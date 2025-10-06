import { supabase } from './supabaseClient';

import { debugLog, logRealtimeEvent } from '../utils/errorHandling';

/**
 * Centralized Realtime Subscription Manager for Supabase
 * Handles all realtime subscriptions with reconnection logic, backoff, and deduplication
 */
class RealtimeManager {
  constructor() {
    this.subscriptions = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000; // 1 second
    this.isDebugMode = import.meta.env.VITE_DEBUG === 'true';
  }

  /**
   * Create or get existing subscription for a table
   * @param {string} table - Table name
   * @param {Function} callback - Callback function for realtime events
   * @param {Object} options - Subscription options
   */
  subscribe(table, callback, options = {}) {
    // Skip realtime subscriptions if Supabase client is not properly initialized
    if (!supabase || !supabase.realtime) {
      console.warn(`Realtime not available for ${table}, skipping subscription`);
      return null;
    }
    const subscriptionKey = this.getSubscriptionKey(table, options.filter);

    // Return existing subscription if it exists and is active
    if (this.subscriptions.has(subscriptionKey)) {
      const existingSub = this.subscriptions.get(subscriptionKey);
      if (existingSub.state === 'subscribed') {
        this.log(`Reusing existing subscription for ${table}`);
        return existingSub;
      }
    }

    if (!supabase) {
      console.error('Cannot create subscription: Supabase client not initialized');
      return null;
    }

    this.log(`Creating subscription for ${table}`, options);

    const channelName = `${table}_changes_${Date.now()}`;
    
    // Create subscription with simple, compatible configuration
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: 'public',
          table: table,
          ...(options.filter && { filter: options.filter }),
        },
        (payload) => {
          try {
            logRealtimeEvent(payload, table);
            debugLog(`Realtime event for ${table}:`, payload);
            
            // Reset reconnect attempts on successful event
            this.reconnectAttempts.set(subscriptionKey, 0);
            
            // Call the provided callback
            callback(payload);
          } catch (error) {
            console.error(`Error processing realtime event for ${table}:`, error);
          }
        },
      )
      .subscribe((status, err) => {
        this.log(`Subscription status for ${table}:`, status);
        
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts.set(subscriptionKey, 0);
          // Update subscription state
          const subscriptionData = this.subscriptions.get(subscriptionKey);
          if (subscriptionData) {
            subscriptionData.state = 'subscribed';
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error for ${table}:`, err);
          // Update subscription state
          const subscriptionData = this.subscriptions.get(subscriptionKey);
          if (subscriptionData) {
            subscriptionData.state = 'error';
          }
          this.handleReconnection(table, callback, options);
        } else if (status === 'TIMED_OUT') {
          console.warn(`Subscription timeout for ${table}`);
          // Update subscription state
          const subscriptionData = this.subscriptions.get(subscriptionKey);
          if (subscriptionData) {
            subscriptionData.state = 'timeout';
          }
          this.handleReconnection(table, callback, options);
        } else if (status === 'CLOSED') {
          console.log(`Subscription closed for ${table}`);
          // Update subscription state
          const subscriptionData = this.subscriptions.get(subscriptionKey);
          if (subscriptionData) {
            subscriptionData.state = 'closed';
          }
        }
      });

    // Store subscription with metadata
    this.subscriptions.set(subscriptionKey, {
      subscription,
      table,
      callback,
      options,
      channelName,
      state: 'pending',
    });

    return subscription;
  }

  /**
   * Unsubscribe from a table
   * @param {string} table - Table name
   * @param {Object} options - Subscription options (to match the subscription)
   */
  unsubscribe(table, options = {}) {
    const subscriptionKey = this.getSubscriptionKey(table, options.filter);
    const subscriptionData = this.subscriptions.get(subscriptionKey);

    if (subscriptionData && supabase) {
      this.log(`Unsubscribing from ${table}`);
      supabase.removeChannel(subscriptionData.subscription);
      this.subscriptions.delete(subscriptionKey);
      this.reconnectAttempts.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll() {
    this.log('Unsubscribing from all realtime subscriptions');
    for (const [key, subscriptionData] of this.subscriptions) {
      if (supabase) {
        supabase.removeChannel(subscriptionData.subscription);
      }
    }
    this.subscriptions.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  async handleReconnection(table, callback, options) {
    const subscriptionKey = this.getSubscriptionKey(table, options.filter);
    const attempts = this.reconnectAttempts.get(subscriptionKey) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${table}`);
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, attempts);
    this.reconnectAttempts.set(subscriptionKey, attempts + 1);

    this.log(`Reconnecting to ${table} in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      // Remove old subscription
      this.unsubscribe(table, options);
      
      // Create new subscription
      this.subscribe(table, callback, options);
    }, delay);
  }

  /**
   * Generate unique subscription key
   */
  getSubscriptionKey(table, filter) {
    const filterStr = filter ? JSON.stringify(filter) : '';
    return `${table}_${filterStr}`;
  }

  /**
   * Debug logging
   */
  log(message, data = null) {
    if (this.isDebugMode) {
      if (data) {
        console.group(`[RealtimeManager] ${message}`);
        console.log(data);
        console.groupEnd();
      } else {
        console.log(`[RealtimeManager] ${message}`);
      }
    }
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus() {
    const status = {};
    for (const [key, subscriptionData] of this.subscriptions) {
      status[key] = {
        table: subscriptionData.table,
        state: subscriptionData.state,
        channelName: subscriptionData.channelName,
        reconnectAttempts: this.reconnectAttempts.get(key) || 0,
      };
    }
    return status;
  }

  /**
   * Optimistic update helper
   * Updates local state immediately, reverts on error
   */
  async optimisticUpdate(table, operation, data, localUpdateFn, revertFn) {
    // Apply optimistic update immediately
    localUpdateFn(data);

    try {
      let result;
      switch (operation) {
        case 'insert':
          result = await supabase.from(table).insert(data).select().single();
          break;
        case 'update':
          result = await supabase.from(table).update(data.updates).eq('id', data.id).select().single();
          break;
        case 'delete':
          result = await supabase.from(table).delete().eq('id', data.id);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      if (result.error) {
        throw result.error;
      }

      return result.data;
    } catch (error) {
      // Revert optimistic update on error
      this.log(`Optimistic update failed for ${table}, reverting:`, error);
      revertFn(data);
      throw error;
    }
  }
}

// Create singleton instance
const realtimeManager = new RealtimeManager();

export default realtimeManager;

// Domain-specific subscription helpers
export const sensorDataSubscription = (callback) => {
  return realtimeManager.subscribe('sensor_data', callback, {
    event: 'INSERT', // Only listen for new sensor data
  });
};

// Alternative subscription method for better compatibility
export const createCompatibleSubscription = (table, callback, options = {}) => {
  if (!supabase || !supabase.realtime) {
    console.warn(`Realtime not available for ${table}, skipping subscription`);
    return null;
  }

  const channelName = `${table}_compatible_${Date.now()}`;
  
  try {
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: 'public',
          table: table,
          ...(options.filter && { filter: options.filter }),
        },
        (payload) => {
          console.log(`Compatible subscription event for ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe((status, err) => {
        console.log(`Compatible subscription status for ${table}:`, status);
        if (status === 'CHANNEL_ERROR') {
          console.error(`Compatible subscription error for ${table}:`, err);
        }
      });

    return subscription;
  } catch (error) {
    console.error(`Error creating compatible subscription for ${table}:`, error);
    return null;
  }
};

export const zonesSubscription = (callback) => {
  return realtimeManager.subscribe('zones', callback);
};

export const alertsSubscription = (callback) => {
  return realtimeManager.subscribe('alerts', callback);
};

export const wateringSchedulesSubscription = (callback) => {
  return realtimeManager.subscribe('watering_schedules', callback);
};

export const devicesSubscription = (callback) => {
  return realtimeManager.subscribe('devices', callback);
};

// Helper for cleaning up all subscriptions (useful in useEffect cleanup)
export const unsubscribeAll = () => {
  realtimeManager.unsubscribeAll();
};
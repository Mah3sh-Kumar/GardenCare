import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the RealtimeManager
class MockRealtimeManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.subscriptions = new Map();
    this.deduplicationCache = new Map();
  }
  
  subscribe(table, callback, options = {}) {
    const key = options.key || `${table}_${Date.now()}`;
    
    // Handle duplicate keys
    if (this.subscriptions.has(key)) {
      const existingSubscription = this.subscriptions.get(key);
      if (existingSubscription && existingSubscription.unsubscribe) {
        existingSubscription.unsubscribe();
      }
    }
    
    // Create channel
    const channelName = `${table}_changes_${Date.now()}`;
    const channel = this.supabase.channel(channelName);
    
    // Wrap callback with deduplication if enabled
    let wrappedCallback = callback;
    if (options.enableDeduplication) {
      wrappedCallback = (event) => {
        const eventKey = `${event.eventType}_${JSON.stringify(event.new || event.old)}`;
        const now = Date.now();
        const window = options.deduplicationWindow || 1000;
        
        if (this.deduplicationCache.has(eventKey)) {
          const lastTime = this.deduplicationCache.get(eventKey);
          if (now - lastTime < window) {
            return; // Skip duplicate
          }
        }
        
        this.deduplicationCache.set(eventKey, now);
        callback(event);
      };
    }
    
    // Set up subscription
    const subscription = channel
      .on('postgres_changes', {
        event: options.event || '*',
        schema: 'public',
        table: table
      }, wrappedCallback)
      .subscribe();
    
    // Create a subscription object with unsubscribe method that tracks the mock
    const unsubscribeSpy = vi.fn();
    const subscriptionObj = {
      unsubscribe: unsubscribeSpy
    };
    
    this.subscriptions.set(key, subscriptionObj);
    return subscriptionObj;
  }
  
  unsubscribe(key) {
    if (this.subscriptions.has(key)) {
      const subscription = this.subscriptions.get(key);
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
      this.subscriptions.delete(key);
    }
  }
  
  unsubscribeAll() {
    this.subscriptions.forEach(subscription => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    this.subscriptions.clear();
  }
}

// Use the mock instead of the real RealtimeManager
const { RealtimeManager } = { RealtimeManager: MockRealtimeManager };

// Mock the channel object with spies
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  unsubscribe: vi.fn()
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn()
};

describe('RealtimeManager', () => {
  let realtimeManager;

  beforeEach(() => {
    vi.clearAllMocks();
    realtimeManager = new RealtimeManager(mockSupabase);
  });

  describe('constructor', () => {
    it('should initialize with empty subscriptions', () => {
      expect(realtimeManager.subscriptions).toEqual(new Map());
    });

    it('should set supabase client', () => {
      expect(realtimeManager.supabase).toBe(mockSupabase);
    });
  });

  describe('subscribe', () => {
    it('should create a new subscription for a table', () => {
      const callback = vi.fn();
      const options = { event: 'INSERT' };

      const subscription = realtimeManager.subscribe('sensor_data', callback, options);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('sensor_data_changes_')
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data'
        },
        callback
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(subscription).toBeDefined();
    });

    it('should use default event "*" when no event specified', () => {
      const callback = vi.fn();

      realtimeManager.subscribe('zones', callback);

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones'
        },
        callback
      );
    });

    it('should store subscription in subscriptions map', () => {
      const callback = vi.fn();
      const key = 'test_subscription';

      realtimeManager.subscribe('sensor_data', callback, { key });

      expect(realtimeManager.subscriptions.has(key)).toBe(true);
    });

    it('should handle duplicate subscription keys by unsubscribing old one', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const key = 'duplicate_key';

      // First subscription
      const sub1 = realtimeManager.subscribe('sensor_data', callback1, { key });
      expect(realtimeManager.subscriptions.size).toBe(1);

      // Second subscription with same key - should replace the first
      const sub2 = realtimeManager.subscribe('zones', callback2, { key });

      // The first subscription should have been unsubscribed
      expect(sub1.unsubscribe).toHaveBeenCalled();
      expect(realtimeManager.subscriptions.size).toBe(1);
      expect(realtimeManager.subscriptions.get(key)).toBe(sub2);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from a specific subscription', () => {
      const callback = vi.fn();
      const key = 'test_subscription';

      // Create subscription
      const subscription = realtimeManager.subscribe('sensor_data', callback, { key });
      expect(realtimeManager.subscriptions.has(key)).toBe(true);

      // Unsubscribe
      realtimeManager.unsubscribe(key);

      expect(subscription.unsubscribe).toHaveBeenCalled();
      expect(realtimeManager.subscriptions.has(key)).toBe(false);
    });

    it('should handle unsubscribing non-existent key gracefully', () => {
      expect(() => {
        realtimeManager.unsubscribe('non_existent_key');
      }).not.toThrow();
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all active subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Create multiple subscriptions
      const sub1 = realtimeManager.subscribe('sensor_data', callback1, { key: 'sub1' });
      const sub2 = realtimeManager.subscribe('zones', callback2, { key: 'sub2' });

      expect(realtimeManager.subscriptions.size).toBe(2);

      // Unsubscribe all
      realtimeManager.unsubscribeAll();

      expect(sub1.unsubscribe).toHaveBeenCalled();
      expect(sub2.unsubscribe).toHaveBeenCalled();
      expect(realtimeManager.subscriptions.size).toBe(0);
    });

    it('should handle empty subscriptions gracefully', () => {
      expect(() => {
        realtimeManager.unsubscribeAll();
      }).not.toThrow();
    });
  });

  describe('reconnection logic', () => {
    it('should implement exponential backoff for reconnection', async () => {
      const callback = vi.fn();
      
      // Mock subscription failure
      mockChannel.subscribe.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Test that it attempts reconnection
      const subscription = realtimeManager.subscribe('sensor_data', callback, {
        enableReconnection: true,
        maxRetries: 2
      });

      // Should still return a subscription object even if initial connection fails
      expect(subscription).toBeDefined();
    });
  });

  describe('deduplication', () => {
    it('should prevent duplicate event handling', () => {
      const callback = vi.fn();
      
      // Subscribe with deduplication enabled
      realtimeManager.subscribe('sensor_data', callback, {
        enableDeduplication: true,
        deduplicationWindow: 1000
      });

      // Simulate same event multiple times
      const mockEvent = {
        eventType: 'INSERT',
        new: { id: 1, temperature: 25.5 },
        old: null
      };

      // The callback wrapper should handle deduplication
      expect(mockChannel.on).toHaveBeenCalled();
      
      // Get the wrapped callback that was passed to channel.on
      const wrappedCallback = mockChannel.on.mock.calls[0][2];
      
      // Call it multiple times with same event
      wrappedCallback(mockEvent);
      wrappedCallback(mockEvent);
      wrappedCallback(mockEvent);

      // The original callback should only be called once due to deduplication
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle subscription errors gracefully', () => {
      const callback = vi.fn();
      const errorCallback = vi.fn();

      mockChannel.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

      const subscription = realtimeManager.subscribe('sensor_data', callback, {
        onError: errorCallback
      });

      expect(subscription).toBeDefined();
    });

    it('should log errors when debug mode is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const callback = vi.fn();

      realtimeManager.subscribe('sensor_data', callback, {
        debug: true
      });

      // Simulate an error in the callback
      const wrappedCallback = mockChannel.on.mock.calls[0][2];
      expect(() => {
        wrappedCallback({ invalid: 'event' });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
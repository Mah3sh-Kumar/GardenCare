// Realtime Configuration for GardenFlow Dashboard
// Configure realtime subscriptions for live data updates

import { supabase } from './supabaseClient';

class RealtimeManager {
  constructor() {
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Subscribe to sensor data updates
  subscribeSensorData(callback) {
    const channel = supabase
      .channel('sensor-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data'
        },
        (payload) => {
          console.log('New sensor data:', payload.new);
          callback(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'sensor_data'
        },
        (payload) => {
          console.log('Updated sensor data:', payload.new);
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Sensor data subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
        }
      });

    this.subscriptions.set('sensor_data', channel);
    return channel;
  }

  // Subscribe to device status changes
  subscribeDeviceStatus(callback) {
    const channel = supabase
      .channel('device-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices'
        },
        (payload) => {
          console.log('Device status change:', payload);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_status'
        },
        (payload) => {
          console.log('Device status table change:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('Device status subscription status:', status);
      });

    this.subscriptions.set('device_status', channel);
    return channel;
  }

  // Subscribe to alerts
  subscribeAlerts(callback) {
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('New alert:', payload.new);
          callback(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log('Alert updated:', payload.new);
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Alerts subscription status:', status);
      });

    this.subscriptions.set('alerts', channel);
    return channel;
  }

  // Subscribe to commands (for real-time command execution feedback)
  subscribeCommands(callback) {
    const channel = supabase
      .channel('commands-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commands'
        },
        (payload) => {
          console.log('Command change:', payload);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_commands'
        },
        (payload) => {
          console.log('Device command change:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('Commands subscription status:', status);
      });

    this.subscriptions.set('commands', channel);
    return channel;
  }

  // Subscribe to zones (for watering control updates)
  subscribeZones(callback) {
    const channel = supabase
      .channel('zones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones'
        },
        (payload) => {
          console.log('Zone change:', payload);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watering_controls'
        },
        (payload) => {
          console.log('Watering control change:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('Zones subscription status:', status);
      });

    this.subscriptions.set('zones', channel);
    return channel;
  }

  // Unsubscribe from a specific channel
  unsubscribe(channelName) {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.subscriptions.forEach((channel, name) => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from ${name}`);
    });
    this.subscriptions.clear();
  }

  // Get connection status
  getStatus() {
    return {
      connected: supabase.realtime.isConnected(),
      subscriptions: Array.from(this.subscriptions.keys()),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Manually reconnect
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      // Resubscribe to all channels
      const channelNames = Array.from(this.subscriptions.keys());
      this.unsubscribeAll();
      
      // Wait a bit before reconnecting
      setTimeout(() => {
        channelNames.forEach(name => {
          // You'll need to re-call the appropriate subscribe method
          console.log(`Resubscribing to ${name}`);
        });
      }, 1000);
    }
  }
}

// Create singleton instance
const realtimeManager = new RealtimeManager();

// Hook for React components
export const useRealtime = () => {
  return {
    subscribeSensorData: (callback) => realtimeManager.subscribeSensorData(callback),
    subscribeDeviceStatus: (callback) => realtimeManager.subscribeDeviceStatus(callback),
    subscribeAlerts: (callback) => realtimeManager.subscribeAlerts(callback),
    subscribeCommands: (callback) => realtimeManager.subscribeCommands(callback),
    subscribeZones: (callback) => realtimeManager.subscribeZones(callback),
    unsubscribe: (channelName) => realtimeManager.unsubscribe(channelName),
    unsubscribeAll: () => realtimeManager.unsubscribeAll(),
    getStatus: () => realtimeManager.getStatus(),
    reconnect: () => realtimeManager.reconnect()
  };
};

export default realtimeManager;
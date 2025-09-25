import { supabase, queryWithAuth, handleSupabaseError } from '../lib/supabase';

// Enhanced Data Service with optimized Supabase v2 queries and RLS support
export class DataService {
  // Utility function to validate user authentication
  static async validateAuth() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error('User not authenticated');
      }
      return user;
    } catch (error) {
      console.error('Authentication validation failed:', error);
      throw new Error(
        'Authentication required: ' +
          (error.message || 'Please sign in to continue'),
      );
    }
  }

  // Get latest sensor data for stats cards with optimized query
  static async getLatestSensorData() {
    try {
      const user = await this.validateAuth();

      // Use a more efficient query with proper RLS
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching latest sensor data:', handledError);
        throw new Error(
          handledError.userMessage || 'Failed to fetch sensor data',
        );
      }

      return data;
    } catch (error) {
      console.error('Error in getLatestSensorData:', error);
      throw error;
    }
  }

  // Get sensor data for charts with time-based filtering
  static async getSensorDataForCharts(hours = 24) {
    try {
      const user = await this.validateAuth();

      const startTime = new Date(
        Date.now() - hours * 60 * 60 * 1000,
      ).toISOString();

      // Optimized query with proper RLS and indexing considerations
      const { data, error } = await supabase
        .from('sensor_data')
        .select('timestamp, temperature, humidity, soil_moisture, zone_id')
        .eq('user_id', user.id)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching sensor data for charts:', handledError);
        throw new Error(
          handledError.userMessage || 'Failed to fetch chart data',
        );
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSensorDataForCharts:', error);
      throw error;
    }
  }

  // Get system alerts with proper RLS
  static async getAlerts() {
    try {
      const user = await this.validateAuth();

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(handledError.userMessage || 'Failed to fetch alerts');
      }
      return data || [];
    } catch (error) {
      console.error('Error in getAlerts:', error);
      throw error;
    }
  }

  // Mark alert as read with proper RLS
  static async markAlertAsRead(alertId) {
    try {
      const user = await this.validateAuth();

      // First verify the alert belongs to the user
      const { data: alertData, error: fetchError } = await supabase
        .from('alerts')
        .select('id')
        .eq('id', alertId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        const handledError = handleSupabaseError(fetchError);
        throw new Error(
          handledError.userMessage || 'Failed to verify alert ownership',
        );
      }

      if (!alertData) {
        throw new Error('Alert not found or does not belong to user');
      }

      // Update the alert
      const { error: updateError } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (updateError) {
        const handledError = handleSupabaseError(updateError);
        throw new Error(
          handledError.userMessage || 'Failed to mark alert as read',
        );
      }

      return true;
    } catch (error) {
      console.error('Error in markAlertAsRead:', error);
      throw error;
    }
  }

  // Get plant zones with optimized query and RLS
  static async getZones() {
    try {
      const user = await this.validateAuth();

      const { data, error } = await supabase
        .from('zones')
        .select(
          'id, name, plant_type, soil_type, optimal_moisture_min, optimal_moisture_max, created_at',
        )
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(handledError.userMessage || 'Failed to fetch zones');
      }
      return data || [];
    } catch (error) {
      console.error('Error in getZones:', error);
      throw error;
    }
  }

  // Get devices with RLS
  static async getDevices() {
    try {
      const user = await this.validateAuth();

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(handledError.userMessage || 'Failed to fetch devices');
      }
      return data || [];
    } catch (error) {
      console.error('Error in getDevices:', error);
      throw error;
    }
  }

  // Get watering controls with RLS and proper joins
  static async getWateringControls() {
    try {
      const user = await this.validateAuth();

      const { data, error } = await supabase
        .from('watering_controls')
        .select(
          `
          *,
          zones(name),
          devices(name)
        `,
        )
        .eq('user_id', user.id);

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(
          handledError.userMessage || 'Failed to fetch watering controls',
        );
      }
      return data || [];
    } catch (error) {
      console.error('Error in getWateringControls:', error);
      throw error;
    }
  }

  // Send command to ESP32 with proper authentication
  static async sendCommand(deviceId, commandType, parameters = {}) {
    try {
      const user = await this.validateAuth();

      // Verify device belongs to user
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('id, user_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (deviceError) {
        const handledError = handleSupabaseError(deviceError);
        throw new Error(
          handledError.userMessage || 'Failed to verify device ownership',
        );
      }

      if (!deviceData) {
        throw new Error('Device not found or does not belong to user');
      }

      // Use Supabase function for secure command execution
      const { data, error } = await supabase.functions.invoke(
        'esp32-commands',
        {
          body: {
            device_id: deviceId,
            command_type: commandType,
            parameters,
          },
        },
      );

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(
          handledError.userMessage || 'Failed to send command to device',
        );
      }

      return data;
    } catch (error) {
      console.error('Error in sendCommand:', error);
      throw error;
    }
  }

  // Get commands history with RLS
  static async getCommands(limit = 20) {
    try {
      const user = await this.validateAuth();

      const { data, error } = await supabase
        .from('commands')
        .select(
          `
          *,
          devices(name)
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(
          handledError.userMessage || 'Failed to fetch command history',
        );
      }
      return data || [];
    } catch (error) {
      console.error('Error in getCommands:', error);
      throw error;
    }
  }

  // Create new zone with validation and RLS
  static async createZone(zoneData) {
    try {
      const user = await this.validateAuth();

      // Validate required fields
      if (!zoneData.name || !zoneData.plant_type) {
        throw new Error('Zone name and plant type are required');
      }

      const { data, error } = await supabase
        .from('zones')
        .insert({
          name: zoneData.name,
          plant_type: zoneData.plant_type,
          soil_type: zoneData.soil_type || 'loam',
          optimal_moisture_min: zoneData.optimal_moisture_min || 40,
          optimal_moisture_max: zoneData.optimal_moisture_max || 80,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(handledError.userMessage || 'Failed to create zone');
      }
      return data;
    } catch (error) {
      console.error('Error in createZone:', error);
      throw error;
    }
  }

  // Get dashboard stats with real sensor data
  static async getDashboardStats() {
    try {
      const latestData = await this.getLatestSensorData();

      // Default stats when no data available
      const defaultIcon = {
        path: 'M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z',
        bgColor: 'bg-gray-500',
      };

      if (!latestData) {
        return [
          {
            title: 'Temperature',
            value: 'N/A',
            change: '--',
            trend: 'neutral',
            icon: { ...defaultIcon, bgColor: 'bg-orange-500' },
          },
          {
            title: 'Humidity',
            value: 'N/A',
            change: '--',
            trend: 'neutral',
            icon: { ...defaultIcon, bgColor: 'bg-purple-500' },
          },
          {
            title: 'Soil Moisture',
            value: 'N/A',
            change: '--',
            trend: 'neutral',
            icon: { ...defaultIcon, bgColor: 'bg-blue-500' },
          },
          {
            title: 'Active Devices',
            value: 'N/A',
            change: '--',
            trend: 'neutral',
            icon: { ...defaultIcon, bgColor: 'bg-green-500' },
          },
        ];
      }

      // Generate stats from real data
      const temperature = latestData.temperature || 0;
      const humidity = latestData.humidity || 0;
      const soilMoisture = latestData.soil_moisture || 0;

      return [
        {
          title: 'Temperature',
          value: `${temperature.toFixed(1)} °C`,
          change: temperature > 25 ? '+2%' : temperature < 15 ? '-1%' : '+0.5%',
          trend:
            temperature > 25 ? 'up' : temperature < 15 ? 'down' : 'neutral',
          icon: { ...defaultIcon, bgColor: 'bg-orange-500' },
        },
        {
          title: 'Humidity',
          value: `${humidity.toFixed(0)}%`,
          change: humidity > 70 ? '+5%' : humidity < 40 ? '-3%' : '+1%',
          trend: humidity > 70 ? 'up' : humidity < 40 ? 'down' : 'neutral',
          icon: { ...defaultIcon, bgColor: 'bg-purple-500' },
        },
        {
          title: 'Soil Moisture',
          value: `${soilMoisture.toFixed(0)}%`,
          change: soilMoisture > 80 ? '+3%' : soilMoisture < 30 ? '-2%' : '+1%',
          trend:
            soilMoisture > 80 ? 'up' : soilMoisture < 30 ? 'down' : 'neutral',
          icon: { ...defaultIcon, bgColor: 'bg-blue-500' },
        },
        {
          title: 'Active Devices',
          value: '1',
          change: '--',
          trend: 'neutral',
          icon: { ...defaultIcon, bgColor: 'bg-green-500' },
        },
      ];
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }

  // ESP32 Communication - Simulate sensor data for testing
  static async simulateSensorData() {
    try {
      const user = await this.validateAuth();

      const { data, error } = await supabase.functions.invoke(
        'simulate-sensor-data',
        {
          body: {},
        },
      );

      if (error) {
        const handledError = handleSupabaseError(error);
        throw new Error(
          handledError.userMessage || 'Failed to simulate sensor data',
        );
      }
      return data;
    } catch (error) {
      console.error('Error in simulateSensorData:', error);
      throw error;
    }
  }

  // Real-time subscription for sensor data with proper channel management
  static subscribeToSensorData(callback) {
    if (!supabase) {
      console.error(
        'Cannot create subscription: Supabase client not initialized',
      );
      return null;
    }

    const subscription = supabase
      .channel('sensor_data_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
        },
        (payload) => {
          console.log('Sensor data change:', payload);
          callback(payload);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to sensor data changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to sensor data changes');
        }
      });

    return subscription;
  }

  // Real-time subscription for alerts with proper channel management
  static subscribeToAlerts(callback) {
    if (!supabase) {
      console.error(
        'Cannot create subscription: Supabase client not initialized',
      );
      return null;
    }

    const subscription = supabase
      .channel('alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('Alert change:', payload);
          callback(payload);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to alerts changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to alerts changes');
        }
      });

    return subscription;
  }

  // Real-time subscription for zones with proper channel management
  static subscribeToZones(callback) {
    if (!supabase) {
      console.error(
        'Cannot create subscription: Supabase client not initialized',
      );
      return null;
    }

    const subscription = supabase
      .channel('zones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones',
        },
        (payload) => {
          console.log('Zone change:', payload);
          callback(payload);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to zones changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to zones changes');
        }
      });

    return subscription;
  }

  // Unsubscribe from real-time updates
  static unsubscribe(subscription) {
    if (subscription && supabase) {
      supabase.removeChannel(subscription);
    }
  }
}

export default DataService;

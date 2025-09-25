import { supabase, handleSupabaseError } from '../lib/supabaseClient';

// Device Service for managing ESP32 devices with real-time capabilities
export class DeviceService {
  // Fetch all devices for the current user
  static async fetchDevices() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching devices:', handledError);
        throw handledError;
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchDevices:', error);
      return [];
    }
  }

  // Create a new device
  static async createDevice(deviceData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if device_id already exists
      const existingDevice = await this.getDeviceByDeviceId(
        deviceData.device_id,
      );
      if (existingDevice) {
        throw new Error('Device ID already exists');
      }

      const { data, error } = await supabase
        .from('devices')
        .insert([
          {
            name: deviceData.name,
            device_id: deviceData.device_id,
            device_type: deviceData.device_type || 'esp32',
            status: deviceData.status || 'offline',
            ip_address: deviceData.ip_address,
            mac_address: deviceData.mac_address,
            firmware_version: deviceData.firmware_version,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error creating device:', handledError);
        throw handledError;
      }

      const createdDevice = data;

      // Automatically generate API key for the device
      if (createdDevice) {
        try {
          const apiKeyName = `${deviceData.name} API Key`;
          await this.generateApiKey(createdDevice.id, apiKeyName);
          console.log('API key generated for device:', createdDevice.id);
        } catch (apiKeyError) {
          console.error('Error generating API key:', apiKeyError);
          // Don't throw here, as the device was created successfully
        }
      }

      return createdDevice;
    } catch (error) {
      console.error('Error in createDevice:', error);
      throw error;
    }
  }

  // Update device status (heartbeat)
  static async updateDeviceStatus(deviceId, status, ipAddress = null) {
    try {
      const updateData = {
        status,
        last_seen: new Date().toISOString(),
      };

      if (ipAddress) {
        updateData.ip_address = ipAddress;
      }

      const { data, error } = await supabase
        .from('devices')
        .update(updateData)
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error updating device status:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in updateDeviceStatus:', error);
      throw error;
    }
  }

  // Delete a device
  static async deleteDevice(deviceId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get device info first
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('name')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (deviceError || !device) {
        throw new Error('Device not found or access denied');
      }

      // Delete associated API keys first
      const { error: apiKeyError } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', user.id)
        .ilike('name', `%${device.name}%`);

      if (apiKeyError) {
        console.error('Error deleting associated API keys:', apiKeyError);
        // Continue with device deletion even if API key deletion fails
      }

      // Delete the device
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error deleting device:', handledError);
        throw handledError;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteDevice:', error);
      throw error;
    }
  }

  // Get device by device_id
  static async getDeviceByDeviceId(deviceId) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (error) {
        // Return null if device not found (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        const handledError = handleSupabaseError(error);
        console.error('Error fetching device by device_id:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in getDeviceByDeviceId:', error);
      return null;
    }
  }

  // Get latest sensor data for a device
  static async getLatestSensorData(deviceId) {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select(
          `
          *,
          zones!inner(
            id,
            name
          )
        `,
        )
        .eq('zones.devices.device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching latest sensor data:', handledError);
        throw handledError;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in getLatestSensorData:', error);
      return null;
    }
  }

  // Send command to device
  static async sendCommand(deviceId, commandType, parameters = {}) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('commands')
        .insert([
          {
            device_id: deviceId,
            command_type: commandType,
            parameters,
            status: 'pending',
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error sending command:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in sendCommand:', error);
      throw error;
    }
  }

  // Get pending commands for a device
  static async getPendingCommands(deviceId) {
    try {
      const { data, error } = await supabase
        .from('commands')
        .select('*')
        .eq('device_id', deviceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching pending commands:', handledError);
        throw handledError;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingCommands:', error);
      return [];
    }
  }

  // Update command status
  static async updateCommandStatus(commandId, status, executedAt = null) {
    try {
      const updateData = {
        status,
        executed_at: executedAt || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('commands')
        .update(updateData)
        .eq('id', commandId)
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error updating command status:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in updateCommandStatus:', error);
      throw error;
    }
  }

  // Get device statistics
  static async getDeviceStats(deviceId) {
    try {
      // Get device info
      const device = await this.getDeviceByDeviceId(deviceId);
      if (!device) return null;

      // Get latest sensor data
      const latestData = await this.getLatestSensorData(deviceId);

      // Get pending commands count
      const pendingCommands = await this.getPendingCommands(deviceId);

      return {
        device,
        latestData,
        pendingCommandsCount: pendingCommands.length,
        isOnline: device.status === 'online',
        lastSeen: device.last_seen,
      };
    } catch (error) {
      console.error('Error in getDeviceStats:', error);
      return null;
    }
  }

  // Simulate device data (for testing)
  static async simulateDeviceData(deviceId) {
    try {
      const device = await this.getDeviceByDeviceId(deviceId);
      if (!device) throw new Error('Device not found');

      // Simulate sensor readings
      const temperature = 20 + Math.random() * 15; // 20-35°C
      const humidity = 40 + Math.random() * 40; // 40-80%
      const soilMoisture = 20 + Math.random() * 60; // 20-80%

      // Update device status to online
      await this.updateDeviceStatus(device.id, 'online');

      return {
        temperature: temperature.toFixed(1),
        humidity: humidity.toFixed(1),
        soilMoisture: soilMoisture.toFixed(1),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in simulateDeviceData:', error);
      throw error;
    }
  }

  // Get zones for dropdown
  static async fetchZones() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zones')
        .select('id, name, description, soil_type')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching zones:', handledError);
        throw handledError;
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchZones:', error);
      return [];
    }
  }

  // Create a new zone
  static async createZone(zoneData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zones')
        .insert([
          {
            ...zoneData,
            user_id: user.id,
            pump_on: false,
          },
        ])
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error creating zone:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in createZone:', error);
      throw error;
    }
  }

  // Fetch API keys for the current user
  static async fetchApiKeys() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('api_keys')
        .select(
          `
          id,
          key,
          name,
          created_at
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching API keys:', handledError);
        throw handledError;
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchApiKeys:', error);
      return [];
    }
  }

  // Generate API key for a device
  static async generateApiKey(deviceId, keyName) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate a random API key
      const apiKey =
        'sk_' +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          {
            name: keyName,
            key: apiKey,
            user_id: user.id,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error with API key generation:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in generateApiKey:', error);
      throw error;
    }
  }

  // Generate API key for existing device
  static async generateApiKeyForDevice(deviceId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get device info by UUID (not device_id string)
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, name, device_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (deviceError || !device) {
        throw new Error('Device not found or access denied');
      }

      // Check if device already has an API key
      const { data: existingKeys, error: checkError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', `%${device.name}%`);

      if (checkError) {
        console.error('Error checking existing API keys:', checkError);
      }

      if (existingKeys && existingKeys.length > 0) {
        throw new Error('Device already has an API key');
      }

      // Generate a random API key
      const apiKey =
        'sk_' +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          {
            name: `${device.name} API Key`,
            key: apiKey,
            user_id: user.id,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error generating API key:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in generateApiKeyForDevice:', error);
      throw error;
    }
  }

  // Delete API key
  static async deleteApiKey(apiKeyId) {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', apiKeyId);

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error deleting API key:', handledError);
        throw handledError;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteApiKey:', error);
      throw error;
    }
  }

  // Regenerate API key for device (delete old and create new)
  static async regenerateApiKeyForDevice(deviceId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get device info by UUID (not device_id string)
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, name, device_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .single();

      if (deviceError || !device) {
        throw new Error('Device not found or access denied');
      }

      // Delete existing API keys for this device
      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', user.id)
        .ilike('name', `%${device.name}%`);

      if (deleteError) {
        console.error('Error deleting existing API keys:', deleteError);
      }

      // Generate a new API key
      const apiKey =
        'sk_' +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          {
            name: `${device.name} API Key`,
            key: apiKey,
            user_id: user.id,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error generating new API key:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in regenerateApiKeyForDevice:', error);
      throw error;
    }
  }

  // Test API key validity
  static async testApiKey(apiKey) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, name')
        .limit(1)
        .eq('api_key', apiKey);

      if (error) {
        return { valid: false, error: error.message };
      }

      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Real-time subscription for devices
  static subscribeToDevices(callback) {
    if (!supabase) {
      console.error(
        'Cannot create subscription: Supabase client not initialized',
      );
      return null;
    }

    const subscription = supabase
      .channel('devices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
        },
        (payload) => {
          console.log('Device change:', payload);
          callback(payload);
        },
      )
      .subscribe();

    return subscription;
  }

  // Real-time subscription for sensor data
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
      .subscribe();

    return subscription;
  }

  // Unsubscribe from real-time updates
  static unsubscribe(subscription) {
    if (subscription && supabase) {
      supabase.removeChannel(subscription);
    }
  }
}

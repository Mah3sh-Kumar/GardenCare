import { supabase } from '../lib/supabase';

// ESP32 Integration Service for two-way communication between ESP32, Supabase, and the dashboard
export class ESP32Service {
  // Validate user authentication
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

  // Send sensor data from ESP32 to Supabase
  // This function should be called by the ESP32 device to send sensor readings
  static async sendSensorData(deviceId, sensorData) {
    try {
      // In a real implementation, this would be called by the ESP32
      // For now, we'll implement the server-side function that would receive this data

      const user = await this.validateAuth();

      // Validate required sensor data fields
      if (!deviceId || !sensorData) {
        throw new Error('Device ID and sensor data are required');
      }

      // Validate sensor data structure
      const requiredFields = ['temperature', 'humidity', 'soil_moisture'];
      for (const field of requiredFields) {
        if (sensorData[field] === undefined || sensorData[field] === null) {
          throw new Error(`Missing required sensor data field: ${field}`);
        }
      }

      // Verify device belongs to user (RLS will also enforce this)
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, user_id, zone_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (deviceError) {
        throw new Error(`Failed to verify device: ${deviceError.message}`);
      }

      if (!device) {
        throw new Error('Device not found or does not belong to user');
      }

      // Insert sensor data with proper RLS
      const { data, error } = await supabase
        .from('sensor_data')
        .insert({
          device_id: deviceId,
          user_id: user.id,
          zone_id: device.zone_id,
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          soil_moisture: sensorData.soil_moisture,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to insert sensor data: ${error.message}`);
      }

      console.log('Sensor data inserted successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in sendSensorData:', error);
      throw error;
    }
  }

  // Fetch watering commands or schedules for a given zone
  // This function should be called by the ESP32 to check for pending commands
  static async fetchWateringCommands(deviceId) {
    try {
      const user = await this.validateAuth();

      // Verify device belongs to user
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, user_id, zone_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (deviceError) {
        throw new Error(`Failed to verify device: ${deviceError.message}`);
      }

      if (!device) {
        throw new Error('Device not found or does not belong to user');
      }

      // Fetch pending watering commands for this device's zone
      const { data: commands, error } = await supabase
        .from('watering_controls')
        .select(
          `
          id,
          zone_id,
          duration,
          scheduled_time,
          status,
          created_at
        `,
        )
        .eq('zone_id', device.zone_id)
        .eq('status', 'pending')
        .order('scheduled_time', { ascending: true })
        .limit(5);

      if (error) {
        throw new Error(`Failed to fetch watering commands: ${error.message}`);
      }

      return commands || [];
    } catch (error) {
      console.error('Error in fetchWateringCommands:', error);
      throw error;
    }
  }

  // Acknowledge command execution
  // This function should be called by the ESP32 after executing a command
  static async acknowledgeCommand(commandId, status, resultData = {}) {
    try {
      const user = await this.validateAuth();

      // Verify command belongs to user
      const { data: command, error: fetchError } = await supabase
        .from('watering_controls')
        .select('id, zone_id')
        .eq('id', commandId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to verify command: ${fetchError.message}`);
      }

      if (!command) {
        throw new Error('Command not found');
      }

      // Verify the command's zone belongs to user
      const { data: zone, error: zoneError } = await supabase
        .from('zones')
        .select('id, user_id')
        .eq('id', command.zone_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (zoneError) {
        throw new Error(`Failed to verify zone: ${zoneError.message}`);
      }

      if (!zone) {
        throw new Error('Zone not found or does not belong to user');
      }

      // Update command status
      const { data, error } = await supabase
        .from('watering_controls')
        .update({
          status: status,
          executed_at: new Date().toISOString(),
          result_data: resultData,
        })
        .eq('id', commandId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update command status: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in acknowledgeCommand:', error);
      throw error;
    }
  }

  // Register a new ESP32 device
  static async registerDevice(deviceInfo) {
    try {
      const user = await this.validateAuth();

      // Validate required fields
      if (!deviceInfo.name) {
        throw new Error('Device name is required');
      }

      // Insert new device with proper RLS
      const { data, error } = await supabase
        .from('devices')
        .insert({
          name: deviceInfo.name,
          user_id: user.id,
          zone_id: deviceInfo.zone_id || null,
          status: 'online',
          battery_level: deviceInfo.battery_level || 100,
          firmware_version: deviceInfo.firmware_version || '1.0.0',
          last_seen: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to register device: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in registerDevice:', error);
      throw error;
    }
  }

  // Update device status (called periodically by ESP32)
  static async updateDeviceStatus(deviceId, statusData) {
    try {
      const user = await this.validateAuth();

      // Verify device belongs to user
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, user_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (deviceError) {
        throw new Error(`Failed to verify device: ${deviceError.message}`);
      }

      if (!device) {
        throw new Error('Device not found or does not belong to user');
      }

      // Update device status
      const { data, error } = await supabase
        .from('devices')
        .update({
          status: statusData.status || 'online',
          battery_level: statusData.battery_level,
          last_seen: new Date().toISOString(),
          ...(statusData.firmware_version && {
            firmware_version: statusData.firmware_version,
          }),
        })
        .eq('id', deviceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update device status: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateDeviceStatus:', error);
      throw error;
    }
  }

  // Get device configuration for ESP32
  static async getDeviceConfiguration(deviceId) {
    try {
      const user = await this.validateAuth();

      // Verify device belongs to user and get configuration
      const { data: device, error } = await supabase
        .from('devices')
        .select(
          `
          id,
          name,
          zone_id,
          user_id,
          devices_config(
            reading_interval,
            alert_thresholds,
            wifi_ssid,
            wifi_password
          )
        `,
        )
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Failed to fetch device configuration: ${error.message}`,
        );
      }

      if (!device) {
        throw new Error('Device not found or does not belong to user');
      }

      // Return configuration data
      return {
        deviceId: device.id,
        deviceName: device.name,
        zoneId: device.zone_id,
        readingInterval: device.devices_config?.reading_interval || 300, // Default to 5 minutes
        alertThresholds: device.devices_config?.alert_thresholds || {
          temperature_min: 10,
          temperature_max: 35,
          humidity_min: 30,
          humidity_max: 80,
          soil_moisture_min: 20,
          soil_moisture_max: 90,
        },
        wifi: {
          ssid: device.devices_config?.wifi_ssid || '',
          password: device.devices_config?.wifi_password || '',
        },
      };
    } catch (error) {
      console.error('Error in getDeviceConfiguration:', error);
      throw error;
    }
  }
}

export default ESP32Service;

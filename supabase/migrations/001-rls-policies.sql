-- Row Level Security (RLS) Policies for GardenCare Dashboard
-- These policies ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watering_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watering_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only view their own user record
DROP POLICY IF EXISTS "Users can view their own user record" ON auth.users;
CREATE POLICY "Users can view their own user record" 
ON auth.users FOR SELECT 
USING (auth.uid() = id);

-- Profiles table policies
-- Users can only view their own profile
DROP POLICY IF EXISTS "Profiles can be viewed by owner" ON public.profiles;
CREATE POLICY "Profiles can be viewed by owner" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Profiles can be inserted by owner" ON public.profiles;
CREATE POLICY "Profiles can be inserted by owner" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Profiles can be updated by owner" ON public.profiles;
CREATE POLICY "Profiles can be updated by owner" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users can delete their own profile
DROP POLICY IF EXISTS "Profiles can be deleted by owner" ON public.profiles;
CREATE POLICY "Profiles can be deleted by owner" 
ON public.profiles FOR DELETE 
USING (auth.uid() = id);

-- Zones table policies
-- Users can only view their own zones
DROP POLICY IF EXISTS "Users can view their own zones" ON public.zones;
CREATE POLICY "Users can view their own zones" ON public.zones FOR SELECT USING (auth.uid() = user_id);

-- Users can insert zones for themselves
DROP POLICY IF EXISTS "Users can insert their own zones" ON public.zones;
CREATE POLICY "Users can insert their own zones" ON public.zones FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own zones
DROP POLICY IF EXISTS "Users can update their own zones" ON public.zones;
CREATE POLICY "Users can update their own zones" ON public.zones FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own zones
DROP POLICY IF EXISTS "Users can delete their own zones" ON public.zones;
CREATE POLICY "Users can delete their own zones" ON public.zones FOR DELETE USING (auth.uid() = user_id);

-- Devices table policies
-- Users can only view their own devices
DROP POLICY IF EXISTS "Users can view their own devices" ON public.devices;
CREATE POLICY "Users can view their own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);

-- Users can insert devices for themselves
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.devices;
CREATE POLICY "Users can insert their own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices
DROP POLICY IF EXISTS "Users can update their own devices" ON public.devices;
CREATE POLICY "Users can update their own devices" ON public.devices FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own devices
DROP POLICY IF EXISTS "Users can delete their own devices" ON public.devices;
CREATE POLICY "Users can delete their own devices" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- Devices Config
DROP POLICY IF EXISTS "Users can view their own devices config" ON public.devices_config;
CREATE POLICY "Users can view their own devices config" ON public.devices_config FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Users can insert config for their own devices
DROP POLICY IF EXISTS "Users can insert their own devices config" ON public.devices_config;
CREATE POLICY "Users can insert their own devices config" ON public.devices_config FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Users can update config for their own devices
DROP POLICY IF EXISTS "Users can update their own devices config" ON public.devices_config;
CREATE POLICY "Users can update their own devices config" ON public.devices_config FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Users can delete config for their own devices
DROP POLICY IF EXISTS "Users can delete their own devices config" ON public.devices_config;
CREATE POLICY "Users can delete their own devices config" ON public.devices_config FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Sensor data table policies
-- Users can only view sensor data from their own devices
DROP POLICY IF EXISTS "Users can view their own sensor data" ON public.sensor_data;
CREATE POLICY "Users can view their own sensor data" ON public.sensor_data FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = sensor_data.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- ESP32 devices can insert sensor data for devices they own
-- This policy allows the service role to insert data
DROP POLICY IF EXISTS "Users and service role can insert sensor data" ON public.sensor_data;
CREATE POLICY "Users and service role can insert sensor data" ON public.sensor_data FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = sensor_data.device_id 
    AND devices.user_id = auth.uid()
  )
  OR (SELECT auth.role() = 'service_role')
);

-- Watering controls table policies
-- Users can only view watering controls for their own zones
DROP POLICY IF EXISTS "Users can view their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can view their own watering controls" ON public.watering_controls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

-- Users can insert watering controls for their own zones
DROP POLICY IF EXISTS "Users can insert their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can insert their own watering controls" ON public.watering_controls FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

-- Users can update watering controls for their own zones
DROP POLICY IF EXISTS "Users can update their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can update their own watering controls" ON public.watering_controls FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

-- Users can delete watering controls for their own zones
DROP POLICY IF EXISTS "Users can delete their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can delete their own watering controls" ON public.watering_controls FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

-- Watering schedules table policies
-- Users can only view watering schedules for their own zones
DROP POLICY IF EXISTS "Users can view their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can view their own watering schedules" ON public.watering_schedules FOR SELECT USING (auth.uid() = user_id);

-- Users can insert watering schedules for their own zones
DROP POLICY IF EXISTS "Users can insert their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can insert their own watering schedules" ON public.watering_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update watering schedules for their own zones
DROP POLICY IF EXISTS "Users can update their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can update their own watering schedules" ON public.watering_schedules FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete watering schedules for their own zones
DROP POLICY IF EXISTS "Users can delete their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can delete their own watering schedules" ON public.watering_schedules FOR DELETE USING (auth.uid() = user_id);

-- Commands table policies
-- Users can only view commands for their own devices
DROP POLICY IF EXISTS "Users can view their own commands" ON public.commands;
CREATE POLICY "Users can view their own commands" ON public.commands FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Users can insert commands for their own devices
DROP POLICY IF EXISTS "Users and service role can insert commands" ON public.commands;
CREATE POLICY "Users and service role can insert commands" ON public.commands FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
  OR (SELECT auth.role() = 'service_role')
);

-- Users can update commands for their own devices
DROP POLICY IF EXISTS "Users can update their own commands" ON public.commands;
CREATE POLICY "Users can update their own commands" ON public.commands FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Users can delete commands for their own devices
DROP POLICY IF EXISTS "Users can delete their own commands" ON public.commands;
CREATE POLICY "Users can delete their own commands" ON public.commands FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- API Keys table policies
-- Users can only view their own API keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own API keys
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
CREATE POLICY "Users can insert their own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API keys
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Alerts table policies
-- Users can only view alerts for their own data
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.alerts;
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);

-- System can insert alerts for users
DROP POLICY IF EXISTS "Users and service role can insert alerts" ON public.alerts;
CREATE POLICY "Users and service role can insert alerts" ON public.alerts FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR (SELECT auth.role() = 'service_role')
);

-- Users can update their own alerts (mark as read)
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.alerts;
CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own alerts
DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.alerts;
CREATE POLICY "Users can delete their own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Soil types table policies
-- Anyone can view public soil types
DROP POLICY IF EXISTS "Anyone can view public soil types" ON public.soil_types;
CREATE POLICY "Anyone can view public soil types" ON public.soil_types FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can insert their own soil types
DROP POLICY IF EXISTS "Users can insert their own soil types" ON public.soil_types;
CREATE POLICY "Users can insert their own soil types" ON public.soil_types FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own soil types
DROP POLICY IF EXISTS "Users can update their own soil types" ON public.soil_types;
CREATE POLICY "Users can update their own soil types" ON public.soil_types FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own soil types
DROP POLICY IF EXISTS "Users can delete their own soil types" ON public.soil_types;
CREATE POLICY "Users can delete their own soil types" ON public.soil_types FOR DELETE USING (auth.uid() = user_id);

-- Audit logs table policies
-- Users can only view their own audit logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own audit logs
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own audit logs
DROP POLICY IF EXISTS "Users can update their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can update their own audit logs" ON public.audit_logs FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own audit logs
DROP POLICY IF EXISTS "Users can delete their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can delete their own audit logs" ON public.audit_logs FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.zones TO authenticated;
GRANT ALL ON TABLE public.devices TO authenticated;
GRANT ALL ON TABLE public.sensor_data TO authenticated;
GRANT ALL ON TABLE public.watering_controls TO authenticated;
GRANT ALL ON TABLE public.watering_schedules TO authenticated;
GRANT ALL ON TABLE public.alerts TO authenticated;
GRANT ALL ON TABLE public.commands TO authenticated;
GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.devices_config TO authenticated;
GRANT ALL ON TABLE public.soil_types TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO authenticated;

-- Grant necessary permissions to service role for ESP32 integration
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE public.sensor_data TO service_role;
GRANT ALL ON TABLE public.alerts TO service_role;
GRANT ALL ON TABLE public.commands TO service_role;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.create_api_key(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_health(UUID, TEXT, INET, TEXT) TO authenticated;
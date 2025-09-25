-- Smart Garden Dashboard Database Schema
-- This file contains the complete database schema for the Smart Garden Dashboard
-- Run this in your Supabase SQL Editor to set up or update the database

-- Step 1: Drop all existing tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS public.devices_config CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.commands CASCADE;
DROP TABLE IF EXISTS public.watering_schedules CASCADE;
DROP TABLE IF EXISTS public.watering_controls CASCADE;
DROP TABLE IF EXISTS public.sensor_data CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE; -- Added profiles table
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.soil_types CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Step 2: Drop all functions
DROP FUNCTION IF EXISTS create_api_key(TEXT, TEXT);
DROP FUNCTION IF EXISTS process_sensor_data();
DROP FUNCTION IF EXISTS handle_watering_command();
DROP FUNCTION IF EXISTS process_pending_commands();
DROP FUNCTION IF EXISTS update_device_health(UUID, TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS audit_table_changes();

-- Step 3: Create tables

-- profiles table (Added)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  name text,
  updated_at timestamp with time zone,
  PRIMARY KEY (id),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- zones table
CREATE TABLE IF NOT EXISTS public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  soil_type text NOT NULL,
  moisture_threshold decimal(5,2) DEFAULT 30.0,
  pump_on boolean DEFAULT false,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  device_id text NOT NULL,
  device_type text NOT NULL DEFAULT 'esp32'::text,
  status text NOT NULL DEFAULT 'offline'::text,
  last_seen timestamp with time zone DEFAULT now(),
  ip_address inet,
  mac_address text,
  firmware_version text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (device_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- devices_config table
CREATE TABLE IF NOT EXISTS public.devices_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  reading_interval integer DEFAULT 300, -- seconds
  alert_thresholds jsonb DEFAULT '{"temperature_min": 10, "temperature_max": 35, "humidity_min": 30, "humidity_max": 80, "soil_moisture_min": 20, "soil_moisture_max": 90}'::jsonb,
  wifi_ssid text,
  wifi_password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE
);

-- sensor_data table
CREATE TABLE IF NOT EXISTS public.sensor_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  temperature decimal(5,2) NOT NULL,
  humidity decimal(5,2) NOT NULL,
  soil_moisture decimal(5,2) NOT NULL,
  light_level integer,
  ph_level decimal(4,2),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- watering_controls table
CREATE TABLE IF NOT EXISTS public.watering_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  device_id uuid,
  pump_pin integer NOT NULL,
  valve_pin integer,
  is_active boolean DEFAULT false,
  auto_mode boolean DEFAULT true,
  moisture_threshold decimal(5,2) DEFAULT 30.0,
  watering_duration integer DEFAULT 30,
  last_watered timestamp with time zone,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- watering_schedules table
CREATE TABLE IF NOT EXISTS public.watering_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  name text NOT NULL,
  cron_expression text NOT NULL,
  duration integer DEFAULT 30,
  is_active boolean DEFAULT true,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- commands table
CREATE TABLE IF NOT EXISTS public.commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  command_type text NOT NULL,
  parameters jsonb,
  status text DEFAULT 'pending',
  priority integer DEFAULT 0,
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  error_message text,
  executed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (key),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  zone text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  read boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- soil_types table
CREATE TABLE IF NOT EXISTS public.soil_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  ideal_plants jsonb NOT NULL,
  watering_tips text NOT NULL,
  amendments text NOT NULL,
  characteristics text NOT NULL,
  user_id uuid,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp timestamptz DEFAULT now(),
  old_data jsonb,
  new_data jsonb
);

-- Step 4: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
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

-- Step 5: Create Policies safely (drop if exists before creating)

-- Profiles
DROP POLICY IF EXISTS "Profiles can be viewed by owner" ON public.profiles;
CREATE POLICY "Profiles can be viewed by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles can be inserted by owner" ON public.profiles;
CREATE POLICY "Profiles can be inserted by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles can be updated by owner" ON public.profiles;
CREATE POLICY "Profiles can be updated by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles can be deleted by owner" ON public.profiles;
CREATE POLICY "Profiles can be deleted by owner" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Zones
DROP POLICY IF EXISTS "Users can view their own zones" ON public.zones;
CREATE POLICY "Users can view their own zones" ON public.zones FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own zones" ON public.zones;
CREATE POLICY "Users can insert their own zones" ON public.zones FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own zones" ON public.zones;
CREATE POLICY "Users can update their own zones" ON public.zones FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own zones" ON public.zones;
CREATE POLICY "Users can delete their own zones" ON public.zones FOR DELETE USING (auth.uid() = user_id);

-- Devices
DROP POLICY IF EXISTS "Users can view their own devices" ON public.devices;
CREATE POLICY "Users can view their own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own devices" ON public.devices;
CREATE POLICY "Users can insert their own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own devices" ON public.devices;
CREATE POLICY "Users can update their own devices" ON public.devices FOR UPDATE USING (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Users can insert their own devices config" ON public.devices_config;
CREATE POLICY "Users can insert their own devices config" ON public.devices_config FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own devices config" ON public.devices_config;
CREATE POLICY "Users can update their own devices config" ON public.devices_config FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own devices config" ON public.devices_config;
CREATE POLICY "Users can delete their own devices config" ON public.devices_config FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = devices_config.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- Sensor Data
DROP POLICY IF EXISTS "Users can view their own sensor data" ON public.sensor_data;
CREATE POLICY "Users can view their own sensor data" ON public.sensor_data FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = sensor_data.device_id 
    AND devices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users and service role can insert sensor data" ON public.sensor_data;
CREATE POLICY "Users and service role can insert sensor data" ON public.sensor_data FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = sensor_data.device_id 
    AND devices.user_id = auth.uid()
  )
  OR (SELECT auth.role() = 'service_role')
);

-- Watering Controls
DROP POLICY IF EXISTS "Users can view their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can view their own watering controls" ON public.watering_controls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can insert their own watering controls" ON public.watering_controls FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can update their own watering controls" ON public.watering_controls FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can delete their own watering controls" ON public.watering_controls FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM zones 
    WHERE zones.id = watering_controls.zone_id 
    AND zones.user_id = auth.uid()
  )
);

-- Watering Schedules
DROP POLICY IF EXISTS "Users can view their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can view their own watering schedules" ON public.watering_schedules FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can insert their own watering schedules" ON public.watering_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can update their own watering schedules" ON public.watering_schedules FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own watering schedules" ON public.watering_schedules;
CREATE POLICY "Users can delete their own watering schedules" ON public.watering_schedules FOR DELETE USING (auth.uid() = user_id);

-- Commands
DROP POLICY IF EXISTS "Users can view their own commands" ON public.commands;
CREATE POLICY "Users can view their own commands" ON public.commands FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users and service role can insert commands" ON public.commands;
CREATE POLICY "Users and service role can insert commands" ON public.commands FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
  OR (SELECT auth.role() = 'service_role')
);

DROP POLICY IF EXISTS "Users can update their own commands" ON public.commands;
CREATE POLICY "Users can update their own commands" ON public.commands FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own commands" ON public.commands;
CREATE POLICY "Users can delete their own commands" ON public.commands FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM devices 
    WHERE devices.id = commands.device_id 
    AND devices.user_id = auth.uid()
  )
);

-- API Keys
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
CREATE POLICY "Users can insert their own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Alerts
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.alerts;
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and service role can insert alerts" ON public.alerts;
CREATE POLICY "Users and service role can insert alerts" ON public.alerts FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR (SELECT auth.role() = 'service_role')
);

DROP POLICY IF EXISTS "Users can update their own alerts" ON public.alerts;
CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.alerts;
CREATE POLICY "Users can delete their own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Soil Types
DROP POLICY IF EXISTS "Anyone can view public soil types" ON public.soil_types;
CREATE POLICY "Anyone can view public soil types" ON public.soil_types FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own soil types" ON public.soil_types;
CREATE POLICY "Users can insert their own soil types" ON public.soil_types FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own soil types" ON public.soil_types;
CREATE POLICY "Users can update their own soil types" ON public.soil_types FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own soil types" ON public.soil_types;
CREATE POLICY "Users can delete their own soil types" ON public.soil_types FOR DELETE USING (auth.uid() = user_id);

-- Audit Logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can update their own audit logs" ON public.audit_logs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can delete their own audit logs" ON public.audit_logs FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Insert default soil types if not already present
INSERT INTO public.soil_types (type, ideal_plants, watering_tips, amendments, characteristics, user_id)
SELECT 'Loam soil', '["Tomatoes", "Peppers", "Cucumbers", "Zucchini", "Roses"]'::jsonb,
       'Water deeply but less frequently to encourage root growth.',
       'Add compost yearly to maintain organic content.',
       'Equal parts of sand, silt, and clay. Excellent drainage and moisture retention.',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM public.soil_types WHERE type = 'Loam soil');

INSERT INTO public.soil_types (type, ideal_plants, watering_tips, amendments, characteristics, user_id)
SELECT 'Sandy soil', '["Lavender", "Rosemary", "Cacti", "Sedums", "Zinnias"]'::jsonb,
       'Water more frequently but in smaller amounts.',
       'Add compost and mulch to improve water retention.',
       'Gritty texture with large particles. Drains quickly but retains little moisture.',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM public.soil_types WHERE type = 'Sandy soil');

INSERT INTO public.soil_types (type, ideal_plants, watering_tips, amendments, characteristics, user_id)
SELECT 'Potting Mix', '["Basil", "Mint", "Parsley", "Thyme", "Cilantro"]'::jsonb,
       'Check moisture level daily, water when top inch feels dry.',
       'Replace or refresh annually with fresh mix.',
       'Lightweight and sterile. Good drainage with adequate water retention.',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM public.soil_types WHERE type = 'Potting Mix');

INSERT INTO public.soil_types (type, ideal_plants, watering_tips, amendments, characteristics, user_id)
SELECT 'Peat soil', '["Ferns", "Orchids", "African Violets", "Peace Lily", "Spider Plant"]'::jsonb,
       'Water thoroughly when top layer becomes dry, avoid overwatering.',
       'Mix with perlite or sand to improve drainage.',
       'Dark, rich organic material. Excellent water retention but can become compacted.',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM public.soil_types WHERE type = 'Peat soil');

-- Step 7: Create functions

-- create_api_key
CREATE OR REPLACE FUNCTION create_api_key(key_name TEXT, key_value TEXT) RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  new_api_key_id UUID;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  INSERT INTO public.api_keys (name, key, user_id) VALUES (key_name, key_value, current_user_id)
    RETURNING id INTO new_api_key_id;
  
  SELECT jsonb_build_object('id', id, 'name', name, 'key', key, 'created_at', created_at, 'user_id', user_id)
    INTO result FROM public.api_keys WHERE id = new_api_key_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- process_sensor_data
CREATE OR REPLACE FUNCTION process_sensor_data() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.soil_moisture < 25 THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id)
    SELECT 'warning', z.name, 'Soil moisture critically low (' || NEW.soil_moisture || '%)', 'high', NEW.user_id
    FROM public.zones z WHERE z.id = NEW.zone_id;
  ELSIF NEW.soil_moisture < 30 THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id)
    SELECT 'warning', z.name, 'Soil moisture below optimal levels (' || NEW.soil_moisture || '%)', 'medium', NEW.user_id
    FROM public.zones z WHERE z.id = NEW.zone_id;
  END IF;

  IF NEW.temperature > 30 THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id)
    SELECT 'warning', z.name, 'Temperature too high (' || NEW.temperature || '°C)', 'medium', NEW.user_id
    FROM public.zones z WHERE z.id = NEW.zone_id;
  END IF;

  INSERT INTO public.commands (device_id, command_type, parameters, user_id)
  SELECT wc.device_id, 'check_watering', 
         jsonb_build_object('moisture', NEW.soil_moisture, 'threshold', wc.moisture_threshold),
         NEW.user_id
  FROM public.watering_controls wc
  WHERE wc.zone_id = NEW.zone_id AND wc.auto_mode = true AND wc.is_active = true AND NEW.soil_moisture < wc.moisture_threshold;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- handle_watering_command
CREATE OR REPLACE FUNCTION handle_watering_command() RETURNS TRIGGER AS $$
BEGIN
  -- Fixed the comparison to properly cast to decimal
  IF NEW.command_type = 'check_watering' AND (NEW.parameters->>'moisture')::decimal < (NEW.parameters->>'threshold')::decimal THEN
    INSERT INTO public.commands (device_id, command_type, parameters, user_id)
    VALUES (NEW.device_id, 'pump_on', jsonb_build_object('duration', 
      (SELECT watering_duration FROM public.watering_controls WHERE device_id = NEW.device_id LIMIT 1)),
      NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- process_pending_commands
CREATE OR REPLACE FUNCTION process_pending_commands() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' AND NEW.retry_count < 3 THEN
    INSERT INTO public.commands (device_id, command_type, parameters, status, user_id, retry_count, last_retry_at)
    VALUES (NEW.device_id, NEW.command_type, NEW.parameters, 'pending', NEW.user_id, NEW.retry_count + 1, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- update_device_health
CREATE OR REPLACE FUNCTION update_device_health(p_device_id UUID, p_status TEXT DEFAULT 'online', p_ip_address INET DEFAULT NULL, p_firmware_version TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  UPDATE public.devices SET
    status = p_status,
    last_seen = NOW(),
    ip_address = COALESCE(p_ip_address, ip_address),
    firmware_version = COALESCE(p_firmware_version, firmware_version)
  WHERE id = p_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- audit_table_changes
CREATE OR REPLACE FUNCTION audit_table_changes() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (table_name, operation, record_id, user_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION create_api_key(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_device_health(UUID, TEXT, INET, TEXT) TO authenticated;

-- Grant necessary permissions to service role for ESP32 integration
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE sensor_data TO service_role;
GRANT ALL ON TABLE alerts TO service_role;
GRANT ALL ON TABLE commands TO service_role;

-- Step 9: Create triggers

-- sensor_data trigger
DROP TRIGGER IF EXISTS sensor_data_trigger ON public.sensor_data;
CREATE TRIGGER sensor_data_trigger AFTER INSERT ON public.sensor_data FOR EACH ROW EXECUTE FUNCTION process_sensor_data();

-- commands trigger
DROP TRIGGER IF EXISTS watering_command_trigger ON public.commands;
CREATE TRIGGER watering_command_trigger AFTER INSERT ON public.commands FOR EACH ROW EXECUTE FUNCTION handle_watering_command();

-- retry failed commands trigger
DROP TRIGGER IF EXISTS retry_failed_commands ON public.commands;
CREATE TRIGGER retry_failed_commands AFTER UPDATE ON public.commands FOR EACH ROW WHEN (NEW.status = 'failed') EXECUTE FUNCTION process_pending_commands();

-- Audit triggers for all tables
-- Zones audit trigger
DROP TRIGGER IF EXISTS zones_audit_trigger ON public.zones;
CREATE TRIGGER zones_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.zones FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Devices audit trigger
DROP TRIGGER IF EXISTS devices_audit_trigger ON public.devices;
CREATE TRIGGER devices_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.devices FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Devices Config audit trigger
DROP TRIGGER IF EXISTS devices_config_audit_trigger ON public.devices_config;
CREATE TRIGGER devices_config_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.devices_config FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Sensor Data audit trigger
DROP TRIGGER IF EXISTS sensor_data_audit_trigger ON public.sensor_data;
CREATE TRIGGER sensor_data_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.sensor_data FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Watering Controls audit trigger
DROP TRIGGER IF EXISTS watering_controls_audit_trigger ON public.watering_controls;
CREATE TRIGGER watering_controls_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.watering_controls FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Watering Schedules audit trigger
DROP TRIGGER IF EXISTS watering_schedules_audit_trigger ON public.watering_schedules;
CREATE TRIGGER watering_schedules_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.watering_schedules FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Commands audit trigger
DROP TRIGGER IF EXISTS commands_audit_trigger ON public.commands;
CREATE TRIGGER commands_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.commands FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- API Keys audit trigger
DROP TRIGGER IF EXISTS api_keys_audit_trigger ON public.api_keys;
CREATE TRIGGER api_keys_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Alerts audit trigger
DROP TRIGGER IF EXISTS alerts_audit_trigger ON public.alerts;
CREATE TRIGGER alerts_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.alerts FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Soil Types audit trigger
DROP TRIGGER IF EXISTS soil_types_audit_trigger ON public.soil_types;
CREATE TRIGGER soil_types_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.soil_types FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Step 10: Enable realtime for tables
ALTER TABLE public.sensor_data REPLICA IDENTITY FULL;
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.commands REPLICA IDENTITY FULL;
ALTER TABLE public.zones REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

-- Step 11: Verify setup
SELECT 'DATABASE SETUP COMPLETE' AS status;
SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';
SELECT COUNT(*) AS function_count FROM information_schema.routines WHERE routine_schema = 'public';
SELECT COUNT(*) AS trigger_count FROM information_schema.triggers WHERE trigger_schema = 'public';
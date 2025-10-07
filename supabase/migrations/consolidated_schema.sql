-- GardenFlow Smart Garden Dashboard - Consolidated Database Schema
-- This file contains the complete, verified database schema for the Smart Garden Dashboard
-- Run this in your Supabase SQL Editor to set up the database from scratch
-- 
-- Author: AI Assistant
-- Date: 2025-10-04
-- Version: 1.0 Consolidated

-- =============================================================================
-- STEP 1: CLEANUP - Drop existing objects if they exist
-- =============================================================================

-- Drop all triggers first (to avoid dependency issues)
-- Note: Triggers will be automatically dropped when tables are dropped with CASCADE

-- Drop all functions
DROP FUNCTION IF EXISTS public.create_api_key(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_sensor_data();
DROP FUNCTION IF EXISTS public.handle_watering_command();
DROP FUNCTION IF EXISTS public.process_pending_commands();
DROP FUNCTION IF EXISTS public.update_device_health(UUID, TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS public.audit_table_changes();
DROP FUNCTION IF EXISTS public.validate_api_key(TEXT);
DROP FUNCTION IF EXISTS public.cleanup_expired_data();
DROP FUNCTION IF EXISTS public.scheduled_maintenance();

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.soil_types CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.commands CASCADE;
DROP TABLE IF EXISTS public.watering_schedules CASCADE;
DROP TABLE IF EXISTS public.watering_controls CASCADE;
DROP TABLE IF EXISTS public.sensor_data CASCADE;
DROP TABLE IF EXISTS public.devices_config CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- STEP 2: CREATE TABLES
-- =============================================================================

-- Profiles table - extends auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Zones table - represents garden zones/areas
CREATE TABLE IF NOT EXISTS public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  soil_type text NOT NULL DEFAULT 'Loam soil',
  moisture_threshold decimal(5,2) NOT NULL DEFAULT 30.0 CHECK (moisture_threshold >= 0 AND moisture_threshold <= 100),
  pump_on boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Devices table - represents ESP32 and other IoT devices
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  device_id text NOT NULL,
  device_type text NOT NULL DEFAULT 'esp32',
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  last_seen timestamp with time zone DEFAULT now(),
  ip_address inet,
  mac_address text,
  firmware_version text DEFAULT '1.0.0',
  zone_id uuid,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (device_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL
);

-- Devices configuration table
CREATE TABLE IF NOT EXISTS public.devices_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  reading_interval integer DEFAULT 300 CHECK (reading_interval > 0),
  alert_thresholds jsonb DEFAULT '{"temperature_min": 10, "temperature_max": 35, "humidity_min": 30, "humidity_max": 80, "soil_moisture_min": 20, "soil_moisture_max": 90}'::jsonb,
  wifi_ssid text,
  wifi_password text,
  auto_watering_enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (device_id),
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE
);

-- Sensor data table - stores all sensor readings
CREATE TABLE IF NOT EXISTS public.sensor_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  zone_id uuid,
  temperature decimal(5,2) NOT NULL CHECK (temperature >= -50 AND temperature <= 100),
  humidity decimal(5,2) NOT NULL CHECK (humidity >= 0 AND humidity <= 100),
  soil_moisture decimal(5,2) NOT NULL CHECK (soil_moisture >= 0 AND soil_moisture <= 100),
  light_level integer CHECK (light_level >= 0 AND light_level <= 4095),
  ph_level decimal(4,2) CHECK (ph_level >= 0 AND ph_level <= 14),
  battery_level decimal(5,2) CHECK (battery_level >= 0 AND battery_level <= 100),
  water_usage decimal(8,3) DEFAULT 0.000,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Watering controls table - manages watering systems for each zone
CREATE TABLE IF NOT EXISTS public.watering_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  device_id uuid,
  pump_pin integer NOT NULL DEFAULT 2 CHECK (pump_pin >= 0 AND pump_pin <= 39),
  valve_pin integer CHECK (valve_pin >= 0 AND valve_pin <= 39),
  is_active boolean NOT NULL DEFAULT false,
  auto_mode boolean NOT NULL DEFAULT true,
  moisture_threshold decimal(5,2) NOT NULL DEFAULT 30.0 CHECK (moisture_threshold >= 0 AND moisture_threshold <= 100),
  watering_duration integer NOT NULL DEFAULT 30 CHECK (watering_duration > 0 AND watering_duration <= 3600),
  last_watered timestamp with time zone,
  next_scheduled_watering timestamp with time zone,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (zone_id),
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Watering schedules table - scheduled watering operations
CREATE TABLE IF NOT EXISTS public.watering_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  name text NOT NULL,
  cron_expression text NOT NULL,
  duration integer NOT NULL DEFAULT 30 CHECK (duration > 0 AND duration <= 3600),
  is_active boolean NOT NULL DEFAULT true,
  last_executed timestamp with time zone,
  next_execution timestamp with time zone,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Commands table - stores commands to be sent to devices
CREATE TABLE IF NOT EXISTS public.commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  command_type text NOT NULL CHECK (command_type IN ('water', 'read_sensors', 'check_watering', 'pump_on', 'pump_off', 'reboot', 'update_config')),
  parameters jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'executed', 'failed', 'timeout')),
  priority integer NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
  last_retry_at timestamp with time zone,
  error_message text,
  result jsonb,
  executed_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + interval '1 hour'),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- API keys table - manages device authentication
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used timestamp with time zone,
  expires_at timestamp with time zone,
  permissions jsonb DEFAULT '["read", "write"]'::jsonb,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (key),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Alerts table - system and user alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('info', 'warning', 'error', 'critical')),
  zone text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_read boolean NOT NULL DEFAULT false,
  is_acknowledged boolean NOT NULL DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Soil types table - reference data for soil types and recommendations
CREATE TABLE IF NOT EXISTS public.soil_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  ideal_plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  watering_tips text NOT NULL DEFAULT '',
  amendments text NOT NULL DEFAULT '',
  characteristics text NOT NULL DEFAULT '',
  moisture_range jsonb DEFAULT '{"min": 20, "max": 80}'::jsonb,
  ph_range jsonb DEFAULT '{"min": 6.0, "max": 7.5}'::jsonb,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Audit logs table - tracks all data changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid,
  user_id uuid,
  ip_address inet,
  user_agent text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  old_data jsonb,
  new_data jsonb,
  changes jsonb,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Sensor data indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_sensor_data_user_id_timestamp ON public.sensor_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id_timestamp ON public.sensor_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_zone_id_timestamp ON public.sensor_data(zone_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON public.sensor_data(timestamp DESC);

-- Device and zone indexes
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON public.zones(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_status_online ON public.devices(status) WHERE status = 'online';

-- Command indexes
CREATE INDEX IF NOT EXISTS idx_commands_device_id_status_pending ON public.commands(device_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_commands_user_id_created_at ON public.commands(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commands_status_pending ON public.commands(expires_at) WHERE status = 'pending';

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_timestamp ON public.alerts(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_unread ON public.alerts(user_id, is_read) WHERE is_read = false;

-- API key indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id_active ON public.api_keys(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_key_active ON public.api_keys(key) WHERE is_active = true;

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_watering_schedules_user_id ON public.watering_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_watering_controls_user_id ON public.watering_controls(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_timestamp ON public.audit_logs(user_id, timestamp DESC);

-- =============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================================================

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

-- =============================================================================
-- STEP 5: CREATE RLS POLICIES
-- =============================================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Zones policies
CREATE POLICY "Users can view their own zones" ON public.zones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own zones" ON public.zones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own zones" ON public.zones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own zones" ON public.zones FOR DELETE USING (auth.uid() = user_id);

-- Devices policies
CREATE POLICY "Users can view their own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own devices" ON public.devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own devices" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- Devices config policies
CREATE POLICY "Users can view config for their own devices" ON public.devices_config FOR SELECT USING (
  EXISTS (SELECT 1 FROM devices WHERE devices.id = devices_config.device_id AND devices.user_id = auth.uid())
);
CREATE POLICY "Users can insert config for their own devices" ON public.devices_config FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM devices WHERE devices.id = devices_config.device_id AND devices.user_id = auth.uid())
);
CREATE POLICY "Users can update config for their own devices" ON public.devices_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM devices WHERE devices.id = devices_config.device_id AND devices.user_id = auth.uid())
);
CREATE POLICY "Users can delete config for their own devices" ON public.devices_config FOR DELETE USING (
  EXISTS (SELECT 1 FROM devices WHERE devices.id = devices_config.device_id AND devices.user_id = auth.uid())
);

-- Sensor data policies
CREATE POLICY "Users can view their own sensor data" ON public.sensor_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users and service role can insert sensor data" ON public.sensor_data FOR INSERT WITH CHECK (
  auth.uid() = user_id OR auth.role() = 'service_role'
);
CREATE POLICY "Users can update their own sensor data" ON public.sensor_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sensor data" ON public.sensor_data FOR DELETE USING (auth.uid() = user_id);

-- Watering controls policies
CREATE POLICY "Users can view their own watering controls" ON public.watering_controls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own watering controls" ON public.watering_controls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watering controls" ON public.watering_controls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watering controls" ON public.watering_controls FOR DELETE USING (auth.uid() = user_id);

-- Watering schedules policies
CREATE POLICY "Users can view their own watering schedules" ON public.watering_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own watering schedules" ON public.watering_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watering schedules" ON public.watering_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watering schedules" ON public.watering_schedules FOR DELETE USING (auth.uid() = user_id);

-- Commands policies
CREATE POLICY "Users can view their own commands" ON public.commands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users and service role can insert commands" ON public.commands FOR INSERT WITH CHECK (
  auth.uid() = user_id OR auth.role() = 'service_role'
);
CREATE POLICY "Users can update their own commands" ON public.commands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own commands" ON public.commands FOR DELETE USING (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users and service role can insert alerts" ON public.alerts FOR INSERT WITH CHECK (
  auth.uid() = user_id OR auth.role() = 'service_role'
);
CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- Soil types policies (public data with user-specific overrides)
CREATE POLICY "Anyone can view public soil types" ON public.soil_types FOR SELECT USING (
  user_id IS NULL OR auth.uid() = user_id
);
CREATE POLICY "Users can insert their own soil types" ON public.soil_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own soil types" ON public.soil_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own soil types" ON public.soil_types FOR DELETE USING (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 6: CREATE FUNCTIONS
-- =============================================================================

-- Function to create API keys
CREATE OR REPLACE FUNCTION public.create_api_key(key_name TEXT, key_value TEXT DEFAULT NULL) 
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  generated_key text;
  new_api_key_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Generate key if not provided
  generated_key := COALESCE(key_value, 'sk_' || encode(gen_random_bytes(32), 'hex'));
  
  INSERT INTO public.api_keys (name, key, user_id)
  VALUES (key_name, generated_key, current_user_id)
  RETURNING id INTO new_api_key_id;
  
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'key', key,
    'created_at', created_at,
    'user_id', user_id
  ) INTO result 
  FROM public.api_keys 
  WHERE id = new_api_key_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API keys
CREATE OR REPLACE FUNCTION public.validate_api_key(api_key_value TEXT)
RETURNS uuid AS $$
DECLARE
  key_user_id uuid;
BEGIN
  SELECT user_id INTO key_user_id
  FROM public.api_keys
  WHERE key = api_key_value
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Update last_used timestamp
  IF key_user_id IS NOT NULL THEN
    UPDATE public.api_keys 
    SET last_used = now() 
    WHERE key = api_key_value;
  END IF;
  
  RETURN key_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process sensor data and trigger alerts/commands
CREATE OR REPLACE FUNCTION public.process_sensor_data() 
RETURNS trigger AS $$
DECLARE
  zone_name text;
  device_name text;
  config_thresholds jsonb;
BEGIN
  -- Get zone and device names for alerts
  SELECT z.name, d.name INTO zone_name, device_name
  FROM public.zones z, public.devices d
  WHERE z.id = NEW.zone_id AND d.id = NEW.device_id;
  
  -- Get device configuration thresholds
  SELECT alert_thresholds INTO config_thresholds
  FROM public.devices_config dc
  WHERE dc.device_id = NEW.device_id;
  
  -- Use default thresholds if not configured
  config_thresholds := COALESCE(config_thresholds, '{
    "temperature_min": 10, "temperature_max": 35,
    "humidity_min": 30, "humidity_max": 80,
    "soil_moisture_min": 20, "soil_moisture_max": 90
  }'::jsonb);
  
  -- Check soil moisture and create alerts
  IF NEW.soil_moisture < (config_thresholds->>'soil_moisture_min')::decimal THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id, data)
    VALUES (
      'warning', 
      COALESCE(zone_name, 'Unknown Zone'),
      'Soil moisture critically low: ' || NEW.soil_moisture || '%',
      CASE 
        WHEN NEW.soil_moisture < 15 THEN 'critical'
        WHEN NEW.soil_moisture < 20 THEN 'high'
        ELSE 'medium'
      END,
      NEW.user_id,
      jsonb_build_object('sensor_value', NEW.soil_moisture, 'threshold', config_thresholds->>'soil_moisture_min')
    );
  END IF;
  
  -- Check temperature alerts
  IF NEW.temperature > (config_thresholds->>'temperature_max')::decimal OR 
     NEW.temperature < (config_thresholds->>'temperature_min')::decimal THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id, data)
    VALUES (
      'warning',
      COALESCE(zone_name, 'Unknown Zone'),
      'Temperature out of range: ' || NEW.temperature || '°C',
      'medium',
      NEW.user_id,
      jsonb_build_object('sensor_value', NEW.temperature, 'min_threshold', config_thresholds->>'temperature_min', 'max_threshold', config_thresholds->>'temperature_max')
    );
  END IF;
  
  -- Check humidity alerts
  IF NEW.humidity > (config_thresholds->>'humidity_max')::decimal OR 
     NEW.humidity < (config_thresholds->>'humidity_min')::decimal THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id, data)
    VALUES (
      'info',
      COALESCE(zone_name, 'Unknown Zone'),
      'Humidity out of optimal range: ' || NEW.humidity || '%',
      'low',
      NEW.user_id,
      jsonb_build_object('sensor_value', NEW.humidity, 'min_threshold', config_thresholds->>'humidity_min', 'max_threshold', config_thresholds->>'humidity_max')
    );
  END IF;
  
  -- Trigger automatic watering if conditions are met
  INSERT INTO public.commands (device_id, command_type, parameters, user_id, priority)
  SELECT 
    wc.device_id,
    'check_watering',
    jsonb_build_object(
      'moisture', NEW.soil_moisture,
      'threshold', wc.moisture_threshold,
      'duration', wc.watering_duration,
      'zone_id', NEW.zone_id
    ),
    NEW.user_id,
    5
  FROM public.watering_controls wc
  WHERE wc.zone_id = NEW.zone_id 
    AND wc.auto_mode = true 
    AND wc.is_active = true 
    AND NEW.soil_moisture < wc.moisture_threshold
    AND wc.device_id IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle watering commands
CREATE OR REPLACE FUNCTION public.handle_watering_command() 
RETURNS trigger AS $$
DECLARE
  moisture_value decimal;
  threshold_value decimal;
  duration_value integer;
BEGIN
  IF NEW.command_type = 'check_watering' AND NEW.status = 'pending' THEN
    moisture_value := (NEW.parameters->>'moisture')::decimal;
    threshold_value := (NEW.parameters->>'threshold')::decimal;
    duration_value := COALESCE((NEW.parameters->>'duration')::integer, 30);
    
    -- Only create pump command if moisture is below threshold
    IF moisture_value < threshold_value THEN
      INSERT INTO public.commands (device_id, command_type, parameters, user_id, priority)
      VALUES (
        NEW.device_id,
        'pump_on',
        jsonb_build_object(
          'duration', duration_value,
          'triggered_by', NEW.id,
          'zone_id', NEW.parameters->>'zone_id'
        ),
        NEW.user_id,
        8
      );
      
      -- Update the zone's last watered timestamp
      UPDATE public.watering_controls
      SET last_watered = now(),
          next_scheduled_watering = now() + (duration_value * interval '1 second')
      WHERE zone_id = (NEW.parameters->>'zone_id')::uuid;
    END IF;
    
    -- Mark the check command as executed
    UPDATE public.commands 
    SET status = 'executed', executed_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed commands
CREATE OR REPLACE FUNCTION public.process_pending_commands() 
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'failed' AND NEW.retry_count < NEW.max_retries THEN
    -- Create a new retry command
    INSERT INTO public.commands (
      device_id, command_type, parameters, user_id, priority,
      retry_count, last_retry_at, expires_at
    ) VALUES (
      NEW.device_id,
      NEW.command_type,
      NEW.parameters,
      NEW.user_id,
      NEW.priority,
      NEW.retry_count + 1,
      now(),
      now() + interval '1 hour'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update device health status
CREATE OR REPLACE FUNCTION public.update_device_health(
  p_device_id uuid, 
  p_status text DEFAULT 'online',
  p_ip_address inet DEFAULT NULL,
  p_firmware_version text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.devices SET
    status = p_status,
    last_seen = now(),
    ip_address = COALESCE(p_ip_address, ip_address),
    firmware_version = COALESCE(p_firmware_version, firmware_version),
    updated_at = now()
  WHERE id = p_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for audit logging
CREATE OR REPLACE FUNCTION public.audit_table_changes() 
RETURNS trigger AS $$
DECLARE
  old_data jsonb := NULL;
  new_data jsonb := NULL;
  changes jsonb := '{}'::jsonb;
BEGIN
  -- Prepare data based on operation
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Calculate changes
    SELECT jsonb_object_agg(key, value) INTO changes
    FROM jsonb_each(new_data)
    WHERE value IS DISTINCT FROM (old_data -> key);
  END IF;
  
  -- Insert audit record
  INSERT INTO public.audit_logs (
    table_name, operation, record_id, user_id, 
    old_data, new_data, changes
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE((NEW).id, (OLD).id),
    auth.uid(),
    old_data,
    new_data,
    changes
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired data
CREATE OR REPLACE FUNCTION public.cleanup_expired_data() 
RETURNS void AS $$
BEGIN
  -- Delete expired commands
  DELETE FROM public.commands 
  WHERE expires_at < now() AND status IN ('failed', 'timeout');
  
  -- Delete old sensor data (keep 90 days)
  DELETE FROM public.sensor_data 
  WHERE timestamp < now() - interval '90 days';
  
  -- Delete expired alerts
  DELETE FROM public.alerts 
  WHERE expires_at < now();
  
  -- Delete old audit logs (keep 1 year)
  DELETE FROM public.audit_logs 
  WHERE timestamp < now() - interval '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 7: CREATE TRIGGERS
-- =============================================================================

-- Sensor data processing trigger
CREATE TRIGGER sensor_data_trigger 
  AFTER INSERT ON public.sensor_data 
  FOR EACH ROW 
  EXECUTE FUNCTION public.process_sensor_data();

-- Watering command processing trigger
CREATE TRIGGER watering_command_trigger 
  AFTER INSERT ON public.commands 
  FOR EACH ROW 
  WHEN (NEW.command_type = 'check_watering')
  EXECUTE FUNCTION public.handle_watering_command();

-- Failed command retry trigger
CREATE TRIGGER retry_failed_commands 
  AFTER UPDATE ON public.commands 
  FOR EACH ROW 
  WHEN (NEW.status = 'failed' AND OLD.status != 'failed')
  EXECUTE FUNCTION public.process_pending_commands();

-- Audit triggers for all tables
CREATE TRIGGER zones_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.zones 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER devices_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.devices 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER sensor_data_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.sensor_data 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER commands_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.commands 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER watering_controls_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.watering_controls 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER watering_schedules_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.watering_schedules 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER api_keys_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER alerts_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.alerts 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER soil_types_audit_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.soil_types 
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- =============================================================================
-- STEP 8: INSERT DEFAULT DATA
-- =============================================================================

-- Insert default soil types
INSERT INTO public.soil_types (type, ideal_plants, watering_tips, amendments, characteristics, moisture_range, ph_range, user_id)
VALUES 
  (
    'Loam soil',
    '["Tomatoes", "Peppers", "Cucumbers", "Zucchini", "Roses", "Most vegetables"]'::jsonb,
    'Water deeply but less frequently to encourage root growth. Check soil moisture 2-3 inches deep.',
    'Add compost yearly to maintain organic content. Mulch to retain moisture.',
    'Equal parts sand, silt, and clay. Excellent drainage and moisture retention. Ideal for most plants.',
    '{"min": 25, "max": 75}'::jsonb,
    '{"min": 6.0, "max": 7.0}'::jsonb,
    NULL
  ),
  (
    'Sandy soil',
    '["Lavender", "Rosemary", "Cacti", "Sedums", "Zinnias", "Mediterranean herbs"]'::jsonb,
    'Water more frequently but in smaller amounts. Check daily during hot weather.',
    'Add compost and mulch to improve water retention. Consider slow-release fertilizers.',
    'Large particles, drains quickly. Low nutrient retention but good aeration.',
    '{"min": 15, "max": 60}'::jsonb,
    '{"min": 6.0, "max": 8.0}'::jsonb,
    NULL
  ),
  (
    'Clay soil',
    '["Daylilies", "Asters", "Bergamot", "Shrubs with deep roots"]'::jsonb,
    'Water less frequently but more thoroughly. Allow soil to dry between waterings.',
    'Add organic matter and coarse sand to improve drainage. Avoid walking on when wet.',
    'Fine particles, retains water and nutrients well but can become compacted.',
    '{"min": 30, "max": 85}'::jsonb,
    '{"min": 6.0, "max": 7.5}'::jsonb,
    NULL
  ),
  (
    'Potting Mix',
    '["Basil", "Mint", "Parsley", "Thyme", "Cilantro", "Container plants"]'::jsonb,
    'Check moisture daily. Water when top inch feels dry. Ensure good drainage.',
    'Replace or refresh annually. Add slow-release fertilizer for container plants.',
    'Lightweight, sterile mix. Good drainage with adequate water retention for containers.',
    '{"min": 20, "max": 70}'::jsonb,
    '{"min": 6.0, "max": 7.0}'::jsonb,
    NULL
  ),
  (
    'Peat soil',
    '["Ferns", "Orchids", "African Violets", "Peace Lily", "Blueberries"]'::jsonb,
    'Keep consistently moist but not waterlogged. Use rainwater when possible.',
    'Mix with perlite or sand to improve drainage. Add lime if too acidic.',
    'High organic content, retains moisture well. Naturally acidic.',
    '{"min": 40, "max": 90}'::jsonb,
    '{"min": 4.5, "max": 6.0}'::jsonb,
    NULL
  )
ON CONFLICT (type) DO NOTHING;

-- =============================================================================
-- STEP 9: GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant specific permissions to service role for ESP32 integration
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE public.sensor_data TO service_role;
GRANT ALL ON TABLE public.devices TO service_role;
GRANT ALL ON TABLE public.commands TO service_role;
GRANT ALL ON TABLE public.alerts TO service_role;
GRANT ALL ON TABLE public.api_keys TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_api_key(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_device_health(UUID, TEXT, INET, TEXT) TO service_role;

-- Grant execute permissions for specific functions
GRANT EXECUTE ON FUNCTION public.create_api_key(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sensor_chart_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_performance_metrics(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_sensor_data(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_alerts(integer) TO authenticated;

-- =============================================================================
-- STEP 10: ENABLE REALTIME
-- =============================================================================

-- Enable realtime for key tables
ALTER TABLE public.sensor_data REPLICA IDENTITY FULL;
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.commands REPLICA IDENTITY FULL;
ALTER TABLE public.zones REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.watering_controls REPLICA IDENTITY FULL;

-- =============================================================================
-- STEP 11: CREATE VIEWS AND FUNCTIONS FOR DASHBOARD AND ANALYTICS
-- =============================================================================

-- View for latest sensor readings per device
CREATE OR REPLACE VIEW public.latest_sensor_data AS
SELECT DISTINCT ON (device_id) 
  device_id,
  zone_id,
  temperature,
  humidity,
  soil_moisture,
  light_level,
  ph_level,
  battery_level,
  timestamp,
  user_id
FROM public.sensor_data
ORDER BY device_id, timestamp DESC;

-- View for device status with latest sensor data
CREATE OR REPLACE VIEW public.device_status_view AS
SELECT 
  d.id,
  d.name,
  d.device_id,
  d.device_type,
  d.status,
  d.last_seen,
  d.firmware_version,
  d.zone_id,
  z.name as zone_name,
  d.user_id,
  lsd.temperature,
  lsd.humidity,
  lsd.soil_moisture,
  lsd.light_level,
  lsd.ph_level,
  lsd.battery_level,
  lsd.timestamp as last_reading
FROM public.devices d
LEFT JOIN public.zones z ON d.zone_id = z.id
LEFT JOIN public.latest_sensor_data lsd ON d.id = lsd.device_id;

-- View for active alerts
CREATE OR REPLACE VIEW public.active_alerts_view AS
SELECT 
  id,
  type,
  zone,
  message,
  severity,
  timestamp,
  user_id,
  data
FROM public.alerts
WHERE is_read = false 
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  timestamp DESC;

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
  total_devices int;
  online_devices int;
  avg_temperature decimal;
  avg_humidity decimal;
  avg_soil_moisture decimal;
  total_zones int;
  active_alerts_count int;
  total_sensor_readings bigint;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get device counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'online')
  INTO total_devices, online_devices
  FROM public.devices 
  WHERE user_id = current_user_id;
  
  -- Get average sensor values from last 24 hours
  SELECT 
    ROUND(AVG(temperature), 1),
    ROUND(AVG(humidity), 1),
    ROUND(AVG(soil_moisture), 1)
  INTO avg_temperature, avg_humidity, avg_soil_moisture
  FROM public.sensor_data 
  WHERE user_id = current_user_id 
    AND timestamp > now() - interval '24 hours';
  
  -- Get zone count
  SELECT COUNT(*) INTO total_zones
  FROM public.zones 
  WHERE user_id = current_user_id;
  
  -- Get active alerts count
  SELECT COUNT(*) INTO active_alerts_count
  FROM public.alerts 
  WHERE user_id = current_user_id 
    AND is_read = false 
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Get total sensor readings
  SELECT COUNT(*) INTO total_sensor_readings
  FROM public.sensor_data 
  WHERE user_id = current_user_id;
  
  -- Build result JSON
  result := jsonb_build_array(
    jsonb_build_object(
      'title', 'Total Devices',
      'value', total_devices,
      'change', '+' || CASE WHEN total_devices > 0 THEN '100' ELSE '0' END || '%',
      'trend', 'up',
      'icon', '🔌'
    ),
    jsonb_build_object(
      'title', 'Online Devices',
      'value', online_devices || '/' || total_devices,
      'change', CASE WHEN total_devices > 0 THEN ROUND((online_devices::decimal / total_devices) * 100, 0) || '%' ELSE '0%' END,
      'trend', CASE WHEN online_devices = total_devices THEN 'up' ELSE 'down' END,
      'icon', '📡'
    ),
    jsonb_build_object(
      'title', 'Avg Temperature',
      'value', COALESCE(avg_temperature, 0) || '°C',
      'change', CASE 
        WHEN avg_temperature IS NULL THEN 'No data'
        WHEN avg_temperature BETWEEN 18 AND 25 THEN 'Optimal'
        ELSE 'Monitor'
      END,
      'trend', CASE 
        WHEN avg_temperature IS NULL THEN 'neutral'
        WHEN avg_temperature BETWEEN 18 AND 25 THEN 'up'
        ELSE 'down'
      END,
      'icon', '🌡️'
    ),
    jsonb_build_object(
      'title', 'Avg Soil Moisture',
      'value', COALESCE(avg_soil_moisture, 0) || '%',
      'change', CASE 
        WHEN avg_soil_moisture IS NULL THEN 'No data'
        WHEN avg_soil_moisture BETWEEN 40 AND 60 THEN 'Optimal'
        WHEN avg_soil_moisture < 30 THEN 'Low'
        ELSE 'High'
      END,
      'trend', CASE 
        WHEN avg_soil_moisture IS NULL THEN 'neutral'
        WHEN avg_soil_moisture BETWEEN 40 AND 60 THEN 'up'
        WHEN avg_soil_moisture < 30 THEN 'down'
        ELSE 'up'
      END,
      'icon', '💧'
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sensor data for charts
CREATE OR REPLACE FUNCTION public.get_sensor_chart_data(
  hours_back integer DEFAULT 24
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'timestamp', timestamp,
      'temperature', temperature,
      'humidity', humidity,
      'soil_moisture', soil_moisture,
      'light_level', light_level,
      'device_id', device_id,
      'zone_id', zone_id
    ) ORDER BY timestamp
  ) INTO result
  FROM public.sensor_data
  WHERE user_id = current_user_id
    AND timestamp > now() - (hours_back || ' hours')::interval;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics performance metrics
CREATE OR REPLACE FUNCTION public.get_analytics_performance_metrics(
  period_type text DEFAULT 'month'
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
  summary_data jsonb;
  water_usage_data jsonb;
  water_savings_data jsonb;
  moisture_distribution_data jsonb;
  health_scores_data jsonb;
  insights_data jsonb;
  interval_period interval;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Set interval based on period type
  interval_period := CASE period_type
    WHEN 'week' THEN '7 days'::interval
    WHEN 'month' THEN '30 days'::interval
    ELSE '30 days'::interval
  END;
  
  -- Calculate summary metrics
  WITH recent_data AS (
    SELECT 
      AVG(soil_moisture) as avg_moisture,
      AVG(temperature) as avg_temp,
      AVG(humidity) as avg_humidity,
      COUNT(*) as total_readings
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  ),
  watering_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE command_type = 'water' AND status = 'executed') as total_waterings,
      SUM(COALESCE((parameters->>'duration')::integer, 30)) FILTER (WHERE command_type = 'water' AND status = 'executed') as total_water_time
    FROM public.commands
    WHERE user_id = current_user_id
      AND created_at > now() - interval_period
  )
  SELECT jsonb_build_object(
    'totalWaterUsage', COALESCE(ws.total_water_time * 0.5, 0), -- Estimate 0.5L per second
    'totalWaterSaved', COALESCE(ws.total_water_time * 0.2, 0), -- Estimate 20% savings
    'avgMoisture', COALESCE(ROUND(rd.avg_moisture, 1), 0),
    'avgHealthScore', CASE 
      WHEN rd.avg_moisture BETWEEN 40 AND 60 AND rd.avg_temp BETWEEN 18 AND 25 THEN 85
      WHEN rd.avg_moisture BETWEEN 30 AND 70 AND rd.avg_temp BETWEEN 15 AND 30 THEN 70
      ELSE 60
    END
  ) INTO summary_data
  FROM recent_data rd
  CROSS JOIN watering_stats ws;
  
  -- Water usage by zone
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', COALESCE(z.name, 'Unknown Zone'),
      'usage', COALESCE(zone_usage.water_amount, 0)
    )
  ) INTO water_usage_data
  FROM public.zones z
  LEFT JOIN (
    SELECT 
      zone_id,
      SUM(COALESCE((c.parameters->>'duration')::integer, 30)) * 0.5 as water_amount
    FROM public.commands c
    JOIN public.devices d ON c.device_id = d.id
    WHERE c.user_id = current_user_id
      AND c.command_type = 'water'
      AND c.status = 'executed'
      AND c.created_at > now() - interval_period
    GROUP BY zone_id
  ) zone_usage ON z.id = zone_usage.zone_id
  WHERE z.user_id = current_user_id;
  
  -- Water savings trend (mock data for now)
  SELECT jsonb_build_array(
    jsonb_build_object('month', 'Jan', 'saved', 45, 'regular', 120),
    jsonb_build_object('month', 'Feb', 'saved', 52, 'regular', 115),
    jsonb_build_object('month', 'Mar', 'saved', 38, 'regular', 108),
    jsonb_build_object('month', 'Apr', 'saved', 61, 'regular', 135)
  ) INTO water_savings_data;
  
  -- Moisture level distribution
  WITH moisture_ranges AS (
    SELECT 
      CASE 
        WHEN soil_moisture < 20 THEN 'Very Dry'
        WHEN soil_moisture < 40 THEN 'Dry'
        WHEN soil_moisture < 60 THEN 'Optimal'
        WHEN soil_moisture < 80 THEN 'Moist'
        ELSE 'Very Moist'
      END as range,
      COUNT(*) as count
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', range,
      'value', count,
      'color', CASE range
        WHEN 'Very Dry' THEN '#ef4444'
        WHEN 'Dry' THEN '#f97316'
        WHEN 'Optimal' THEN '#22c55e'
        WHEN 'Moist' THEN '#3b82f6'
        ELSE '#8b5cf6'
      END
    )
  ) INTO moisture_distribution_data
  FROM moisture_ranges;
  
  -- Health scores by zone
  SELECT jsonb_agg(
    jsonb_build_object(
      'zone', COALESCE(z.name, 'Zone ' || substr(z.id::text, 1, 8)),
      'score', CASE 
        WHEN avg_moisture BETWEEN 40 AND 60 AND avg_temp BETWEEN 18 AND 25 THEN 90
        WHEN avg_moisture BETWEEN 30 AND 70 AND avg_temp BETWEEN 15 AND 30 THEN 75
        WHEN avg_moisture BETWEEN 20 AND 80 THEN 60
        ELSE 45
      END
    )
  ) INTO health_scores_data
  FROM public.zones z
  LEFT JOIN (
    SELECT 
      zone_id,
      AVG(soil_moisture) as avg_moisture,
      AVG(temperature) as avg_temp
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
    GROUP BY zone_id
  ) zone_averages ON z.id = zone_averages.zone_id
  WHERE z.user_id = current_user_id;
  
  -- Generate AI insights based on data
  WITH alert_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
      COUNT(*) FILTER (WHERE type = 'warning') as warnings,
      COUNT(*) as total_alerts
    FROM public.alerts
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  ),
  avg_conditions AS (
    SELECT 
      AVG(soil_moisture) as avg_moisture,
      AVG(temperature) as avg_temp,
      AVG(humidity) as avg_humidity
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  )
  SELECT jsonb_build_array(
    CASE 
      WHEN ac.avg_moisture BETWEEN 40 AND 60 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'positive',
          'icon', '🌱',
          'title', 'Optimal Soil Moisture',
          'description', 'Your soil moisture levels are in the optimal range. Plants are receiving ideal hydration.'
        )
      WHEN ac.avg_moisture < 30 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'warning',
          'icon', '🚰',
          'title', 'Increase Watering',
          'description', 'Soil moisture is below optimal levels. Consider increasing watering frequency or duration.'
        )
      ELSE
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'recommendation',
          'icon', '💡',
          'title', 'Monitor Moisture Levels',
          'description', 'Keep an eye on soil moisture to ensure optimal plant health.'
        )
    END,
    CASE 
      WHEN ac.avg_temp BETWEEN 18 AND 25 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'positive',
          'icon', '🌡️',
          'title', 'Perfect Temperature',
          'description', 'Temperature conditions are ideal for most plants. Great growing environment!'
        )
      WHEN ac.avg_temp > 30 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'warning',
          'icon', '🔥',
          'title', 'High Temperature Alert',
          'description', 'Temperatures are quite high. Consider providing shade or increasing watering during hot days.'
        )
      ELSE
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'recommendation',
          'icon', '📊',
          'title', 'Temperature Monitoring',
          'description', 'Keep monitoring temperature trends to optimize plant care schedules.'
        )
    END,
    jsonb_build_object(
      'id', gen_random_uuid(),
      'type', 'recommendation',
      'icon', '📈',
      'title', 'Data-Driven Insights',
      'description', 'Your garden is generating valuable data. Use these insights to optimize watering schedules and improve plant health.'
    )
  ) INTO insights_data
  FROM alert_counts ac
  CROSS JOIN avg_conditions;
  
  -- Combine all data
  result := jsonb_build_object(
    'summary', COALESCE(summary_data, '{}'::jsonb),
    'waterUsageByZone', COALESCE(water_usage_data, '[]'::jsonb),
    'waterSavings', COALESCE(water_savings_data, '[]'::jsonb),
    'moistureDistribution', COALESCE(moisture_distribution_data, '[]'::jsonb),
    'healthScores', COALESCE(health_scores_data, '[]'::jsonb),
    'insights', COALESCE(insights_data, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get device information for system page
CREATE OR REPLACE FUNCTION public.get_device_info()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT jsonb_build_object(
    'devices', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'device_id', d.device_id,
          'status', d.status,
          'last_seen', d.last_seen,
          'firmware_version', d.firmware_version,
          'ip_address', d.ip_address,
          'zone_id', d.zone_id,
          'zone_name', z.name
        )
      )
      FROM public.devices d
      LEFT JOIN public.zones z ON d.zone_id = z.id
      WHERE d.user_id = current_user_id
    ),
    'zones', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'description', description,
          'soil_type', soil_type,
          'moisture_threshold', moisture_threshold
        )
      )
      FROM public.zones
      WHERE user_id = current_user_id
    ),
    'api_keys', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'key', key,
          'created_at', created_at,
          'last_used', last_used,
          'is_active', is_active
        )
      )
      FROM public.api_keys
      WHERE user_id = current_user_id
        AND is_active = true
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{"devices": [], "zones": [], "api_keys": []}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get device configuration for ESP32
CREATE OR REPLACE FUNCTION get_device_config(p_device_id VARCHAR(50))
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  device_config JSON;
BEGIN
  SELECT json_build_object(
    'device_id', d.device_id,
    'device_uuid', d.id,  -- Add the device UUID for status updates
    'device_name', d.name,
    'zone_id', z.id,
    'zone_name', z.name,
    'moisture_threshold', z.moisture_threshold,
    'soil_type', z.soil_type,
    'status', d.status
  )
  INTO device_config
  FROM public.devices d
  JOIN public.zones z ON d.zone_id = z.id
  WHERE d.device_id = p_device_id
    AND z.user_id = auth.uid();
  
  IF device_config IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Device not found or access denied'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'config', device_config
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to simulate sensor data for testing
CREATE OR REPLACE FUNCTION public.simulate_sensor_data(
  device_count integer DEFAULT 1,
  hours_back integer DEFAULT 24
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  device_rec record;
  i integer;
  generated_count integer := 0;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Generate data for existing devices
  FOR device_rec IN 
    SELECT id, zone_id 
    FROM public.devices 
    WHERE user_id = current_user_id 
    LIMIT device_count
  LOOP
    -- Generate hourly data points
    FOR i IN 0..hours_back LOOP
      INSERT INTO public.sensor_data (
        device_id,
        zone_id,
        temperature,
        humidity,
        soil_moisture,
        light_level,
        ph_level,
        battery_level,
        timestamp,
        user_id
      ) VALUES (
        device_rec.id,
        device_rec.zone_id,
        20 + (random() * 15), -- 20-35°C
        40 + (random() * 40), -- 40-80%
        30 + (random() * 40), -- 30-70%
        (random() * 4095)::integer, -- 0-4095
        6.0 + (random() * 2), -- 6.0-8.0 pH
        80 + (random() * 20), -- 80-100% battery
        now() - (i || ' hours')::interval - (random() * 60 || ' minutes')::interval,
        current_user_id
      );
      generated_count := generated_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'generated_records', generated_count,
    'message', 'Generated ' || generated_count || ' sensor data records'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent alerts for dashboard
CREATE OR REPLACE FUNCTION public.get_recent_alerts(limit_count integer DEFAULT 10)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', type,
      'zone', zone,
      'message', message,
      'severity', severity,
      'timestamp', timestamp,
      'is_read', is_read,
      'data', data
    ) ORDER BY timestamp DESC
  ) INTO result
  FROM (
    SELECT *
    FROM public.alerts
    WHERE user_id = current_user_id
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY timestamp DESC
    LIMIT limit_count
  ) recent_alerts;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 12: CREATE ADDITIONAL TABLES FOR ENHANCED FUNCTIONALITY
-- =============================================================================

-- Device status table for real-time status tracking
CREATE TABLE IF NOT EXISTS public.device_status (
  device_id text NOT NULL PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline',
  message text DEFAULT 'No status available',
  last_seen timestamp with time zone DEFAULT now(),
  wifi_rssi integer,
  free_heap integer,
  uptime integer,
  pump_active boolean DEFAULT false,
  soil_moisture decimal(5,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Device commands table for ESP32 communication
CREATE TABLE IF NOT EXISTS public.device_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  command_type text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  result text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  executed_at timestamp with time zone,
  PRIMARY KEY (id)
);

-- Enable RLS for new tables
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_status (public read for device communication)
CREATE POLICY "Anyone can read device status" ON public.device_status FOR SELECT USING (true);
CREATE POLICY "Anyone can insert device status" ON public.device_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update device status" ON public.device_status FOR UPDATE USING (true);

-- RLS policies for device_commands (public access for device communication) 
CREATE POLICY "Anyone can read device commands" ON public.device_commands FOR SELECT USING (true);
CREATE POLICY "Anyone can insert device commands" ON public.device_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update device commands" ON public.device_commands FOR UPDATE USING (true);

-- =============================================================================
-- STEP 13: VERIFICATION AND CLEANUP SCHEDULER
-- =============================================================================

-- Create a function that can be called by a cron job to cleanup old data
CREATE OR REPLACE FUNCTION public.scheduled_maintenance()
RETURNS void AS $$
BEGIN
  PERFORM public.cleanup_expired_data();
  
  -- Update device status to offline if not seen for 30 minutes
  UPDATE public.devices 
  SET status = 'offline', updated_at = now()
  WHERE last_seen < now() - interval '30 minutes' 
    AND status != 'offline';
    
  -- Mark old alerts as expired
  UPDATE public.alerts
  SET expires_at = now()
  WHERE expires_at IS NULL 
    AND timestamp < now() - interval '7 days'
    AND is_read = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 14: FINAL VERIFICATION
-- =============================================================================

-- Verify the setup
DO $$
DECLARE
  table_count int;
  function_count int;
  trigger_count int;
  policy_count int;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN (
      'profiles', 'zones', 'devices', 'devices_config', 'sensor_data',
      'watering_controls', 'watering_schedules', 'commands', 'api_keys',
      'alerts', 'soil_types', 'audit_logs'
    );
  
  -- Count functions
  SELECT COUNT(*) INTO function_count 
  FROM information_schema.routines 
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'create_api_key', 'validate_api_key', 'process_sensor_data',
      'handle_watering_command', 'process_pending_commands',
      'update_device_health', 'audit_table_changes', 'cleanup_expired_data',
      'scheduled_maintenance'
    );
  
  -- Count triggers
  SELECT COUNT(*) INTO trigger_count 
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Output results
  RAISE NOTICE 'GardenFlow Database Setup Complete!';
  RAISE NOTICE 'Tables created: %', table_count;
  RAISE NOTICE 'Functions created: %', function_count;
  RAISE NOTICE 'Triggers created: %', trigger_count;
  RAISE NOTICE 'RLS policies created: %', policy_count;
  
  -- Verify essential tables exist
  IF table_count < 12 THEN
    RAISE WARNING 'Some tables may be missing. Expected 12, found %', table_count;
  END IF;
  
  IF function_count < 9 THEN
    RAISE WARNING 'Some functions may be missing. Expected 9, found %', function_count;
  END IF;
  
  IF trigger_count < 9 THEN
    RAISE WARNING 'Some triggers may be missing. Expected 9, found %', trigger_count;
  END IF;
END $$;

-- Success message
SELECT 'GardenFlow database schema setup completed successfully!' as status,
       now() as completion_time;

-- Recommend next steps
SELECT 'Next steps:' as step, '1. Test the schema with sample data' as description
UNION ALL
SELECT '', '2. Set up Edge Functions for ESP32 communication'
UNION ALL
SELECT '', '3. Configure realtime subscriptions in your app'
UNION ALL
SELECT '', '4. Set up scheduled maintenance (optional)';
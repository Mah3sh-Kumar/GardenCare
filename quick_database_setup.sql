-- QUICK DATABASE SETUP FOR GARDENCARE
-- Copy and paste this entire script into Supabase SQL Editor
-- This is a simplified version of the full schema for quick setup

-- =============================================================================
-- STEP 1: CREATE BASIC TABLES
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zones table
CREATE TABLE IF NOT EXISTS public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  soil_type text DEFAULT 'Loam soil',
  moisture_threshold decimal(5,2) DEFAULT 30.0,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  device_id text UNIQUE NOT NULL,
  device_type text DEFAULT 'esp32',
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  last_seen timestamptz DEFAULT now(),
  ip_address inet,
  firmware_version text DEFAULT '1.0.0',
  zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sensor data table
CREATE TABLE IF NOT EXISTS public.sensor_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  temperature decimal(5,2) NOT NULL,
  humidity decimal(5,2) NOT NULL,
  soil_moisture decimal(5,2) NOT NULL,
  light_level integer,
  ph_level decimal(4,2),
  timestamp timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Commands table
CREATE TABLE IF NOT EXISTS public.commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  command_type text NOT NULL CHECK (command_type IN ('water', 'read_sensors', 'pump_on', 'pump_off', 'reboot')),
  parameters jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'executed', 'failed')),
  result jsonb,
  executed_at timestamptz,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  zone text,
  message text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  read boolean DEFAULT false,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  data jsonb DEFAULT '{}'
);

-- API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  last_used timestamptz,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: CREATE RLS POLICIES
-- =============================================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Zones policies
CREATE POLICY "Users can manage own zones" ON public.zones FOR ALL USING (auth.uid() = user_id);

-- Devices policies
CREATE POLICY "Users can manage own devices" ON public.devices FOR ALL USING (auth.uid() = user_id);

-- Sensor data policies
CREATE POLICY "Users can view own sensor data" ON public.sensor_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert sensor data" ON public.sensor_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Commands policies
CREATE POLICY "Users can manage own commands" ON public.commands FOR ALL USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Users can manage own API keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 4: CREATE USEFUL FUNCTIONS
-- =============================================================================

-- Function to create API keys
CREATE OR REPLACE FUNCTION public.create_api_key(
  key_name text,
  key_value text DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_key_id uuid;
  generated_key text;
BEGIN
  -- Generate key if not provided
  IF key_value IS NULL THEN
    generated_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
  ELSE
    generated_key := key_value;
  END IF;
  
  -- Insert the API key
  INSERT INTO public.api_keys (name, key, user_id)
  VALUES (key_name, generated_key, auth.uid())
  RETURNING id INTO new_key_id;
  
  RETURN new_key_id;
END;
$$;

-- =============================================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sensor_data_device_timestamp ON public.sensor_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_zone_timestamp ON public.sensor_data(zone_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON public.zones(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_device_status ON public.commands(device_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key) WHERE is_active = true;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 
  'GardenCare database setup completed successfully!' as status,
  'You can now test your functions and create your first account' as next_step,
  now() as setup_time;
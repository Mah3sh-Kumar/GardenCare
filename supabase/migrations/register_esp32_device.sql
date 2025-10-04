-- Register ESP32 Device for Connection
-- Run this to prepare your database for ESP32 connection

-- =============================================================================
-- STEP 1: CREATE ZONE FOR YOUR ESP32 (if needed)
-- =============================================================================

-- Function to register a new ESP32 device and create associated zone
CREATE OR REPLACE FUNCTION register_esp32_device(
  p_device_id VARCHAR(50),
  p_device_name VARCHAR(255),
  p_zone_name VARCHAR(255),
  p_zone_description TEXT DEFAULT NULL,
  p_soil_type VARCHAR(100) DEFAULT 'Loam soil',
  p_moisture_threshold DECIMAL(5,2) DEFAULT 40.0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_zone_id UUID;
  new_device_record RECORD;
  result JSON;
BEGIN
  -- Generate new zone ID
  new_zone_id := gen_random_uuid();
  
  -- Insert the zone first
  INSERT INTO public.zones (id, name, description, soil_type, moisture_threshold, user_id)
  VALUES (
    new_zone_id,
    p_zone_name,
    COALESCE(p_zone_description, 'Zone for device: ' || p_device_name),
    p_soil_type,
    p_moisture_threshold,
    auth.uid()
  );
  
  -- Insert the device
  INSERT INTO public.devices (device_id, name, zone_id, device_type, status)
  VALUES (
    p_device_id,
    p_device_name,
    new_zone_id,
    'ESP32',
    'active'
  )
  RETURNING * INTO new_device_record;
  
  -- Return the created device and zone information
  SELECT json_build_object(
    'success', true,
    'device_id', new_device_record.device_id,
    'device_name', new_device_record.name,
    'zone_id', new_zone_id,
    'zone_name', p_zone_name,
    'message', 'Device and zone created successfully'
  ) INTO result;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to register device'
    );
END;
$$;

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

-- =============================================================================
-- STEP 2: EXAMPLE USAGE - REGISTER ESP32 DEVICE VIA DASHBOARD
-- =============================================================================

-- Example: Register a new ESP32 device (replace with actual values from dashboard)
-- This would typically be called from your dashboard interface
/*
SELECT register_esp32_device(
  'esp_01',                    -- Device ID (from dashboard form)
  'My Garden Monitor',         -- Device name (from dashboard form)
  'Main Garden Zone',          -- Zone name (from dashboard form)
  'Monitoring my vegetable garden',  -- Zone description (optional)
  'Loamy soil',               -- Soil type (from dropdown)
  35.0                        -- Moisture threshold (from slider/input)
);
*/

-- =============================================================================
-- STEP 3: EXAMPLE DEVICE STATUS AND CONFIGURATION (for testing only)
-- =============================================================================

-- Note: In production, these would be created automatically when 
-- register_esp32_device() function is called from the dashboard

-- Example device status (replace 'esp_01' with actual device_id from dashboard)
/*
INSERT INTO public.device_status (
  device_id,
  status,
  message,
  last_seen,
  created_at,
  updated_at
)
SELECT 
  d.id,
  'offline',
  'Device registered, waiting for first connection',
  now(),
  now(),
  now()
FROM public.devices d
WHERE d.device_id = 'esp_01'  -- Replace with actual device_id
  AND d.user_id = auth.uid()
ON CONFLICT (device_id) DO UPDATE SET
  message = EXCLUDED.message,
  updated_at = now();
*/

-- =============================================================================
-- STEP 4: UTILITY FUNCTIONS FOR DASHBOARD INTEGRATION
-- =============================================================================

-- Function to get all user devices for dashboard
CREATE OR REPLACE FUNCTION get_user_devices()
RETURNS TABLE (
  device_id VARCHAR(50),
  device_name VARCHAR(255),
  zone_id UUID,
  zone_name VARCHAR(255),
  device_status VARCHAR(50),
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.device_id,
    d.name as device_name,
    z.id as zone_id,
    z.name as zone_name,
    d.status as device_status,
    ds.last_seen
  FROM public.devices d
  JOIN public.zones z ON d.zone_id = z.id
  LEFT JOIN public.device_status ds ON ds.device_id = d.id
  WHERE z.user_id = auth.uid()
  ORDER BY d.created_at DESC;
END;
$$;

-- =============================================================================
-- STEP 5: EXAMPLE CONFIGURATION (for testing only)
-- =============================================================================

-- Note: In production, device configuration would be set through dashboard
-- when register_esp32_device() function is called

-- Example device configuration (replace with actual device_id from dashboard)
/*
INSERT INTO public.devices_config (
  device_id,
  reading_interval,
  alert_thresholds,
  auto_watering_enabled,
  created_at,
  updated_at
)
SELECT 
  d.id,
  10,  -- 10 seconds for testing, 300 for production
  jsonb_build_object(
    'temperature_min', 15,
    'temperature_max', 35,
    'humidity_min', 30,
    'humidity_max', 80,
    'soil_moisture_min', 25,
    'soil_moisture_max', 90
  ),
  true,
  now(),
  now()
FROM public.devices d
WHERE d.device_id = 'esp_01'  -- Replace with actual device_id
  AND d.user_id = auth.uid()
ON CONFLICT (device_id) DO UPDATE SET
  alert_thresholds = EXCLUDED.alert_thresholds,
  updated_at = now();
*/

-- =============================================================================
-- STEP 6: EXAMPLE WATERING CONTROL (for testing only)
-- =============================================================================

-- Note: In production, watering control would be set through dashboard
-- when register_esp32_device() function is called

-- Example watering control setup (replace with actual zone_id from dashboard)
/*
INSERT INTO public.watering_controls (
  zone_id,
  device_id,
  pump_pin,
  is_active,
  auto_mode,
  moisture_threshold,
  watering_duration,
  user_id,
  created_at,
  updated_at
)
SELECT 
  z.id,
  d.id,
  2,     -- GPIO 2 for pump control
  true,
  true,
  z.moisture_threshold,  -- Use zone's moisture threshold
  30,    -- Water for 30 seconds
  auth.uid(),
  now(),
  now()
FROM public.zones z
JOIN public.devices d ON d.zone_id = z.id
WHERE d.device_id = 'esp_01'  -- Replace with actual device_id
  AND z.user_id = auth.uid()
ON CONFLICT (zone_id) DO UPDATE SET
  device_id = EXCLUDED.device_id,
  moisture_threshold = EXCLUDED.moisture_threshold,
  updated_at = now();
*/

-- =============================================================================
-- STEP 7: TESTING AND VERIFICATION FUNCTIONS
-- =============================================================================

-- Function to verify device registration
CREATE OR REPLACE FUNCTION verify_device_registration(p_device_id VARCHAR(50))
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  device_info RECORD;
  result JSON;
BEGIN
  SELECT 
    d.name as device_name,
    d.device_id,
    d.status,
    z.name as zone_name,
    z.id as zone_id,
    ds.last_seen
  INTO device_info
  FROM public.devices d
  JOIN public.zones z ON d.zone_id = z.id
  LEFT JOIN public.device_status ds ON ds.device_id = d.id
  WHERE d.device_id = p_device_id
    AND z.user_id = auth.uid();
  
  IF device_info IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Device not found or access denied'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'device', row_to_json(device_info),
    'message', 'Device is ready for ESP32 connection'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Example verification (replace with actual device_id)
-- SELECT verify_device_registration('esp_01');

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

/*
HOW TO USE THIS FROM YOUR DASHBOARD:

1. Register a new ESP32 device:
   SELECT register_esp32_device(
     'my_esp_device_001',           -- Unique device ID
     'Garden Monitor #1',           -- Device name
     'Vegetable Garden',            -- Zone name
     'My main vegetable garden',    -- Zone description (optional)
     'Clay soil',                   -- Soil type
     35.0                          -- Moisture threshold
   );

2. Get device configuration for ESP32 code:
   SELECT get_device_config('my_esp_device_001');

3. List all user devices:
   SELECT * FROM get_user_devices();

4. Verify device registration:
   SELECT verify_device_registration('my_esp_device_001');

NOTE: Replace hardcoded values with user input from your dashboard forms.
The ESP32 code should use the device_id and zone_id returned by these functions.
*/
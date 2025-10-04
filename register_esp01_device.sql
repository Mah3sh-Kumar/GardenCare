-- Register ESP01 Device for Your GardenFlow System
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- STEP 1: Register ESP01 device with zone
-- =============================================================================

-- Register your ESP01 device with a proper zone
SELECT register_esp32_device(
  'esp01',                          -- Your existing device ID
  'ESP01 Garden Monitor',           -- Device name
  'Main Garden Zone',               -- Zone name (you can change this)
  'Smart monitoring zone for ESP01 device',  -- Zone description
  'Mixed soil',                     -- Soil type
  40.0                             -- Moisture threshold (water when below 40%)
);

-- =============================================================================
-- STEP 2: Verify the registration
-- =============================================================================

-- Check if device was registered successfully
SELECT verify_device_registration('esp01');

-- =============================================================================
-- STEP 3: Get device configuration (what ESP32 will fetch)
-- =============================================================================

-- This shows what your ESP32 will receive when it calls get_device_config()
SELECT get_device_config('esp01');

-- =============================================================================
-- STEP 4: Update existing device record (if needed)
-- =============================================================================

-- If you already have the device in the database, update it with zone info
-- This query will link your existing device to the newly created zone
UPDATE public.devices 
SET zone_id = (
  SELECT id FROM public.zones 
  WHERE name = 'Main Garden Zone' 
  AND user_id = auth.uid()
  LIMIT 1
),
updated_at = now()
WHERE device_id = 'esp01' 
AND user_id = auth.uid();

-- =============================================================================
-- STEP 5: Create device configuration
-- =============================================================================

-- Set up device configuration for faster testing intervals
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
  10,  -- 10 seconds for testing
  jsonb_build_object(
    'temperature_min', 10,
    'temperature_max', 40,
    'humidity_min', 20,
    'humidity_max', 90,
    'soil_moisture_min', 20,
    'soil_moisture_max', 95
  ),
  true,
  now(),
  now()
FROM public.devices d
WHERE d.device_id = 'esp01'
  AND d.user_id = auth.uid()
ON CONFLICT (device_id) DO UPDATE SET
  reading_interval = EXCLUDED.reading_interval,
  alert_thresholds = EXCLUDED.alert_thresholds,
  updated_at = now();

-- =============================================================================
-- STEP 6: Set up watering control
-- =============================================================================

-- Link pump control to the zone
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
WHERE d.device_id = 'esp01'
  AND z.user_id = auth.uid()
ON CONFLICT (zone_id) DO UPDATE SET
  device_id = EXCLUDED.device_id,
  moisture_threshold = EXCLUDED.moisture_threshold,
  updated_at = now();

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Final verification - check all is set up correctly
SELECT 
  'Device Setup Complete' as status,
  d.device_id,
  d.name as device_name,
  d.status,
  z.name as zone_name,
  z.id as zone_id,
  z.moisture_threshold,
  wc.auto_mode as auto_watering,
  'Ready for ESP32 connection!' as message
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
LEFT JOIN public.watering_controls wc ON wc.zone_id = z.id
WHERE d.device_id = 'esp01'
  AND d.user_id = auth.uid();

-- Show what the ESP32 will receive
SELECT 
  'ESP32 Configuration' as info,
  jsonb_pretty(
    jsonb_build_object(
      'device_id', d.device_id,
      'device_name', d.name,
      'zone_id', z.id,
      'zone_name', z.name,
      'moisture_threshold', z.moisture_threshold,
      'soil_type', z.soil_type,
      'status', d.status
    )
  ) as config
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
WHERE d.device_id = 'esp01'
  AND d.user_id = auth.uid();
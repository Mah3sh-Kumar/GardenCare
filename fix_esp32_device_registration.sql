-- Fix ESP32 Device Registration Issue
-- This will register your ESP01 device properly and get its UUID

-- Step 1: Register the ESP01 device with proper zone
SELECT register_esp32_device(
  'esp01',                          -- Your ESP32 device identifier
  'ESP01 Garden Monitor',           -- Device name
  'Main Garden Zone',               -- Zone name
  'Smart monitoring zone for ESP01 device',  -- Zone description
  'Mixed soil',                     -- Soil type
  40.0                             -- Moisture threshold
);

-- Step 2: Get the UUID for your device (this is what ESP32 needs to use)
SELECT 
  'Device UUID Information' as info,
  d.id as device_uuid,              -- This is what ESP32 should send as device_id
  d.device_id as device_string,     -- This is 'esp01'
  d.name as device_name,
  z.id as zone_uuid,                -- Zone UUID
  z.name as zone_name
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
WHERE d.device_id = 'esp01'
  AND d.user_id = auth.uid();

-- Step 3: Verify device configuration
SELECT get_device_config('esp01');
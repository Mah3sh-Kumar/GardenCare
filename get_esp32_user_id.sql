-- Get User ID for ESP32 Configuration
-- Run this to get the user_id that ESP32 needs to include in sensor data

SELECT 
  'ESP32 Configuration Data' as info,
  d.id as device_uuid,              -- dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b
  z.id as zone_uuid,                -- 0fa94b5e-d58a-4245-aee6-2fbee53b7de9
  d.user_id as user_uuid,           -- **THIS IS WHAT ESP32 NEEDS**
  d.device_id as device_string,     -- esp01
  d.name as device_name,
  z.name as zone_name
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
WHERE d.id = 'dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b'::uuid;

-- Alternative: Get by device string ID
SELECT 
  'ESP32 Configuration Data (by string ID)' as info,
  d.id as device_uuid,
  z.id as zone_uuid,
  d.user_id as user_uuid,           -- **COPY THIS UUID FOR ESP32**
  d.device_id as device_string,
  d.name as device_name,
  z.name as zone_name
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
WHERE d.device_id = 'esp01';
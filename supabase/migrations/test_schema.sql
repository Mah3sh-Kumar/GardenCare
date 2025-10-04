-- Test Schema with Sample Data
-- Run this to validate your database setup and generate test data

-- =============================================================================
-- STEP 1: CREATE TEST USER DATA (if needed)
-- =============================================================================

-- Note: This assumes you have a user account created via Supabase Auth
-- Get current user ID for testing
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Try to get current authenticated user
  test_user_id := auth.uid();
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No authenticated user found. Please log in first.';
    RAISE NOTICE 'You can create test data manually by replacing auth.uid() with a UUID.';
  ELSE
    RAISE NOTICE 'Current user ID: %', test_user_id;
  END IF;
END $$;

-- =============================================================================
-- STEP 2: INSERT TEST ZONES
-- =============================================================================

-- Insert test zones for the current user
INSERT INTO public.zones (name, description, soil_type, moisture_threshold, user_id)
VALUES 
  ('Vegetable Garden', 'Main vegetable growing area with tomatoes and peppers', 'Loam soil', 45.0, auth.uid()),
  ('Herb Garden', 'Small herb section with basil, rosemary, and thyme', 'Sandy soil', 40.0, auth.uid()),
  ('Greenhouse Zone', 'Controlled environment for seedlings', 'Potting Mix', 50.0, auth.uid())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 3: INSERT TEST DEVICES
-- =============================================================================

-- Insert test ESP32 devices
WITH zone_data AS (
  SELECT id as zone_id, name as zone_name 
  FROM public.zones 
  WHERE user_id = auth.uid() 
  LIMIT 3
)
INSERT INTO public.devices (name, device_id, device_type, status, zone_id, user_id, firmware_version)
SELECT 
  'ESP32 ' || zone_name,
  'esp32_' || lower(replace(zone_name, ' ', '_')),
  'esp32',
  CASE 
    WHEN random() > 0.3 THEN 'online'
    ELSE 'offline'
  END,
  zone_id,
  auth.uid(),
  'v2.0.0'
FROM zone_data
ON CONFLICT (device_id) DO NOTHING;

-- =============================================================================
-- STEP 4: INSERT TEST SENSOR DATA
-- =============================================================================

-- Generate realistic sensor data for the last 7 days
INSERT INTO public.sensor_data (
  device_id, zone_id, temperature, humidity, soil_moisture, 
  light_level, ph_level, battery_level, timestamp, user_id
)
SELECT 
  d.id as device_id,
  d.zone_id,
  -- Temperature: 18-28°C with daily variation
  20 + 8 * sin(extract(hour from ts) * pi() / 12) + (random() - 0.5) * 4,
  -- Humidity: 40-80% with some randomness
  60 + (random() - 0.5) * 40,
  -- Soil moisture: Varies by zone type, decreases over time without watering
  CASE z.soil_type
    WHEN 'Sandy soil' THEN 30 + (random() * 20) + (extract(hour from ts) * -0.5)
    WHEN 'Loam soil' THEN 45 + (random() * 20) + (extract(hour from ts) * -0.3)
    ELSE 40 + (random() * 25) + (extract(hour from ts) * -0.4)
  END,
  -- Light level: Follows day/night cycle
  CASE 
    WHEN extract(hour from ts) BETWEEN 6 AND 18 THEN 
      (sin((extract(hour from ts) - 6) * pi() / 12) * 3000 + random() * 1000)::integer
    ELSE (random() * 100)::integer
  END,
  -- pH: Stable around 6.5-7.0
  6.5 + (random() * 0.5),
  -- Battery: Slowly decreasing
  100 - (extract(day from (now() - ts)) * 2) + (random() * 5),
  ts,
  auth.uid()
FROM 
  public.devices d
  JOIN public.zones z ON d.zone_id = z.id
  CROSS JOIN generate_series(
    now() - interval '7 days',
    now(),
    interval '1 hour'
  ) as ts
WHERE d.user_id = auth.uid()
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 5: INSERT TEST ALERTS
-- =============================================================================

-- Create some test alerts
INSERT INTO public.alerts (type, zone, message, severity, user_id, data)
VALUES 
  ('warning', 'Vegetable Garden', 'Soil moisture dropping below optimal levels', 'medium', auth.uid(), 
   '{"sensor_value": 35, "threshold": 45}'::jsonb),
  ('info', 'Herb Garden', 'Temperature is perfect for herb growth', 'low', auth.uid(),
   '{"temperature": 22}'::jsonb),
  ('error', 'Greenhouse Zone', 'Device connection lost', 'high', auth.uid(),
   '{"last_seen": "2024-01-10T10:30:00Z"}'::jsonb)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 6: INSERT TEST API KEYS
-- =============================================================================

-- Create test API keys for devices
SELECT public.create_api_key('ESP32 Vegetable Garden Key', 'sk_test_vegetable_garden_' || encode(gen_random_bytes(16), 'hex'));
SELECT public.create_api_key('ESP32 Herb Garden Key', 'sk_test_herb_garden_' || encode(gen_random_bytes(16), 'hex'));
SELECT public.create_api_key('ESP32 Greenhouse Key', 'sk_test_greenhouse_' || encode(gen_random_bytes(16), 'hex'));

-- =============================================================================
-- STEP 7: INSERT TEST COMMANDS
-- =============================================================================

-- Create some test commands
INSERT INTO public.commands (device_id, command_type, parameters, status, user_id)
SELECT 
  d.id,
  CASE 
    WHEN random() > 0.5 THEN 'water'
    ELSE 'read_sensors'
  END,
  jsonb_build_object('duration', (15 + random() * 30)::integer),
  CASE 
    WHEN random() > 0.7 THEN 'executed'
    WHEN random() > 0.4 THEN 'pending'
    ELSE 'failed'
  END,
  auth.uid()
FROM public.devices d
WHERE d.user_id = auth.uid();

-- =============================================================================
-- STEP 8: TEST ALL FUNCTIONS
-- =============================================================================

-- Test dashboard stats function
SELECT 'Testing get_dashboard_stats()' as test_name;
SELECT public.get_dashboard_stats();

-- Test sensor chart data function
SELECT 'Testing get_sensor_chart_data(24)' as test_name;
SELECT jsonb_array_length(public.get_sensor_chart_data(24)) as sensor_data_count;

-- Test recent alerts function
SELECT 'Testing get_recent_alerts(5)' as test_name;
SELECT jsonb_array_length(public.get_recent_alerts(5)) as alerts_count;

-- Test analytics performance metrics
SELECT 'Testing get_analytics_performance_metrics()' as test_name;
SELECT public.get_analytics_performance_metrics('month');

-- Test device info function
SELECT 'Testing get_device_info()' as test_name;
SELECT public.get_device_info();

-- =============================================================================
-- STEP 9: VALIDATION QUERIES
-- =============================================================================

-- Validate data counts
SELECT 'Data Validation Summary' as summary;

SELECT 
  'Zones' as table_name,
  COUNT(*) as record_count
FROM public.zones 
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Devices' as table_name,
  COUNT(*) as record_count
FROM public.devices 
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Sensor Data' as table_name,
  COUNT(*) as record_count
FROM public.sensor_data 
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Alerts' as table_name,
  COUNT(*) as record_count
FROM public.alerts 
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'API Keys' as table_name,
  COUNT(*) as record_count
FROM public.api_keys 
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Commands' as table_name,
  COUNT(*) as record_count
FROM public.commands 
WHERE user_id = auth.uid();

-- Check latest sensor readings per device
SELECT 
  d.name as device_name,
  d.status,
  lsd.temperature,
  lsd.humidity,
  lsd.soil_moisture,
  lsd.timestamp as last_reading
FROM public.devices d
LEFT JOIN public.latest_sensor_data lsd ON d.id = lsd.device_id
WHERE d.user_id = auth.uid()
ORDER BY d.name;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 
  'Schema test completed successfully!' as status,
  'Your database is ready for ESP32 integration' as message,
  now() as test_completion_time;
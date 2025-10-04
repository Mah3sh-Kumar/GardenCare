# ESP32 Device Registration Fix - Instructions

## Problem
Your ESP32 is sending `device_id: "esp01"` (string) but the database expects a UUID. This causes the error:
```
❌ Send failed: HTTP 400
Response: {"code":"22P02","details":null,"hint":null,"message":"invalid input syntax for type uuid: \"esp01\""}
```

## Solution Steps

### Step 1: Register Device in Supabase
1. Open your Supabase SQL Editor
2. Run this query to register your ESP01 device:

```sql
-- Register your ESP01 device
SELECT register_esp32_device(
  'esp01',                          -- Your ESP32 device identifier
  'ESP01 Garden Monitor',           -- Device name
  'Main Garden Zone',               -- Zone name
  'Smart monitoring zone for ESP01 device',
  'Mixed soil',
  40.0
);
```

3. Get the UUIDs by running:
```sql
-- Get the device UUID (copy these values)
SELECT 
  d.id as device_uuid,              -- **Copy this UUID**
  z.id as zone_uuid                 -- **Copy this UUID**
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
WHERE d.device_id = 'esp01'
  AND d.user_id = auth.uid();
```

### Step 2: Update ESP32 Code
1. Open your ESP32_SIMPLE.ino file
2. Find these lines around line 31:
```cpp
const char* deviceUUID = "PUT_DEVICE_UUID_HERE";  // **UPDATE THIS**
const char* zoneUUID = "PUT_ZONE_UUID_HERE";      // **UPDATE THIS**
```

3. Replace `PUT_DEVICE_UUID_HERE` and `PUT_ZONE_UUID_HERE` with the actual UUIDs from Step 1

### Step 3: Upload and Test
1. Upload the updated code to your ESP32
2. Monitor the Serial output
3. You should now see:
```
✅ Sensor data sent successfully!
```

## Alternative Solution (If you prefer)
Instead of modifying ESP32 code, you can run the `supabase_sensor_data_function.sql` file in your Supabase SQL Editor. This creates a function that accepts string device IDs and converts them to UUIDs automatically.

Then modify your ESP32 to use this endpoint:
```cpp
String url = String(supabaseUrl) + "/rest/v1/rpc/insert_sensor_data_by_device_string";
```

## Files Created
- `fix_esp32_device_registration.sql` - Device registration script
- `supabase_sensor_data_function.sql` - Alternative function solution
- `ESP32_SIMPLE.ino` - Updated with UUID placeholders

## Verification
After fixing, your sensor data should appear in the SensorsPage.jsx dashboard with real-time updates.
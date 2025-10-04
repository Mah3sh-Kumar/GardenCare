# ESP32 Quick Fix - Missing user_id

## Current Issue
```
❌ Send failed: HTTP 400
Response: {"code":"23502",...,"message":"null value in column \"user_id\" of relation \"sensor_data\" violates not-null constraint"}
```

## Fix Steps

### Step 1: Get Your User ID
Run this query in your Supabase SQL Editor:

```sql
-- Get user_id for ESP32
SELECT 
  d.user_id as user_uuid,           -- **COPY THIS VALUE**
  d.id as device_uuid,
  z.id as zone_uuid
FROM public.devices d
JOIN public.zones z ON d.zone_id = z.id
WHERE d.id = 'dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b'::uuid;
```

### Step 2: Update ESP32 Code
1. In your `ESP32_SIMPLE.ino` file, find line ~21:
```cpp
const char* userUUID = "PUT_USER_UUID_HERE";   // **UPDATE THIS**
```

2. Replace `PUT_USER_UUID_HERE` with the `user_uuid` value from Step 1

### Step 3: Upload and Test
- Upload the updated code to your ESP32
- Monitor Serial output
- You should see: `✅ Sensor data sent successfully!`

## What This Fixes
The ESP32 payload now includes all required fields:
- ✅ `device_id`: `dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b`
- ✅ `zone_id`: `0fa94b5e-d58a-4245-aee6-2fbee53b7de9`
- ✅ `user_id`: Your user UUID (from Step 1)
- ✅ `temperature`, `humidity`, `soil_moisture`, etc.

## Files Modified
- `ESP32_SIMPLE.ino` - Added `user_id` to sensor data payload
- `get_esp32_user_id.sql` - Query to get your user ID
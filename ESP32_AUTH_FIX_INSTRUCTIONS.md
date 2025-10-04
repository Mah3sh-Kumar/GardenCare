# ESP32 Authentication Fix - Complete Instructions

## Problem
Your ESP32 is getting HTTP 400 error due to missing `user_id` field:
```
❌ Send failed: HTTP 400
Response: {"code":"23502","details":"Failing row contains (..., null).","hint":null,"message":"null value in column \"user_id\" of relation \"sensor_data\" violates not-null constraint"}
```

## Root Cause
The `sensor_data` table requires `user_id` to be NOT NULL, but the ESP32 payload doesn't include it.

## Solutions (Choose ONE)

### Solution 1: Add User ID to ESP32 Payload (Recommended)

#### Step 1A: Get Your User ID
1. Run the query in `get_esp32_user_id.sql` in your Supabase SQL Editor
2. Copy the `user_uuid` value from the result

#### Step 1B: Update ESP32 Code
1. In your ESP32_SIMPLE.ino file, find line ~21:
```cpp
const char* userUUID = "PUT_USER_UUID_HERE";   // **UPDATE THIS**
```

2. Replace `PUT_USER_UUID_HERE` with your actual user UUID from Step 1A

3. The ESP32 code has already been updated to include `user_id` in the sensor data payload

#### Step 1C: Upload and Test
- Upload the updated code to your ESP32
- You should now see: `✅ Sensor data sent successfully!`

---

### Solution 2: Use Enhanced Function (Alternative)

#### Step 2A: Create Enhanced Function
1. Run `esp32_sensor_data_function_enhanced.sql` in your Supabase SQL Editor
2. This creates a function that properly handles user_id assignment

#### Step 2B: Update ESP32 to Use Function
Replace your sendSensorData URL with:
```cpp
String url = String(supabaseUrl) + "/rest/v1/rpc/insert_esp32_sensor_data";
```

And modify the payload to match the function parameters.

---

## Quick Fix Summary

**You need to add the missing user_id to your ESP32 payload:**

1. **Get User ID**: Run `get_esp32_user_id.sql` in Supabase SQL Editor
2. **Update ESP32**: Replace `PUT_USER_UUID_HERE` with your actual user UUID
3. **Upload**: Flash the updated code to your ESP32

## Current ESP32 Configuration
Your ESP32 already has the correct values:
- **Device UUID**: `dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b` ✅
- **Zone UUID**: `0fa94b5e-d58a-4245-aee6-2fbee53b7de9` ✅
- **User UUID**: `PUT_USER_UUID_HERE` ❌ **NEEDS UPDATE**

## Files Updated
- `ESP32_SIMPLE.ino` - Updated to use service key
- `esp32_sensor_data_function_enhanced.sql` - Alternative function solution

## Testing
After applying the fix, your ESP32 should successfully send data:
```
📡 Sending sensor data...
✅ Sensor data sent successfully!
```

And you'll see the data appear in your SensorsPage.jsx dashboard.
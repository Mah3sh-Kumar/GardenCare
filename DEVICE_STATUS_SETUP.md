# Device Status Setup Guide

This guide explains how to configure your ESP32 device to properly report its status to the GardenCare dashboard.

## Overview

The ESP32 device reports its status to the dashboard through several mechanisms:
1. **Heartbeat updates** - Periodic status updates every minute
2. **Sensor data updates** - Status updates when sensor data is sent
3. **Command execution updates** - Status updates when commands are processed

## Setup Process

### 1. Register Your Device in the Dashboard

1. Log into your GardenCare dashboard
2. Navigate to the "System" page
3. Click "Add Device" and fill in the device details:
   - Device Name (e.g., "Garden Monitor 1")
   - Device ID (e.g., "esp01") - Remember this value
   - Select or create a zone
4. After creating the device, generate an API key for it

### 2. Configure the ESP32 Code

Update the following values in `ESP32_PRODUCTION.ino`:

```cpp
// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "https://YOUR_SUPABASE_PROJECT.supabase.co";
const char* supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
const char* supabaseServiceKey = "YOUR_SUPABASE_SERVICE_KEY";

// Device configuration
const char* deviceId = "esp01";              // Must match the Device ID from dashboard
const char* deviceApiKey = "YOUR_DEVICE_API_KEY";  // API key from dashboard
```

### 3. Deploy Database Functions

Make sure the following Edge Functions are deployed:
- `device-api` - Handles device authentication and commands
- `device-status` - Handles device status updates (new)
- `esp32-data` - Handles sensor data
- `esp32-commands` - Handles command processing

Deploy them using:
```bash
supabase functions deploy device-status --project-ref YOUR_PROJECT_ID
```

### 4. Upload Code to ESP32

1. Compile and upload the code to your ESP32
2. Open the Serial Monitor to verify the device connects and sends status updates

## How Status Updates Work

### Heartbeat Updates
- Sent every minute automatically
- Updates the device status to "online"
- Provides additional device metrics (WiFi RSSI, memory usage, etc.)

### Manual Status Updates
You can trigger manual status updates through serial commands:
- `status` - Show current device status
- `heartbeat` - Send manual heartbeat

### Automatic Status Updates
- When sensor data is sent
- When commands are executed
- When errors occur

## Troubleshooting

### Device Shows as Offline
1. Check WiFi connection - LED should be off when connected
2. Verify API key is correct
3. Check Supabase configuration values
4. Ensure device is registered in the dashboard with matching Device ID

### Status Not Updating
1. Check serial monitor for error messages
2. Verify Edge Functions are deployed
3. Check database RLS policies
4. Confirm device has proper permissions

### Authentication Errors
1. Verify Supabase URL and API keys
2. Check that API key is active in the dashboard
3. Ensure the device is assigned to the correct user

## Monitoring Device Status

You can monitor device status through:
1. Dashboard "Connected Devices" section
2. Serial monitor output
3. Database `devices` table
4. Database `device_status` table (historical data)

The dashboard checks the `status` field in the `devices` table, which should be "online" when the device is connected and functioning properly.
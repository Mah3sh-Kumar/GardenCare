# ESP32 Connection Guide for GardenCare Dashboard

This guide explains how to connect your ESP32 device to the GardenCare dashboard using Supabase as the backend.

## Prerequisites

1. An ESP32 development board
2. Sensors (DHT22 for temperature/humidity, soil moisture sensor)
3. Arduino IDE or PlatformIO for development
4. A GardenCare dashboard account
5. WiFi network credentials

## Step 1: Register Your Device in the Dashboard

1. Navigate to the System page in your GardenCare dashboard
2. Click "Add Device" and fill in the required information:
   - Device Name: A descriptive name for your device
   - Device ID: A unique identifier for your device (e.g., ESP32_GARDEN_001)
   - Firmware Version: Current version of your firmware (e.g., v1.0.0)
   - Zone: Select the zone where your device is located
3. Click "Add Device" to register it

## Step 2: Generate API Key for Your Device

1. After registering your device, go to the "Device Configuration" section
2. Find your device in the list and click "Generate API Key"
3. Copy the generated API key - you'll need this for your ESP32 code

## Step 3: Configure Your ESP32 Code

1. In your ESP32 code, include the following configuration:
   ```cpp
   // Supabase configuration
   const char* supabaseUrl = "YOUR_SUPABASE_URL";
   const char* supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
   const char* apiKey = "YOUR_DEVICE_API_KEY"; // The key generated in Step 2
   ```

2. Use these credentials to authenticate with the GardenCare API endpoints

## Step 4: Sending Sensor Data

To send sensor data from your ESP32 to the dashboard:

1. Collect data from your sensors (temperature, humidity, soil moisture)
2. Format the data as JSON:
   ```json
   {
     "device_id": "YOUR_DEVICE_ID",
     "temperature": 25.3,
     "humidity": 60.5,
     "soil_moisture": 45.2,
     "api_key": "YOUR_API_KEY"
   }
   ```
3. Send a POST request to the ESP32 data endpoint:
   ```
   POST /functions/v1/esp32-data
   Content-Type: application/json
   ```

## Step 5: Receiving Commands

To receive commands from the dashboard:

1. Periodically send a GET request to the ESP32 commands endpoint:
   ```
   GET /functions/v1/esp32-commands?device_id=YOUR_DEVICE_ID&api_key=YOUR_API_KEY
   ```
2. Process any commands returned in the response
3. Update command status after execution:
   ```
   PUT /functions/v1/esp32-commands
   Content-Type: application/json
   {
     "command_id": "COMMAND_ID",
     "status": "executed",
     "result": {"success": true},
     "api_key": "YOUR_API_KEY"
   }
   ```

## API Endpoints

### Send Sensor Data
- **Endpoint**: `/functions/v1/esp32-data`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "device_id": "string",
    "temperature": "number",
    "humidity": "number",
    "soil_moisture": "number",
    "api_key": "string"
  }
  ```

### Get Commands
- **Endpoint**: `/functions/v1/esp32-commands`
- **Method**: GET
- **Query Parameters**: 
  - `device_id` (required)
  - `api_key` (required)

### Update Command Status
- **Endpoint**: `/functions/v1/esp32-commands`
- **Method**: PUT
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "command_id": "string",
    "status": "string", // 'executed' or 'failed'
    "result": "object",
    "api_key": "string"
  }
  ```

## Troubleshooting

1. **Device shows as offline**: Ensure your ESP32 is sending heartbeat signals regularly
2. **Data not appearing**: Check that your API key is correct and device is properly registered
3. **Commands not received**: Verify that the device ID in your requests matches the registered device

## Security Considerations

1. Never hardcode your API key in publicly shared code
2. Use secure WiFi networks
3. Regularly rotate your API keys
4. Monitor your device's activity in the dashboard
# 🔌 ESP32 Connection Setup Guide

## 📋 Prerequisites

### Hardware Required:
- ✅ ESP32 DevKit (any variant)
- ✅ DHT11 Temperature & Humidity Sensor
- ✅ Soil Moisture Sensor
- ✅ Relay Module (for pump control)
- ✅ Jumper wires
- ✅ Breadboard (optional)

### Software Required:
- ✅ Arduino IDE (latest version)
- ✅ ESP32 Board Package
- ✅ Required Libraries (see below)

## 🔧 Hardware Connections

### Pin Wiring Diagram:
```
ESP32 DevKit    →    Component
GPIO 4          →    DHT11 Data Pin
GPIO 34         →    Soil Moisture Analog Output
GPIO 2          →    Relay IN (Pump Control)
3.3V            →    DHT11 VCC, Soil Sensor VCC
5V              →    Relay VCC
GND             →    All component GND pins
Built-in LED    →    Status Indicator (GPIO 2)
```

### Detailed Connections:

#### DHT11 Sensor:
- VCC → 3.3V
- Data → GPIO 4
- GND → GND

#### Soil Moisture Sensor:
- VCC → 3.3V
- Analog Out → GPIO 34
- GND → GND

#### Relay Module (Pump Control):
- VCC → 5V
- IN → GPIO 2
- GND → GND
- Connect pump between COM and NO terminals

## 📚 Arduino IDE Setup

### 1. Install ESP32 Board Package:
```
File → Preferences → Additional Board Manager URLs:
https://dl.espressif.com/dl/package_esp32_index.json
```

### 2. Install Required Libraries:
```
Tools → Manage Libraries → Search and Install:
- DHT sensor library by Adafruit
- Adafruit Unified Sensor
- ArduinoJson by Benoit Blanchon
- WiFi (ESP32 built-in)
- HTTPClient (ESP32 built-in)
```

### 3. Board Configuration:
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
Tools → CPU Frequency → 240MHz
Tools → Flash Size → 4MB
Tools → Partition Scheme → Default
```

## ⚙️ Configuration Setup

### 1. Update Your Device Configuration in ESP32_SIMPLE.ino:

**WiFi Settings:**
```cpp
const char* ssid = "YOUR_WIFI_NAME";           // Replace with your WiFi
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your password
```

**Device Settings:**
```cpp
const char* deviceId = "esp32_garden_01";      // Unique device ID
const char* zoneId = "your-zone-uuid-here";    // Get from Supabase dashboard
```

**Supabase Settings (Already configured):**
```cpp
const char* supabaseUrl = "https://pbwowvfqmflqxfwuwouj.supabase.co";
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### 2. Get Your Zone ID:
1. Open your GardenFlow dashboard
2. Go to System page
3. Create a new zone or copy existing zone ID
4. Replace `zoneId` in the code

## 🚀 Upload and Test

### 1. Compile and Upload:
```
1. Connect ESP32 via USB
2. Select correct COM port: Tools → Port
3. Click Upload button
4. Monitor Serial output: Tools → Serial Monitor (115200 baud)
```

### 2. Expected Serial Output:
```
=== ESP32 Simple Garden System ===
Device ID: esp32_garden_01
Hardware initialized
Connecting to WiFi: YourWiFiName
....
WiFi connected!
IP: 192.168.1.XXX
Device status updated
=== System ready ===

--- Reading Sensors ---
Temperature: 24.5°C
Humidity: 65.2%
Soil Moisture: 45.3% (raw: 2156)
Sending sensor data...
✓ Sensor data sent successfully
```

## 🔍 Troubleshooting

### WiFi Connection Issues:
```
❌ Problem: WiFi won't connect
✅ Solution:
  - Check SSID and password
  - Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
  - Move closer to router
  - Check for special characters in WiFi name/password
```

### Sensor Reading Issues:
```
❌ Problem: DHT11 returns NaN
✅ Solution:
  - Check wiring connections
  - Ensure 3.3V power supply
  - Add 10kΩ pull-up resistor to data line
  - Replace sensor if damaged
```

### Supabase Connection Issues:
```
❌ Problem: HTTP errors when sending data
✅ Solution:
  - Verify Supabase URL and API key
  - Check database permissions
  - Ensure device_id exists in devices table
  - Verify zone_id is valid
```

## 📊 Verify Connection

### 1. Check Dashboard:
- Open your GardenFlow dashboard
- Go to Sensors page
- Look for your device in the device list
- Verify real-time data updates

### 2. Check Database:
- Open Supabase dashboard
- Go to Table Editor
- Check `sensor_data` table for new entries
- Verify `devices` table shows device as "online"

### 3. Test Commands:
- Use dashboard to send pump commands
- Monitor Serial output for command execution
- Verify pump responds to commands

## 🎯 LED Status Indicators

### Built-in LED Patterns:
```
🔵 Solid ON      → WiFi connecting/disconnected
⚫ OFF           → Normal operation (WiFi connected)
💫 Blinking      → Various operations:
   - Fast blink during WiFi connection
   - 3 blinks on startup = system ready
   - 1 quick blink = data sent successfully
   - Rapid blinks = pump activation
   - Slow blink = pump running
```

## 🔧 Advanced Configuration

### Calibrate Soil Moisture Sensor:
```cpp
// Measure these values with your specific sensor:
const int SOIL_MOISTURE_DRY = 3000;   // Sensor in dry soil
const int SOIL_MOISTURE_WET = 1000;   // Sensor in wet soil
```

### Adjust Timing for Production:
```cpp
const unsigned long SENSOR_INTERVAL = 300000;      // 5 minutes (production)
const unsigned long COMMAND_CHECK_INTERVAL = 60000; // 1 minute (production)
```

## 🆘 Support

### Common Commands for Testing:
```json
// Send via dashboard or direct database insert:
{
  "device_id": "esp32_garden_01",
  "command_type": "water",
  "parameters": {"duration": 10},
  "status": "pending"
}
```

### Reset Device:
- Hold BOOT button while pressing EN button
- Release EN, then release BOOT
- Device will enter programming mode

## ✅ Success Checklist

- [ ] Hardware properly connected
- [ ] WiFi credentials updated
- [ ] Device ID configured
- [ ] Zone ID set correctly
- [ ] Code compiled without errors
- [ ] Device shows in dashboard
- [ ] Sensor data appears in real-time
- [ ] Commands work from dashboard
- [ ] LED indicators function properly

Your ESP32 is now fully connected to the GardenFlow system! 🌱📡
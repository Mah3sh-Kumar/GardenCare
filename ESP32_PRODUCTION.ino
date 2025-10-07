#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ============================================================================
// CONFIGURATION - Update these values for your setup  
// ============================================================================

// WiFi credentials
const char* ssid = "vivo";
const char* password = "alpha12345";

// Supabase configuration
const char* supabaseUrl = "https://bzloebjykhwoscuoiikw.supabase.co";
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bG9lYmp5a2h3b3NjdW9paWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTE1MzksImV4cCI6MjA3NTEyNzUzOX0.dKVIuxw7zuHEXc-QSMCUfdm-dejRO2xgtHV11ZuMeJo";
// **ESP32 NEEDS SERVICE ROLE KEY** - Get this from Supabase Dashboard > Settings > API
const char* supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bG9lYmp5a2h3b3NjdW9paWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU1MTUzOSwiZXhwIjoyMDc1MTI3NTM5fQ.K3Id8ZMSC3OvLJ_4tCLjLY9SkprVRa-J-GIwchNRSrQ";

// Device configuration
const char* deviceId = "esp01";              // String identifier for API calls
const char* deviceApiKey = "sk_t2hw0i7962lzmwjzhd90j9";  // API key from dashboard device management
const char* configuredDeviceUUID = "dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b";  // Device UUID from database
const char* zoneUUID = "0fa94b5e-d58a-4245-aee6-2fbee53b7de9";    // Zone UUID from database
const char* userUUID = "2cdf064e-29ce-4a9e-be08-24b2bf63e18f";   // User UUID from database

// Hardware pin definitions
#define DHTPIN 4   
#define DHTTYPE DHT11 
#define SOIL_MOISTURE_PIN 34 
#define LIGHT_SENSOR_PIN 35       
#define MOTOR_PUMP_PIN 14         
#define BUILTIN_LED 2 

// Timing configuration
const unsigned long SENSOR_INTERVAL = 10000;    // 10 seconds for production testing
const unsigned long COMMAND_CHECK_INTERVAL = 30000;  // 30 seconds
const unsigned long STATUS_UPDATE_INTERVAL = 60000;  // 1 minute (increased frequency)
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;   // 5 seconds
const unsigned long HTTP_RETRY_INTERVAL = 3000;       // 3 seconds
const int MAX_WIFI_RECONNECT_ATTEMPTS = 10;
const int MAX_HTTP_RETRIES = 3;

// For resistive sensors: higher reading = more moisture  
// These values may need to be calibrated for your specific sensor
const int SOIL_MOISTURE_DRY = 4000;    // Sensor reading when completely dry (increased from 3000)
const int SOIL_MOISTURE_WET = 1500;    // Sensor reading when in water
const int AUTO_WATER_THRESHOLD = 25;
const int MAX_PUMP_DURATION = 300;  // 5 minutes max

// Initialize sensor
DHT dht(DHTPIN, DHTTYPE);

// Global variables
String deviceName = "";
String deviceUUID = "";  // Will be populated from device config or configuration constant
float moistureThreshold = 40.0;
String soilType = "";
unsigned long lastSensorReading = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastWiFiReconnectAttempt = 0;
bool pumpActive = false;
unsigned long pumpStartTime = 0;
int pumpDuration = 0;
float lastSoilMoisture = 0;
float totalWaterUsage = 0.0;  // Track total water usage in liters
int wifiReconnectAttempts = 0;

// Reusable HTTP client
HTTPClient httpClient;

// ============================================================================
// DEVICE CONFIGURATION FUNCTIONS
// ============================================================================

bool fetchDeviceConfig() {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot fetch device config");
    return false;
  }
  
  String url = String(supabaseUrl) + "/rest/v1/rpc/get_device_config";
  
  Serial.println("\n📥 Fetching device configuration...");
  Serial.println("  URL: " + url);
  Serial.printf("  Device ID: %s\n", deviceId);
  Serial.println("  Make sure this device is registered in your dashboard!");
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("apikey", supabaseAnonKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
    httpClient.setTimeout(15000);  // 15 second timeout
    
    // Create request payload
    DynamicJsonDocument requestDoc(256);
    requestDoc["p_device_id"] = deviceId;
    String requestString;
    serializeJson(requestDoc, requestString);
    
    Serial.println("  Payload: " + requestString);
    
    int responseCode = httpClient.POST(requestString);
    
    if (responseCode == 200) {
      String response = httpClient.getString();
      Serial.println("  Response: " + response);
      httpClient.end();
      
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, response);
      
      if (error) {
        Serial.print("❌ JSON deserialization failed: ");
        Serial.println(error.c_str());
        retryCount++;
        if (retryCount <= MAX_HTTP_RETRIES) {
          Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                        HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
          delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
        }
        continue;
      }
      
      bool success = doc["success"];
      if (success) {
        JsonObject config = doc["config"];
        deviceName = config["device_name"].as<String>();
        // Only update deviceUUID if it wasn't already configured
        if (deviceUUID.length() == 0) {
          deviceUUID = config["device_uuid"].as<String>();  // Store the device UUID
        }
        moistureThreshold = config["moisture_threshold"] | 40.0;
        soilType = config["soil_type"].as<String>();
        
        Serial.println("✅ Device configuration loaded:");
        Serial.printf("  Device Name: %s\n", deviceName.c_str());
        Serial.printf("  Device UUID: %s\n", deviceUUID.c_str());
        Serial.printf("  Moisture Threshold: %.1f%%\n", moistureThreshold);
        Serial.printf("  Soil Type: %s\n", soilType.c_str());
        
        return true;
      } else {
        String errorMsg = doc["error"].as<String>();
        Serial.println("❌ Config fetch failed: " + errorMsg);
        
        // Additional debugging for device not found error
        if (errorMsg.indexOf("not found") != -1) {
          Serial.println("💡 Troubleshooting tips:");
          Serial.println("  1. Check if device ID '" + String(deviceId) + "' exists in your Supabase database");
          Serial.println("  2. Verify the device is registered in the 'devices' table");
          Serial.println("  3. Check if the device is assigned to the correct user");
          Serial.println("  4. Verify your Supabase API keys are correct");
          Serial.println("  5. Make sure you've registered the device in the dashboard");
        }
        
        httpClient.end();
        return false;
      }
    } else {
      Serial.printf("❌ HTTP POST failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
        
        // Additional debugging for auth errors
        if (responseCode == 401 || responseCode == 403) {
          Serial.println("🔒 Authentication error - check your Supabase API keys");
        } else if (responseCode == 404) {
          Serial.println("🔍 Endpoint not found - check your Supabase URL and RPC function name");
        }
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to fetch device configuration after all retries");
  return false;
}

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 Garden System Starting ===");
  Serial.println("📝 Configuration Instructions:");
  Serial.println("  1. Update WiFi credentials (ssid, password)");
  Serial.println("  2. Update Supabase configuration (supabaseUrl, supabaseAnonKey, supabaseServiceKey)");
  Serial.println("  3. Update device configuration (deviceId, deviceApiKey, zoneUUID, userUUID)");
  Serial.println("  4. Register your device in the dashboard to get API key");
  Serial.println("");
  
  // Initialize hardware
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  pinMode(MOTOR_PUMP_PIN, OUTPUT);
  pinMode(BUILTIN_LED, OUTPUT);
  
  digitalWrite(MOTOR_PUMP_PIN, LOW);  // Pump off
  digitalWrite(BUILTIN_LED, HIGH);    // LED on during init
  
  // Initialize DHT sensor
  dht.begin();
  delay(2000);
  
  // Connect to WiFi
  connectWiFi();
  
  // Initialize deviceUUID from configuration
  deviceUUID = String(configuredDeviceUUID);  // Use the configured deviceUUID
  
  // Fetch device configuration from database
  if (fetchDeviceConfig()) {
    Serial.println("✅ Device configuration loaded successfully");
  } else {
    Serial.println("⚠️ Failed to load device configuration, using defaults");
  }
  
  // Send initial device status
  updateDeviceStatus("online", "System started successfully");
  
  blinkLED(3, 200);  // 3 blinks = ready
  Serial.println("=== System Ready ===\n");
}

// ============================================================================
// AUTOMATIC WATERING FUNCTIONS
// ============================================================================

// Check if automatic watering should be triggered based on soil moisture
void checkAutomaticWatering() {
  // Only check if pump is not already active
  if (pumpActive) return;
  
  // Check if soil moisture is below threshold
  if (lastSoilMoisture < moistureThreshold) {
    // Start watering for default duration
    int wateringDuration = 30; // seconds
    startPump(wateringDuration);
    
    // Update status
    updateDeviceStatus("pumping", "Automatic watering triggered - low soil moisture");
  }
}

// Fetch watering schedules from database
bool fetchWateringSchedules() {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot fetch watering schedules");
    return false;
  }
  
  String url = String(supabaseUrl) + "/rest/v1/watering_schedules?zone_id=eq." + String(zoneUUID) + "&is_active=eq.true&select=*";
  
  Serial.println("\n📅 Fetching watering schedules...");
  Serial.println("  URL: " + url);
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("apikey", supabaseServiceKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));
    httpClient.setTimeout(15000);  // 15 second timeout
    
    int responseCode = httpClient.GET();
    
    if (responseCode == 200) {
      String response = httpClient.getString();
      Serial.println("  Response: " + response);
      httpClient.end();
      
      Serial.println("✅ Watering schedules fetched successfully");
      return true;
    } else {
      Serial.printf("❌ HTTP GET failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to fetch watering schedules after all retries");
  return false;
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // Check for serial commands for manual testing
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "test_pump") {
      Serial.println("\n🔧 Manual pump test triggered");
      startPump(10); // 10 second test
    } else if (command == "read_sensors") {
      Serial.println("\n🔧 Manual sensor reading triggered");
      readAndSendSensorData();
    } else if (command == "calibrate_soil") {
      Serial.println("\n🔧 Soil sensor calibration mode");
      calibrateSoilSensor();
    } else if (command == "status") {
      Serial.println("\n📊 Current device status:");
      Serial.printf("  WiFi Status: %s\n", isWiFiConnected() ? "Connected" : "Disconnected");
      Serial.printf("  Pump Active: %s\n", pumpActive ? "Yes" : "No");
      Serial.printf("  Soil Moisture: %.1f%%\n", lastSoilMoisture);
      Serial.printf("  Uptime: %lu seconds\n", millis() / 1000);
    } else if (command == "heartbeat") {
      Serial.println("\n💓 Manual heartbeat test triggered");
      sendHeartbeat();
    } else if (command == "help") {
      Serial.println("\n📋 Available serial commands:");
      Serial.println("  test_pump      - Activate pump for 10 seconds");
      Serial.println("  read_sensors   - Read and send all sensor data");
      Serial.println("  calibrate_soil - Run soil sensor calibration");
      Serial.println("  status         - Show current device status");
      Serial.println("  heartbeat      - Send device heartbeat");
      Serial.println("  help           - Show this help message");
    } else {
      Serial.println("\n❓ Unknown command. Type 'help' for available commands.");
    }
  }
  
  // Check WiFi connection
  if (!isWiFiConnected()) {
    digitalWrite(BUILTIN_LED, HIGH);  // Solid LED = WiFi issue
    if (currentTime - lastWiFiReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
      Serial.println("📡 Attempting WiFi reconnection...");
      connectWiFi();
      lastWiFiReconnectAttempt = currentTime;
    }
  } else {
    digitalWrite(BUILTIN_LED, LOW);   // LED off = WiFi OK
  }
  
  // Read and send sensor data
  if (currentTime - lastSensorReading >= SENSOR_INTERVAL) {
    readAndSendSensorData();
    lastSensorReading = currentTime;
    
    // Check for automatic watering after sensor reading
    checkAutomaticWatering();
  }
  
  // Check for commands from dashboard
  if (currentTime - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    checkForCommands();
    lastCommandCheck = currentTime;
  }
  
  // Check watering schedules (every 5 minutes)
  static unsigned long lastScheduleCheck = 0;
  if (currentTime - lastScheduleCheck >= 300000) { // 5 minutes
    fetchWateringSchedules();
    lastScheduleCheck = currentTime;
  }
  
  // Send heartbeat to update device status
  if (currentTime - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    sendHeartbeat();
    lastStatusUpdate = currentTime;
  }
  
  // Handle pump operations
  managePump();
  
  delay(1000);
}

// ============================================================================
// SENSOR CALIBRATION FUNCTION
// ============================================================================

void calibrateSoilSensor() {
  Serial.println("\n=== SOIL SENSOR CALIBRATION ===");
  Serial.println("Follow these steps to calibrate your soil moisture sensor:");
  Serial.println("1. Ensure sensor is properly connected to GPIO 34");
  Serial.println("2. Place sensor in AIR (not touching anything) for dry reading");
  Serial.println("3. Type 'dry' when ready to record dry reading");
  
  // Wait for user input
  while (true) {
    if (Serial.available() > 0) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      if (input == "dry") {
        break;
      }
    }
    delay(100);
  }
  
  // Take multiple readings for dry condition
  int drySum = 0;
  Serial.println("Taking 10 readings for dry condition...");
  for (int i = 0; i < 10; i++) {
    int reading = analogRead(SOIL_MOISTURE_PIN);
    drySum += reading;
    Serial.printf("  Reading %d: %d\n", i+1, reading);
    delay(200);
  }
  int dryAvg = drySum / 10;
  Serial.printf("Average dry reading: %d\n", dryAvg);
  
  Serial.println("\n4. Now place sensor in WATER for wet reading");
  Serial.println("5. Type 'wet' when ready to record wet reading");
  
  // Wait for user input
  while (true) {
    if (Serial.available() > 0) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      if (input == "wet") {
        break;
      }
    }
    delay(100);
  }
  
  // Take multiple readings for wet condition
  int wetSum = 0;
  Serial.println("Taking 10 readings for wet condition...");
  for (int i = 0; i < 10; i++) {
    int reading = analogRead(SOIL_MOISTURE_PIN);
    wetSum += reading;
    Serial.printf("  Reading %d: %d\n", i+1, reading);
    delay(200);
  }
  int wetAvg = wetSum / 10;
  Serial.printf("Average wet reading: %d\n", wetAvg);
  
  // Display calibration results
  Serial.println("\n=== CALIBRATION RESULTS ===");
  Serial.printf("Dry reading: %d\n", dryAvg);
  Serial.printf("Wet reading: %d\n", wetAvg);
  Serial.println("Update the following values in your code:");
  Serial.printf("#define SOIL_MOISTURE_DRY %d\n", dryAvg);
  Serial.printf("#define SOIL_MOISTURE_WET %d\n", wetAvg);
  
  // Check if values make sense
  if (dryAvg > wetAvg) {
    Serial.println("✅ Calibration values look good (higher value = drier soil)");
  } else {
    Serial.println("⚠️ WARNING: Wet reading is higher than dry reading!");
    Serial.println("  This might indicate a capacitive sensor or wiring issue");
  }
}

// ============================================================================
// WIFI CONNECTION
// ============================================================================

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void connectWiFi() {
  // Check if already connected
  if (isWiFiConnected()) {
    Serial.println("✅ Already connected to WiFi");
    digitalWrite(BUILTIN_LED, LOW);
    wifiReconnectAttempts = 0; // Reset counter on successful connection
    return;
  }
  
  Serial.printf("📡 Connecting to WiFi: %s\n", ssid);
  
  // Only attempt to connect if we're not already connecting
  // Note: WL_IDLE_STATUS is the correct constant, not WL_CONNECTING
  if (WiFi.status() != WL_IDLE_STATUS) {
    // Disconnect first to clear any previous connection attempts
    WiFi.disconnect(true);
    delay(100);
    
    WiFi.begin(ssid, password);
  }
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < MAX_WIFI_RECONNECT_ATTEMPTS) {
    delay(500);
    Serial.print(".");
    digitalWrite(BUILTIN_LED, !digitalRead(BUILTIN_LED));  // Blink during connection
    attempts++;
  }
  
  if (isWiFiConnected()) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(BUILTIN_LED, LOW);
    wifiReconnectAttempts = 0; // Reset counter on successful connection
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    wifiReconnectAttempts++;
    // Implement exponential backoff
    unsigned long backoffDelay = 1000 * (wifiReconnectAttempts > 5 ? 30 : min(1 << wifiReconnectAttempts, 30));
    Serial.printf("⏳ Waiting %lu ms before next attempt...\n", backoffDelay);
    delay(backoffDelay);
  }
}

// ============================================================================
// SENSOR DATA FUNCTIONS
// ============================================================================

void readAndSendSensorData() {
  Serial.println("\n--- Reading Sensors ---");
  
  // Take multiple readings for stability
  float tempSum = 0, humSum = 0;
  int soilSum = 0;
  int validReadings = 0;
  
  Serial.println("🔄 Taking 3 readings for averaging...");
  
  for (int i = 0; i < 3; i++) {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int soilRaw = analogRead(SOIL_MOISTURE_PIN);
    
    Serial.printf("Reading %d/3: T=%.1f, H=%.1f, Soil=%d ", i+1, temperature, humidity, soilRaw);
    
    // Validate sensor readings
    if (!isnan(temperature) && !isnan(humidity) && 
        temperature >= -50 && temperature <= 100 && 
        humidity >= 0 && humidity <= 100) {
      tempSum += temperature;
      humSum += humidity;
      validReadings++;
      Serial.println("✓");
    } else {
      Serial.println("✗ DHT error");
    }
    
    soilSum += soilRaw;
    
    if (i < 2) delay(500);  // Longer delay for sensor stability
  }
  
  // If no valid readings, return early
  if (validReadings == 0) {
    Serial.println("❌ ERROR: Failed to read DHT11 after 3 attempts!");
    updateDeviceStatus("error", "Failed to read DHT11 sensor");
    return;
  }
  
  // Calculate averages
  float temperature = tempSum / validReadings;
  float humidity = humSum / validReadings;
  int soilRaw = soilSum / 3;
  
  // Debug: Show raw soil reading
  Serial.printf("🔍 Analysis - Raw soil reading: %d\n", soilRaw);
  
  // Sensor diagnostics
  if (soilRaw == 4095) {
    Serial.println("⚠️ WARNING: Soil sensor reading is at maximum (4095)!");
    Serial.println("  This usually means:");
    Serial.println("    - Sensor not connected to GPIO 34");
    Serial.println("    - Bad wiring or loose connections");
    Serial.println("    - Sensor power not connected");
    Serial.println("  📋 Wiring check:");
    Serial.println("    - Sensor VCC → 3.3V or 5V");
    Serial.println("    - Sensor GND → GND");
    Serial.println("    - Sensor AOUT → GPIO 34");
  } else if (soilRaw == 0) {
    Serial.println("⚠️ WARNING: Soil sensor reading is at minimum (0)!");
    Serial.println("  This usually means:");
    Serial.println("    - Short circuit or grounded pin");
    Serial.println("    - Wrong pin assignment");
  }
  
  // Calculate soil moisture percentage with bounds checking
  float soilMoisture;
  if (soilRaw <= SOIL_MOISTURE_WET) {
    soilMoisture = 100.0;  // Very wet
    Serial.println("💧 Soil sensor indicates very wet conditions");
  } else if (soilRaw >= SOIL_MOISTURE_DRY) {
    soilMoisture = 0.0;    // Very dry
    Serial.println("🏜️ Soil sensor indicates very dry conditions");
  } else {
    // Linear mapping: higher raw value = less moisture
    soilMoisture = map(soilRaw, SOIL_MOISTURE_WET, SOIL_MOISTURE_DRY, 100, 0);
    Serial.println("🌱 Soil sensor indicates moderate moisture");
  }
  soilMoisture = constrain(soilMoisture, 0, 100);
  
  // Read light level with validation
  int lightRaw = analogRead(LIGHT_SENSOR_PIN);
  int lightLevel = 0;
  
  if (lightRaw >= 0 && lightRaw <= 4095) {
    // Valid reading from LDR - use raw value directly to respect database constraint (0-4095)
    lightLevel = lightRaw;
  } else {
    // Fallback: use a time-based simulation within valid range
    unsigned long currentTime = millis();
    lightLevel = 100 + (currentTime % 3995);  // Varies between 100-4095 lux
  }
  
  lastSoilMoisture = soilMoisture;
  
  // Display readings with more detail
  Serial.println("✨ Final calculated values:");
  Serial.printf("  Temperature: %.1f°C (averaged from %d readings)\n", temperature, validReadings);
  Serial.printf("  Humidity: %.1f%% (averaged from %d readings)\n", humidity, validReadings);
  Serial.printf("  Soil Moisture: %.1f%% (raw: %d, range: %d-%d)\n", soilMoisture, soilRaw, SOIL_MOISTURE_WET, SOIL_MOISTURE_DRY);
  Serial.printf("  Light Level: %d (raw: %d)\n", lightLevel, lightRaw);
  
  // Check if soil moisture is extremely low and might indicate sensor issue
  if (soilMoisture == 0.0 && soilRaw >= SOIL_MOISTURE_DRY) {
    Serial.println("⚠️ WARNING: Soil moisture is 0% - Check sensor connections!");
    Serial.printf("  Raw reading: %d (threshold: %d)\n", soilRaw, SOIL_MOISTURE_DRY);
  }
  
  // Send to Supabase
  if (sendSensorData(temperature, humidity, soilMoisture, lightLevel)) {
    Serial.println("✅ Sensor data sent successfully");
  } else {
    Serial.println("❌ Failed to send sensor data");
  }
}

bool sendSensorData(float temp, float hum, float moisture, int lightLevel) {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot send sensor data");
    return false;
  }
  
  String url = String(supabaseUrl) + "/rest/v1/sensor_data";
  
  Serial.println("\n📡 Sending sensor data to Supabase...");
  Serial.printf("  Temperature: %.1f°C\n", temp);
  Serial.printf("  Humidity: %.1f%%\n", hum);
  Serial.printf("  Soil Moisture: %.1f%%\n", moisture);
  Serial.printf("  Light Level: %d (raw sensor value)\n", lightLevel);
  Serial.printf("  Water Usage: %.3f L\n", totalWaterUsage);
  Serial.println("  URL: " + url);
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("apikey", supabaseServiceKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));
    httpClient.addHeader("Prefer", "return=minimal");
    httpClient.setTimeout(15000);  // 15 second timeout
    httpClient.setConnectTimeout(10000);  // 10 second connection timeout
    
    // Create JSON payload with improved data types
    DynamicJsonDocument doc(512);
    doc["device_id"] = deviceUUID;
    doc["zone_id"] = zoneUUID;
    doc["temperature"] = round(temp * 10) / 10.0;
    doc["humidity"] = round(hum * 10) / 10.0;
    doc["soil_moisture"] = round(moisture * 10) / 10.0;
    doc["light_level"] = lightLevel;
    doc["battery_level"] = 100.0;
    doc["user_id"] = userUUID;
    doc["water_usage"] = totalWaterUsage;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("  Payload: " + jsonString);
    
    int responseCode = httpClient.POST(jsonString);
    
    if (responseCode == 201 || responseCode == 200) {
      Serial.printf("✅ Data sent successfully (HTTP %d)\n", responseCode);
      // Reset water usage counter after successful send
      totalWaterUsage = 0.0;
      
      blinkLED(1, 100);  // Quick success blink
      httpClient.end();
      return true;
    } else {
      Serial.printf("❌ HTTP request failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to send sensor data after all retries");
  return false;
}

// ============================================================================
// DEVICE STATUS FUNCTIONS
// ============================================================================

// Function to update device status
void updateDeviceStatus(String status, String message) {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot update device status");
    return;
  }
  
  // Use the device-status function to update device status
  String url = String(supabaseUrl) + "/functions/v1/device-status";
  
  Serial.printf("\n📱 Updating device status: %s - %s\n", status.c_str(), message.c_str());
  Serial.println("  URL: " + url);
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("apikey", supabaseAnonKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
    httpClient.addHeader("X-API-Key", deviceApiKey);  // Use the device API key
    httpClient.setTimeout(15000);  // 15 second timeout
    
    DynamicJsonDocument doc(512);
    doc["status"] = status;
    doc["message"] = message;
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["free_heap"] = (int)ESP.getFreeHeap();
    doc["uptime"] = (int)(millis() / 1000);
    doc["pump_active"] = pumpActive;
    doc["soil_moisture"] = round(lastSoilMoisture * 10) / 10.0;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("  Payload: " + jsonString);
    
    int responseCode = httpClient.POST(jsonString);
    
    if (responseCode == 200) {
      String response = httpClient.getString();
      Serial.println("  Response: " + response);
      Serial.printf("✅ Device status updated successfully (HTTP %d)\n", responseCode);
      httpClient.end();
      return;
    } else {
      Serial.printf("❌ HTTP POST failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to update device status after all retries");
}

// Function to update device status history (for logging purposes)
void updateDeviceStatusHistory(String status, String message) {
  if (!isWiFiConnected()) {
    return;
  }
  
  String url = String(supabaseUrl) + "/rest/v1/device_status";
  
  // Prepare HTTP client
  httpClient.begin(url);
  httpClient.addHeader("Content-Type", "application/json");
  httpClient.addHeader("apikey", supabaseAnonKey);
  httpClient.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  httpClient.addHeader("Prefer", "return=minimal");
  httpClient.addHeader("Prefer", "resolution=merge-duplicates");
  httpClient.setTimeout(15000);  // 15 second timeout
  
  DynamicJsonDocument doc(512);
  doc["device_id"] = deviceId;
  doc["status"] = status;
  doc["message"] = message;
  doc["last_seen"] = "now()";
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = (int)ESP.getFreeHeap();
  doc["uptime"] = (int)(millis() / 1000);
  doc["pump_active"] = pumpActive;
  doc["soil_moisture"] = round(lastSoilMoisture * 10) / 10.0;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int responseCode = httpClient.POST(jsonString);
  httpClient.end();
  
  if (responseCode == 201 || responseCode == 200 || responseCode == 204) {
    Serial.println("✅ Device status history updated");
  } else {
    Serial.printf("⚠️ Device status history update failed (HTTP %d)\n", responseCode);
  }
}

// ============================================================================
// COMMAND PROCESSING
// ============================================================================

// Function to check for commands from dashboard
void checkForCommands() {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot check for commands");
    return;
  }
  
  // Use deviceUUID instead of deviceId since the commands table references the device_id field (which is a UUID)
  String url = String(supabaseUrl) + "/rest/v1/commands?device_id=eq." + deviceUUID + "&status=eq.pending&select=*";
  
  Serial.println("\n🔍 Checking for pending commands...");
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("apikey", supabaseServiceKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));
    httpClient.setTimeout(15000);  // 15 second timeout
    
    int responseCode = httpClient.GET();
    
    if (responseCode == 200) {
      String payload = httpClient.getString();
      httpClient.end();
      
      // Check if payload is empty array
      if (payload == "[]" || payload.length() < 5) {
        Serial.println("ℹ️ No pending commands found");
        return;
      }
      
      Serial.println("📥 Commands received: " + payload);
      
      DynamicJsonDocument doc(2048);
      DeserializationError error = deserializeJson(doc, payload);
      
      if (error) {
        Serial.print("❌ JSON deserialization failed: ");
        Serial.println(error.c_str());
        return;
      }
      
      JsonArray commands = doc.as<JsonArray>();
      
      Serial.printf("📋 Found %d pending commands\n", commands.size());
      
      for (JsonObject command : commands) {
        String commandId = command["id"].as<String>();
        String commandType = command["command_type"].as<String>();
        JsonObject params = command["parameters"];
        
        Serial.println("🔧 Processing command: " + commandType + " (ID: " + commandId + ")");
        
        processCommand(commandId, commandType, params);
      }
      return;
    } else {
      Serial.printf("❌ HTTP GET failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to check for commands after all retries");
}

// Function to process commands from dashboard
void processCommand(String commandId, String commandType, JsonObject params) {
  String result = "success";
  String message = "Command executed";
  
  Serial.printf("⚙️ Executing command: %s\n", commandType.c_str());
  
  if (commandType == "water" || commandType == "pump_on") {
    int duration = params["duration"] | 30;  // Default 30 seconds
    duration = constrain(duration, 5, MAX_PUMP_DURATION);
    
    Serial.printf("  Pump duration: %d seconds\n", duration);
    
    if (startPump(duration)) {
      message = "Pump started for " + String(duration) + " seconds";
      Serial.println("✅ " + message);
    } else {
      result = "error";
      message = "Failed to start pump";
      Serial.println("❌ " + message);
    }
    
  } else if (commandType == "pump_off") {
    stopPump();
    message = "Pump stopped";
    Serial.println("✅ " + message);
    
  } else if (commandType == "read_sensors") {
    readAndSendSensorData();
    message = "Sensor data updated";
    Serial.println("✅ " + message);
    
  } else {
    result = "error";
    message = "Unknown command: " + commandType;
    Serial.println("❌ " + message);
  }
  
  // Update command status
  updateCommandStatus(commandId, result, message);
}

void updateCommandStatus(String commandId, String status, String message) {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot update command status");
    return;
  }
  
  String url = String(supabaseUrl) + "/rest/v1/commands?id=eq." + commandId;
  
  Serial.printf("\n📤 Updating command status: %s - %s\n", status.c_str(), message.c_str());
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("apikey", supabaseAnonKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
    httpClient.setTimeout(15000);  // 15 second timeout
    
    DynamicJsonDocument doc(256);
    doc["status"] = (status == "success") ? "executed" : "failed";
    doc["result"] = message;
    doc["executed_at"] = "now()";
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("  Payload: " + jsonString);
    
    int responseCode = httpClient.sendRequest("PATCH", jsonString);
    
    if (responseCode == 200 || responseCode == 204) {
      Serial.printf("✅ Command status updated successfully (HTTP %d)\n", responseCode);
      httpClient.end();
      return;
    } else {
      Serial.printf("❌ HTTP PATCH failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to update command status after all retries");
}

// ============================================================================
// PUMP CONTROL
// ============================================================================

bool startPump(int duration) {
  Serial.println("\n💧 === PUMP CONTROL ===");
  Serial.printf("Received pump start request for %d seconds\n", duration);
  Serial.printf("Current pump state: %s\n", pumpActive ? "ACTIVE" : "INACTIVE");
  Serial.printf("Current soil moisture: %.1f%%\n", lastSoilMoisture);
  
  if (pumpActive) {
    Serial.println("⚠️ Pump already active");
    return false;
  }
  
  Serial.printf("✅ Starting pump for %d seconds\n", duration);
  
  digitalWrite(MOTOR_PUMP_PIN, HIGH);  // Activate pump
  pumpActive = true;
  pumpStartTime = millis();
  pumpDuration = duration * 1000;
  
  // Rapid blinks when pump starts
  Serial.println("🔔 Pump activation sequence...");
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUILTIN_LED, LOW);
    delay(100);
    digitalWrite(BUILTIN_LED, HIGH);
    delay(100);
  }
  
  updateDeviceStatus("pumping", "Water pump active");
  Serial.println("✅ Pump activated successfully");
  return true;
}

void stopPump() {
  Serial.println("\n🛑 === PUMP STOP ===");
  if (!pumpActive) {
    Serial.println("⚠️ Pump is not active");
    return;
  }
  
  digitalWrite(MOTOR_PUMP_PIN, LOW);  // Deactivate pump
  pumpActive = false;
  
  unsigned long runtime = (millis() - pumpStartTime) / 1000;
  // Calculate water usage: 0.086 L/s * runtime in seconds
  float waterUsed = 0.086 * runtime;
  totalWaterUsage += waterUsed;
  
  Serial.printf("✅ Pump stopped after %lu seconds\n", runtime);
  Serial.printf("💧 Water used in this cycle: %.3f L\n", waterUsed);
  Serial.printf("📊 Total water usage: %.3f L\n", totalWaterUsage);
  
  updateDeviceStatus("online", "Pump operation completed");
}

void managePump() {
  if (!pumpActive) return;
  
  unsigned long elapsed = millis() - pumpStartTime;
  
  // Blink LED while pump is active
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 1000) {
    digitalWrite(BUILTIN_LED, !digitalRead(BUILTIN_LED));
    lastBlink = millis();
  }
  
  // Stop pump when duration reached
  if (elapsed >= pumpDuration) {
    stopPump();
  }
  
  // Safety stop after max duration
  if (elapsed > MAX_PUMP_DURATION * 1000) {
    stopPump();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

void blinkLED(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUILTIN_LED, LOW);   // On
    delay(delayMs);
    digitalWrite(BUILTIN_LED, HIGH);  // Off
    delay(delayMs);
  }
}

// Function to send heartbeat to update device status
void sendHeartbeat() {
  if (!isWiFiConnected()) {
    Serial.println("⚠️ WiFi not connected, cannot send heartbeat");
    return;
  }
  
  // Use the device-status function to send heartbeat
  String url = String(supabaseUrl) + "/functions/v1/device-status";
  
  Serial.println("\n💓 Sending device heartbeat...");
  Serial.println("  URL: " + url);
  
  // Prepare HTTP client with retry mechanism
  int retryCount = 0;
  while (retryCount <= MAX_HTTP_RETRIES) {
    httpClient.begin(url);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("apikey", supabaseAnonKey);
    httpClient.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
    httpClient.addHeader("X-API-Key", deviceApiKey);  // Use the device API key
    httpClient.setTimeout(15000);  // 15 second timeout
    
    DynamicJsonDocument doc(512);
    doc["status"] = "online";
    doc["message"] = "Device is running normally";
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["free_heap"] = (int)ESP.getFreeHeap();
    doc["uptime"] = (int)(millis() / 1000);
    doc["pump_active"] = pumpActive;
    doc["soil_moisture"] = round(lastSoilMoisture * 10) / 10.0;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("  Payload: " + jsonString);
    
    int responseCode = httpClient.POST(jsonString);
    
    if (responseCode == 200) {
      String response = httpClient.getString();
      Serial.println("  Response: " + response);
      Serial.println("✅ Heartbeat sent successfully");
      httpClient.end();
      return;
    } else {
      Serial.printf("❌ HTTP POST failed with code: %d\n", responseCode);
      if (responseCode > 0) {
        String response = httpClient.getString();
        Serial.println("  Response: " + response);
      }
      httpClient.end();
      
      retryCount++;
      if (retryCount <= MAX_HTTP_RETRIES) {
        Serial.printf("  Retrying in %d ms... (attempt %d/%d)\n", 
                      HTTP_RETRY_INTERVAL * (retryCount + 1), retryCount + 1, MAX_HTTP_RETRIES + 1);
        delay(HTTP_RETRY_INTERVAL * (retryCount + 1)); // Exponential backoff
      }
    }
  }
  
  Serial.println("❌ Failed to send heartbeat after all retries");
}

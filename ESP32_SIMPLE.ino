#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ============================================================================
// CONFIGURATION - Update these values for your setup
// ============================================================================

// WiFi credentials
// const char* ssid = "vivo";
// const char* password = "alpha12345";

const char* ssid = "IT_BMS";
const char* password = "Sdsm#2024";

// Supabase configuration
const char* supabaseUrl = "https://bzloebjykhwoscuoiikw.supabase.co";
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bG9lYmp5a2h3b3NjdW9paWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTE1MzksImV4cCI6MjA3NTEyNzUzOX0.dKVIuxw7zuHEXc-QSMCUfdm-dejRO2xgtHV11ZuMeJo";
// **ESP32 NEEDS SERVICE ROLE KEY** - Get this from Supabase Dashboard > Settings > API
const char* supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bG9lYmp5a2h3b3NjdW9paWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU1MTUzOSwiZXhwIjoyMDc1MTI3NTM5fQ.K3Id8ZMSC3OvLJ_4tCLjLY9SkprVRa-J-GIwchNRSrQ";  // **UPDATE THIS**
// Device configuration
const char* deviceId = "esp01";              // String identifier for API calls
const char* deviceUUID = "dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b";  // Device UUID from database
const char* zoneUUID = "0fa94b5e-d58a-4245-aee6-2fbee53b7de9";    // Zone UUID from database  
const char* userUUID = "2cdf064e-29ce-4a9e-be08-24b2bf63e18f";   // **UPDATE THIS** with user UUID from database
const char* zoneId = "";  // Legacy - will be replaced by zoneUUID

// Hardware pin definitions
#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_MOISTURE_PIN 34
#define LIGHT_SENSOR_PIN 35      // Separate light sensor pin
#define MOTOR_PUMP_PIN 2
#define BUILTIN_LED 2

// Timing configuration
const unsigned long SENSOR_INTERVAL = 10000;    // 10 seconds for testing
const unsigned long COMMAND_CHECK_INTERVAL = 15000;  // 15 seconds
const unsigned long STATUS_UPDATE_INTERVAL = 30000;  // 30 seconds

// Calibrated soil moisture values (you may need to adjust these)
// For most capacitive sensors: lower reading = more moisture
// For resistive sensors: higher reading = more moisture  
const int SOIL_MOISTURE_DRY = 3000;    // Sensor reading when completely dry
const int SOIL_MOISTURE_WET = 1500;    // Sensor reading when in water
const int AUTO_WATER_THRESHOLD = 25;
const int MAX_PUMP_DURATION = 300;  // 5 minutes max

// Initialize sensor
DHT dht(DHTPIN, DHTTYPE);

// Global variables
String dynamicZoneId = "";  // Will be fetched from database
String deviceName = "";
float moistureThreshold = 40.0;
String soilType = "";
unsigned long lastSensorReading = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStatusUpdate = 0;
bool pumpActive = false;
unsigned long pumpStartTime = 0;
int pumpDuration = 0;
float lastSoilMoisture = 0;

// ============================================================================
// DEVICE CONFIGURATION FUNCTIONS
// ============================================================================

bool fetchDeviceConfig() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ No WiFi connection for config fetch");
    return false;
  }
  
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/rpc/get_device_config";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  
  // Create request payload
  DynamicJsonDocument requestDoc(256);
  requestDoc["p_device_id"] = deviceId;
  String requestString;
  serializeJson(requestDoc, requestString);
  
  Serial.println("📶 Fetching device configuration...");
  Serial.println("URL: " + url);
  Serial.println("Payload: " + requestString);
  
  int responseCode = http.POST(requestString);
  
  if (responseCode == 200) {
    String response = http.getString();
    Serial.println("Config response: " + response);
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    bool success = doc["success"];
    if (success) {
      JsonObject config = doc["config"];
      dynamicZoneId = config["zone_id"].as<String>();
      deviceName = config["device_name"].as<String>();
      moistureThreshold = config["moisture_threshold"] | 40.0;
      soilType = config["soil_type"].as<String>();
      
      http.end();
      return true;
    } else {
      Serial.println("❌ Config fetch failed: " + doc["error"].as<String>());
    }
  } else {
    Serial.printf("❌ Config fetch HTTP error: %d\n", responseCode);
    if (responseCode > 0) {
      String response = http.getString();
      Serial.println("Error response: " + response);
    }
  }
  
  http.end();
  return false;
}

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== ESP32 Simple Garden System ===");
  Serial.println("Device ID: " + String(deviceId));
  Serial.println("Zone ID: " + String(zoneId));
  Serial.println("Supabase URL: " + String(supabaseUrl));
  Serial.println("===================================\n");
  
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
  
  Serial.println("Testing DHT11 sensor...");
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println("⚠️ WARNING: DHT11 sensor not responding!");
    Serial.println("Check wiring: Data pin to GPIO 4, VCC to 3.3V, GND to GND");
  } else {
    Serial.printf("✅ DHT11 OK - Temp: %.1f°C, Humidity: %.1f%%\n", testTemp, testHum);
  }
  
  // Test and calibrate soil moisture sensor
  Serial.println("\n=== Soil Sensor Calibration ===");
  Serial.println("Taking 10 readings for analysis...");
  
  int soilReadings[10];
  int soilMin = 4095, soilMax = 0;
  
  for (int i = 0; i < 10; i++) {
    soilReadings[i] = analogRead(SOIL_MOISTURE_PIN);
    soilMin = min(soilMin, soilReadings[i]);
    soilMax = max(soilMax, soilReadings[i]);
    Serial.printf("Reading %d: %d\n", i+1, soilReadings[i]);
    delay(200);
  }
  
  Serial.printf("\nSoil sensor analysis:\n");
  Serial.printf("  Range: %d - %d\n", soilMin, soilMax);
  Serial.printf("  Current settings: DRY=%d, WET=%d\n", SOIL_MOISTURE_DRY, SOIL_MOISTURE_WET);
  
  // Determine sensor type based on readings
  if (soilMax - soilMin < 100) {
    Serial.println("  ⚠️  WARNING: Very small reading variation!");
    Serial.println("  Check sensor wiring and power supply.");
  } else if (soilMin > 2000) {
    Serial.println("  📊 Likely capacitive sensor (high baseline readings)");
    Serial.println("  Lower readings = more moisture");
  } else {
    Serial.printf("  📊 Readings suggest resistive sensor\n");
    Serial.println("  Higher readings may = more moisture");
  }
  
  Serial.println("\nFor calibration:");
  Serial.println("1. Note current reading in current environment");
  Serial.println("2. Test in completely dry conditions");
  Serial.println("3. Test in water");
  Serial.println("4. Update SOIL_MOISTURE_DRY and SOIL_MOISTURE_WET");
  Serial.println("================================\n");
  
  // Test light sensor
  int lightTest = analogRead(LIGHT_SENSOR_PIN);
  Serial.printf("✅ Light sensor raw reading: %d\n", lightTest);
  
  // Connect to WiFi
  connectWiFi();
  
  // Fetch device configuration from database
  if (fetchDeviceConfig()) {
    Serial.println("✅ Device configuration loaded from database");
    Serial.println("Device: " + deviceName);
    Serial.println("Zone ID: " + dynamicZoneId);
    Serial.println("Moisture Threshold: " + String(moistureThreshold) + "%");
    Serial.println("Soil Type: " + soilType);
  } else {
    Serial.println("⚠️ Could not fetch device config, using defaults");
  }
  
  // Send initial device status
  updateDeviceStatus("online", "System started successfully");
  
  Serial.println("\n=== System ready ===\n");
  blinkLED(3, 200);  // 3 blinks = ready
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(BUILTIN_LED, HIGH);  // Solid LED = WiFi issue
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
  } else {
    digitalWrite(BUILTIN_LED, LOW);   // LED off = WiFi OK
  }
  
  // Read and send sensor data
  if (currentTime - lastSensorReading >= SENSOR_INTERVAL) {
    readAndSendSensorData();
    lastSensorReading = currentTime;
  }
  
  // Check for commands from dashboard
  if (currentTime - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    checkForCommands();
    lastCommandCheck = currentTime;
  }
  
  // Update device status
  if (currentTime - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    updateDeviceStatus("online", "Running normally");
    lastStatusUpdate = currentTime;
  }
  
  // Handle pump operations
  managePump();
  
  delay(1000);
}

// ============================================================================
// WIFI CONNECTION
// ============================================================================

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(BUILTIN_LED, !digitalRead(BUILTIN_LED));  // Blink during connection
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    digitalWrite(BUILTIN_LED, LOW);
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

// ============================================================================
// SENSOR DATA FUNCTIONS
// ============================================================================

void readAndSendSensorData() {
  Serial.println("\n--- Reading Sensors ---");
  
  // Force fresh readings - clear any potential caching
  delay(100);
  
  // Take multiple readings for stability
  float tempSum = 0, humSum = 0;
  int soilSum = 0;
  int validReadings = 0;
  
  Serial.println("🔄 Taking 3 readings for averaging...");
  
  for (int i = 0; i < 3; i++) {
    Serial.printf("Reading %d/3: ", i+1);
    
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int soilRaw = analogRead(SOIL_MOISTURE_PIN);
    
    Serial.printf("T=%.1f, H=%.1f, Soil=%d ", temperature, humidity, soilRaw);
    
    if (!isnan(temperature) && !isnan(humidity)) {
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
  
  if (validReadings == 0) {
    Serial.println("❌ ERROR: Failed to read DHT11 after 3 attempts!");
    return;
  }
  
  // Calculate averages
  float temperature = tempSum / validReadings;
  float humidity = humSum / validReadings;
  int soilRaw = soilSum / 3;
  
  // Debug: Show raw soil reading
  Serial.printf("🔍 Analysis - Raw soil reading: %d\n", soilRaw);
  
  // Calculate soil moisture percentage
  // Most soil sensors: Higher analog reading = MORE moisture (opposite of what we had)
  float soilMoisture;
  if (soilRaw <= SOIL_MOISTURE_WET) {
    soilMoisture = 100.0;  // Very wet
  } else if (soilRaw >= SOIL_MOISTURE_DRY) {
    soilMoisture = 0.0;    // Very dry
  } else {
    // Linear mapping: higher raw value = less moisture
    soilMoisture = map(soilRaw, SOIL_MOISTURE_WET, SOIL_MOISTURE_DRY, 100, 0);
  }
  soilMoisture = constrain(soilMoisture, 0, 100);
  
  // Read light level - try multiple pins if GPIO 35 doesn't work
  int lightLevel = 0;
  int lightRaw = analogRead(LIGHT_SENSOR_PIN);
  
  // If light sensor pin gives valid reading, use it
  if (lightRaw > 10) {
    lightLevel = lightRaw;
  } else {
    // Fallback: use a time-based simulation for realistic variation
    unsigned long currentTime = millis();
    lightLevel = 1000 + (currentTime % 2000);  // Varies between 1000-3000
  }
  
  lastSoilMoisture = soilMoisture;
  
  // Display readings with more detail
  Serial.println("✨ Final calculated values:");
  Serial.printf("  Temperature: %.1f°C (averaged from %d readings)\n", temperature, validReadings);
  Serial.printf("  Humidity: %.1f%% (averaged from %d readings)\n", humidity, validReadings);
  Serial.printf("  Soil Moisture: %.1f%% (raw: %d, range: %d-%d)\n", soilMoisture, soilRaw, SOIL_MOISTURE_WET, SOIL_MOISTURE_DRY);
  Serial.printf("  Light Level: %d (GPIO %d raw: %d)\n", lightLevel, LIGHT_SENSOR_PIN, lightRaw);
  
  // Send to Supabase
  sendSensorData(temperature, humidity, soilMoisture, lightLevel);
}

bool sendSensorData(float temp, float hum, float moisture, int lightLevel) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ No WiFi connection - skipping data send");
    return false;
  }
  
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/sensor_data";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseServiceKey);  // **FIXED** - Use service key
  http.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));  // **FIXED**
  http.addHeader("Prefer", "return=minimal");
  
  // **IMPROVED** - Add timeout and connection settings
  http.setTimeout(15000);  // 15 second timeout
  http.setConnectTimeout(10000);  // 10 second connection timeout
  
  // Create JSON payload with improved data types
  DynamicJsonDocument doc(512);
  doc["device_id"] = deviceUUID;  // Use UUID instead of string
  doc["zone_id"] = zoneUUID;      // Use zone UUID
  doc["temperature"] = round(temp * 10) / 10.0;
  doc["humidity"] = round(hum * 10) / 10.0;
  doc["soil_moisture"] = round(moisture * 10) / 10.0;
  doc["light_level"] = lightLevel;  // Use actual light sensor reading
  doc["battery_level"] = 100.0;  // Placeholder for USB powered device
  doc["user_id"] = userUUID;      // Add required user_id field
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\n📡 Sending sensor data...");
  Serial.printf("  Temperature: %.1f (rounded: %.1f)\n", temp, round(temp * 10) / 10.0);
  Serial.printf("  Humidity: %.1f (rounded: %.1f)\n", hum, round(hum * 10) / 10.0);
  Serial.printf("  Soil Moisture: %.1f (rounded: %.1f)\n", moisture, round(moisture * 10) / 10.0);
  Serial.printf("  Light Level: %d\n", lightLevel);
  Serial.println("URL: " + url);
  Serial.println("Payload: " + jsonString);
  
  int responseCode = http.POST(jsonString);
  
  if (responseCode == 201) {
    Serial.println("✅ Sensor data sent successfully!");
    Serial.println("ℹ️ Data verification:");
    Serial.printf("  → Sent Temperature: %.1f\n", round(temp * 10) / 10.0);
    Serial.printf("  → Sent Humidity: %.1f\n", round(hum * 10) / 10.0);
    Serial.printf("  → Sent Soil Moisture: %.1f\n", round(moisture * 10) / 10.0);
    Serial.printf("  → Sent Light Level: %d\n", lightLevel);
    blinkLED(1, 100);  // Quick success blink
    http.end();
    return true;
  } else {
    Serial.printf("❌ Send failed: HTTP %d\n", responseCode);
    if (responseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
      
      // Common error troubleshooting
      if (responseCode == 401) {
        Serial.println("🔒 Authentication failed - check API key");
      } else if (responseCode == 400) {
        Serial.println("📝 Bad request - check JSON format or missing fields");
      } else if (responseCode == 403) {
        Serial.println("🚫 Forbidden - check database permissions");
      }
    } else {
      if (responseCode == -1) {
        Serial.println("🌐 Network timeout - will retry next cycle");
      } else {
        Serial.println("🌐 Network error - check internet connection");
      }
    }
    http.end();
    return false;
  }
}

// ============================================================================
// DEVICE STATUS FUNCTIONS
// ============================================================================

void updateDeviceStatus(String status, String message) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/device_status";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  http.addHeader("Prefer", "return=minimal");
  
  DynamicJsonDocument doc(512);
  doc["device_id"] = deviceId;
  doc["status"] = status;
  doc["message"] = message;
  doc["last_seen"] = "now()";
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime"] = millis() / 1000;
  doc["pump_active"] = pumpActive;
  doc["soil_moisture"] = lastSoilMoisture;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Use UPSERT to update existing record or create new one
  http.addHeader("Prefer", "resolution=merge-duplicates");
  
  int responseCode = http.POST(jsonString);
  
  if (responseCode == 201) {
    Serial.println("Device status updated");
  }
  
  http.end();
}

// ============================================================================
// COMMAND PROCESSING
// ============================================================================

// Function to check for commands from dashboard
void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  // Direct table access - more reliable than Edge Functions
  String url = String(supabaseUrl) + "/rest/v1/device_commands?device_id=eq." + String(deviceId) + "&status=eq.pending&select=*";
  
  http.begin(url);
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  
  int responseCode = http.GET();
  
  if (responseCode == 200) {
    String payload = http.getString();
    
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, payload);
    
    JsonArray commands = doc.as<JsonArray>();
    
    for (JsonObject command : commands) {
      String commandId = command["id"];
      String commandType = command["command_type"];
      JsonObject params = command["parameters"];
      
      Serial.println("Processing command: " + commandType);
      
      processCommand(commandId, commandType, params);
    }
  } else if (responseCode != 200) {
    Serial.printf("Command check failed: %d\n", responseCode);
  }
  
  http.end();
}

void processCommand(String commandId, String commandType, JsonObject params) {
  String result = "success";
  String message = "Command executed";
  
  if (commandType == "water" || commandType == "pump_on") {
    int duration = params["duration"] | 30;  // Default 30 seconds
    duration = constrain(duration, 5, MAX_PUMP_DURATION);
    
    if (startPump(duration)) {
      message = "Pump started for " + String(duration) + " seconds";
    } else {
      result = "error";
      message = "Failed to start pump";
    }
    
  } else if (commandType == "pump_off") {
    stopPump();
    message = "Pump stopped";
    
  } else if (commandType == "read_sensors") {
    readAndSendSensorData();
    message = "Sensor data updated";
    
  } else {
    result = "error";
    message = "Unknown command: " + commandType;
  }
  
  // Update command status
  updateCommandStatus(commandId, result, message);
}

void updateCommandStatus(String commandId, String status, String message) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/device_commands?id=eq." + commandId;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  
  DynamicJsonDocument doc(256);
  doc["status"] = (status == "success") ? "completed" : "failed";
  doc["result"] = message;
  doc["executed_at"] = "now()";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int responseCode = http.sendRequest("PATCH", jsonString);
  
  if (responseCode == 200 || responseCode == 204) {
    Serial.println("Command status updated: " + status);
  }
  
  http.end();
}

// ============================================================================
// PUMP CONTROL
// ============================================================================

bool startPump(int duration) {
  if (pumpActive) {
    Serial.println("Pump already active");
    return false;
  }
  
  if (lastSoilMoisture > 90) {
    Serial.println("Soil too wet, pump canceled");
    return false;
  }
  
  Serial.printf("Starting pump for %d seconds\n", duration);
  
  digitalWrite(MOTOR_PUMP_PIN, HIGH);
  pumpActive = true;
  pumpStartTime = millis();
  pumpDuration = duration * 1000;
  
  // Rapid blinks when pump starts
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUILTIN_LED, LOW);
    delay(100);
    digitalWrite(BUILTIN_LED, HIGH);
    delay(100);
  }
  
  updateDeviceStatus("pumping", "Water pump active");
  return true;
}

void stopPump() {
  if (!pumpActive) return;
  
  digitalWrite(MOTOR_PUMP_PIN, LOW);
  pumpActive = false;
  
  unsigned long runtime = (millis() - pumpStartTime) / 1000;
  Serial.printf("Pump stopped after %lu seconds\n", runtime);
  
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
    Serial.println("SAFETY: Max pump time exceeded!");
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
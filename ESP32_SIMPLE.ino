#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ============================================================================
// CONFIGURATION - Update these values for your setup  
// ============================================================================

// WiFi credentials
// const char* ssid = "IT_BMS";
// const char* password = "Sdsm#2024";


const char* ssid = "vivo";
const char* password = "alpha12345";

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
#define LIGHT_SENSOR_PIN 35       
#define MOTOR_PUMP_PIN 14         
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
float totalWaterUsage = 0.0;  // Track total water usage in liters

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
    Serial.printf("Reading %d: %d (GPIO %d)\n", i+1, soilReadings[i], SOIL_MOISTURE_PIN);
    delay(200);
  }
  
  // Additional debugging for GPIO 34
  Serial.println("\n🔬 GPIO 34 Detailed Analysis:");
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  delay(100);
  for (int i = 0; i < 5; i++) {
    int rawValue = analogRead(SOIL_MOISTURE_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;
    Serial.printf("  Raw: %d, Voltage: %.3fV\n", rawValue, voltage);
    delay(500);
  }
  
  Serial.printf("\nSoil sensor analysis:\n");
  Serial.printf("  Range: %d - %d\n", soilMin, soilMax);
  Serial.printf("  Current settings: DRY=%d, WET=%d\n", SOIL_MOISTURE_DRY, SOIL_MOISTURE_WET);
  
  // Check for sensor connection issues
  if (soilMin == 4095 && soilMax == 4095) {
    Serial.println("  ❌ ERROR: All readings are 4095!");
    Serial.println("  This usually means:");
    Serial.println("    - Sensor not connected to GPIO 34");
    Serial.println("    - Bad wiring or loose connections");
    Serial.println("    - Sensor power not connected");
    Serial.println("  📋 Wiring check:");
    Serial.println("    - Sensor VCC → 3.3V or 5V");
    Serial.println("    - Sensor GND → GND");
    Serial.println("    - Sensor AOUT → GPIO 34");
  } else if (soilMin == 0 && soilMax == 0) {
    Serial.println("  ❌ ERROR: All readings are 0!");
    Serial.println("  This usually means:");
    Serial.println("    - Short circuit or grounded pin");
    Serial.println("    - Wrong pin assignment");
  }
  
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
  
  // Test light sensor with detailed debugging
  Serial.println("\n=== Light Sensor Testing ===");
  Serial.printf("Testing GPIO %d (LIGHT_SENSOR_PIN)\n", LIGHT_SENSOR_PIN);
  
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  delay(100);
  
  for (int i = 0; i < 5; i++) {
    int lightRaw = analogRead(LIGHT_SENSOR_PIN);
    float voltage = (lightRaw / 4095.0) * 3.3;
    Serial.printf("  Light reading %d: Raw=%d, Voltage=%.3fV\n", i+1, lightRaw, voltage);
    delay(300);
  }
  
  // Try alternative GPIO pins for light sensor
  Serial.println("\nTesting alternative GPIO pins:");
  int testPins[] = {32, 33, 36, 39}; // Other ADC pins
  for (int j = 0; j < 4; j++) {
    int pin = testPins[j];
    pinMode(pin, INPUT);
    delay(50);
    int value = analogRead(pin);
    float voltage = (value / 4095.0) * 3.3;
    Serial.printf("  GPIO %d: Raw=%d, Voltage=%.3fV\n", pin, value, voltage);
  }
  
  // Run comprehensive sensor diagnostics
  runSensorDiagnostics();
  
  // Connect to WiFi
  
  Serial.println("\n💡 LDR (GL5528) Wiring Instructions:");
  Serial.println("  - One leg of LDR to 3.3V");
  Serial.println("  - Other leg of LDR to GPIO 35");
  Serial.println("  - 10kΩ resistor from GPIO 35 to GND (voltage divider)");
  Serial.println("  - This creates a voltage divider circuit for analog reading\n");
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
// AUTOMATIC WATERING FUNCTIONS
// ============================================================================

// Check if automatic watering should be triggered based on soil moisture
void checkAutomaticWatering() {
  // Only check if pump is not already active
  if (pumpActive) return;
  
  // Check if soil moisture is below threshold
  if (lastSoilMoisture < moistureThreshold) {
    Serial.printf("\n🌱 Soil moisture (%.1f%%) below threshold (%.1f%%) - Triggering automatic watering\n", lastSoilMoisture, moistureThreshold);
    
    // Start watering for default duration
    int wateringDuration = 30; // seconds
    startPump(wateringDuration);
    
    // Update status
    updateDeviceStatus("pumping", "Automatic watering triggered - low soil moisture");
  }
}

// Fetch watering schedules from database
bool fetchWateringSchedules() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ No WiFi connection for schedule fetch");
    return false;
  }
  
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/watering_schedules?zone_id=eq." + String(zoneUUID) + "&is_active=eq.true&select=*";
  
  http.begin(url);
  http.addHeader("apikey", supabaseServiceKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));
  
  int responseCode = http.GET();
  
  if (responseCode == 200) {
    String payload = http.getString();
    Serial.println("📅 Watering schedules: " + payload);
    
    // For now, we'll just log the schedules
    // In a more advanced implementation, we could parse and check cron expressions
    http.end();
    return true;
  } else {
    Serial.printf("❌ Schedule fetch failed: HTTP %d\n", responseCode);
    if (responseCode > 0) {
      String response = http.getString();
      Serial.println("Error response: " + response);
    }
    http.end();
    return false;
  }
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // Check for serial commands for debugging
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "test_pump") {
      Serial.println("\n⚠️ Manual pump test disabled - system is now automatic");
      Serial.println("Soil moisture: " + String(lastSoilMoisture) + "%");
      Serial.println("Threshold: " + String(moistureThreshold) + "%");
      
      // Show current status
      if (lastSoilMoisture < moistureThreshold) {
        Serial.println("✅ Automatic watering would trigger now");
      } else {
        Serial.println("ℹ️ Soil moisture is adequate");
      }
    } else if (command == "check_commands") {
      Serial.println("\n🔄 Manual command check triggered via serial");
      checkForCommands();
    } else if (command == "status") {
      Serial.printf("\n📊 Device Status:\n");
      Serial.printf("  WiFi: %s\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
      Serial.printf("  Pump Active: %s\n", pumpActive ? "Yes" : "No");
      Serial.printf("  Soil Moisture: %.1f%%\n", lastSoilMoisture);
      Serial.printf("  Moisture Threshold: %.1f%%\n", moistureThreshold);
      Serial.printf("  Uptime: %lu seconds\n", millis() / 1000);
    }
  }
  
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
// DIAGNOSTIC FUNCTIONS
// ============================================================================

void runSensorDiagnostics() {
  Serial.println("\n🔧 === SENSOR DIAGNOSTICS ===");
  
  // Test all ADC pins
  int adcPins[] = {32, 33, 34, 35, 36, 39};
  Serial.println("Testing all ADC-capable GPIO pins:");
  
  for (int i = 0; i < 6; i++) {
    int pin = adcPins[i];
    pinMode(pin, INPUT);
    delay(50);
    
    int reading = analogRead(pin);
    float voltage = (reading / 4095.0) * 3.3;
    
    Serial.printf("  GPIO %d: Raw=%d, Voltage=%.3fV", pin, reading, voltage);
    
    if (pin == SOIL_MOISTURE_PIN) {
      Serial.print(" (SOIL SENSOR)");
    }
    if (pin == LIGHT_SENSOR_PIN) {
      Serial.print(" (LIGHT SENSOR)");
    }
    
    // Analyze readings
    if (reading == 4095) {
      Serial.print(" - FLOATING/DISCONNECTED");
    } else if (reading == 0) {
      Serial.print(" - GROUNDED/SHORT");
    } else if (reading > 10 && reading < 4085) {
      Serial.print(" - NORMAL RANGE");
    }
    
    Serial.println();
  }
  
  Serial.println("===========================\n");
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
  
  // Read light level with improved debugging for LDR (GL5528)
  int lightLevel = 0;
  int lightRaw = analogRead(LIGHT_SENSOR_PIN);
  
  Serial.printf("Light sensor debug: GPIO %d raw = %d\n", LIGHT_SENSOR_PIN, lightRaw);
  
  // Check if light sensor is working properly
  if (lightRaw >= 0 && lightRaw <= 4095) {
    // Valid reading from LDR - convert to light intensity (lux approximation)
    // LDR resistance decreases with more light
    // Raw values: 0 (dark) to 4095 (bright) - but actual range depends on voltage divider
    
    // Map the raw reading to a more realistic light level range
    // Adjust these values based on your specific LDR and resistor combination
    lightLevel = map(lightRaw, 0, 4095, 0, 10000); // 0-10000 lux approximation
    lightLevel = constrain(lightLevel, 0, 10000);
    
    Serial.printf("✅ Using LDR reading: %d lux (raw: %d)\n", lightLevel, lightRaw);
  } else {
    // Invalid reading - use fallback
    Serial.println("⚠️ Invalid LDR reading, using fallback...");
    
    // Try alternative pins
    int altReading = analogRead(32);
    if (altReading >= 0 && altReading <= 4095) {
      lightLevel = map(altReading, 0, 4095, 0, 10000);
      lightLevel = constrain(lightLevel, 0, 10000);
      Serial.printf("✅ Using GPIO 32 LDR reading: %d lux (raw: %d)\n", lightLevel, altReading);
    } else {
      // Fallback: use a time-based simulation for realistic variation
      unsigned long currentTime = millis();
      lightLevel = 1000 + (currentTime % 9000);  // Varies between 1000-10000 lux
      Serial.printf("🔄 Using simulated reading: %d lux\n", lightLevel);
    }
  }
  
  lastSoilMoisture = soilMoisture;
  
  // Display readings with more detail
  Serial.println("✨ Final calculated values:");
  Serial.printf("  Temperature: %.1f°C (averaged from %d readings)\n", temperature, validReadings);
  Serial.printf("  Humidity: %.1f%% (averaged from %d readings)\n", humidity, validReadings);
  Serial.printf("  Soil Moisture: %.1f%% (raw: %d, range: %d-%d)\n", soilMoisture, soilRaw, SOIL_MOISTURE_WET, SOIL_MOISTURE_DRY);
  Serial.printf("  Light Level: %d lux (GPIO %d raw: %d)\n", lightLevel, LIGHT_SENSOR_PIN, lightRaw);
  
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
  doc["water_usage"] = totalWaterUsage;  // Add water usage data
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\n📡 Sending sensor data...");
  Serial.printf("  Temperature: %.1f (rounded: %.1f)\n", temp, round(temp * 10) / 10.0);
  Serial.printf("  Humidity: %.1f (rounded: %.1f)\n", hum, round(hum * 10) / 10.0);
  Serial.printf("  Soil Moisture: %.1f (rounded: %.1f)\n", moisture, round(moisture * 10) / 10.0);
  Serial.printf("  Light Level: %d lux\n", lightLevel);
  Serial.printf("  Water Usage: %.3f L\n", totalWaterUsage);
  Serial.println("URL: " + url);
  Serial.println("Payload: " + jsonString);
  
  int responseCode = http.POST(jsonString);
  
  if (responseCode == 201) {
    Serial.println("✅ Sensor data sent successfully!");
    Serial.println("ℹ️ Data verification:");
    Serial.printf("  → Sent Temperature: %.1f\n", round(temp * 10) / 10.0);
    Serial.printf("  → Sent Humidity: %.1f\n", round(hum * 10) / 10.0);
    Serial.printf("  → Sent Soil Moisture: %.1f\n", round(moisture * 10) / 10.0);
    Serial.printf("  → Sent Light Level: %d lux\n", lightLevel);
    Serial.printf("  → Sent Water Usage: %.3f L\n", totalWaterUsage);
    
    // Reset water usage counter after successful send
    totalWaterUsage = 0.0;
    
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
  // Enhanced debugging: Check for commands using multiple methods
  String url = String(supabaseUrl) + "/rest/v1/commands?device_id=eq." + String(deviceUUID) + "&status=eq.pending&select=*";
  
  Serial.println("\n🔍 Checking for commands...");
  Serial.println("Device UUID: " + String(deviceUUID));
  Serial.println("URL: " + url);
  
  http.begin(url);
  http.addHeader("apikey", supabaseServiceKey);  // Use service key for more permissions
  http.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));
  
  int responseCode = http.GET();
  
  Serial.printf("📡 Command check response: HTTP %d\n", responseCode);
  
  if (responseCode == 200) {
    String payload = http.getString();
    Serial.println("📡 Commands received: " + payload);
    
    // Check if payload is empty array
    if (payload == "[]" || payload.length() < 5) {
      Serial.println("ℹ️ No pending commands found");
      http.end();
      return;
    }
    
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, payload);
    
    JsonArray commands = doc.as<JsonArray>();
    
    Serial.printf("📋 Found %d pending commands\n", commands.size());
    
    for (JsonObject command : commands) {
      String commandId = command["id"];
      String commandType = command["command_type"];
      JsonObject params = command["parameters"];
      
      Serial.println("🔧 Processing command: " + commandType + " (ID: " + commandId + ")");
      
      processCommand(commandId, commandType, params);
    }
  } else {
    Serial.printf("❌ Command check failed: HTTP %d\n", responseCode);
    if (responseCode > 0) {
      String response = http.getString();
      Serial.println("Error response: " + response);
      
      // Try alternative query method
      Serial.println("🔄 Trying alternative command query...");
      checkForCommandsAlternative();
    }
  }
  
  http.end();
}

// Alternative command checking method
void checkForCommandsAlternative() {
  HTTPClient http;
  // Try querying with device_id field directly
  String url = String(supabaseUrl) + "/rest/v1/commands?device_id=eq." + String(deviceUUID) + "&status=eq.pending";
  
  http.begin(url);
  http.addHeader("apikey", supabaseServiceKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseServiceKey));
  
  int responseCode = http.GET();
  
  if (responseCode == 200) {
    String payload = http.getString();
    Serial.println("🔄 Alternative method response: " + payload);
    
    if (payload != "[]" && payload.length() > 5) {
      DynamicJsonDocument doc(2048);
      deserializeJson(doc, payload);
      
      JsonArray commands = doc.as<JsonArray>();
      
      for (JsonObject command : commands) {
        String commandId = command["id"];
        String commandType = command["command_type"];
        JsonObject params = command["parameters"];
        
        Serial.println("🔧 Alt method processing: " + commandType + " (ID: " + commandId + ")");
        
        processCommand(commandId, commandType, params);
      }
    }
  }
  
  http.end();
}

// Function to process commands from dashboard
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
  // FIXED: Use the correct 'commands' table
  String url = String(supabaseUrl) + "/rest/v1/commands?id=eq." + commandId;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseAnonKey));
  
  DynamicJsonDocument doc(256);
  doc["status"] = (status == "success") ? "executed" : "failed";  // FIXED: Use correct status values
  doc["result"] = message;
  doc["executed_at"] = "now()";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Updating command status: " + jsonString);
  
  int responseCode = http.sendRequest("PATCH", jsonString);
  
  if (responseCode == 200 || responseCode == 204) {
    Serial.println("✅ Command status updated: " + status);
  } else {
    Serial.printf("❌ Failed to update command status: HTTP %d\n", responseCode);
    if (responseCode > 0) {
      String response = http.getString();
      Serial.println("Error response: " + response);
    }
  }
  
  http.end();
}

// ============================================================================
// PUMP CONTROL
// ============================================================================

bool startPump(int duration) {
  Serial.println("\n💧 === PUMP CONTROL DEBUG ===");
  Serial.printf("Received pump start request for %d seconds\n", duration);
  Serial.printf("Current pump state: %s\n", pumpActive ? "ACTIVE" : "INACTIVE");
  Serial.printf("Current soil moisture: %.1f%%\n", lastSoilMoisture);
  Serial.printf("Motor pump pin: %d\n", MOTOR_PUMP_PIN);
  
  if (pumpActive) {
    Serial.println("⚠️ Pump already active");
    return false;
  }
  
  // Note: Removed soil moisture check to allow manual override and scheduled watering
  // Even if soil is wet, user can still trigger watering if needed
  
  Serial.printf("✅ Starting ULN2002 pump control for %d seconds\n", duration);
  
  digitalWrite(MOTOR_PUMP_PIN, HIGH);  // Activate ULN2002 output
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
  
  updateDeviceStatus("pumping", "Water pump active via ULN2002");
  Serial.println("✅ Pump activated successfully");
  return true;
}

void stopPump() {
  Serial.println("\n🛑 === PUMP STOP DEBUG ===");
  if (!pumpActive) {
    Serial.println("⚠️ Pump is not active");
    return;
  }
  
  digitalWrite(MOTOR_PUMP_PIN, LOW);  // Deactivate ULN2002 output
  pumpActive = false;
  
  unsigned long runtime = (millis() - pumpStartTime) / 1000;
  // Calculate water usage: 0.086 L/s * runtime in seconds
  float waterUsed = 0.086 * runtime;
  totalWaterUsage += waterUsed;
  
  Serial.printf("✅ ULN2002 pump stopped after %lu seconds\n", runtime);
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
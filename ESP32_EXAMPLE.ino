/*
 * ESP32 Example for GardenCare Dashboard
 * 
 * This example demonstrates how to connect an ESP32 to the GardenCare dashboard
 * using Supabase as the backend.
 * 
 * Required libraries:
 * - WiFi
 * - HTTPClient
 * - ArduinoJson
 * - DHT sensor library
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "YOUR_SUPABASE_URL";
const char* supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
const char* apiKey = "YOUR_DEVICE_API_KEY";
const char* deviceId = "YOUR_DEVICE_ID";

// Sensor pins
#define DHTPIN 4
#define DHTTYPE DHT22
#define SOIL_MOISTURE_PIN 34

// Initialize DHT sensor
DHT dht(DHTPIN, DHTTYPE);

// Timing variables
unsigned long lastSensorUpdate = 0;
unsigned long sensorInterval = 300000; // 5 minutes in milliseconds

void setup() {
  Serial.begin(115200);
  
  // Initialize sensors
  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("ESP32 initialized and ready");
}

void loop() {
  // Send sensor data at regular intervals
  if (millis() - lastSensorUpdate >= sensorInterval) {
    sendSensorData();
    lastSensorUpdate = millis();
  }
  
  // Check for commands from the dashboard
  checkForCommands();
  
  delay(5000); // Check every 5 seconds
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void sendSensorData() {
  // Read sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  
  // Check if any reads failed and exit early (to try again).
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // Convert soil moisture to percentage (adjust these values based on your sensor)
  int soilMoisturePercent = map(soilMoisture, 4095, 0, 0, 100);
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["device_id"] = deviceId;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soil_moisture"] = soilMoisturePercent;
  doc["api_key"] = apiKey;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send data to Supabase
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    String url = String(supabaseUrl) + "/functions/v1/esp32-data";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", supabaseAnonKey);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Data sent successfully");
      Serial.println("Response: " + response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

void checkForCommands() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    String url = String(supabaseUrl) + "/functions/v1/esp32-commands?device_id=" + deviceId + "&api_key=" + apiKey;
    http.begin(url);
    http.addHeader("apikey", supabaseAnonKey);
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String payload = http.getString();
      
      // Parse JSON response
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        JsonArray commands = doc["commands"];
        
        for (JsonObject command : commands) {
          String commandId = command["id"];
          String commandType = command["command_type"];
          JsonObject parameters = command["parameters"];
          
          // Process command based on type
          processCommand(commandId, commandType, parameters);
        }
      } else {
        Serial.print("JSON parsing failed: ");
        Serial.println(error.c_str());
      }
    } else {
      Serial.print("Error on sending GET: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

void processCommand(String commandId, String commandType, JsonObject parameters) {
  Serial.println("Processing command: " + commandType);
  
  String resultStatus = "executed";
  String resultMessage = "Command executed successfully";
  
  // Example command processing
  if (commandType == "water") {
    int duration = parameters["duration"] | 30; // Default to 30 seconds
    // Activate watering system for 'duration' seconds
    activateWateringSystem(duration);
  } else if (commandType == "read_sensors") {
    // Force immediate sensor reading
    sendSensorData();
  } else {
    resultStatus = "failed";
    resultMessage = "Unknown command type";
  }
  
  // Report command execution status
  reportCommandStatus(commandId, resultStatus, resultMessage);
}

void activateWateringSystem(int duration) {
  Serial.println("Activating watering system for " + String(duration) + " seconds");
  
  // Add your watering system activation code here
  // For example, activate a relay connected to a water pump
  // digitalWrite(WATER_PUMP_PIN, HIGH);
  // delay(duration * 1000);
  // digitalWrite(WATER_PUMP_PIN, LOW);
}

void reportCommandStatus(String commandId, String status, String message) {
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["command_id"] = commandId;
  doc["status"] = status;
  doc["result"] = message;
  doc["api_key"] = apiKey;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send status update to Supabase
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    String url = String(supabaseUrl) + "/functions/v1/esp32-commands";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", supabaseAnonKey);
    
    int httpResponseCode = http.PUT(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Command status reported successfully");
    } else {
      Serial.print("Error on sending PUT: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}
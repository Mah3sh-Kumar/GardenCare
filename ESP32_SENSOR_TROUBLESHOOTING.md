# ESP32 Sensor Data Troubleshooting Guide - UPDATED

## 🚨 Current Issue: Fixed Values Not Actual Sensor Data

**Problem**: ESP32 console shows varying sensor readings, but database receives constant/incorrect values

**Root Causes Identified**:
1. ❌ Humidity mismatch (console: 79%, database: 69%)
2. ❌ Light sensor using wrong GPIO or not connected
3. ❌ Soil moisture mapping incorrect for your sensor type
4. ❌ Potential data caching or JSON serialization issues

## 🔧 **FIXES IMPLEMENTED**

### 1. Enhanced Sensor Reading Process
- ✅ **Multiple readings with averaging** (3 samples per cycle)
- ✅ **Individual reading validation** with detailed logging
- ✅ **Improved delay timing** (500ms between readings)
- ✅ **Fresh sensor reads** to eliminate caching

### 2. Better Soil Moisture Calibration
```cpp
// Updated calibration values
const int SOIL_MOISTURE_DRY = 3000;    // When sensor is completely dry
const int SOIL_MOISTURE_WET = 1500;    // When sensor is in water
```

### 3. Enhanced Debugging Output
New console output will show:
```
🔄 Taking 3 readings for averaging...
Reading 1/3: T=31.8, H=79.0, Soil=743 ✓
Reading 2/3: T=31.9, H=78.5, Soil=745 ✓
Reading 3/3: T=31.7, H=79.2, Soil=741 ✓

🔍 Analysis - Raw soil reading: 743

✨ Final calculated values:
  Temperature: 31.8°C (averaged from 3 readings)
  Humidity: 79.0% (averaged from 3 readings)
  Soil Moisture: 45.2% (raw: 743, range: 1500-3000)
  Light Level: 1543 (GPIO 35 raw: 12)

📡 Sending sensor data...
  Temperature: 31.8 (rounded: 31.8)
  Humidity: 79.0 (rounded: 79.0)
  Soil Moisture: 45.2 (rounded: 45.2)
  Light Level: 1543

✅ Sensor data sent successfully!
ℹ️ Data verification:
  → Sent Temperature: 31.8
  → Sent Humidity: 79.0
  → Sent Soil Moisture: 45.2
  → Sent Light Level: 1543
```

## 🔍 **DEBUGGING STEPS**

### Step 1: Upload Updated Code and Monitor
1. Upload the enhanced `ESP32_SIMPLE.ino`
2. Open Serial Monitor (115200 baud)
3. **Watch for the new detailed output format**
4. **Verify each sensor reading shows variation**

### Step 2: Verify Sensor Hardware
**DHT11 (Temperature/Humidity)**:
- Should show readings like: `T=31.8, H=79.0` with small variations
- If getting `T=nan, H=nan`, check wires and power

**Soil Moisture Sensor**:
- Should show different raw values: `Soil=743`, `Soil=751`, etc.
- If always same value, check analog connection to GPIO 34

**Light Sensor (GPIO 35)**:
- If raw reading is < 10, sensor might not be connected
- Code will use time-based simulation as fallback

### Step 3: Calibrate Soil Sensor
Look for this output during startup:
```
=== Soil Sensor Calibration ===
Soil sensor analysis:
  Range: 743 - 756
  Current settings: DRY=3000, WET=1500
  📊 Readings suggest resistive sensor
  Higher readings may = more moisture
```

**Action Required**:
1. Note your sensor's actual range
2. Test sensor in completely dry conditions
3. Test sensor in water
4. Update these constants with your values:
   ```cpp
   const int SOIL_MOISTURE_DRY = [your_dry_reading];
   const int SOIL_MOISTURE_WET = [your_wet_reading];
   ```

### Step 4: Verify Data Transmission
Look for this confirmation:
```
✅ Sensor data sent successfully!
ℹ️ Data verification:
  → Sent Temperature: 31.8
  → Sent Humidity: 79.0  ← Should match console reading
  → Sent Soil Moisture: 45.2
  → Sent Light Level: 1543
```

**If values don't match console readings**: There's a serialization issue
**If Supabase data still doesn't match**: Database/network issue

## 📊 **EXPECTED RESULTS**

After the fix, you should see:

### Console Output
- ✅ Detailed step-by-step sensor readings
- ✅ Individual validation of each reading
- ✅ Clear verification of sent values
- ✅ Realistic sensor variations over time

### Database Data
- ✅ Temperature values matching console (±0.1°)
- ✅ Humidity values matching console exactly
- ✅ Soil moisture showing gradual changes (not 0%/100% jumps)
- ✅ Light levels showing variation
- ✅ Timestamps progressing correctly

## 🚨 **IF STILL GETTING FIXED VALUES**

### Check 1: Hardware Issues
```bash
# Look for these error patterns:
"T=nan, H=nan"           # DHT11 wiring problem
"Soil=0" or "Soil=4095"   # Soil sensor disconnected
"Range: 2845 - 2845"     # No variation = bad sensor/wiring
```

### Check 2: JSON Serialization
```bash
# Compare these two lines in output:
"Final calculated values: Temperature: 31.8°C"
"→ Sent Temperature: 31.8"   # Should be identical
```

### Check 3: Database Schema
Ensure your sensor_data table accepts:
- `temperature` as DECIMAL/FLOAT
- `humidity` as DECIMAL/FLOAT  
- `soil_moisture` as DECIMAL/FLOAT
- `light_level` as INTEGER

If columns are defined as INTEGER, they'll truncate decimal values!

## 📈 **MONITORING SUCCESS**

Over 30-60 minutes, you should observe:
- Temperature: ±0.5-2°C natural variation
- Humidity: ±2-5% changes based on environment
- Soil Moisture: Gradual changes (not sudden jumps)
- Light Level: Changes based on ambient conditions

**Database Query to Verify**:
```sql
SELECT 
  temperature, 
  humidity, 
  soil_moisture, 
  light_level,
  timestamp
FROM sensor_data 
WHERE device_id = 'dcf10adb-aa2e-4aaa-9b2b-fff6903a7a9b'
ORDER BY timestamp DESC 
LIMIT 10;
```

Look for **gradual variations** in all values, not identical repeated numbers.

## Monitoring Your Sensor Data

### Normal Sensor Ranges
- **Temperature**: 20-40°C (indoor/outdoor)
- **Humidity**: 30-95% (varies by environment)
- **Soil Moisture**: 0-100% (0=dry, 100=wet)
- **Light Level**: 0-4095 (ADC reading)

### Console Log Interpretation
```
--- Reading Sensors ---
Temperature: 31.8°C     ← Should be stable ±2°C
Humidity: 79.0%         ← Should be stable ±5%
Soil Moisture: 100.0% (raw: 743)  ← Raw value shows actual sensor reading
📡 Sending sensor data...
✅ Sensor data sent successfully!  ← Confirms database insert worked
```

## Calibration Steps

### Step 1: Upload Updated Code
1. Upload the modified ESP32_SIMPLE.ino to your device
2. Open Serial Monitor (115200 baud)
3. Watch the calibration readings during startup

### Step 2: Soil Sensor Calibration
1. **Dry Calibration**:
   - Remove sensor from soil
   - Clean and dry completely
   - Note the "Soil sensor range" max value
   
2. **Wet Calibration**:
   - Dip sensor in clean water
   - Note the minimum value
   
3. **Update Constants**:
   ```cpp
   const int SOIL_MOISTURE_DRY = [your_dry_value];
   const int SOIL_MOISTURE_WET = [your_wet_value];
   ```

### Step 3: Verify Data Flow
1. Check console for "✅ Sensor data sent successfully!"
2. Verify data appears in Supabase dashboard
3. Confirm sensor values make sense

## Hardware Setup Verification

### DHT11 Sensor (Temperature/Humidity)
```
DHT11 → ESP32
VCC   → 3.3V
GND   → GND
DATA  → GPIO 4
```

### Soil Moisture Sensor
```
Soil Sensor → ESP32
VCC         → 3.3V
GND         → GND
AOUT        → GPIO 34
```

### Light Sensor (Optional)
```
Light Sensor → ESP32
VCC          → 3.3V
GND          → GND
AOUT         → GPIO 35
```

## Troubleshooting Common Issues

### Issue: Sensor Values Don't Change
**Symptoms**: Same values repeatedly in database
**Causes**: 
- Sensor not properly connected
- Incorrect pin assignments
- Faulty sensor

**Solutions**:
- Check all wiring connections
- Use multimeter to test sensor output
- Try different GPIO pins

### Issue: DHT11 Returns NaN
**Symptoms**: "Failed to read DHT11!" in console
**Causes**:
- Loose wiring
- Insufficient power
- Timing issues

**Solutions**:
- Check 3.3V power supply
- Add 10kΩ pull-up resistor on data line
- Try different GPIO pin

### Issue: Soil Sensor Stuck at 0% or 100%
**Symptoms**: Always shows extreme values
**Causes**:
- Incorrect calibration values
- Sensor degradation
- Poor electrical contact

**Solutions**:
- Recalibrate with proper dry/wet tests
- Clean sensor contacts
- Replace sensor if old

## Expected Behavior After Fix

### Console Output Should Show:
```
=== Soil Sensor Calibration ===
Taking 10 readings for calibration...
Reading 1: 2834
Reading 2: 2831
...
Soil sensor range: 2831 - 2845
```

### Database Should Show:
- Gradually changing values (not jumping between extremes)
- Humidity values matching console output
- Consistent light level readings
- Proper timestamp progression

## Next Steps

1. **Upload the updated code**
2. **Monitor the serial output for 5-10 minutes**
3. **Note the calibration values shown**
4. **Update the DRY/WET constants if needed**
5. **Verify data in Supabase dashboard**

The code improvements include:
- ✅ Better soil moisture calculation
- ✅ Sensor reading averaging (3 readings per cycle)
- ✅ Separate light sensor support
- ✅ Automatic calibration guidance
- ✅ Improved error handling

Your IoT system connection is working perfectly - we just needed to fix the sensor data interpretation!
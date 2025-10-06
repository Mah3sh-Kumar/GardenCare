# Troubleshooting Guide

This guide provides solutions for common issues you may encounter when using GardenCare.

## 🌐 Network and Connectivity Issues

### WiFi Connection Problems

**Symptom:** ESP32 device shows as offline in the dashboard.

**Solutions:**
1. Check WiFi credentials in `ESP32_SIMPLE.ino`:
   ```cpp
   const char* ssid = "your_wifi_ssid";
   const char* password = "your_wifi_password";
   ```
2. Verify WiFi network is accessible and password is correct
3. Ensure ESP32 is within WiFi range
4. Restart the ESP32 device
5. Check router settings for device blocking

### Supabase Connection Errors

**Symptom:** Dashboard shows "Failed to fetch data" or authentication errors.

**Solutions:**
1. Verify environment variables in `.env` file:
   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
2. Check Supabase project status in the dashboard
3. Ensure Supabase URL and keys are correct
4. Verify internet connectivity
5. Check browser console for specific error messages

### Real-time Updates Not Working

**Symptom:** Dashboard doesn't update automatically when sensor data changes.

**Solutions:**
1. Check browser console for WebSocket errors
2. Verify Supabase Realtime is enabled for your project
3. Ensure RLS policies allow real-time subscriptions
4. Refresh the browser page
5. Check if ad-blockers are interfering with WebSocket connections

## ⚡ Hardware Issues

### Sensor Readings Are Inaccurate

**Symptom:** Temperature, humidity, or soil moisture readings seem incorrect.

**Solutions:**
1. **Calibrate soil moisture sensor:**
   - Take readings in air (dry reading)
   - Take readings in water (wet reading)
   - Update `SOIL_MOISTURE_DRY` and `SOIL_MOISTURE_WET` values in firmware
2. **Check DHT11 sensor:**
   - Ensure proper wiring (Data pin to GPIO 4)
   - Verify 3.3V power supply
   - Replace sensor if consistently returning NaN values
3. **Verify power supply:**
   - Ensure stable 5V power for ESP32
   - Check for voltage drops under load
   - Use quality USB cables and power adapters

### Water Pump Not Activating

**Symptom:** Watering commands are sent but pump doesn't activate.

**Solutions:**
1. Check relay module wiring:
   - Ensure relay input is connected to GPIO 2
   - Verify relay power connections
   - Confirm relay output is properly connected to pump
2. Test relay with simple code:
   ```cpp
   digitalWrite(MOTOR_PUMP_PIN, HIGH); // Should activate relay
   delay(5000);
   digitalWrite(MOTOR_PUMP_PIN, LOW);  // Should deactivate relay
   ```
3. Check pump power requirements:
   - Ensure adequate power supply for pump
   - Verify pump is not damaged
   - Check for clogs in pump or tubing

### Device Shows as Offline

**Symptom:** ESP32 device status is "offline" in dashboard.

**Solutions:**
1. Check physical connections:
   - Ensure ESP32 is properly powered
   - Verify all sensor connections
   - Check for loose wires
2. Monitor serial output:
   - Connect ESP32 to computer via USB
   - Open Serial Monitor at 115200 baud
   - Look for error messages or connection attempts
3. Reset device:
   - Press reset button on ESP32
   - Power cycle the device
   - Re-upload firmware if necessary

## 💻 Dashboard Issues

### Dashboard Fails to Load

**Symptom:** Blank page or error messages when accessing dashboard.

**Solutions:**
1. Check browser console for JavaScript errors
2. Clear browser cache and cookies
3. Try a different browser
4. Verify all environment variables are set correctly
5. Check for network connectivity issues
6. Restart development server:
   ```bash
   npm run dev
   ```

### Charts Not Displaying Data

**Symptom:** Charts show "No data available" or empty graphs.

**Solutions:**
1. Verify sensor data is being recorded in database:
   - Check `sensor_data` table in Supabase
   - Ensure ESP32 is sending data successfully
2. Check date/time filters on charts
3. Verify user authentication and RLS policies
4. Refresh the page to trigger data reload
5. Check browser console for API errors

### Authentication Problems

**Symptom:** Unable to sign in or sign up, or getting logged out unexpectedly.

**Solutions:**
1. Verify Supabase Auth is configured correctly
2. Check for browser extensions blocking authentication
3. Clear browser storage for the site
4. Ensure email confirmation is working (if enabled)
5. Check Supabase Auth settings in dashboard

## 🛠️ Development Environment Issues

### npm Install Failures

**Symptom:** Errors when running `npm install` or `npm ci`.

**Solutions:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
2. Delete `node_modules` and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   npm ci
   ```
3. Update Node.js to version 18 or higher
4. Check disk space availability
5. Verify internet connectivity

### Build Errors

**Symptom:** Errors when running `npm run build`.

**Solutions:**
1. Check for syntax errors in code
2. Verify all dependencies are installed
3. Check for type errors or missing imports
4. Ensure environment variables are set for production
5. Review build logs for specific error messages

### Test Failures

**Symptom:** Tests failing when running `npm run test`.

**Solutions:**
1. Check test output for specific failure messages
2. Verify test environment variables are set
3. Ensure Supabase is accessible during testing
4. Check for network connectivity issues
5. Review test setup and mock configurations

## 🔐 Security Issues

### Invalid API Keys

**Symptom:** Device authentication failures or "401 Unauthorized" errors.

**Solutions:**
1. Verify API key format and validity
2. Check API key permissions in Supabase dashboard
3. Ensure API key is active and not expired
4. Regenerate API key if compromised
5. Check for typos in key values

### RLS Policy Violations

**Symptom:** "403 Forbidden" errors or missing data.

**Solutions:**
1. Review RLS policies in Supabase table editor
2. Verify user authentication is working
3. Check that policies allow required operations
4. Test queries in Supabase SQL editor
5. Consult Supabase documentation for RLS best practices

## 📱 Mobile Responsiveness Issues

### Layout Problems on Mobile Devices

**Symptom:** Dashboard elements overlapping or not displaying properly on mobile.

**Solutions:**
1. Test with browser developer tools mobile emulator
2. Check CSS breakpoints in Tailwind configuration
3. Verify responsive design classes are applied correctly
4. Test on actual mobile devices
5. Review mobile-specific CSS rules

## 🔄 Data Synchronization Issues

### Inconsistent Data Between Components

**Symptom:** Different parts of the dashboard show conflicting information.

**Solutions:**
1. Check real-time subscription setup
2. Verify data consistency in database
3. Review caching mechanisms
4. Ensure all components use the same data sources
5. Check for race conditions in data updates

## 📞 Support Resources

If you're unable to resolve your issue with these troubleshooting steps:

1. **Check GitHub Issues:** Search existing issues in the repository
2. **Community Forums:** Post questions on relevant developer communities
3. **Supabase Support:** Contact Supabase for backend-related issues
4. **Documentation:** Review official documentation for all technologies used
5. **Professional Help:** Consider consulting with a developer experienced in IoT systems

## 📊 Diagnostic Commands

### Check Supabase Connection
```bash
# Test database connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "YOUR_SUPABASE_URL/rest/v1/zones?select=*"
```

### Verify Environment Variables
```bash
# Check if required variables are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Test ESP32 Serial Output
```bash
# Monitor ESP32 serial output (Linux/Mac)
screen /dev/ttyUSB0 115200

# Monitor ESP32 serial output (Windows with PowerShell)
mode COM3 BAUD=115200 PARITY=n DATA=8 STOP=1
```

### Database Query for Debugging
```sql
-- Check latest sensor data
SELECT * FROM sensor_data 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check device status
SELECT id, name, status, last_seen 
FROM devices 
ORDER BY last_seen DESC;
```

---

*Troubleshooting Guide - Last Updated: October 6, 2025*
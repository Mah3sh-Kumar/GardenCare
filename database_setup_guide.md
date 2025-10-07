# 🚀 GardenCare Database Setup Guide

## Quick Setup (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/bzloebjykhwoscuoiikw
2. Navigate to the **SQL Editor** tab

### Step 2: Run Main Schema
Copy and paste the entire content of `supabase/migrations/consolidated_schema.sql` into the SQL Editor and click **RUN**.

This will create all tables, functions, triggers, and RLS policies.

### Step 3: Add Test Data (Optional)
After the main schema is applied, run `supabase/migrations/test_schema.sql` to populate with sample data.

---

## Your Deployed Functions (Ready to Use)

✅ **Device API**: `https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/device-api`
✅ **Device Management**: `https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/device-management`  
✅ **ESP32 Commands**: `https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/esp32-commands`
✅ **ESP32 Data**: `https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/esp32-data`
✅ **Simulate Data**: `https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/simulate-sensor-data`

---

## Database Tables Overview

### Core Tables:
- **profiles** - User profile extensions
- **zones** - Garden zones/areas  
- **devices** - ESP32 and IoT devices
- **sensor_data** - All sensor readings
- **commands** - Device commands queue
- **alerts** - System notifications
- **api_keys** - Device authentication
- **watering_controls** - Automated watering
- **watering_schedules** - Scheduled operations

### Key Features:
- ✅ Row Level Security (RLS) enabled
- ✅ Real-time subscriptions ready
- ✅ Automated triggers for data processing
- ✅ API key authentication system
- ✅ Device health monitoring
- ✅ Comprehensive validation constraints

---

## Testing Your Setup

### Frontend Test:
Your React app is running at: http://localhost:5173
- Try logging in/signing up
- Check the dashboard for sensor data
- Test device management features

### API Test:
Use the simulate-sensor-data function to generate test data:
```bash
# After logging into your app, use the browser console:
fetch('https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/simulate-sensor-data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase.auth.session().access_token}`,
    'Content-Type': 'application/json'
  }
})
```

---

## Next Steps After Database Setup

1. **Create Your Account**: Sign up in the app at http://localhost:5173
2. **Add Zones**: Create your garden zones
3. **Register Devices**: Add your ESP32 devices
4. **Generate API Keys**: Create API keys for device authentication
5. **Test Functions**: Use the simulate function to verify data flow
6. **Connect ESP32**: Update your Arduino code with the live endpoints

Your system is 95% ready - just need to run the SQL schema! 🎯
# Setup Guide

This guide provides step-by-step instructions for setting up the GardenCare system locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Software Requirements
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **Arduino IDE** (for ESP32 firmware, optional)
- **Supabase CLI** (optional, for local development)

### Hardware Requirements (Optional)
- **ESP32 Development Board**
- **DHT11 Temperature/Humidity Sensor**
- **Capacitive Soil Moisture Sensor**
- **Light Sensor (LDR or BH1750)**
- **5V Water Pump**
- **Relay Module (5V)**
- **Breadboard and Jumper Wires**
- **Power Supply (5V for ESP32, appropriate voltage for pump)**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd GardenCare
```

### 2. Install Dependencies
```bash
npm ci
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit the `.env` file with your Supabase credentials:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access the Application
Open your browser and navigate to `http://localhost:5173`

## ☁️ Supabase Setup

### 1. Create Supabase Account
1. Go to [supabase.io](https://supabase.io)
2. Sign up for a free account
3. Create a new project

### 2. Get Project Credentials
1. In your Supabase dashboard, go to Project Settings
2. Navigate to API section
3. Copy your Project URL and anon key
4. Update your `.env` file with these credentials

### 3. Set Up Database
1. In Supabase dashboard, go to SQL Editor
2. Copy the contents of `supabase/migrations/consolidated_schema.sql`
3. Paste and run the SQL script
4. This will create all necessary tables and set up RLS policies

### 4. Configure Authentication
1. Go to Authentication > Settings in Supabase dashboard
2. Enable Email signup
3. Configure site URL for your deployment
4. Set up redirect URLs if needed

### 5. Set Up Realtime
1. Go to Database > Replication in Supabase dashboard
2. Enable replication for required tables:
   - `sensor_data`
   - `devices`
   - `commands`
   - `zones`
   - `alerts`
   - `watering_controls`

### 6. Configure Edge Functions (Optional)
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Link your project:
   ```bash
   supabase link --project-ref your_project_id
   ```
3. Deploy functions:
   ```bash
   supabase functions deploy
   ```

## 💻 Development Environment

### Code Editor Setup
We recommend using Visual Studio Code with the following extensions:
- **ESLint** - For JavaScript/JSX linting
- **Prettier** - For code formatting
- **Tailwind CSS IntelliSense** - For Tailwind CSS classes
- **GitLens** - For Git integration
- **Auto Rename Tag** - For HTML tag renaming

### Environment Variables
Create a `.env` file in the project root:
```bash
# Required
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
VITE_DEBUG=1
VITE_WEATHER_API_KEY=your_weather_api_key
```

### Development Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## 🛠️ Hardware Setup (ESP32)

### 1. Install Arduino IDE
1. Download Arduino IDE from [arduino.cc](https://www.arduino.cc/en/software)
2. Install the IDE
3. Install ESP32 board support:
   - Go to File > Preferences
   - Add ESP32 board manager URL: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Go to Tools > Board > Boards Manager
   - Search for "ESP32" and install

### 2. Install Required Libraries
In Arduino IDE Library Manager, install:
- **DHT sensor library** by Adafruit
- **ArduinoJson** by Benoit Blanchon
- **WiFi** (usually pre-installed)

### 3. Configure ESP32 Firmware
1. Open `ESP32_SIMPLE.ino` in Arduino IDE
2. Update configuration values:
   ```cpp
   // WiFi credentials
   const char* ssid = "your_wifi_ssid";
   const char* password = "your_wifi_password";
   
   // Supabase configuration
   const char* supabaseUrl = "your_supabase_url";
   const char* supabaseServiceKey = "your_supabase_service_key";
   
   // Device configuration
   const char* deviceId = "unique_device_identifier";
   const char* deviceUUID = "device_uuid_from_database";
   const char* zoneUUID = "zone_uuid_from_database";
   const char* userUUID = "user_uuid_from_database";
   ```

### 4. Wire Components
```
ESP32         Components
GPIO 4   →   DHT11 Data
GPIO 34  →   Soil Moisture Sensor Analog Output
GPIO 35  →   Light Sensor Analog Output
GPIO 2   →   Relay Module Input
3.3V     →   DHT11 VCC
GND      →   DHT11 GND
3.3V     →   Soil Moisture Sensor VCC
GND      →   Soil Moisture Sensor GND
5V       →   Relay Module VCC
GND      →   Relay Module GND
Relay Output → Water Pump
```

### 5. Upload Firmware
1. Connect ESP32 to computer via USB
2. Select correct board and port in Arduino IDE
3. Click Upload button
4. Monitor serial output for successful connection

### 6. Register Device in Dashboard
1. Open GardenCare dashboard
2. Navigate to System page
3. Click "Register New Device"
4. Enter device information
5. Note the generated UUIDs for firmware configuration

## 🧪 Testing Setup

### Unit Tests
Run unit tests to verify core functionality:
```bash
npm run test
```

### Integration Tests
Run integration tests for Supabase interactions:
```bash
npm run test:integration
```

### Component Tests
Run React component tests:
```bash
npm run test:components
```

### End-to-End Tests
Run full application tests:
```bash
npm run test:e2e
```

## 📦 Deployment

### Vercel Deployment
1. Sign up for Vercel account
2. Connect your Git repository
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Netlify Deployment
1. Sign up for Netlify account
2. Connect your Git repository
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Set environment variables
5. Deploy!

### Manual Deployment
1. Build the project:
   ```bash
   npm run build
   ```
2. Upload the contents of the `dist` folder to your web server
3. Configure your web server to serve `index.html` for all routes
4. Set environment variables on your server

## 🔧 Configuration

### Customizing the Dashboard
1. **Theme**: Modify `src/contexts/ThemeContext.jsx` for theme changes
2. **Charts**: Adjust chart components in `src/components/charts/`
3. **UI Components**: Modify components in `src/components/ui/`
4. **Pages**: Update page layouts in `src/pages/`

### Adding New Sensors
1. Update ESP32 firmware to read new sensor
2. Modify `sensor_data` table schema to include new fields
3. Update dashboard components to display new data
4. Add new chart components if needed

### Extending Plant Database
1. Add new plants to `src/data/plantsData.json`
2. Ensure all required fields are present
3. Update plant recommendation algorithms if needed

## 🛡️ Security Configuration

### API Key Management
1. Generate secure API keys in Supabase dashboard
2. Store keys securely (never in client-side code)
3. Rotate keys periodically
4. Monitor key usage

### User Authentication
1. Configure email templates in Supabase Auth
2. Set up email confirmation requirements
3. Configure password policies
4. Enable multi-factor authentication (if needed)

### Database Security
1. Review and test RLS policies
2. Monitor database access logs
3. Regularly audit user permissions
4. Implement data encryption for sensitive information

## 📊 Monitoring and Maintenance

### Performance Monitoring
1. Use browser developer tools to monitor performance
2. Implement logging for critical operations
3. Monitor Supabase usage and performance metrics
4. Set up alerts for system issues

### Regular Maintenance
1. Update dependencies regularly:
   ```bash
   npm outdated
   npm update
   ```
2. Review and update documentation
3. Test all functionality after updates
4. Backup database regularly

### Backup Strategy
1. Enable Supabase database backups
2. Regularly export plant data
3. Backup configuration files
4. Document recovery procedures

## 🆘 Troubleshooting Common Issues

### Development Server Won't Start
1. Check Node.js version (must be 18+)
2. Verify all dependencies are installed
3. Check for port conflicts
4. Review error messages in terminal

### Database Connection Issues
1. Verify Supabase credentials
2. Check internet connectivity
3. Ensure Supabase project is active
4. Review RLS policies

### Hardware Communication Problems
1. Check wiring connections
2. Verify firmware configuration
3. Monitor serial output
4. Test individual components

## 📞 Support

For issues not covered in this guide:
1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

---

*Setup Guide - Last Updated: October 6, 2025*
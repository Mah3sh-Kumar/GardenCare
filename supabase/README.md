# GardenCare Dashboard - Supabase Configuration

This directory contains the Supabase configuration and migration files for the GardenCare Dashboard project.

## Database Schema Overview

The GardenCare Dashboard uses the following tables:

1. **users** - Supabase Auth users table
2. **profiles** - User profile information
3. **zones** - Plant zones managed by users
4. **devices** - ESP32 devices registered by users
5. **sensor_data** - Sensor readings from devices
6. **watering_controls** - Watering schedules and commands
7. **alerts** - System alerts and notifications
8. **commands** - Commands sent to devices
9. **devices_config** - Configuration settings for devices

## Row Level Security (RLS) Policies

All tables have RLS enabled with policies that ensure users can only access data they own. The policies are defined in [migrations/001-rls-policies.sql](migrations/001-rls-policies.sql).

### Key Security Principles

1. **User Isolation**: Users can only access their own data
2. **Device Ownership**: Devices belong to users, and all device-related data is protected
3. **Zone Protection**: Plant zones and related watering controls are isolated per user
4. **ESP32 Integration**: Special policies allow ESP32 devices to insert sensor data while maintaining security
5. **Service Role Access**: Certain operations (like system alerts) can be performed by service roles

### Policy Summary

- **users**: Users can only view their own record
- **profiles**: Users can view, insert, and update their own profile
- **zones**: Users can perform all operations on their own zones
- **devices**: Users can perform all operations on their own devices
- **sensor_data**: Users can view data from their devices; ESP32 can insert data
- **watering_controls**: Users can perform all operations on controls for their zones
- **alerts**: Users can view, update, and delete their own alerts; system can insert
- **commands**: Users can perform all operations on commands for their devices
- **devices_config**: Users can perform all operations on config for their devices

## Applying Migrations

To apply these policies to your Supabase project:

1. Make sure you have the Supabase CLI installed
2. Link your project: `supabase link --project-ref your-project-ref`
3. Apply migrations: `supabase db push`

## ESP32 Integration Security

For ESP32 devices to securely communicate with Supabase:

1. Devices use a service key with limited permissions
2. All data inserts are validated against device ownership
3. Commands are sent through secure Supabase functions
4. Device authentication is handled through device registration

The RLS policies ensure that even if a device is compromised, it can only affect data belonging to its owner.
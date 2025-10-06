# API Reference

## Overview

This document provides detailed information about the Supabase API endpoints used in the GardenCare system. All endpoints follow REST conventions and require appropriate authentication.

## Authentication

Most API endpoints require authentication via JWT tokens. The React frontend handles authentication automatically through the Supabase client.

### Headers

All authenticated requests must include:
```
Authorization: Bearer <JWT_TOKEN>
apikey: <ANON_KEY>
Content-Type: application/json
```

## REST Endpoints

### Zones

#### Get All Zones
```
GET /rest/v1/zones
```
Retrieves all zones for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "soil_type": "string",
    "moisture_threshold": "decimal",
    "pump_on": "boolean",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### Create Zone
```
POST /rest/v1/zones
```
Creates a new zone.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "soil_type": "string",
  "moisture_threshold": "decimal",
  "pump_on": "boolean"
}
```

#### Update Zone
```
PATCH /rest/v1/zones?id=eq.{zone_id}
```
Updates an existing zone.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "soil_type": "string",
  "moisture_threshold": "decimal",
  "pump_on": "boolean"
}
```

#### Delete Zone
```
DELETE /rest/v1/zones?id=eq.{zone_id}
```
Deletes a zone.

### Devices

#### Get All Devices
```
GET /rest/v1/devices
```
Retrieves all devices for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "device_id": "string",
    "device_type": "string",
    "status": "string",
    "last_seen": "timestamp",
    "ip_address": "inet",
    "mac_address": "string",
    "firmware_version": "string",
    "zone_id": "uuid",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### Create Device
```
POST /rest/v1/devices
```
Registers a new device.

**Request Body:**
```json
{
  "name": "string",
  "device_id": "string",
  "device_type": "string",
  "zone_id": "uuid"
}
```

#### Update Device
```
PATCH /rest/v1/devices?id=eq.{device_id}
```
Updates device information.

**Request Body:**
```json
{
  "name": "string",
  "zone_id": "uuid",
  "status": "string"
}
```

#### Delete Device
```
DELETE /rest/v1/devices?id=eq.{device_id}
```
Removes a device from the system.

### Sensor Data

#### Get Sensor Data
```
GET /rest/v1/sensor_data?user_id=eq.{user_id}&timestamp=gte.{start_time}&timestamp=lte.{end_time}&order=timestamp.asc
```
Retrieves sensor readings for a time range.

**Response:**
```json
[
  {
    "id": "uuid",
    "device_id": "uuid",
    "zone_id": "uuid",
    "temperature": "decimal",
    "humidity": "decimal",
    "soil_moisture": "decimal",
    "light_level": "integer",
    "ph_level": "decimal",
    "battery_level": "decimal",
    "timestamp": "timestamp",
    "user_id": "uuid"
  }
]
```

#### Create Sensor Data
```
POST /rest/v1/sensor_data
```
Records new sensor readings (used by ESP32 devices).

**Request Body:**
```json
{
  "device_id": "uuid",
  "zone_id": "uuid",
  "temperature": "decimal",
  "humidity": "decimal",
  "soil_moisture": "decimal",
  "light_level": "integer",
  "ph_level": "decimal",
  "battery_level": "decimal",
  "user_id": "uuid"
}
```

### Watering Controls

#### Get Watering Controls
```
GET /rest/v1/watering_controls
```
Retrieves watering system configuration.

**Response:**
```json
[
  {
    "id": "uuid",
    "zone_id": "uuid",
    "device_id": "uuid",
    "pump_pin": "integer",
    "valve_pin": "integer",
    "is_active": "boolean",
    "auto_mode": "boolean",
    "moisture_threshold": "decimal",
    "watering_duration": "integer",
    "last_watered": "timestamp",
    "next_scheduled_watering": "timestamp",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### Update Watering Control
```
PATCH /rest/v1/watering_controls?id=eq.{control_id}
```
Modifies watering system settings.

**Request Body:**
```json
{
  "is_active": "boolean",
  "auto_mode": "boolean",
  "moisture_threshold": "decimal",
  "watering_duration": "integer"
}
```

### Watering Schedules

#### Get Schedules
```
GET /rest/v1/watering_schedules
```
Retrieves all watering schedules.

**Response:**
```json
[
  {
    "id": "uuid",
    "zone_id": "uuid",
    "name": "string",
    "cron_expression": "string",
    "duration": "integer",
    "is_active": "boolean",
    "last_executed": "timestamp",
    "next_execution": "timestamp",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### Create Schedule
```
POST /rest/v1/watering_schedules
```
Creates a new watering schedule.

**Request Body:**
```json
{
  "zone_id": "uuid",
  "name": "string",
  "cron_expression": "string",
  "duration": "integer",
  "is_active": "boolean"
}
```

#### Update Schedule
```
PATCH /rest/v1/watering_schedules?id=eq.{schedule_id}
```
Modifies an existing schedule.

**Request Body:**
```json
{
  "name": "string",
  "cron_expression": "string",
  "duration": "integer",
  "is_active": "boolean"
}
```

#### Delete Schedule
```
DELETE /rest/v1/watering_schedules?id=eq.{schedule_id}
```
Removes a watering schedule.

### Commands

#### Get Pending Commands
```
GET /rest/v1/commands?device_id=eq.{device_id}&status=eq.pending
```
Retrieves pending commands for a device.

**Response:**
```json
[
  {
    "id": "uuid",
    "device_id": "uuid",
    "command_type": "string",
    "parameters": "json",
    "status": "string",
    "priority": "integer",
    "retry_count": "integer",
    "max_retries": "integer",
    "last_retry_at": "timestamp",
    "error_message": "string",
    "result": "json",
    "executed_at": "timestamp",
    "expires_at": "timestamp",
    "user_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### Create Command
```
POST /rest/v1/commands
```
Sends a command to a device.

**Request Body:**
```json
{
  "device_id": "uuid",
  "command_type": "string",
  "parameters": "json",
  "priority": "integer"
}
```

#### Update Command Status
```
PATCH /rest/v1/commands?id=eq.{command_id}
```
Updates command execution status.

**Request Body:**
```json
{
  "status": "string",
  "result": "json",
  "executed_at": "timestamp"
}
```

### Alerts

#### Get Active Alerts
```
GET /rest/v1/alerts?user_id=eq.{user_id}&is_read=eq.false&order=timestamp.desc
```
Retrieves unread alerts for a user.

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "string",
    "zone": "string",
    "message": "string",
    "severity": "string",
    "is_read": "boolean",
    "is_acknowledged": "boolean",
    "data": "json",
    "user_id": "uuid",
    "timestamp": "timestamp",
    "expires_at": "timestamp"
  }
]
```

#### Mark Alert as Read
```
PATCH /rest/v1/alerts?id=eq.{alert_id}
```
Marks an alert as read.

**Request Body:**
```json
{
  "is_read": "boolean"
}
```

## Edge Functions

### Get Device Configuration
```
POST /rest/v1/rpc/get_device_config
```
Retrieves configuration for a specific device.

**Request Body:**
```json
{
  "p_device_id": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "config": {
    "zone_id": "uuid",
    "device_name": "string",
    "moisture_threshold": "decimal",
    "soil_type": "string"
  }
}
```

### Simulate Sensor Data
```
POST /rest/v1/rpc/simulate_sensor_data
```
Generates test sensor data for development.

**Request Body:**
```json
{
  "device_count": "integer",
  "hours_back": "integer"
}
```

**Response:**
```json
{
  "success": "boolean",
  "generated_records": "integer",
  "message": "string"
}
```

### Get Dashboard Stats
```
POST /rest/v1/rpc/get_dashboard_stats
```
Retrieves statistics for the dashboard.

**Response:**
```json
[
  {
    "title": "string",
    "value": "string",
    "change": "string",
    "trend": "string",
    "icon": "string"
  }
]
```

### Get Analytics Data
```
POST /rest/v1/rpc/get_analytics_performance_metrics
```
Retrieves analytics data for the performance metrics page.

**Request Body:**
```json
{
  "period_type": "string"
}
```

**Response:**
```json
{
  "summary": "json",
  "waterUsageByZone": "json",
  "waterSavings": "json",
  "moistureDistribution": "json",
  "healthScores": "json",
  "insights": "json"
}
```

## Real-time Subscriptions

### Sensor Data Changes
```javascript
supabase
  .channel('sensor_data_changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'sensor_data',
    },
    (payload) => {
      console.log('Sensor data change:', payload);
    }
  )
  .subscribe();
```

### Alert Changes
```javascript
supabase
  .channel('alerts_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'alerts',
    },
    (payload) => {
      console.log('Alert change:', payload);
    }
  )
  .subscribe();
```

### Zone Changes
```javascript
supabase
  .channel('zones_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'zones',
    },
    (payload) => {
      console.log('Zone change:', payload);
    }
  )
  .subscribe();
```

## Error Handling

API responses follow standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a JSON body with error details:
```json
{
  "error": "string",
  "message": "string"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 1000 requests per hour per API key
- 100 requests per minute per IP address

Exceeding these limits will result in a `429 Too Many Requests` response.

---

*API Reference - Last Updated: October 6, 2025*
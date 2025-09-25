// ESP32 Sensor Data Edge Function
// Handles receiving sensor data from ESP32 devices and storing in Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const requestData = await req.json()
    
    // Extract fields with validation
    const { 
      device_id, 
      zone_id, 
      temperature, 
      humidity, 
      soil_moisture, 
      light_level, 
      ph_level,
      api_key 
    } = requestData
    
    // Validate required fields
    if (!device_id || temperature === undefined || humidity === undefined || soil_moisture === undefined || !api_key) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: device_id, temperature, humidity, soil_moisture, api_key' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate data types
    const temp = parseFloat(temperature)
    const hum = parseFloat(humidity)
    const soil = parseFloat(soil_moisture)
    const light = light_level ? parseFloat(light_level) : null
    const ph = ph_level ? parseFloat(ph_level) : null
    
    if (isNaN(temp) || isNaN(hum) || isNaN(soil)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid data types for temperature, humidity, or soil_moisture' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate API key and get user
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('user_id, name')
      .eq('key', api_key)
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeyData) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const user_id = apiKeyData.user_id

    // Validate device belongs to user
    const { data: device, error: deviceError } = await supabaseClient
      .from('devices')
      .select('id, name, zone_id')
      .eq('device_id', device_id)
      .eq('user_id', user_id)
      .single()

    if (deviceError || !device) {
      return new Response(JSON.stringify({ error: 'Device not registered or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Use provided zone_id or device's zone_id
    const finalZoneId = zone_id || device.zone_id
    
    if (!finalZoneId) {
      return new Response(JSON.stringify({ error: 'No zone assigned to device' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate zone belongs to user
    const { data: zone, error: zoneError } = await supabaseClient
      .from('zones')
      .select('id, name')
      .eq('id', finalZoneId)
      .eq('user_id', user_id)
      .single()

    if (zoneError || !zone) {
      return new Response(JSON.stringify({ error: 'Zone not found or access denied' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Insert sensor data
    const { data, error } = await supabaseClient
      .from('sensor_data')
      .insert({
        device_id: device.id,
        zone_id: finalZoneId,
        temperature: temp,
        humidity: hum,
        soil_moisture: soil,
        light_level: light,
        ph_level: ph,
        user_id: user_id,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: `Database error: ${error.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Update device last seen
    await supabaseClient
      .from('devices')
      .update({ 
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', device.id)

    // Check for alerts based on thresholds
    const alerts = []
    
    // Temperature alerts
    if (temp > 35) {
      alerts.push({
        type: 'warning',
        message: `High temperature detected: ${temp}°C`,
        zone_id: finalZoneId,
        user_id: user_id
      })
    } else if (temp < 5) {
      alerts.push({
        type: 'warning',
        message: `Low temperature detected: ${temp}°C`,
        zone_id: finalZoneId,
        user_id: user_id
      })
    }

    // Soil moisture alerts
    if (soil < 20) {
      alerts.push({
        type: 'warning',
        message: `Low soil moisture: ${soil}%`,
        zone_id: finalZoneId,
        user_id: user_id
      })
    }

    // Insert alerts if any
    if (alerts.length > 0) {
      await supabaseClient
        .from('alerts')
        .insert(alerts.map(alert => ({
          ...alert,
          timestamp: new Date().toISOString(),
          read: false
        })))
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Sensor data received successfully',
      data: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('ESP32 data error:', error)
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
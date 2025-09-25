// Simulate Sensor Data Edge Function
// Generates realistic sensor data for testing and demonstration purposes

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

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Get zones for the authenticated user
    const { data: zones, error: zonesError } = await supabaseClient
      .from('zones')
      .select('id, name')
      .eq('user_id', user.id)

    if (zonesError) {
      return new Response(JSON.stringify({ error: `Database error: ${zonesError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!zones || zones.length === 0) {
      return new Response(JSON.stringify({ error: 'No zones found. Create zones first.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Get devices for the authenticated user
    const { data: devices, error: devicesError } = await supabaseClient
      .from('devices')
      .select('id, name')
      .eq('user_id', user.id)
      .limit(1)

    if (devicesError) {
      return new Response(JSON.stringify({ error: `Database error: ${devicesError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const deviceId = devices && devices.length > 0 ? devices[0].id : null;

    // Generate realistic sensor data for each zone
    const sensorData = zones.map(zone => ({
      device_id: deviceId,
      zone_id: zone.id,
      temperature: parseFloat((18 + Math.random() * 12).toFixed(1)), // 18-30°C
      humidity: parseFloat((45 + Math.random() * 30).toFixed(1)),    // 45-75%
      soil_moisture: parseFloat((30 + Math.random() * 40).toFixed(1)), // 30-70%
      light_level: parseFloat((100 + Math.random() * 900).toFixed(0)), // 100-1000 lux
      ph_level: parseFloat((6.0 + Math.random() * 1.5).toFixed(1)),    // 6.0-7.5 pH
      user_id: user.id,
      timestamp: new Date().toISOString()
    }))

    // Insert the data into the sensor_data table
    const { data, error } = await supabaseClient
      .from('sensor_data')
      .insert(sensorData)
      .select()

    if (error) {
      return new Response(JSON.stringify({ error: `Database error: ${error.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Sensor data simulated successfully',
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Simulate sensor data error:', error)
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
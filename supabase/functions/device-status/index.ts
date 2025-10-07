// Device Status Edge Function
// Handles device status updates from ESP32 devices

// @ts-ignore: Deno is available in the Edge Functions runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-ignore: Deno is available in the Edge Functions runtime
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-API-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API Key
    const apiKey = req.headers.get('X-API-Key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key is required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // @ts-ignore: Deno environment variables are available in Edge Functions
    const supabase = createClient(
      // @ts-ignore: Deno environment variables are available in Edge Functions
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno environment variables are available in Edge Functions
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Validate API key against database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, key, user_id')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API Key' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get device information - find device associated with this user
    // In the future, we might want to pass device_id as a parameter
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_id, name, user_id')
      .eq('user_id', apiKeyData.user_id)
      .limit(1)
      .maybeSingle()

    if (deviceError || !deviceData) {
      return new Response(
        JSON.stringify({ error: 'No device found for this API key' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle POST requests (update device status)
    if (req.method === 'POST') {
      const body = await req.json()
      
      // Update device status (without message column which doesn't exist in devices table)
      const { data: updatedDevice, error: updateError } = await supabase
        .from('devices')
        .update({
          status: body.status || 'online',
          last_seen: new Date().toISOString()
          // Removed message field as it doesn't exist in devices table
        })
        .eq('id', deviceData.id)
        .select()
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update device status: ' + updateError.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Also insert into device_status table for historical tracking
      const { error: statusError } = await supabase
        .from('device_status')
        .upsert([{
          device_id: deviceData.device_id,
          status: body.status || 'online',
          message: body.message,
          last_seen: new Date().toISOString(),
          wifi_rssi: body.wifi_rssi,
          free_heap: body.free_heap,
          uptime: body.uptime,
          pump_active: body.pump_active,
          soil_moisture: body.soil_moisture
        }], {
          onConflict: 'device_id'
        })

      if (statusError) {
        console.error('Failed to insert device status history:', statusError)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          device: updatedDevice 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Device Status Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
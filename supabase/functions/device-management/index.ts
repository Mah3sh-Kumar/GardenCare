// Device Management Edge Function
// Handles ESP32 device registration, updates, and status management

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

    const { method } = req

    if (method === 'POST') {
      // Register new device or update device status
      const { 
        device_id, 
        name, 
        device_type = 'esp32', 
        ip_address, 
        mac_address, 
        firmware_version,
        api_key 
      } = await req.json()
      
      if (!device_id || !name || !api_key) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: device_id, name, api_key' 
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

      // Check if device already exists
      const { data: existingDevice, error: existingError } = await supabaseClient
        .from('devices')
        .select('id')
        .eq('device_id', device_id)
        .eq('user_id', user_id)
        .single()

      if (existingDevice) {
        // Update existing device
        const { data: device, error: updateError } = await supabaseClient
          .from('devices')
          .update({
            name,
            status: 'online',
            last_seen: new Date().toISOString(),
            ip_address,
            mac_address,
            firmware_version
          })
          .eq('id', existingDevice.id)
          .select()
          .single()

        if (updateError) {
          return new Response(JSON.stringify({ error: `Database error: ${updateError.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          })
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Device updated successfully',
          device 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } else {
        // Register new device
        const { data: device, error: insertError } = await supabaseClient
          .from('devices')
          .insert({
            device_id,
            name,
            device_type,
            status: 'online',
            ip_address,
            mac_address,
            firmware_version,
            user_id: user_id
          })
          .select()
          .single()

        if (insertError) {
          return new Response(JSON.stringify({ error: `Database error: ${insertError.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          })
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Device registered successfully',
          device 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

    } else if (method === 'GET') {
      // Get user's devices (requires authentication)
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

      const { data: devices, error: devicesError } = await supabaseClient
        .from('devices')
        .select('id, device_id, name, device_type, status, ip_address, firmware_version, last_seen, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (devicesError) {
        return new Response(JSON.stringify({ error: `Database error: ${devicesError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({ 
        success: true,
        devices: devices || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (method === 'PUT') {
      // Update device status (heartbeat from ESP32)
      const { device_id, status = 'online', api_key } = await req.json()
      
      if (!device_id || !api_key) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: device_id, api_key' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Validate API key and get user
      const { data: apiKeyData, error: apiKeyError } = await supabaseClient
        .from('api_keys')
        .select('user_id')
        .eq('key', api_key)
        .eq('is_active', true)
        .single()

      if (apiKeyError || !apiKeyData) {
        return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      // Update device status
      const { data: device, error: updateError } = await supabaseClient
        .from('devices')
        .update({
          status,
          last_seen: new Date().toISOString()
        })
        .eq('device_id', device_id)
        .eq('user_id', apiKeyData.user_id)
        .select('id, name, status, last_seen')
        .single()

      if (updateError) {
        return new Response(JSON.stringify({ error: `Database error: ${updateError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Device status updated successfully',
        device 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (method === 'DELETE') {
      // Delete device (requires authentication)
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

      const { device_id } = await req.json()
      
      if (!device_id) {
        return new Response(JSON.stringify({ error: 'Missing device_id' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Delete device
      const { error: deleteError } = await supabaseClient
        .from('devices')
        .delete()
        .eq('id', device_id)
        .eq('user_id', user.id)

      if (deleteError) {
        return new Response(JSON.stringify({ error: `Database error: ${deleteError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Device deleted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      })
    }

  } catch (error) {
    console.error('Device management error:', error)
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 
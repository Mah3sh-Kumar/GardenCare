// ESP32 Commands Edge Function
// Handles sending commands to ESP32 devices for pump control and watering operations

// @ts-ignore: Deno is available in the Edge Functions runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Supabase client is imported via CDN
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
    // @ts-ignore: Deno environment variables are available in Edge Functions
    const supabaseClient = createClient(
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

    const { method } = req

    if (method === 'POST') {
      // Send command to ESP32 (frontend request)
      const { device_id, command_type, parameters, api_key } = await req.json()
      
      if (!device_id || !command_type || !api_key) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: device_id, command_type, api_key' 
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
        .select('id, name, status')
        .eq('id', device_id)
        .eq('user_id', user_id)
        .single()

      if (deviceError || !device) {
        return new Response(JSON.stringify({ error: 'Device not found or access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      // Insert command into database
      const { data: command, error: commandError } = await supabaseClient
        .from('commands')
        .insert({
          device_id,
          command_type,
          parameters: parameters || {},
          status: 'pending',
          user_id: user_id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (commandError) {
        return new Response(JSON.stringify({ error: `Database error: ${commandError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Command sent successfully',
        command 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (method === 'GET') {
      // Get pending commands for ESP32 (device request)
      const url = new URL(req.url)
      const device_id = url.searchParams.get('device_id')
      const api_key = url.searchParams.get('api_key')

      if (!device_id || !api_key) {
        return new Response(JSON.stringify({ 
          error: 'Missing required parameters: device_id, api_key' 
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

      // Validate device belongs to user
      const { data: device, error: deviceError } = await supabaseClient
        .from('devices')
        .select('id')
        .eq('device_id', device_id)
        .eq('user_id', apiKeyData.user_id)
        .single()

      if (deviceError || !device) {
        return new Response(JSON.stringify({ error: 'Device registered or access denied' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      // Get pending commands for the device
      const { data: commands, error: commandsError } = await supabaseClient
        .from('commands')
        .select('id, command_type, parameters, created_at')
        .eq('device_id', device.id)
        .eq('status', 'pending')
        .eq('user_id', apiKeyData.user_id)
        .order('created_at', { ascending: true })

      if (commandsError) {
        return new Response(JSON.stringify({ error: `Database error: ${commandsError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({ 
        success: true,
        commands: commands || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (method === 'PUT') {
      // Update command status (ESP32 reporting execution)
      const { command_id, status, result, api_key } = await req.json()
      
      if (!command_id || !status || !api_key) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: command_id, status, api_key' 
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

      // Update command status
      const updateData: any = { 
        status,
        executed_at: status === 'executed' || status === 'failed' ? new Date().toISOString() : null
      }
      
      if (result) {
        updateData.result = result
      }

      const { data: command, error: commandError } = await supabaseClient
        .from('commands')
        .update(updateData)
        .eq('id', command_id)
        .eq('user_id', apiKeyData.user_id)
        .select()
        .single()

      if (commandError) {
        return new Response(JSON.stringify({ error: `Database error: ${commandError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      // If watering command was executed, update zone last watered
      if (status === 'executed' && command.command_type === 'water') {
        await supabaseClient
          .from('zones')
          .update({ last_watered: new Date().toISOString() })
          .eq('id', command.zone_id)
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Command status updated successfully',
        command 
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
    console.error('ESP32 commands error:', error)
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
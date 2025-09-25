-- Enhanced RLS Policies and Security Improvements for GardenFlow
-- DRAFT: DO NOT RUN - FOR MANUAL REVIEW ONLY
-- Review these changes before applying to production

-- Function to get user permissions level (future enhancement)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'user_role',
    'user'
  );
$$;

-- Enhanced sensor_data policy for better performance
DROP POLICY IF EXISTS "Users can view their own sensor data" ON public.sensor_data;
CREATE POLICY "Users can view their own sensor data" 
ON public.sensor_data FOR SELECT 
USING (auth.uid() = user_id);

-- Enhanced sensor_data insert policy for ESP32 devices with API key validation
DROP POLICY IF EXISTS "Users and service role can insert sensor data" ON public.sensor_data;
CREATE POLICY "ESP32 devices can insert sensor data" 
ON public.sensor_data FOR INSERT 
WITH CHECK (
  -- Users can insert their own data
  auth.uid() = user_id
  OR 
  -- Service role can insert (for ESP32 devices via Edge Functions)
  auth.role() = 'service_role'
  OR
  -- API key validation for ESP32 devices (if implemented)
  EXISTS (
    SELECT 1 FROM api_keys ak
    WHERE ak.user_id = sensor_data.user_id
    AND ak.is_active = true
    AND current_setting('request.headers')::json->>'x-api-key' = ak.key
  )
);

-- Enhanced watering_controls policy to use direct user_id reference
DROP POLICY IF EXISTS "Users can view their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can view their own watering controls" 
ON public.watering_controls FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can insert their own watering controls" 
ON public.watering_controls FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can update their own watering controls" 
ON public.watering_controls FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own watering controls" ON public.watering_controls;
CREATE POLICY "Users can delete their own watering controls" 
ON public.watering_controls FOR DELETE 
USING (auth.uid() = user_id);

-- Enhanced commands policy for better performance
DROP POLICY IF EXISTS "Users can view their own commands" ON public.commands;
CREATE POLICY "Users can view their own commands" 
ON public.commands FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and service role can insert commands" ON public.commands;
CREATE POLICY "Users and service role can insert commands" 
ON public.commands FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "Users can update their own commands" ON public.commands;
CREATE POLICY "Users can update their own commands" 
ON public.commands FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own commands" ON public.commands;
CREATE POLICY "Users can delete their own commands" 
ON public.commands FOR DELETE 
USING (auth.uid() = user_id);

-- Add rate limiting function for API calls (security enhancement)
CREATE OR REPLACE FUNCTION check_rate_limit(user_uuid UUID, operation TEXT, max_requests INTEGER, time_window INTERVAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*)
  INTO request_count
  FROM audit_logs
  WHERE user_id = user_uuid
    AND table_name = operation
    AND created_at > NOW() - time_window;
  
  -- Return true if under limit
  RETURN request_count < max_requests;
END;
$$;

-- Enhanced API key validation function
CREATE OR REPLACE FUNCTION validate_api_key(api_key TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_user_id UUID;
BEGIN
  SELECT user_id
  INTO key_user_id
  FROM api_keys
  WHERE key = api_key
    AND is_active = true;
  
  RETURN key_user_id;
END;
$$;

-- Add indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_user_id_timestamp ON public.sensor_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON public.zones(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_user_id_status ON public.commands(user_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_read ON public.alerts(user_id, read);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id_active ON public.api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_watering_schedules_user_id ON public.watering_schedules(user_id);

-- Add trigger to automatically set user_id on insert (backup security measure)
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only set user_id if it's null and we have an authenticated user
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply the trigger to key tables (commented out for safety)
-- DROP TRIGGER IF EXISTS trigger_set_user_id_zones ON public.zones;
-- CREATE TRIGGER trigger_set_user_id_zones
--   BEFORE INSERT ON public.zones
--   FOR EACH ROW
--   EXECUTE FUNCTION set_user_id();

-- DROP TRIGGER IF EXISTS trigger_set_user_id_devices ON public.devices;
-- CREATE TRIGGER trigger_set_user_id_devices
--   BEFORE INSERT ON public.devices
--   FOR EACH ROW
--   EXECUTE FUNCTION set_user_id();

-- Revoke unnecessary permissions for security
REVOKE ALL ON SCHEMA information_schema FROM PUBLIC;
REVOKE ALL ON SCHEMA pg_catalog FROM PUBLIC;

-- Grant necessary permissions to authenticated users (ensure no regression)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Additional security: Prevent users from modifying other users' data
-- This is already handled by RLS, but adding as an extra security layer
ALTER TABLE public.profiles ADD CONSTRAINT check_profile_user_id 
CHECK (id = auth.uid());

-- Performance optimization: Add partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sensor_data_recent 
ON public.sensor_data(user_id, timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_alerts_unread 
ON public.alerts(user_id, timestamp DESC) 
WHERE read = false;

-- Comment: These indexes will significantly improve dashboard load times
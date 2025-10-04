-- Enhanced ESP32 Sensor Data Function with User ID Assignment
-- This function allows ESP32 to insert sensor data while properly assigning user_id

CREATE OR REPLACE FUNCTION public.insert_esp32_sensor_data(
  p_device_uuid UUID,
  p_zone_uuid UUID,
  p_temperature DECIMAL(5,2),
  p_humidity DECIMAL(5,2),
  p_soil_moisture DECIMAL(5,2),
  p_light_level INTEGER DEFAULT NULL,
  p_battery_level DECIMAL(5,2) DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  device_record RECORD;
  inserted_id UUID;
  target_user_id UUID;
BEGIN
  -- Find the device and get the owner's user_id
  SELECT d.id, d.user_id, z.id as zone_id
  INTO device_record
  FROM public.devices d
  LEFT JOIN public.zones z ON d.zone_id = z.id
  WHERE d.id = p_device_uuid
    AND d.status IN ('online', 'offline')  -- Allow both online and offline devices
  LIMIT 1;
  
  -- Check if device exists
  IF device_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Device not found',
      'device_uuid', p_device_uuid
    );
  END IF;
  
  -- Use the device owner's user_id
  target_user_id := device_record.user_id;
  
  -- Validate zone if provided
  IF p_zone_uuid IS NOT NULL AND p_zone_uuid != device_record.zone_id THEN
    -- Check if the provided zone belongs to the same user
    IF NOT EXISTS (
      SELECT 1 FROM public.zones 
      WHERE id = p_zone_uuid AND user_id = target_user_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Zone not found or access denied',
        'zone_uuid', p_zone_uuid
      );
    END IF;
  END IF;
  
  -- Insert sensor data with proper user_id
  INSERT INTO public.sensor_data (
    device_id,
    zone_id,
    temperature,
    humidity,
    soil_moisture,
    light_level,
    battery_level,
    user_id,          -- **KEY**: Assign user_id from device owner
    timestamp
  ) VALUES (
    p_device_uuid,
    COALESCE(p_zone_uuid, device_record.zone_id),
    p_temperature,
    p_humidity,
    p_soil_moisture,
    p_light_level,
    p_battery_level,
    target_user_id,   -- **KEY**: Use device owner's user_id
    now()
  ) RETURNING id INTO inserted_id;
  
  -- Update device last_seen and status
  UPDATE public.devices 
  SET last_seen = now(), 
      status = 'online',
      updated_at = now()
  WHERE id = p_device_uuid;
  
  RETURN jsonb_build_object(
    'success', true,
    'sensor_data_id', inserted_id,
    'device_uuid', p_device_uuid,
    'user_id', target_user_id,
    'message', 'Sensor data inserted successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'device_uuid', p_device_uuid
    );
END;
$$;

-- Grant permissions for both authenticated users and service role
GRANT EXECUTE ON FUNCTION public.insert_esp32_sensor_data(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_esp32_sensor_data(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, INTEGER, DECIMAL) TO service_role;
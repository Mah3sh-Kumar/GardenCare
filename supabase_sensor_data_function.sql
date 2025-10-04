-- Alternative Solution: Create Function for ESP32 Sensor Data
-- This function accepts string device_id and converts to UUID internally

CREATE OR REPLACE FUNCTION public.insert_sensor_data_by_device_string(
  p_device_id_string TEXT,
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
BEGIN
  -- Find the device by string device_id
  SELECT d.id, d.zone_id, d.user_id
  INTO device_record
  FROM public.devices d
  WHERE d.device_id = p_device_id_string
    AND d.status = 'online'
  LIMIT 1;
  
  -- Check if device exists
  IF device_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Device not found or offline',
      'device_id', p_device_id_string
    );
  END IF;
  
  -- Insert sensor data using the UUID
  INSERT INTO public.sensor_data (
    device_id,
    zone_id,
    temperature,
    humidity,
    soil_moisture,
    light_level,
    battery_level,
    user_id,
    timestamp
  ) VALUES (
    device_record.id,           -- Use UUID here
    device_record.zone_id,
    p_temperature,
    p_humidity,
    p_soil_moisture,
    p_light_level,
    p_battery_level,
    device_record.user_id,
    now()
  ) RETURNING id INTO inserted_id;
  
  -- Update device last_seen
  UPDATE public.devices 
  SET last_seen = now(), 
      updated_at = now()
  WHERE id = device_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'sensor_data_id', inserted_id,
    'device_uuid', device_record.id,
    'message', 'Sensor data inserted successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'device_id', p_device_id_string
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.insert_sensor_data_by_device_string(TEXT, DECIMAL, DECIMAL, DECIMAL, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sensor_data_by_device_string(TEXT, DECIMAL, DECIMAL, DECIMAL, INTEGER, DECIMAL) TO service_role;
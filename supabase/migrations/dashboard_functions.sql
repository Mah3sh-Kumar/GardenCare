-- Dashboard Functions - Fix for missing functions error
-- Run this after the consolidated schema to add missing functions

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
  total_devices int;
  online_devices int;
  avg_temperature decimal;
  avg_humidity decimal;
  avg_soil_moisture decimal;
  total_zones int;
  active_alerts_count int;
  total_sensor_readings bigint;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get device counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'online')
  INTO total_devices, online_devices
  FROM public.devices 
  WHERE user_id = current_user_id;
  
  -- Get average sensor values from last 24 hours
  SELECT 
    ROUND(AVG(temperature), 1),
    ROUND(AVG(humidity), 1),
    ROUND(AVG(soil_moisture), 1)
  INTO avg_temperature, avg_humidity, avg_soil_moisture
  FROM public.sensor_data 
  WHERE user_id = current_user_id 
    AND timestamp > now() - interval '24 hours';
  
  -- Get zone count
  SELECT COUNT(*) INTO total_zones
  FROM public.zones 
  WHERE user_id = current_user_id;
  
  -- Get active alerts count
  SELECT COUNT(*) INTO active_alerts_count
  FROM public.alerts 
  WHERE user_id = current_user_id 
    AND is_read = false 
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Get total sensor readings
  SELECT COUNT(*) INTO total_sensor_readings
  FROM public.sensor_data 
  WHERE user_id = current_user_id;
  
  -- Build result JSON
  result := jsonb_build_array(
    jsonb_build_object(
      'title', 'Total Devices',
      'value', total_devices,
      'change', '+' || CASE WHEN total_devices > 0 THEN '100' ELSE '0' END || '%',
      'trend', 'up',
      'icon', '🔌'
    ),
    jsonb_build_object(
      'title', 'Online Devices',
      'value', online_devices || '/' || total_devices,
      'change', CASE WHEN total_devices > 0 THEN ROUND((online_devices::decimal / total_devices) * 100, 0) || '%' ELSE '0%' END,
      'trend', CASE WHEN online_devices = total_devices THEN 'up' ELSE 'down' END,
      'icon', '📡'
    ),
    jsonb_build_object(
      'title', 'Avg Temperature',
      'value', COALESCE(avg_temperature, 0) || '°C',
      'change', CASE 
        WHEN avg_temperature IS NULL THEN 'No data'
        WHEN avg_temperature BETWEEN 18 AND 25 THEN 'Optimal'
        ELSE 'Monitor'
      END,
      'trend', CASE 
        WHEN avg_temperature IS NULL THEN 'neutral'
        WHEN avg_temperature BETWEEN 18 AND 25 THEN 'up'
        ELSE 'down'
      END,
      'icon', '🌡️'
    ),
    jsonb_build_object(
      'title', 'Avg Soil Moisture',
      'value', COALESCE(avg_soil_moisture, 0) || '%',
      'change', CASE 
        WHEN avg_soil_moisture IS NULL THEN 'No data'
        WHEN avg_soil_moisture BETWEEN 40 AND 60 THEN 'Optimal'
        WHEN avg_soil_moisture < 30 THEN 'Low'
        ELSE 'High'
      END,
      'trend', CASE 
        WHEN avg_soil_moisture IS NULL THEN 'neutral'
        WHEN avg_soil_moisture BETWEEN 40 AND 60 THEN 'up'
        WHEN avg_soil_moisture < 30 THEN 'down'
        ELSE 'up'
      END,
      'icon', '💧'
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sensor data for charts
CREATE OR REPLACE FUNCTION public.get_sensor_chart_data(
  hours_back integer DEFAULT 24
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'timestamp', timestamp,
      'temperature', temperature,
      'humidity', humidity,
      'soil_moisture', soil_moisture,
      'light_level', light_level,
      'device_id', device_id,
      'zone_id', zone_id
    ) ORDER BY timestamp
  ) INTO result
  FROM public.sensor_data
  WHERE user_id = current_user_id
    AND timestamp > now() - (hours_back || ' hours')::interval;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent alerts for dashboard
CREATE OR REPLACE FUNCTION public.get_recent_alerts(limit_count integer DEFAULT 10)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', type,
      'zone', zone,
      'message', message,
      'severity', severity,
      'timestamp', timestamp,
      'is_read', is_read,
      'data', data
    ) ORDER BY timestamp DESC
  ) INTO result
  FROM (
    SELECT *
    FROM public.alerts
    WHERE user_id = current_user_id
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY timestamp DESC
    LIMIT limit_count
  ) recent_alerts;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to simulate sensor data for testing
CREATE OR REPLACE FUNCTION public.simulate_sensor_data(
  device_count integer DEFAULT 1,
  hours_back integer DEFAULT 24
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  device_rec record;
  i integer;
  generated_count integer := 0;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Generate data for existing devices
  FOR device_rec IN 
    SELECT id, zone_id 
    FROM public.devices 
    WHERE user_id = current_user_id 
    LIMIT device_count
  LOOP
    -- Generate hourly data points
    FOR i IN 0..hours_back LOOP
      INSERT INTO public.sensor_data (
        device_id,
        zone_id,
        temperature,
        humidity,
        soil_moisture,
        light_level,
        ph_level,
        battery_level,
        timestamp,
        user_id
      ) VALUES (
        device_rec.id,
        device_rec.zone_id,
        20 + (random() * 15), -- 20-35°C
        40 + (random() * 40), -- 40-80%
        30 + (random() * 40), -- 30-70%
        (random() * 4095)::integer, -- 0-4095
        6.0 + (random() * 2), -- 6.0-8.0 pH
        80 + (random() * 20), -- 80-100% battery
        now() - (i || ' hours')::interval - (random() * 60 || ' minutes')::interval,
        current_user_id
      );
      generated_count := generated_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'generated_records', generated_count,
    'message', 'Generated ' || generated_count || ' sensor data records'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics performance metrics
CREATE OR REPLACE FUNCTION public.get_analytics_performance_metrics(
  period_type text DEFAULT 'month'
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
  summary_data jsonb;
  water_usage_data jsonb;
  water_savings_data jsonb;
  moisture_distribution_data jsonb;
  health_scores_data jsonb;
  insights_data jsonb;
  interval_period interval;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Set interval based on period type
  interval_period := CASE period_type
    WHEN 'week' THEN '7 days'::interval
    WHEN 'month' THEN '30 days'::interval
    ELSE '30 days'::interval
  END;
  
  -- Calculate summary metrics
  WITH recent_data AS (
    SELECT 
      AVG(soil_moisture) as avg_moisture,
      AVG(temperature) as avg_temp,
      AVG(humidity) as avg_humidity,
      COUNT(*) as total_readings
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  ),
  watering_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE command_type = 'water' AND status = 'executed') as total_waterings,
      SUM(COALESCE((parameters->>'duration')::integer, 30)) FILTER (WHERE command_type = 'water' AND status = 'executed') as total_water_time
    FROM public.commands
    WHERE user_id = current_user_id
      AND created_at > now() - interval_period
  )
  SELECT jsonb_build_object(
    'totalWaterUsage', COALESCE(ws.total_water_time * 0.5, 0), -- Estimate 0.5L per second
    'totalWaterSaved', COALESCE(ws.total_water_time * 0.2, 0), -- Estimate 20% savings
    'avgMoisture', COALESCE(ROUND(rd.avg_moisture, 1), 0),
    'avgHealthScore', CASE 
      WHEN rd.avg_moisture BETWEEN 40 AND 60 AND rd.avg_temp BETWEEN 18 AND 25 THEN 85
      WHEN rd.avg_moisture BETWEEN 30 AND 70 AND rd.avg_temp BETWEEN 15 AND 30 THEN 70
      ELSE 60
    END
  ) INTO summary_data
  FROM recent_data rd
  CROSS JOIN watering_stats ws;
  
  -- Water usage by zone
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', COALESCE(z.name, 'Unknown Zone'),
      'usage', COALESCE(zone_usage.water_amount, 0)
    )
  ) INTO water_usage_data
  FROM public.zones z
  LEFT JOIN (
    SELECT 
      zone_id,
      SUM(COALESCE((c.parameters->>'duration')::integer, 30)) * 0.5 as water_amount
    FROM public.commands c
    JOIN public.devices d ON c.device_id = d.id
    WHERE c.user_id = current_user_id
      AND c.command_type = 'water'
      AND c.status = 'executed'
      AND c.created_at > now() - interval_period
    GROUP BY zone_id
  ) zone_usage ON z.id = zone_usage.zone_id
  WHERE z.user_id = current_user_id;
  
  -- Water savings trend (mock data for now)
  SELECT jsonb_build_array(
    jsonb_build_object('month', 'Jan', 'saved', 45, 'regular', 120),
    jsonb_build_object('month', 'Feb', 'saved', 52, 'regular', 115),
    jsonb_build_object('month', 'Mar', 'saved', 38, 'regular', 108),
    jsonb_build_object('month', 'Apr', 'saved', 61, 'regular', 135)
  ) INTO water_savings_data;
  
  -- Moisture level distribution
  WITH moisture_ranges AS (
    SELECT 
      CASE 
        WHEN soil_moisture < 20 THEN 'Very Dry'
        WHEN soil_moisture < 40 THEN 'Dry'
        WHEN soil_moisture < 60 THEN 'Optimal'
        WHEN soil_moisture < 80 THEN 'Moist'
        ELSE 'Very Moist'
      END as range,
      COUNT(*) as count
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', range,
      'value', count,
      'color', CASE range
        WHEN 'Very Dry' THEN '#ef4444'
        WHEN 'Dry' THEN '#f97316'
        WHEN 'Optimal' THEN '#22c55e'
        WHEN 'Moist' THEN '#3b82f6'
        ELSE '#8b5cf6'
      END
    )
  ) INTO moisture_distribution_data
  FROM moisture_ranges;
  
  -- Health scores by zone
  SELECT jsonb_agg(
    jsonb_build_object(
      'zone', COALESCE(z.name, 'Zone ' || substr(z.id::text, 1, 8)),
      'score', CASE 
        WHEN avg_moisture BETWEEN 40 AND 60 AND avg_temp BETWEEN 18 AND 25 THEN 90
        WHEN avg_moisture BETWEEN 30 AND 70 AND avg_temp BETWEEN 15 AND 30 THEN 75
        WHEN avg_moisture BETWEEN 20 AND 80 THEN 60
        ELSE 45
      END
    )
  ) INTO health_scores_data
  FROM public.zones z
  LEFT JOIN (
    SELECT 
      zone_id,
      AVG(soil_moisture) as avg_moisture,
      AVG(temperature) as avg_temp
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
    GROUP BY zone_id
  ) zone_averages ON z.id = zone_averages.zone_id
  WHERE z.user_id = current_user_id;
  
  -- Generate AI insights based on data
  WITH alert_counts AS (
    SELECT 
      COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
      COUNT(*) FILTER (WHERE type = 'warning') as warnings,
      COUNT(*) as total_alerts
    FROM public.alerts
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  ),
  avg_conditions AS (
    SELECT 
      AVG(soil_moisture) as avg_moisture,
      AVG(temperature) as avg_temp,
      AVG(humidity) as avg_humidity
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  )
  SELECT jsonb_build_array(
    CASE 
      WHEN ac.avg_moisture BETWEEN 40 AND 60 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'positive',
          'icon', '🌱',
          'title', 'Optimal Soil Moisture',
          'description', 'Your soil moisture levels are in the optimal range. Plants are receiving ideal hydration.'
        )
      WHEN ac.avg_moisture < 30 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'warning',
          'icon', '🚰',
          'title', 'Increase Watering',
          'description', 'Soil moisture is below optimal levels. Consider increasing watering frequency or duration.'
        )
      ELSE
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'recommendation',
          'icon', '💡',
          'title', 'Monitor Moisture Levels',
          'description', 'Keep an eye on soil moisture to ensure optimal plant health.'
        )
    END,
    CASE 
      WHEN ac.avg_temp BETWEEN 18 AND 25 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'positive',
          'icon', '🌡️',
          'title', 'Perfect Temperature',
          'description', 'Temperature conditions are ideal for most plants. Great growing environment!'
        )
      WHEN ac.avg_temp > 30 THEN
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'warning',
          'icon', '🔥',
          'title', 'High Temperature Alert',
          'description', 'Temperatures are quite high. Consider providing shade or increasing watering during hot days.'
        )
      ELSE
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'recommendation',
          'icon', '📊',
          'title', 'Temperature Monitoring',
          'description', 'Keep monitoring temperature trends to optimize plant care schedules.'
        )
    END,
    jsonb_build_object(
      'id', gen_random_uuid(),
      'type', 'recommendation',
      'icon', '📈',
      'title', 'Data-Driven Insights',
      'description', 'Your garden is generating valuable data. Use these insights to optimize watering schedules and improve plant health.'
    )
  ) INTO insights_data
  FROM alert_counts ac
  CROSS JOIN avg_conditions;
  
  -- Combine all data
  result := jsonb_build_object(
    'summary', COALESCE(summary_data, '{}'::jsonb),
    'waterUsageByZone', COALESCE(water_usage_data, '[]'::jsonb),
    'waterSavings', COALESCE(water_savings_data, '[]'::jsonb),
    'moistureDistribution', COALESCE(moisture_distribution_data, '[]'::jsonb),
    'healthScores', COALESCE(health_scores_data, '[]'::jsonb),
    'insights', COALESCE(insights_data, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get device information for system page
CREATE OR REPLACE FUNCTION public.get_device_info()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT jsonb_build_object(
    'devices', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'device_id', d.device_id,
          'status', d.status,
          'last_seen', d.last_seen,
          'firmware_version', d.firmware_version,
          'ip_address', d.ip_address,
          'zone_id', d.zone_id,
          'zone_name', z.name
        )
      )
      FROM public.devices d
      LEFT JOIN public.zones z ON d.zone_id = z.id
      WHERE d.user_id = current_user_id
    ),
    'zones', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'description', description,
          'soil_type', soil_type,
          'moisture_threshold', moisture_threshold
        )
      )
      FROM public.zones
      WHERE user_id = current_user_id
    ),
    'api_keys', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'key', key,
          'created_at', created_at,
          'last_used', last_used,
          'is_active', is_active
        )
      )
      FROM public.api_keys
      WHERE user_id = current_user_id
        AND is_active = true
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{"devices": [], "zones": [], "api_keys": []}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sensor_chart_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_alerts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_sensor_data(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_performance_metrics(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_info() TO authenticated;

-- Test the functions
SELECT 'Dashboard functions created successfully!' as status;
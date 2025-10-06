-- Migration to add water usage tracking feature
-- Add water_usage column to sensor_data table
ALTER TABLE public.sensor_data ADD COLUMN IF NOT EXISTS water_usage decimal(8,3) DEFAULT 0.000;

-- Update get_dashboard_stats function to include water usage
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
  total_water_usage decimal;
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
  
  -- Get total water usage
  SELECT COALESCE(SUM(water_usage), 0) INTO total_water_usage
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
    ),
    jsonb_build_object(
      'title', 'Total Water Used',
      'value', COALESCE(ROUND(total_water_usage, 2), 0) || 'L',
      'change', CASE 
        WHEN total_water_usage > 0 THEN 'Today'
        ELSE 'No data'
      END,
      'trend', CASE 
        WHEN total_water_usage > 10 THEN 'up'
        WHEN total_water_usage > 0 THEN 'neutral'
        ELSE 'neutral'
      END,
      'icon', '🚰'
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_analytics_performance_metrics function to include water usage
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
  ),
  water_usage_stats AS (
    SELECT 
      COALESCE(SUM(water_usage), 0) as total_water_usage
    FROM public.sensor_data
    WHERE user_id = current_user_id
      AND timestamp > now() - interval_period
  )
  SELECT jsonb_build_object(
    'totalWaterUsage', COALESCE(ws.total_water_time * 0.5, 0), -- Estimate 0.5L per second
    'totalWaterSaved', COALESCE(ws.total_water_time * 0.2, 0), -- Estimate 20% savings
    'avgMoisture', COALESCE(ROUND(rd.avg_moisture, 1), 0),
    'avgHealthScore', CASE 
      WHEN rd.avg_moisture BETWEEN 40 AND 60 AND rd.avg_temp BETWEEN 18 AND 25 THEN 85
      WHEN rd.avg_moisture BETWEEN 30 AND 70 AND rd.avg_temp BETWEEN 15 AND 30 THEN 70
      ELSE 60
    END,
    'actualWaterUsage', COALESCE(wus.total_water_usage, 0)
  ) INTO summary_data
  FROM recent_data rd
  CROSS JOIN watering_stats ws
  CROSS JOIN water_usage_stats wus;
  
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
  
  -- Water usage trend data
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date_trunc('day', timestamp)::date,
      'usage', SUM(water_usage)
    ) ORDER BY date_trunc('day', timestamp)
  ) INTO water_savings_data
  FROM public.sensor_data
  WHERE user_id = current_user_id
    AND timestamp > now() - interval_period
    AND water_usage > 0
  GROUP BY date_trunc('day', timestamp)
  ORDER BY date_trunc('day', timestamp);
  
  -- If no water usage data, provide default structure
  IF water_savings_data IS NULL THEN
    SELECT jsonb_build_array() INTO water_savings_data;
  END IF;
  
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
    'waterUsageTrend', COALESCE(water_savings_data, '[]'::jsonb),
    'moistureDistribution', COALESCE(moisture_distribution_data, '[]'::jsonb),
    'healthScores', COALESCE(health_scores_data, '[]'::jsonb),
    'insights', COALESCE(insights_data, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
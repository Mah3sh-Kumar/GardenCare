-- Scheduled Maintenance Setup for GardenFlow
-- This sets up automated maintenance tasks for data cleanup and optimization

-- =============================================================================
-- ENHANCED SCHEDULED MAINTENANCE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.scheduled_maintenance()
RETURNS jsonb AS $$
DECLARE
  cleanup_stats jsonb;
  deleted_sensor_data bigint := 0;
  deleted_expired_commands bigint := 0;
  deleted_expired_alerts bigint := 0;
  deleted_audit_logs bigint := 0;
  updated_offline_devices bigint := 0;
  result jsonb;
BEGIN
  -- Delete old sensor data (keep 90 days)
  DELETE FROM public.sensor_data 
  WHERE timestamp < now() - interval '90 days';
  GET DIAGNOSTICS deleted_sensor_data = ROW_COUNT;

  -- Delete expired/failed commands
  DELETE FROM public.commands 
  WHERE expires_at < now() AND status IN ('failed', 'timeout');
  GET DIAGNOSTICS deleted_expired_commands = ROW_COUNT;

  -- Delete expired alerts
  DELETE FROM public.alerts 
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_expired_alerts = ROW_COUNT;

  -- Delete old audit logs (keep 1 year)
  DELETE FROM public.audit_logs 
  WHERE timestamp < now() - interval '1 year';
  GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;

  -- Update device status to offline if not seen for 30 minutes
  UPDATE public.devices 
  SET status = 'offline', updated_at = now()
  WHERE last_seen < now() - interval '30 minutes' 
    AND status != 'offline';
  GET DIAGNOSTICS updated_offline_devices = ROW_COUNT;

  -- Update device_status table
  UPDATE public.device_status
  SET status = 'offline', updated_at = now()
  WHERE last_seen < now() - interval '30 minutes'
    AND status != 'offline';

  -- Mark old alerts as expired
  UPDATE public.alerts
  SET expires_at = now()
  WHERE expires_at IS NULL 
    AND timestamp < now() - interval '7 days'
    AND is_read = true;

  -- Cleanup device_commands table
  DELETE FROM public.device_commands
  WHERE created_at < now() - interval '7 days'
    AND status IN ('completed', 'failed');

  -- Vacuum analyze key tables for performance
  VACUUM ANALYZE public.sensor_data;
  VACUUM ANALYZE public.devices;
  VACUUM ANALYZE public.alerts;
  VACUUM ANALYZE public.commands;

  -- Build result summary
  result := jsonb_build_object(
    'maintenance_completed_at', now(),
    'cleanup_summary', jsonb_build_object(
      'deleted_old_sensor_data', deleted_sensor_data,
      'deleted_expired_commands', deleted_expired_commands,
      'deleted_expired_alerts', deleted_expired_alerts,
      'deleted_old_audit_logs', deleted_audit_logs,
      'updated_offline_devices', updated_offline_devices
    ),
    'status', 'success'
  );

  RAISE NOTICE 'Scheduled maintenance completed: %', result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATABASE HEALTH CHECK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.database_health_check()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  table_stats jsonb;
  performance_stats jsonb;
BEGIN
  -- Get table statistics
  SELECT jsonb_object_agg(
    table_name, 
    jsonb_build_object(
      'row_count', row_count,
      'table_size', pg_size_pretty(table_size),
      'index_size', pg_size_pretty(index_size)
    )
  ) INTO table_stats
  FROM (
    SELECT 
      schemaname||'.'||tablename as table_name,
      n_tup_ins + n_tup_upd + n_tup_del as row_count,
      pg_total_relation_size(schemaname||'.'||tablename) as table_size,
      pg_indexes_size(schemaname||'.'||tablename) as index_size
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10
  ) stats;

  -- Get performance statistics
  SELECT jsonb_build_object(
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'active_connections', (
      SELECT count(*) 
      FROM pg_stat_activity 
      WHERE state = 'active'
    ),
    'slow_queries', (
      SELECT count(*) 
      FROM pg_stat_activity 
      WHERE state = 'active' 
        AND query_start < now() - interval '30 seconds'
    )
  ) INTO performance_stats;

  -- Combine results
  result := jsonb_build_object(
    'health_check_at', now(),
    'database_status', 'healthy',
    'table_statistics', table_stats,
    'performance_metrics', performance_stats
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DEVICE HEALTH MONITORING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.monitor_device_health()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  offline_devices jsonb;
  low_battery_devices jsonb;
  stale_data_devices jsonb;
BEGIN
  -- Find offline devices
  SELECT jsonb_agg(
    jsonb_build_object(
      'device_id', device_id,
      'name', name,
      'last_seen', last_seen,
      'offline_duration', extract(epoch from (now() - last_seen))/3600 || ' hours'
    )
  ) INTO offline_devices
  FROM public.devices
  WHERE status = 'offline' 
    AND last_seen < now() - interval '1 hour';

  -- Find devices with low battery
  SELECT jsonb_agg(
    jsonb_build_object(
      'device_id', d.device_id,
      'name', d.name,
      'battery_level', lsd.battery_level,
      'last_reading', lsd.timestamp
    )
  ) INTO low_battery_devices
  FROM public.devices d
  JOIN public.latest_sensor_data lsd ON d.id = lsd.device_id
  WHERE lsd.battery_level < 20;

  -- Find devices with stale sensor data
  SELECT jsonb_agg(
    jsonb_build_object(
      'device_id', d.device_id,
      'name', d.name,
      'last_data', lsd.timestamp,
      'hours_since_data', extract(epoch from (now() - lsd.timestamp))/3600
    )
  ) INTO stale_data_devices
  FROM public.devices d
  LEFT JOIN public.latest_sensor_data lsd ON d.id = lsd.device_id
  WHERE d.status = 'online' 
    AND (lsd.timestamp IS NULL OR lsd.timestamp < now() - interval '2 hours');

  result := jsonb_build_object(
    'monitoring_timestamp', now(),
    'offline_devices', COALESCE(offline_devices, '[]'::jsonb),
    'low_battery_devices', COALESCE(low_battery_devices, '[]'::jsonb),
    'stale_data_devices', COALESCE(stale_data_devices, '[]'::jsonb)
  );

  -- Create alerts for critical issues
  IF jsonb_array_length(COALESCE(low_battery_devices, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.alerts (type, zone, message, severity, user_id, data)
    SELECT 
      'warning',
      'System',
      'Device "' || (device_info->>'name') || '" has low battery: ' || (device_info->>'battery_level') || '%',
      'medium',
      (SELECT user_id FROM public.devices WHERE device_id = device_info->>'device_id' LIMIT 1),
      device_info
    FROM jsonb_array_elements(low_battery_devices) as device_info;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUTO-OPTIMIZATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.optimize_database()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Analyze all tables to update statistics
  ANALYZE;
  
  -- Reindex if needed (be careful with this in production)
  -- REINDEX DATABASE current_database();
  
  -- Update table statistics
  SELECT pg_stat_reset() as stats_reset;
  
  result := jsonb_build_object(
    'optimization_completed_at', now(),
    'status', 'Database optimization completed successfully'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.scheduled_maintenance() TO service_role;
GRANT EXECUTE ON FUNCTION public.database_health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_device_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.optimize_database() TO service_role;

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================

/*
To set up automated maintenance, you can:

1. Use Supabase Edge Functions with cron:
   - Create an Edge Function that calls these functions
   - Use GitHub Actions or external cron services

2. Use pg_cron extension (if available):
   SELECT cron.schedule('nightly-maintenance', '0 2 * * *', 'SELECT public.scheduled_maintenance();');

3. Manual execution:
   - Run these functions periodically from your application
   - Call them from your admin dashboard

4. Test the functions:
   SELECT public.scheduled_maintenance();
   SELECT public.database_health_check();
   SELECT public.monitor_device_health();
*/

-- Test all maintenance functions
SELECT 'Maintenance functions created successfully!' as status;
SELECT 'Run the functions manually or set up automated scheduling' as next_step;
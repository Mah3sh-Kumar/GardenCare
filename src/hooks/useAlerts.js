import { useState, useEffect } from 'react';
import realtimeManager from '../lib/realtimeManager';
import { supabase } from '../lib/supabaseClient';

/**
 * Custom hook for managing realtime alerts
 * @param {number} limit - Number of alerts to fetch
 */
export function useAlerts(limit = 5) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) throw error;
        
        if (isMounted) {
          setAlerts(data || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching alerts:', err);
        if (isMounted) {
          setError(err.message || 'Failed to fetch alerts');
          setAlerts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch initial alerts
    fetchAlerts();

    // Set up realtime subscription
    subscription = realtimeManager.subscribe(
      'alerts',
      (payload) => {
        if (isMounted) {
          // When we receive a new alert, fetch the latest alerts
          fetchAlerts();
        }
      },
      {
        event: 'INSERT',
      }
    );

    return () => {
      isMounted = false;
      if (subscription) {
        realtimeManager.unsubscribe('alerts', { event: 'INSERT' });
      }
    };
  }, [limit]);

  return {
    alerts,
    loading,
    error,
  };
}
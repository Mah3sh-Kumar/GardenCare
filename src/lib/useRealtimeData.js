import { useState, useEffect, useRef } from 'react';
import realtimeManager from './realtimeManager';
import DataService from '../services/dataService';

/**
 * Custom hook for managing realtime data with automatic subscription management
 * @param {string} table - Table name to subscribe to
 * @param {Function} dataFetcher - Function to fetch initial data
 * @param {Object} options - Subscription options
 */
export function useRealtimeData(table, dataFetcher, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dataFetcher();
      setData(result || []);
    } catch (err) {
      console.error(`Error loading ${table} data:`, err);
      setError(err.message || `Failed to load ${table} data`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up realtime subscription
    const subscription = realtimeManager.subscribe(
      table,
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        switch (eventType) {
          case 'INSERT':
            if (newRecord) {
              setData((prev) => {
                // Check if record already exists (prevent duplicates)
                const exists = prev.some(item => item.id === newRecord.id);
                return exists ? prev : [newRecord, ...prev];
              });
            }
            break;
          case 'UPDATE':
            if (newRecord) {
              setData((prev) => 
                prev.map((item) => 
                  item.id === newRecord.id ? newRecord : item
                )
              );
            }
            break;
          case 'DELETE':
            if (oldRecord) {
              setData((prev) => prev.filter((item) => item.id !== oldRecord.id));
            }
            break;
        }

        // Call custom handler if provided
        if (options.onRealtimeEvent) {
          options.onRealtimeEvent(payload);
        }
      },
      {
        event: options.event || '*',
        filter: options.filter,
      }
    );

    subscriptionRef.current = subscription;

    return () => {
      realtimeManager.unsubscribe(table, { filter: options.filter });
    };
  }, [table, options.event, options.filter, dataFetcher]);

  return {
    data,
    loading,
    error,
    refetch: loadData,
  };
}

/**
 * Hook for optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdate(table) {
  const performUpdate = async (operation, data, localUpdateFn, revertFn) => {
    return realtimeManager.optimisticUpdate(
      table,
      operation,
      data,
      localUpdateFn,
      revertFn
    );
  };

  return performUpdate;
}

/**
 * Hook for managing sensor data with realtime updates
 */
export function useSensorData(hours = 24) {
  const [sensorData, setSensorData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSensorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [chartData, latest] = await Promise.all([
        DataService.getSensorDataForCharts(hours),
        DataService.getLatestSensorData(),
      ]);
      
      setSensorData(chartData || []);
      setLatestReading(latest);
    } catch (err) {
      console.error('Error loading sensor data:', err);
      setError(err.message || 'Failed to load sensor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSensorData();

    // Subscribe to new sensor data
    const subscription = realtimeManager.subscribe(
      'sensor_data',
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newReading = payload.new;
          
          // Update latest reading
          setLatestReading(newReading);
          
          // Add to chart data if within time range
          const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
          if (new Date(newReading.timestamp) > cutoffTime) {
            setSensorData((prev) => {
              const updated = [...prev, newReading];
              // Keep only data within time window and sort by timestamp
              return updated
                .filter(item => new Date(item.timestamp) > cutoffTime)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
          }
        }
      },
      { event: 'INSERT' }
    );

    return () => {
      realtimeManager.unsubscribe('sensor_data');
    };
  }, [hours]);

  return {
    sensorData,
    latestReading,
    loading,
    error,
    refetch: loadSensorData,
  };
}
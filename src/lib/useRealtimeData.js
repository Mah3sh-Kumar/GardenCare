import { useState, useEffect, useRef } from 'react';
// Removed realtimeManager import since subscriptions are disabled
import DataService from '../services/dataService';

/**
 * Custom hook for managing data with polling instead of realtime subscriptions
 * @param {string} table - Table name (for logging purposes)
 * @param {Function} dataFetcher - Function to fetch initial data
 * @param {Object} options - Options including polling interval
 */
export function useRealtimeData(table, dataFetcher, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);

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

    // Set up polling instead of realtime subscription due to transport issues
    console.log(`useRealtimeData: Setting up polling for ${table} (every 30 seconds)`);
    const interval = setInterval(() => {
      console.log(`Polling for ${table} updates...`);
      loadData();
    }, options.pollingInterval || 30000); // Default to 30 seconds

    pollingIntervalRef.current = interval;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [table, dataFetcher, options.pollingInterval]);

  return {
    data,
    loading,
    error,
    refetch: loadData,
  };
}

/**
 * Hook for managing sensor data with polling instead of realtime updates
 */
export function useSensorData(hours = 24) {
  const [sensorData, setSensorData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);

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

    // Enable more frequent polling for better dashboard updates
    console.log('useSensorData: Setting up polling (every 15 seconds)');
    
    // Set up polling for sensor data updates
    const pollingInterval = setInterval(() => {
      console.log('Polling for sensor data updates...');
      loadSensorData();
    }, 15000); // Poll every 15 seconds for faster updates

    pollingIntervalRef.current = pollingInterval;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
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
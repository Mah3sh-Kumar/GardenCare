import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DataService from '../services/dataService';
import Button from './ui/Button';
import Card from './ui/Card';

const DataDebugPanel = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [debugInfo, setDebugInfo] = useState({
    latestSensorData: null,
    chartData: null,
    devices: null,
    stats: null,
    lastUpdated: null,
    loading: false,
    error: null
  });

  const runDiagnostics = async () => {
    setDebugInfo(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔍 Running data diagnostics...');
      
      const [latestSensorData, chartData, devices, stats] = await Promise.all([
        DataService.getLatestSensorData().catch(e => ({ error: e.message })),
        DataService.getSensorDataForCharts(24).catch(e => ({ error: e.message })),
        DataService.getDevices().catch(e => ({ error: e.message })),
        DataService.getDashboardStats().catch(e => ({ error: e.message }))
      ]);

      setDebugInfo({
        latestSensorData,
        chartData,
        devices,
        stats,
        lastUpdated: new Date().toLocaleTimeString(),
        loading: false,
        error: null
      });

      console.log('📊 Diagnostics complete:', {
        latestSensorData,
        chartDataCount: Array.isArray(chartData) ? chartData.length : 'error',
        devicesCount: Array.isArray(devices) ? devices.length : 'error',
        statsCount: Array.isArray(stats) ? stats.length : 'error'
      });
      
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      setDebugInfo(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      if (value.error) return `❌ ${value.error}`;
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🔍 Data Diagnostics
          </h3>
          <Button 
            onClick={runDiagnostics} 
            disabled={debugInfo.loading}
            variant="secondary"
            size="sm"
          >
            {debugInfo.loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>

        {debugInfo.lastUpdated && (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Last updated: {debugInfo.lastUpdated}
          </p>
        )}

        {debugInfo.error && (
          <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`}>
            ❌ Error: {debugInfo.error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Latest Sensor Data
            </h4>
            <pre className={`text-xs overflow-auto max-h-32 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatValue(debugInfo.latestSensorData)}
            </pre>
          </div>

          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Chart Data (24h)
            </h4>
            <pre className={`text-xs overflow-auto max-h-32 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {Array.isArray(debugInfo.chartData) 
                ? `${debugInfo.chartData.length} records\n${formatValue(debugInfo.chartData.slice(0, 2))}`
                : formatValue(debugInfo.chartData)
              }
            </pre>
          </div>

          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Devices
            </h4>
            <pre className={`text-xs overflow-auto max-h-32 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatValue(debugInfo.devices)}
            </pre>
          </div>

          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Dashboard Stats
            </h4>
            <pre className={`text-xs overflow-auto max-h-32 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatValue(debugInfo.stats)}
            </pre>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DataDebugPanel;
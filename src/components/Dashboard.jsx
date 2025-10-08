// src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import StatsCard from '../components/StatsCard';
import WeatherPanel from '../components/WeatherPanel';
import AlertsPanel from '../components/AlertsPanel';
import TemperatureChart from '../components/charts/TemperatureChart';
import MoistureHumidityChart from '../components/charts/MoistureHumidityChart';
import LightSensorChart from '../components/charts/LightSensorChart';
import PlantZonesPanel from '../components/PlantZonesPanel';
import PlantRecommendationsPanel from '../components/PlantRecommendationsPanel';
import DataService from '../services/dataService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import realtimeManager, { sensorDataSubscription, alertsSubscription, createCompatibleSubscription } from '../lib/realtimeManager';
import { supabase } from '../lib/supabaseClient';

const Dashboard = () => {
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { unreadCount } = useNotifications();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true); // Changed default to true to show initial loading
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Memoized refresh function to prevent unnecessary re-renders
  const loadDashboardData = useCallback(async () => {
    // Always attempt to load data, but handle auth errors gracefully
    try {
      setLoading(true);
      setError(null);

      const dashboardStats = await DataService.getDashboardStats();

      // Validate stats data
      const validatedStats = Array.isArray(dashboardStats)
        ? dashboardStats.filter((stat) => stat && stat.title && stat.value)
        : [];

      setStats(validatedStats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      // Don't set error state that would hide the dashboard
      // setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect with realtime subscriptions
  useEffect(() => {
    loadDashboardData();

    // More frequent polling for dashboard updates
    console.log('Dashboard: Setting up polling (every 20 seconds)');
    
    const interval = setInterval(() => {
      console.log('Dashboard: Polling for data updates...');
      setRefreshCount((prev) => prev + 1);
      loadDashboardData();
    }, 20000); // Poll every 20 seconds

    return () => {
      clearInterval(interval);
      // No realtime subscriptions to clean up since they're disabled
    };
  }, [loadDashboardData]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshCount((prev) => prev + 1);
    loadDashboardData();
  }, [loadDashboardData]);

  // Memoized formatted last updated time
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [lastUpdated]);

  // Show loading state only during initial load
  if (authLoading) {
    return (
      <div
        className="space-y-6 max-w-full animate-fade-in"
        role="main"
        aria-label="Garden Dashboard"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1
            className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}
          >
            🌿 Garden Dashboard
          </h1>
          <div className="flex items-center space-x-2">
            <div
              className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"
              aria-hidden="true"
            ></div>
            <p
              className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
            >
              Loading your garden data...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-4 sm:p-6 rounded-lg shadow-soft border ${isDark ? 'border-gray-700' : 'border-gray-200'} animate-pulse`}
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-300 rounded w-24"></div>
                <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
              </div>
              <div className="mt-4">
                <div className="h-8 bg-gray-300 rounded w-16"></div>
                <div className="h-4 bg-gray-300 rounded w-12 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 max-w-full animate-fade-in"
      role="main"
      aria-label="Garden Dashboard"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}
          >
            🌿 Garden Dashboard
          </h1>
          {lastUpdated && (
            <p
              className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Last updated: {formattedLastUpdated}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="secondary"
            title="Refresh data"
            aria-label="Refresh dashboard data"
          >
            {loading ? (
              <div
                className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"
                aria-hidden="true"
              ></div>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Single Line */}
      <section aria-label="Garden Statistics">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-6">
          {stats.length > 0 ? (
            stats.map((stat, index) => (
              <StatsCard
                key={`${stat.title}-${index}-${refreshCount}`}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
                icon={stat.icon}
                loading={loading}
              />
            ))
          ) : (
            <div
              className={`col-span-full ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-green-50 to-blue-50'} p-8 sm:p-12 rounded-xl shadow-sm border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-green-200'} text-center`}
            >
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${isDark ? 'bg-green-900/30' : 'bg-green-100'} shadow-lg`}>
                <svg
                  className={`h-10 w-10 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3
                className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}
              >
                🌱 Welcome to Your Smart Garden!
              </h3>
              <p
                className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6 max-w-md mx-auto leading-relaxed`}
              >
                Connect your ESP32 sensors to start monitoring temperature, humidity, soil moisture, and more in real-time.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={handleRefresh}
                  variant="primary"
                  className="px-6 py-3 text-base"
                  aria-label="Check for new sensor data"
                >
                  🔍 Discover Sensors
                </Button>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  💡 <strong>Getting started:</strong> Visit the System page to register your ESP32 devices
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Weather Panel */}
      <section aria-label="Weather Information">
        <WeatherPanel />
      </section>

      {/* Alerts */}
      <section aria-label="System Alerts">
        <div className="relative">
          <AlertsPanel />
        </div>
      </section>

      {/* Charts Section - Modified Layout */}
      <section aria-label="Sensor Data Charts">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* First Row: Temperature and Moisture & Humidity Charts */}
          <Card>
            <h2
              className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}
            >
              <span className="mr-2" aria-hidden="true">
                🌡
              </span>
              Temperature Trends (24h)
            </h2>
            <div className="h-64 sm:h-80">
              <TemperatureChart />
            </div>
          </Card>
          <Card>
            <h2
              className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}
            >
              <span className="mr-2" aria-hidden="true">
                💧
              </span>
              Moisture & Humidity Trends (24h)
            </h2>
            <div className="h-64 sm:h-80">
              <MoistureHumidityChart />
            </div>
          </Card>
        </div>
        
        {/* Second and Third Rows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6 h-full">
          {/* Left Column: Light Card (Row 2) and Plant Zone (Row 3) */}
          <div className="flex flex-col gap-4 sm:gap-6 h-full">
            {/* Light Card - Same height as Temperature card */}
            <Card>
              <h2
                className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-800'} flex items-center`}
              >
                <span className="mr-2" aria-hidden="true">
                  ☀️
                </span>
                Light Sensor Trends (24h)
              </h2>
              <div className="h-64 sm:h-80"> {/* Same as Temperature card */}
                <LightSensorChart />
              </div>
            </Card>
            
            {/* Plant Zone - Takes remaining height with scroll */}
            <div className="flex-grow min-h-0"> {/* min-h-0 allows flex-grow to work properly */}
              <PlantZonesPanel />
            </div>
          </div>
          
          {/* Right Column: Plant Recommendation (Row 2 and Row 3) */}
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-hidden">
              <PlantRecommendationsPanel />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

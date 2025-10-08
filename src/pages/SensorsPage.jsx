import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import DataService from '../services/dataService';
import { convertTemperature, getTemperatureUnitSymbol } from '../utils/temperatureUtils';
import { useTemperatureUnit } from '../hooks/useTemperatureUnit';

const SensorsPage = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const temperatureUnit = useTemperatureUnit();

  const [sensors, setSensors] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('day'); // day, week, month

  // Load sensors from Supabase
  const loadSensors = async () => {
    setLoading(true);
    setError(null);
    try {
      const devices = await DataService.getDevices();

      // Transform devices to sensor format
      const transformedSensors = devices.map((device) => ({
        id: device.id,
        name: device.name,
        zone: device.zone_id || 'Unassigned',
        status: device.status,
        battery: device.battery_level || 100, // Default to 100% if not provided
      }));

      setSensors(transformedSensors);

      // Set the first sensor as selected by default
      if (transformedSensors.length > 0 && !selectedSensor) {
        setSelectedSensor(transformedSensors[0].id);
      }
    } catch (err) {
      console.error('Error loading sensors:', err);
      setError('Failed to load sensors: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate hours based on timeframe
  const getHoursFromTimeframe = (timeframe) => {
    switch (timeframe) {
      case 'day':
        return 24;
      case 'week':
        return 24 * 7;
      case 'month':
        return 24 * 30;
      default:
        return 24;
    }
  };

  // Load sensor data from Supabase
  const loadSensorData = async (sensorId, timeframe) => {
    try {
      const hours = getHoursFromTimeframe(timeframe);
      const data = await DataService.getSensorDataForCharts(hours);

      // Filter data for selected sensor if sensorId is provided
      const filteredData = sensorId ? 
        data.filter((item) => item.device_id === sensorId) : 
        data;

      // Transform data for charts
      const transformedData = filteredData.map((item) => ({
        ...item,
        time: new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        // Convert temperature based on user preference
        temperature: convertTemperature(parseFloat(item.temperature) || 0, 'celsius', temperatureUnit),
        humidity: parseFloat(item.humidity) || 0,
        soil_moisture: parseFloat(item.soil_moisture) || 0,
        light_level: parseInt(item.light_level) || 0,
      }));

      setSensorData(transformedData);
    } catch (err) {
      console.error('Error loading sensor data:', err);
      setError('Failed to load sensor data: ' + err.message);
    }
  };

  // Format time for display based on timeframe
  const formatTime = (timestamp, timeframe) => {
    const date = new Date(timestamp);

    switch (timeframe) {
      case 'day':
        return `${date.getHours()}:00`;
      case 'week':
      case 'month':
        return `${date.getMonth() + 1}/${date.getDate()}`;
      default:
        return `${date.getHours()}:00`;
    }
  };

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    // Auto-select first sensor if none selected and sensors are available
    if (!selectedSensor && sensors.length > 0) {
      console.log('Auto-selecting first sensor:', sensors[0].id);
      setSelectedSensor(sensors[0].id);
    }
  }, [sensors, selectedSensor]);

  useEffect(() => {
    // Load sensor data when a sensor is selected
    if (selectedSensor) {
      console.log('Loading data for sensor:', selectedSensor, 'timeframe:', timeframe);
      loadSensorData(selectedSensor, timeframe);
    }
  }, [selectedSensor, timeframe, temperatureUnit]);

  // Function to refresh data
  const handleRefresh = () => {
    loadSensors();
    if (selectedSensor) {
      loadSensorData(selectedSensor, timeframe);
    }
  };

  const getSensorStatusClass = (status) => {
    switch (status) {
      case 'online':
        return isDark
          ? 'bg-green-900 bg-opacity-40 text-green-400'
          : 'bg-green-100 text-green-800';
      case 'offline':
        return isDark
          ? 'bg-red-900 bg-opacity-40 text-red-400'
          : 'bg-red-100 text-red-800';
      default:
        return isDark
          ? 'bg-gray-700 text-gray-300'
          : 'bg-gray-100 text-gray-800';
    }
  };

  const getBatteryColor = (level) => {
    if (level < 20) return 'text-red-500';
    if (level < 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1
          className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}
        >
          Sensors
        </h1>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            title="Refresh sensors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>
        </div>
      </div>

      {error && (
        <div
          className={`p-4 rounded-lg ${isDark ? 'bg-red-900 bg-opacity-20 border border-red-500 text-red-400' : 'bg-red-50 border border-red-500 text-red-700'}`}
        >
          <div className="flex items-center">
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Sensor Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          id="sensor-select"
          value={selectedSensor || ''}
          onChange={(e) => setSelectedSensor(e.target.value)}
          label="Select Sensor"
          className="w-full sm:w-64"
        >
          <option value="">Select a sensor</option>
          {sensors.map((sensor) => (
            <option key={sensor.id} value={sensor.id}>
              {sensor.name}
            </option>
          ))}
        </Select>

        <Select
          id="timeframe-select"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          label="Timeframe"
          className="w-full sm:w-32"
        >
          <option value="day">Last 24 Hours</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          {selectedSensor ? (
            <>
              {/* Sensor Details */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {sensors
                    .filter((sensor) => sensor.id === selectedSensor)
                    .map((sensor) => (
                      <div key={sensor.id} className="md:col-span-1">
                        <h3
                          className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          Sensor
                        </h3>
                        <p
                          className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {sensor.name}
                        </p>
                      </div>
                    ))}

                  <div className="md:col-span-1">
                    <h3
                      className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Status
                    </h3>
                    {sensors
                      .filter((sensor) => sensor.id === selectedSensor)
                      .map((sensor) => (
                        <Badge
                          key={sensor.id}
                          variant={
                            sensor.status === 'online' ? 'success' : 'error'
                          }
                        >
                          {sensor.status}
                        </Badge>
                      ))}
                  </div>

                  <div className="md:col-span-1">
                    <h3
                      className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Battery
                    </h3>
                    {sensors
                      .filter((sensor) => sensor.id === selectedSensor)
                      .map((sensor) => (
                        <div key={sensor.id} className="flex items-center">
                          <span
                            className={`font-semibold ${getBatteryColor(sensor.battery)}`}
                          >
                            {sensor.battery}%
                          </span>
                          <svg
                            className={`ml-2 h-5 w-5 ${getBatteryColor(sensor.battery)}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      ))}
                  </div>

                  <div className="md:col-span-1">
                    <h3
                      className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      Zone
                    </h3>
                    {sensors
                      .filter((sensor) => sensor.id === selectedSensor)
                      .map((sensor) => (
                        <p
                          key={sensor.id}
                          className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {sensor.zone}
                        </p>
                      ))}
                  </div>
                </div>
              </Card>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Temperature Chart */}
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Temperature
                    </h3>
                    <div className="flex items-center">
                      <span className={`text-sm px-2 py-1 rounded-full ${isDark ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                        {getTemperatureUnitSymbol(temperatureUnit)}
                      </span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={sensorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <XAxis
                          dataKey="time"
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          interval="preserveStartEnd"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          domain={['dataMin - 2', 'dataMax + 2']}
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <Tooltip
                          contentStyle={
                            isDark
                              ? {
                                  backgroundColor: '#1f2937',
                                  borderColor: '#374151',
                                  color: 'white',
                                  borderRadius: '0.5rem',
                                }
                              : {
                                  borderRadius: '0.5rem',
                                }
                          }
                          cursor={{
                            stroke: isDark ? '#6b7280' : '#d1d5db',
                            strokeWidth: 1,
                            strokeDasharray: '3 3',
                          }}
                          formatter={(value) => [`${value}${getTemperatureUnitSymbol(temperatureUnit)}`, 'Temperature']}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f97316"
                          strokeWidth={3}
                          activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                          dot={{ r: 4, strokeWidth: 2 }}
                          name="Temperature"
                        />
                        <Brush 
                          dataKey="time" 
                          height={30} 
                          stroke={isDark ? "#9ca3af" : "#6b7280"}
                          travellerWidth={10}
                          startIndex={Math.max(0, sensorData.length - 10)}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4 4 0 003 15z" />
                      </svg>
                      Humidity
                    </h3>
                    <div className="flex items-center">
                      <span className={`text-sm px-2 py-1 rounded-full ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                        %
                      </span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={sensorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <XAxis
                          dataKey="time"
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          interval="preserveStartEnd"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          domain={[0, 100]}
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <Tooltip
                          contentStyle={
                            isDark
                              ? {
                                  backgroundColor: '#1f2937',
                                  borderColor: '#374151',
                                  color: 'white',
                                  borderRadius: '0.5rem',
                                }
                              : {
                                  borderRadius: '0.5rem',
                                }
                          }
                          cursor={{
                            stroke: isDark ? '#6b7280' : '#d1d5db',
                            strokeWidth: 1,
                            strokeDasharray: '3 3',
                          }}
                          formatter={(value) => [`${value}%`, 'Humidity']}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="humidity"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                          dot={{ r: 4, strokeWidth: 2 }}
                          name="Humidity (%)"
                        />
                        <Brush 
                          dataKey="time" 
                          height={30} 
                          stroke={isDark ? "#9ca3af" : "#6b7280"}
                          travellerWidth={10}
                          startIndex={Math.max(0, sensorData.length - 10)}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h6M3 9h18M3 15h18M3 21h18" />
                      </svg>
                      Soil Moisture
                    </h3>
                    <div className="flex items-center">
                      <span className={`text-sm px-2 py-1 rounded-full ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                        %
                      </span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={sensorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <XAxis
                          dataKey="time"
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          interval="preserveStartEnd"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          domain={[0, 100]}
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <Tooltip
                          contentStyle={
                            isDark
                              ? {
                                  backgroundColor: '#1f2937',
                                  borderColor: '#374151',
                                  color: 'white',
                                  borderRadius: '0.5rem',
                                }
                              : {
                                  borderRadius: '0.5rem',
                                }
                          }
                          cursor={{
                            stroke: isDark ? '#6b7280' : '#d1d5db',
                            strokeWidth: 1,
                            strokeDasharray: '3 3',
                          }}
                          formatter={(value) => [`${value}%`, 'Soil Moisture']}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="soil_moisture"
                          stroke="#22c55e"
                          strokeWidth={3}
                          activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                          dot={{ r: 4, strokeWidth: 2 }}
                          name="Soil Moisture (%)"
                        />
                        <Brush 
                          dataKey="time" 
                          height={30} 
                          stroke={isDark ? "#9ca3af" : "#6b7280"}
                          travellerWidth={10}
                          startIndex={Math.max(0, sensorData.length - 10)}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Light Level
                    </h3>
                    <div className="flex items-center">
                      <span className={`text-sm px-2 py-1 rounded-full ${isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>
                        lux
                      </span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={sensorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <XAxis
                          dataKey="time"
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          interval="preserveStartEnd"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280',
                          }}
                          domain={[0, 4095]}
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <Tooltip
                          contentStyle={
                            isDark
                              ? {
                                  backgroundColor: '#1f2937',
                                  borderColor: '#374151',
                                  color: 'white',
                                  borderRadius: '0.5rem',
                                }
                              : {
                                  borderRadius: '0.5rem',
                                }
                          }
                          cursor={{
                            stroke: isDark ? '#6b7280' : '#d1d5db',
                            strokeWidth: 1,
                            strokeDasharray: '3 3',
                          }}
                          formatter={(value) => [`${value}`, 'Light Level']}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="light_level"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                          dot={{ r: 4, strokeWidth: 2 }}
                          name="Light Level"
                        />
                        <Brush 
                          dataKey="time" 
                          height={30} 
                          stroke={isDark ? "#9ca3af" : "#6b7280"}
                          travellerWidth={10}
                          startIndex={Math.max(0, sensorData.length - 10)}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <div className={`text-center py-16 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-blue-50 to-green-50'} rounded-xl border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${isDark ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
                  <svg
                    className={`h-10 w-10 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}
                >
                  📡 Ready to Monitor Your Garden
                </h3>
                <p
                  className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6 max-w-md mx-auto leading-relaxed`}
                >
                  Select a sensor from the controls above to view real-time environmental data and historical trends for your garden zones.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleRefresh} variant="primary" className="flex items-center space-x-2 px-6 py-3">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>🔍 Discover Sensors</span>
                  </Button>
                  {sensors.length > 0 && (
                    <Button 
                      onClick={() => setSelectedSensor(sensors[0].id)} 
                      variant="secondary"
                      className="flex items-center space-x-2 px-6 py-3"
                    >
                      <span>⚡ Start Monitoring</span>
                    </Button>
                  )}
                </div>
                {sensors.length === 0 && (
                  <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                      💡 <strong>Tip:</strong> No sensors found? Make sure your ESP32 devices are connected and registered in the System page.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SensorsPage;
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import DataService from '../services/dataService';

const SensorsPage = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
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
      const transformedSensors = devices.map(device => ({
        id: device.id,
        name: device.name,
        zone: device.zone_id || 'Unassigned',
        status: device.status,
        battery: device.battery_level || 100 // Default to 100% if not provided
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

  // Load sensor data from Supabase
  const loadSensorData = async (sensorId, timeframe) => {
    try {
      // Calculate hours based on timeframe
      let hours;
      switch (timeframe) {
        case 'day':
          hours = 24;
          break;
        case 'week':
          hours = 24 * 7;
          break;
        case 'month':
          hours = 24 * 30;
          break;
        default:
          hours = 24;
      }

      const data = await DataService.getSensorDataForCharts(hours);
      
      // Filter data for selected sensor
      const filteredData = data.filter(item => {
        // Find the device for this data point
        const device = sensors.find(sensor => sensor.id === item.device_id);
        return device && device.id === sensorId;
      });

      // Transform data for charts
      const transformedData = filteredData.map(item => ({
        time: formatTime(item.timestamp, timeframe),
        temperature: item.temperature,
        humidity: item.humidity,
        soil_moisture: item.soil_moisture
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
    // Load sensor data when a sensor is selected
    if (selectedSensor) {
      loadSensorData(selectedSensor, timeframe);
    }
  }, [selectedSensor, timeframe, sensors]);

  // Function to refresh data
  const handleRefresh = () => {
    loadSensors();
    if (selectedSensor) {
      loadSensorData(selectedSensor, timeframe);
    }
  };

  const simulateSensorData = async () => {
    try {
      await DataService.simulateSensorData();
      
      // Refresh data after simulation
      handleRefresh();
      
      // Show success message
      alert('Sensor data generated successfully!');
      
    } catch (err) {
      console.error('Error generating sensor data:', err);
      setError('Failed to generate sensor data: ' + err.message);
    }
  };

  const getSensorStatusClass = (status) => {
    switch (status) {
      case 'online':
        return isDark ? 'bg-green-900 bg-opacity-40 text-green-400' : 'bg-green-100 text-green-800';
      case 'offline':
        return isDark ? 'bg-red-900 bg-opacity-40 text-red-400' : 'bg-red-100 text-red-800';
      default:
        return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
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
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Sensors</h1>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleRefresh}
            variant="secondary"
            title="Refresh sensors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900 bg-opacity-20 border border-red-500 text-red-400' : 'bg-red-50 border border-red-500 text-red-700'}`}>
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          {/* Sensor Selection and Timeframe */}
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
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
            
            <Button onClick={simulateSensorData} variant="primary">
              Simulate Data
            </Button>
          </div>

          {selectedSensor ? (
            <>
              {/* Sensor Details */}
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {sensors
                    .filter(sensor => sensor.id === selectedSensor)
                    .map(sensor => (
                      <div key={sensor.id} className="md:col-span-1">
                        <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Sensor</h3>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{sensor.name}</p>
                      </div>
                    ))}
                  
                  <div className="md:col-span-1">
                    <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</h3>
                    {sensors
                      .filter(sensor => sensor.id === selectedSensor)
                      .map(sensor => (
                        <Badge key={sensor.id} variant={sensor.status === 'online' ? 'success' : 'error'}>
                          {sensor.status}
                        </Badge>
                      ))}
                  </div>
                  
                  <div className="md:col-span-1">
                    <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Battery</h3>
                    {sensors
                      .filter(sensor => sensor.id === selectedSensor)
                      .map(sensor => (
                        <p key={sensor.id} className={`text-lg font-semibold ${getBatteryColor(sensor.battery)}`}>
                          {sensor.battery}%
                        </p>
                      ))}
                  </div>
                  
                  <div className="md:col-span-1">
                    <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Zone</h3>
                    {sensors
                      .filter(sensor => sensor.id === selectedSensor)
                      .map(sensor => (
                        <p key={sensor.id} className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {sensor.zone}
                        </p>
                      ))}
                  </div>
                </div>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Temperature</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={sensorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ 
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280'
                          }}
                          interval="preserveStartEnd"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <YAxis 
                          tick={{ 
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280'
                          }}
                          domain={['dataMin - 2', 'dataMax + 2']}
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <Tooltip 
                          contentStyle={isDark ? { 
                            backgroundColor: '#1f2937', 
                            borderColor: '#374151',
                            color: 'white'
                          } : {}}
                          cursor={{
                            stroke: isDark ? '#6b7280' : '#d1d5db',
                            strokeWidth: 1,
                            strokeDasharray: '3 3'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="temperature" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }} 
                          name="Temperature (°C)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Humidity & Soil Moisture</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={sensorData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ 
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280'
                          }}
                          interval="preserveStartEnd"
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <YAxis 
                          tick={{ 
                            fontSize: 12,
                            fill: isDark ? '#9ca3af' : '#6b7280'
                          }}
                          domain={[0, 100]}
                          stroke={isDark ? '#374151' : '#e5e7eb'}
                        />
                        <Tooltip 
                          contentStyle={isDark ? { 
                            backgroundColor: '#1f2937', 
                            borderColor: '#374151',
                            color: 'white'
                          } : {}}
                          cursor={{
                            stroke: isDark ? '#6b7280' : '#d1d5db',
                            strokeWidth: 1,
                            strokeDasharray: '3 3'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="humidity" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }} 
                          name="Humidity (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="soil_moisture" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }} 
                          name="Soil Moisture (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <div className="text-center py-12">
                <svg className={`h-16 w-16 mx-auto ${isDark ? 'text-gray-600' : 'text-gray-400'} mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No sensor selected</h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Select a sensor from the dropdown to view its data</p>
                <Button onClick={handleRefresh} variant="primary">
                  Refresh Sensors
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SensorsPage;
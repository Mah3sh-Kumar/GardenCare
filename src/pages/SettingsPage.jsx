import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { ProfileService } from '../services/profileService';
import { DeviceService } from '../services/deviceService';
import {
  FiUser,
  FiBell,
  FiSettings,
  FiLogOut,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiWifi,
  FiSun,
  FiMoon,
  FiDroplet,
  FiRefreshCw,
  FiKey,
  FiSave,
  FiCpu,
} from 'react-icons/fi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Switch from '../components/ui/Switch';
import Alert from '../components/ui/Alert';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme, setThemeDirectly } = useTheme();
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [devices, setDevices] = useState([]);

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    wateringReminders: true,
    systemUpdates: false,
  });

  const [systemSettings, setSystemSettings] = useState({
    darkMode: isDark,
    autoWatering: true,
    temperatureUnit: 'celsius',
    dataRefreshInterval: 30,
  });

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const deviceData = await DeviceService.fetchDevices();
      setDevices(deviceData);
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      // Fetch user profile data from Supabase
      fetchUserProfile();
      // Fetch devices
      fetchDevices();
    }
  }, [user]);

  useEffect(() => {
    setSystemSettings((prev) => ({
      ...prev,
      darkMode: isDark,
    }));
  }, [isDark]);

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      if (user) {
        // Use the ProfileService to fetch or create profile
        try {
          const profile = await ProfileService.fetchProfile();
          setName(
            profile?.name || user.email?.split('@')[0] || 'Garden Enthusiast',
          );
        } catch (profileError) {
          console.error('Error with ProfileService:', profileError);
          // Fallback to default name
          setName(user.email?.split('@')[0] || 'Garden Enthusiast');
        }

        // Load settings from localStorage or use defaults
        const savedNotificationSettings = localStorage.getItem(
          'notificationSettings',
        );
        const savedSystemSettings = localStorage.getItem('systemSettings');

        if (savedNotificationSettings) {
          setNotificationSettings(JSON.parse(savedNotificationSettings));
        }

        if (savedSystemSettings) {
          const parsedSettings = JSON.parse(savedSystemSettings);
          setSystemSettings(parsedSettings);
          // Apply dark mode setting
          if (parsedSettings.darkMode !== undefined) {
            setThemeDirectly(parsedSettings.darkMode ? 'dark' : 'light');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setName('Garden Enthusiast');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await ProfileService.updateProfile(name);
      setMessage('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      // Provide more specific error messages
      if (err.code === '23505') {
        setError('Profile already exists. Please try updating instead.');
      } else if (err.message.includes('406')) {
        setError('Access denied. Please check your permissions.');
      } else {
        setError('Failed to update profile: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      setMessage('Password reset email sent. Please check your inbox.');
    } catch (err) {
      setError('Failed to send password reset email: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (setting) => {
    const newSettings = {
      ...notificationSettings,
      [setting]: !notificationSettings[setting],
    };

    setNotificationSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));

    // Show feedback that setting was changed (without auto-clear to prevent layout shifts)
    setMessage(
      `${setting.charAt(0).toUpperCase() + setting.slice(1)} notifications ${!notificationSettings[setting] ? 'enabled' : 'disabled'}`,
    );
  };

  const handleSystemSettingChange = (setting) => {
    // Special handling for dark mode
    if (setting === 'darkMode') {
      const newTheme = systemSettings.darkMode ? 'light' : 'dark';
      setThemeDirectly(newTheme);
      setSystemSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
      localStorage.setItem(
        'systemSettings',
        JSON.stringify({
          ...systemSettings,
          darkMode: !systemSettings.darkMode,
        }),
      );
      setMessage(
        `Dark mode ${!systemSettings.darkMode ? 'enabled' : 'disabled'}`,
      );
      return;
    }

    // Special handling for temperature unit
    if (setting === 'temperatureUnit') {
      const newValue =
        systemSettings.temperatureUnit === 'celsius' ? 'fahrenheit' : 'celsius';
      const newSettings = { ...systemSettings, temperatureUnit: newValue };
      setSystemSettings(newSettings);
      localStorage.setItem('systemSettings', JSON.stringify(newSettings));
      setMessage(
        `Temperature unit changed to ${newValue === 'celsius' ? 'Celsius' : 'Fahrenheit'}`,
      );
      return;
    }

    // Handle other boolean settings
    const newValue = !systemSettings[setting];
    const newSettings = {
      ...systemSettings,
      [setting]: newValue,
    };

    // Update system settings
    setSystemSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));

    if (setting === 'autoWatering') {
      setMessage(`Automatic watering ${newValue ? 'enabled' : 'disabled'}`);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await logout();
      setMessage('Logged out successfully');
    } catch (error) {
      setError('Failed to log out: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone.',
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Delete user account from Supabase
      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) throw error;

      setMessage('Account deleted successfully');
      // Log out the user after deletion
      await logout();
    } catch (err) {
      setError('Failed to delete account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Settings
          </h1>
          <p
            className={`mt-2 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Manage your account preferences and system settings
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <Alert variant="error" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert variant="success" className="fixed top-4 right-4 z-50 max-w-sm">
          {message}
        </Alert>
      )}

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Profile Settings */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <FiUser className="mr-2" />
              Profile Settings
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your personal information and account details
            </p>
          </div>
          <form onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Display Name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
              />

              <div>
                <label
                  htmlFor="email"
                  className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  className={`w-full px-4 py-3 border rounded-lg ${
                    isDark
                      ? 'border-gray-600 bg-gray-700 text-gray-400'
                      : 'border-gray-300 bg-gray-100 text-gray-600'
                  }`}
                  disabled
                  aria-describedby="email-disabled"
                />
                <p
                  id="email-disabled"
                  className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Email cannot be changed from this page. Contact support for
                  email changes.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                variant="secondary"
              >
                <FiKey className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </form>
        </Card>

        {/* Notification Settings */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <FiBell className="mr-2" />
              Notification Preferences
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Control how and when you receive notifications about your garden
            </p>
          </div>
          <div className="space-y-6">
            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Email Alerts
                </h3>
                <p
                  className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailAlerts}
                onChange={() => handleNotificationChange('emailAlerts')}
                id="email-alerts"
              />
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Watering Reminders
                </h3>
                <p
                  className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Get reminders for scheduled watering
                </p>
              </div>
              <Switch
                checked={notificationSettings.wateringReminders}
                onChange={() => handleNotificationChange('wateringReminders')}
                id="watering-reminders"
              />
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  System Updates
                </h3>
                <p
                  className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Receive notifications about system updates
                </p>
              </div>
              <Switch
                checked={notificationSettings.systemUpdates}
                onChange={() => handleNotificationChange('systemUpdates')}
                id="system-updates"
              />
            </div>
          </div>
        </Card>

        {/* System Settings */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <FiSettings className="mr-2" />
              System Preferences
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Customize your dashboard experience and system behavior
            </p>
          </div>
          <div className="space-y-6">
            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Dark Mode
                </h3>
                <p
                  className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Enable dark theme for the dashboard
                </p>
              </div>
              <Switch
                checked={systemSettings.darkMode}
                onChange={() => handleSystemSettingChange('darkMode')}
                id="dark-mode"
              />
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Automatic Watering
                </h3>
                <p
                  className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Enable automatic watering based on soil moisture
                </p>
              </div>
              <Switch
                checked={systemSettings.autoWatering}
                onChange={() => handleSystemSettingChange('autoWatering')}
                id="auto-watering"
              />
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex-1">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Temperature Unit
                </h3>
                <p
                  className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Display temperature in Celsius or Fahrenheit
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSystemSettingChange('temperatureUnit')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    systemSettings.temperatureUnit === 'celsius'
                      ? isDark
                        ? 'bg-green-600 text-white'
                        : 'bg-green-500 text-white'
                      : isDark
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => handleSystemSettingChange('temperatureUnit')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    systemSettings.temperatureUnit === 'fahrenheit'
                      ? isDark
                        ? 'bg-green-600 text-white'
                        : 'bg-green-500 text-white'
                      : isDark
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  °F
                </button>
              </div>
            </div>

            <div>
              <label
                className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}
              >
                Data Refresh Interval
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={systemSettings.dataRefreshInterval}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      dataRefreshInterval: parseInt(e.target.value),
                    })
                  }
                  className="w-full max-w-xs"
                />
                <span
                  className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  {systemSettings.dataRefreshInterval} seconds
                </span>
              </div>
              <p
                className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                How often to refresh sensor data (10-300 seconds)
              </p>
            </div>
          </div>
        </Card>

        {/* ESP32 Configuration */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <FiCpu className="mr-2" />
              Device Configuration
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your ESP32 devices and connection settings
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label
                htmlFor="api-key"
                className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}
              >
                API Key
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="api-key"
                  value=""
                  className={`flex-1 px-4 py-3 border rounded-l-lg ${
                    isDark
                      ? 'border-gray-600 bg-gray-700 text-gray-400'
                      : 'border-gray-300 bg-gray-100 text-gray-600'
                  }`}
                  disabled
                />
                <button
                  className={`px-4 py-3 rounded-r-lg font-medium ${
                    isDark
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  Regenerate
                </button>
              </div>
              <p
                className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Use this key to authenticate your ESP32 devices with the
                GardenCare API
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="mqtt-server"
                  className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}
                >
                  MQTT Server
                </label>
                <input
                  type="text"
                  id="mqtt-server"
                  value="mqtt.farmflow.example.com"
                  className={`w-full px-4 py-3 border rounded-lg ${
                    isDark
                      ? 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  disabled
                />
              </div>

              <div>
                <label
                  htmlFor="mqtt-port"
                  className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}
                >
                  MQTT Port
                </label>
                <input
                  type="text"
                  id="mqtt-port"
                  value="8883"
                  className={`w-full px-4 py-3 border rounded-lg ${
                    isDark
                      ? 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  disabled
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3
                  className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Connected Devices
                </h3>
                <button
                  onClick={fetchDevices}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FiRefreshCw
                    className={`inline mr-1 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </button>
              </div>

              {devices.length > 0 ? (
                <div className="overflow-hidden border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Device Name
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                          Last Seen
                        </th>
                      </tr>
                    </thead>

                    <tbody
                      className={`divide-y ${isDark ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}
                    >
                      {devices.map((device) => (
                        <tr key={device.id}>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            {device.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                device.status === 'online'
                                  ? isDark
                                    ? 'bg-green-900 text-green-400'
                                    : 'bg-green-100 text-green-800'
                                  : isDark
                                    ? 'bg-red-900 text-red-400'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {device.status}
                            </span>
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {new Date(device.last_seen).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiWifi
                    className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                  />
                  <h3
                    className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}
                  >
                    No devices connected
                  </h3>
                  <p
                    className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Your ESP32 devices will appear here once connected. Visit
                    the System page to register devices.
                  </p>
                  <div className="mt-4">
                    <a
                      href="/system"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiSettings className="mr-2 -ml-1 h-4 w-4" />
                      Go to System Page
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Account Actions */}
        <Card>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <FiAlertCircle className="mr-2" />
              Account Management
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your account security and data
            </p>
          </div>
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="secondary"
              className="flex items-center px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded focus:ring-2 focus:ring-gray-500"
              onClick={handleLogout}
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>

            <Button
              variant="danger"
              className="flex items-center px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded focus:ring-2 focus:ring-red-500"
              onClick={handleDeleteAccount}
            >
              <FiX className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>

          <div className="bg-red-900/30 border border-red-700 text-red-200 text-sm rounded p-4">
            <p>
              <span className="font-semibold">Warning:</span> Deleting your
              account will permanently remove all your data, including plant
              information, sensor data, and settings. This action cannot be
              undone.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;

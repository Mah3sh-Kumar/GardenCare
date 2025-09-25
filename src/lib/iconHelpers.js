// Icon constants and helpers for consistent icon usage across components
import {
  FiHome,
  FiSettings,
  FiDroplet,
  FiActivity,
  FiDatabase,
  FiCpu,
  FiSun,
  FiMoon,
  FiWind,
  FiZap,
  FiCloud,
  FiCloudRain,
  FiCloudSnow,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiInfo,
  FiRefreshCw,
  FiLoader,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiPlus,
  FiSave,
  FiKey,
  FiWifi,
  FiPower,
  FiMapPin,
  FiSearch,
  FiSunrise,
  FiSunset,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';

// Navigation icons
export const NAV_ICONS = {
  dashboard: FiHome,
  plants: FaLeaf,
  watering: FiDroplet,
  sensors: FiDatabase,
  analytics: FiActivity,
  system: FiCpu,
  settings: FiSettings,
};

// Weather condition icons
export const WEATHER_ICONS = {
  sunny: FiSun,
  clear: FiSun,
  moon: FiMoon,
  cloudy: FiCloud,
  rain: FiCloudRain,
  snow: FiCloudSnow,
  storm: FiZap,
  wind: FiWind,
  sunrise: FiSunrise,
  sunset: FiSunset,
};

// Alert and status icons
export const STATUS_ICONS = {
  success: FiCheck,
  error: FiX,
  warning: FiAlertTriangle,
  info: FiInfo,
  alert: FiAlertCircle,
};

// Action icons
export const ACTION_ICONS = {
  refresh: FiRefreshCw,
  loading: FiLoader,
  add: FiPlus,
  delete: FiTrash2,
  save: FiSave,
  key: FiKey,
  wifi: FiWifi,
  power: FiPower,
  search: FiSearch,
  location: FiMapPin,
  view: FiEye,
  hide: FiEyeOff,
};

// Theme icons
export const THEME_ICONS = {
  light: FiSun,
  dark: FiMoon,
};

/**
 * Get weather icon based on condition text
 * @param {string} condition - Weather condition text
 * @returns {React.Component} Icon component
 */
export const getWeatherIcon = (condition) => {
  const conditionText = condition?.toLowerCase() || '';
  
  if (conditionText.includes('sunny') || conditionText.includes('clear')) {
    return WEATHER_ICONS.sunny;
  }
  if (conditionText.includes('cloudy') || conditionText.includes('overcast')) {
    return WEATHER_ICONS.cloudy;
  }
  if (conditionText.includes('rain') || conditionText.includes('drizzle')) {
    return WEATHER_ICONS.rain;
  }
  if (conditionText.includes('snow')) {
    return WEATHER_ICONS.snow;
  }
  if (conditionText.includes('thunder') || conditionText.includes('storm')) {
    return WEATHER_ICONS.storm;
  }
  if (conditionText.includes('wind')) {
    return WEATHER_ICONS.wind;
  }
  
  return WEATHER_ICONS.sunny; // Default fallback
};

/**
 * Get status icon based on status type
 * @param {string} status - Status type (success, error, warning, info)
 * @returns {React.Component} Icon component
 */
export const getStatusIcon = (status) => {
  return STATUS_ICONS[status] || STATUS_ICONS.info;
};

/**
 * Get trend icon based on trend direction
 * @param {string} trend - Trend direction (up, down, stable)
 * @returns {object} Icon configuration with path and color
 */
export const getTrendIcon = (trend) => {
  const icons = {
    up: {
      path: 'M5 10l7-7m0 0l7 7m-7-7v18',
      color: 'text-green-500',
      description: 'increasing',
    },
    down: {
      path: 'M19 14l-7 7m0 0l-7-7m7 7V3',
      color: 'text-red-500',
      description: 'decreasing',
    },
    stable: {
      path: 'M5 12h14',
      color: 'text-gray-500',
      description: 'stable',
    },
  };
  
  return icons[trend] || icons.stable;
};

/**
 * Common icon props for consistent sizing
 */
export const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

/**
 * Get icon size class
 * @param {string} size - Size key (xs, sm, md, lg, xl)
 * @returns {string} Tailwind CSS classes
 */
export const getIconSize = (size = 'md') => {
  return ICON_SIZES[size] || ICON_SIZES.md;
};
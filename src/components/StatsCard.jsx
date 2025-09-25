import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const StatsCard = ({ title, value, change, trend, icon, loading = false, error = null }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div 
        className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-4 sm:p-6 rounded-xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} animate-pulse`}
        role="status"
        aria-label={`Loading ${title} statistics`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-4 sm:p-6 rounded-xl shadow-sm border ${isDark ? 'border-red-700' : 'border-red-200'} ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}
        role="alert"
        aria-label={`Error loading ${title} statistics`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>{title}</h3>
          <span className="p-2 rounded-full bg-red-500">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <div className="text-sm text-red-600 dark:text-red-400">Error loading data</div>
      </div>
    );
  }

  const getTrendColor = (trend) => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-gray-500';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return 'M5 10l7-7m0 0l7 7m-7-7v18';
    if (trend === 'down') return 'M19 14l-7 7m0 0l-7-7m7 7V3';
    return 'M5 12h14';
  };

  const getTrendText = (trend) => {
    if (trend === 'up') return 'increasing';
    if (trend === 'down') return 'decreasing';
    return 'stable';
  };

  const getTrendDescription = (trend, change) => {
    if (trend === 'up') return `${change} increase`;
    if (trend === 'down') return `${change} decrease`;
    return `${change} change`;
  };

  return (
    <div 
      className={`${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} p-4 sm:p-6 rounded-xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-opacity-50`}
      role="region"
      aria-label={`${title} statistics`}
      tabIndex="0"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</h3>
        <span className={`p-2 rounded-full ${icon?.bgColor || 'bg-gray-500'} shadow-sm`}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={icon?.path || 'M13 10V3L4 14h7v7l9-11h-7z'} 
            />
          </svg>
        </span>
      </div>
      <div className="flex flex-col">
        <span 
          className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`} 
          aria-live="polite"
          aria-label={`${title} value is ${value}`}
        >
          {value || 'N/A'}
        </span>
        <div className="flex items-center mt-2">
          <span 
            className={`text-sm ${getTrendColor(trend)} flex items-center`}
            aria-label={`${getTrendDescription(trend, change)} - trend is ${getTrendText(trend)}`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={getTrendIcon(trend)} 
              />
            </svg>
            {change || '--'}
          </span>
          <span className={`text-xs ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>vs last period</span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
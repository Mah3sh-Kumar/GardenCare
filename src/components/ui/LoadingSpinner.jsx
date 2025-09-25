import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const LoadingSpinner = ({ size = 'md', text = 'Loading...', className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const spinnerSize = sizes[size] || sizes.md;

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-2 border-b-2 border-green-500 ${spinnerSize} mb-4`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
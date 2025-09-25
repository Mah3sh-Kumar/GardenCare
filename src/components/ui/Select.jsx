import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Select = ({ 
  label, 
  id, 
  error, 
  helperText, 
  className = '', 
  disabled = false,
  fullWidth = false,
  children,
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseClasses = `
    block w-full px-4 py-3 border rounded-lg
    focus:ring-2 focus:ring-green-500 focus:border-green-500
    transition-colors appearance-none
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isDark 
      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
    }
    ${error 
      ? (isDark ? 'border-red-500 focus:ring-red-500' : 'border-red-500 focus:ring-red-500') 
      : ''
    }
  `.trim();

  const wrapperClasses = fullWidth ? 'w-full' : '';

  return (
    <div className={wrapperClasses}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`${baseClasses} ${className}`}
          disabled={disabled}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {helperText && (
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
      {error && (
        <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
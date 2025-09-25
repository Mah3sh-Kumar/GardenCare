import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Input = ({ 
  label, 
  id, 
  error, 
  helperText, 
  className = '', 
  disabled = false,
  fullWidth = false,
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseClasses = `
    block w-full px-4 py-3 border rounded-lg
    focus:ring-2 focus:ring-green-500 focus:border-green-500
    transition-colors
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
      <input
        id={id}
        className={`${baseClasses} ${className}`}
        disabled={disabled}
        {...props}
      />
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

export default Input;
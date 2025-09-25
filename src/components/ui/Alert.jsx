import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiX, FiCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const Alert = ({ 
  children, 
  variant = 'info', 
  onClose, 
  className = '',
  dismissible = false,
  icon,
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Define variants
  const variants = {
    success: {
      container: isDark ? 'bg-green-900 bg-opacity-20 border-green-500 text-green-400' : 'bg-green-50 border-green-500 text-green-700',
      icon: isDark ? 'text-green-400' : 'text-green-600',
      iconComponent: icon || <FiCheck className="w-5 h-5" />
    },
    error: {
      container: isDark ? 'bg-red-900 bg-opacity-20 border-red-500 text-red-400' : 'bg-red-50 border-red-500 text-red-700',
      icon: isDark ? 'text-red-400' : 'text-red-600',
      iconComponent: icon || <FiX className="w-5 h-5" />
    },
    warning: {
      container: isDark ? 'bg-yellow-900 bg-opacity-20 border-yellow-500 text-yellow-400' : 'bg-yellow-50 border-yellow-500 text-yellow-700',
      icon: isDark ? 'text-yellow-400' : 'text-yellow-600',
      iconComponent: icon || <FiAlertTriangle className="w-5 h-5" />
    },
    info: {
      container: isDark ? 'bg-blue-900 bg-opacity-20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-500 text-blue-700',
      icon: isDark ? 'text-blue-400' : 'text-blue-600',
      iconComponent: icon || <FiInfo className="w-5 h-5" />
    }
  };

  const selectedVariant = variants[variant];
  const containerClasses = `
    flex items-center p-4 border-l-4 rounded-lg shadow-sm
    ${selectedVariant.container}
    ${className}
  `.trim();

  return (
    <div className={containerClasses} {...props}>
      <div className={`mr-3 flex-shrink-0 ${selectedVariant.icon}`}>
        {selectedVariant.iconComponent}
      </div>
      <div className="flex-1">
        {children}
      </div>
      {dismissible && onClose && (
        <button 
          onClick={onClose}
          className={`ml-3 p-1 rounded-full ${isDark ? 'hover:bg-opacity-20 hover:bg-white' : 'hover:bg-opacity-20 hover:bg-black'}`}
          aria-label="Close alert"
        >
          <FiX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Card = ({ 
  children, 
  className = '', 
  header, 
  footer,
  variant = 'default',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Define variants
  const variants = {
    default: isDark 
      ? 'bg-gray-800 border-gray-700' 
      : 'bg-white border-gray-200',
    elevated: isDark 
      ? 'bg-gray-800 border-gray-700 shadow-lg' 
      : 'bg-white border-gray-200 shadow-lg',
    subtle: isDark 
      ? 'bg-gray-800 border-gray-700' 
      : 'bg-gray-50 border-gray-200'
  };

  const borderClass = 'border rounded-xl overflow-hidden';
  const cardClasses = `${variants[variant]} ${borderClass} ${className}`.trim();

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          {typeof header === 'string' ? (
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {header}
            </h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top',
  className = '',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [visible, setVisible] = useState(false);

  // Position classes
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const tooltipClasses = `
    absolute z-50 px-3 py-2 text-sm font-medium rounded-lg shadow-sm
    ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white'}
    whitespace-nowrap
    ${positionClasses[position]}
    ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    transition-opacity duration-200
    ${className}
  `.trim();

  const arrowClasses = `
    absolute w-2 h-2 rotate-45
    ${isDark ? 'bg-gray-700' : 'bg-gray-900'}
  `.trim();

  const getArrowPosition = () => {
    switch (position) {
      case 'top': return 'top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'bottom': return 'bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2';
      case 'left': return 'left-full top-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'right': return 'right-full top-1/2 transform translate-x-1/2 -translate-y-1/2';
      default: return '';
    }
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      {...props}
    >
      {children}
      <div className={tooltipClasses} role="tooltip">
        {content}
        <div className={`${arrowClasses} ${getArrowPosition()}`}></div>
      </div>
    </div>
  );
};

export default Tooltip;
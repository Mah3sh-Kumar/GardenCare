import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ProgressBar = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  className = '',
  showPercentage = false,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Define variants
  const variants = {
    primary: 'bg-green-500',
    secondary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  // Define sizes
  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const containerClasses = `
    w-full rounded-full overflow-hidden
    ${isDark ? 'bg-gray-700' : 'bg-gray-200'}
    ${sizes[size]}
    ${className}
  `.trim();

  const fillerClasses = `
    h-full rounded-full transition-all duration-300 ease-in-out
    ${variants[variant]}
  `.trim();

  return (
    <div className="w-full">
      <div className={containerClasses} {...props}>
        <div className={fillerClasses} style={{ width: `${percentage}%` }} />
      </div>
      {showPercentage && (
        <div
          className={`text-xs mt-1 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;

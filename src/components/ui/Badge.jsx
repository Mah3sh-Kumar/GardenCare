import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Define variants
  const variants = {
    default: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800',
    primary: isDark
      ? 'bg-green-900 text-green-400'
      : 'bg-green-100 text-green-800',
    secondary: isDark
      ? 'bg-blue-900 text-blue-400'
      : 'bg-blue-100 text-blue-800',
    success: isDark
      ? 'bg-green-900 text-green-400'
      : 'bg-green-100 text-green-800',
    warning: isDark
      ? 'bg-yellow-900 text-yellow-400'
      : 'bg-yellow-100 text-yellow-800',
    error: isDark ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-800',
    info: isDark ? 'bg-blue-900 text-blue-400' : 'bg-blue-100 text-blue-800',
  };

  // Define sizes
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  const badgeClasses = `
    inline-flex items-center rounded-full font-medium
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `.trim();

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;

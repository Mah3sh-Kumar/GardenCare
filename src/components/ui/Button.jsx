import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick, 
  className = '',
  type = 'button',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Define variants
  const variants = {
    primary: isDark 
      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white' 
      : 'bg-green-500 hover:bg-green-600 focus:ring-green-500 text-white',
    secondary: isDark 
      ? 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white' 
      : 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 text-gray-800',
    outline: isDark 
      ? 'border border-gray-600 hover:bg-gray-700 focus:ring-green-500 text-white' 
      : 'border border-gray-300 hover:bg-gray-50 focus:ring-green-500 text-gray-700',
    danger: isDark 
      ? 'bg-red-700 hover:bg-red-600 focus:ring-red-500 text-white' 
      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    ghost: isDark 
      ? 'hover:bg-gray-700 focus:ring-gray-500 text-white' 
      : 'hover:bg-gray-100 focus:ring-gray-500 text-gray-700'
  };

  // Define sizes
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Disabled styles
  const disabledStyles = 'opacity-50 cursor-not-allowed';

  // Combine all classes
  const buttonClasses = `
    inline-flex items-center justify-center rounded-lg font-medium transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}
    ${variants[variant]}
    ${sizes[size]}
    ${disabled ? disabledStyles : 'shadow-sm'}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
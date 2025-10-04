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
      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200'
      : 'bg-green-500 hover:bg-green-600 focus:ring-green-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200',
    secondary: isDark
      ? 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white border border-gray-600 hover:border-gray-500 transition-all duration-200'
      : 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 text-gray-800 border border-gray-300 hover:border-gray-400 transition-all duration-200',
    outline: isDark
      ? 'border-2 border-gray-600 hover:bg-gray-700 hover:border-gray-500 focus:ring-green-500 text-white transition-all duration-200'
      : 'border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-green-500 text-gray-700 transition-all duration-200',
    danger: isDark
      ? 'bg-red-700 hover:bg-red-600 focus:ring-red-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200'
      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200',
    ghost: isDark
      ? 'hover:bg-gray-700 focus:ring-gray-500 text-white transition-all duration-200'
      : 'hover:bg-gray-100 focus:ring-gray-500 text-gray-700 transition-all duration-200',
  };

  // Define sizes
  const sizes = {
    sm: 'px-3 py-1.5 text-sm font-medium',
    md: 'px-4 py-2.5 text-sm font-medium',
    lg: 'px-6 py-3 text-base font-semibold',
  };

  // Disabled styles
  const disabledStyles = 'opacity-50 cursor-not-allowed transform-none hover:transform-none hover:shadow-none';

  // Combine all classes
  const buttonClasses = `
    inline-flex items-center justify-center rounded-lg font-medium 
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}
    ${variants[variant]}
    ${sizes[size]}
    ${disabled ? disabledStyles : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

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

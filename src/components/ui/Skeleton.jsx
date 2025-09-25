import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Skeleton = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Base skeleton classes
  const baseClasses = `
    rounded-lg animate-pulse
    ${isDark ? 'bg-gray-700' : 'bg-gray-200'}
  `.trim();

  // Variant-specific classes
  const variantClasses = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded-full',
  };

  // Size styles
  const sizeStyles = {};
  if (width) sizeStyles.width = width;
  if (height) sizeStyles.height = height;

  const skeletonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${className}
  `.trim();

  return <div className={skeletonClasses} style={sizeStyles} {...props} />;
};

export default Skeleton;

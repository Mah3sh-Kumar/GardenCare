import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Switch = ({ 
  checked, 
  onChange, 
  label, 
  id,
  disabled = false,
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const switchClasses = `
    relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full
    cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none
    focus:ring-2 focus:ring-offset-2 focus:ring-green-500
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}
    ${checked ? 'bg-green-600' : (isDark ? 'bg-gray-600' : 'bg-gray-200')}
  `.trim();

  const thumbClasses = `
    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
    transform ring-0 transition ease-in-out duration-200
    ${checked ? 'translate-x-5' : 'translate-x-0'}
  `.trim();

  return (
    <div className="flex items-center">
      <button
        type="button"
        className={switchClasses}
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${id}-label` : undefined}
        onClick={() => !disabled && onChange && onChange(!checked)}
        disabled={disabled}
        {...props}
      >
        <span
          className={thumbClasses}
          aria-hidden="true"
        />
      </button>
      {label && (
        <span 
          id={`${id}-label`}
          className={`ml-3 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default Switch;
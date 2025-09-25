import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiX } from 'react-icons/fi';

const Modal = ({ 
  children, 
  isOpen, 
  onClose, 
  title,
  size = 'md',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Define sizes
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-full mx-4'
  };

  const modalClasses = `
    fixed inset-0 z-50 overflow-y-auto
    ${isDark ? 'text-white' : 'text-gray-900'}
  `.trim();

  const backdropClasses = `
    fixed inset-0 bg-black bg-opacity-50 transition-opacity
  `.trim();

  const dialogClasses = `
    relative flex min-h-screen items-center justify-center p-4
  `.trim();

  const contentClasses = `
    relative rounded-xl shadow-xl transform transition-all
    w-full ${sizes[size]}
    ${isDark ? 'bg-gray-800' : 'bg-white'}
    overflow-hidden
  `.trim();

  return (
    <div className={modalClasses} {...props}>
      <div 
        className={backdropClasses}
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className={dialogClasses}>
        <div 
          className={contentClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {title && (
              <h3 
                id="modal-title"
                className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {title}
              </h3>
            )}
            <button
              type="button"
              className={`p-1 rounded-full ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
              onClick={onClose}
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
/**
 * Toast notification system for user feedback
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ toast, onDismiss }) => {
  const getToastStyles = (type) => {
    const base = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-md z-50 transition-all duration-300';
    
    switch (type) {
      case 'error': return `${base} bg-red-500 text-white`;
      case 'success': return `${base} bg-green-500 text-white`;
      case 'warning': return `${base} bg-yellow-500 text-black`;
      default: return `${base} bg-blue-500 text-white`;
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={getToastStyles(toast.type)}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {toast.title && <div className="font-bold mb-1">{toast.title}</div>}
          <div className="text-sm">{toast.message}</div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-4 text-white hover:text-gray-200 font-bold text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = {
    error: (message, title = 'Error') => addToast({ type: 'error', message, title }),
    success: (message, title = 'Success') => addToast({ type: 'success', message, title }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', message, title }),
    info: (message, title = 'Info') => addToast({ type: 'info', message, title })
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, dismissToast }}>
      {children}
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </ToastContext.Provider>
  );
};
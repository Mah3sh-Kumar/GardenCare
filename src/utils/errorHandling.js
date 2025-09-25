/**
 * Error handling utilities for consistent error management
 */

// Debug logging utility
export const debugLog = (...args) => {
  if (import.meta.env.VITE_DEBUG === '1' || process.env.NODE_ENV === 'development') {
    console.group('🐛 Debug Log');
    console.log(...args);
    console.trace('Call stack:');
    console.groupEnd();
  }
};

// Realtime event logging
export const logRealtimeEvent = (event, table) => {
  if (import.meta.env.VITE_DEBUG === '1') {
    console.group(`📡 Realtime Event: ${table}`);
    console.log('Event Type:', event.eventType);
    console.log('New Data:', event.new);
    console.log('Old Data:', event.old);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
};

// Supabase error handler
export const handleSupabaseError = (error, toast) => {
  console.error('Supabase error:', error);
  
  if (!toast) return;

  const errorMessages = {
    'JWT expired': 'Your session has expired. Please sign in again.',
    'Invalid JWT': 'Authentication error. Please sign in again.',
    'Row Level Security': 'You do not have permission to access this data.',
    'column does not exist': 'Database error. Please contact support.',
    'relation does not exist': 'Database error. Please contact support.',
    'duplicate key value': 'This record already exists.',
    'permission denied': 'You do not have permission to perform this action.'
  };

  let userMessage = 'An unexpected error occurred. Please try again.';
  
  if (error?.message) {
    for (const [pattern, message] of Object.entries(errorMessages)) {
      if (error.message.includes(pattern)) {
        userMessage = message;
        break;
      }
    }
  }

  toast.error(userMessage, 'Database Error');
};

// Network error handler
export const handleNetworkError = (error, toast) => {
  console.error('Network error:', error);
  
  if (!toast) return;

  const isOffline = !navigator.onLine;
  const message = isOffline 
    ? 'You appear to be offline. Please check your internet connection.'
    : 'Network error occurred. Please check your connection and try again.';
    
  toast.error(message, 'Connection Error');
};

// Generic error handler
export const handleGenericError = (error, toast, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  if (!toast) return;

  const message = error?.message || 'An unexpected error occurred.';
  toast.error(message, context ? `${context} Error` : 'Error');
};
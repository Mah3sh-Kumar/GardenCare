import { useCallback, useRef, useMemo } from 'react';

/**
 * Throttle function to limit the rate of function calls
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * Debounce function to delay function calls until after wait time has elapsed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Hook for throttling callbacks
 * @param {Function} callback - Callback to throttle
 * @param {number} delay - Throttle delay in ms
 * @returns {Function} Throttled callback
 */
export const useThrottle = (callback, delay) => {
  const throttledCallback = useRef(throttle(callback, delay));
  
  return useCallback((...args) => {
    throttledCallback.current(...args);
  }, []);
};

/**
 * Hook for debouncing callbacks
 * @param {Function} callback - Callback to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} Debounced callback
 */
export const useDebounce = (callback, delay) => {
  const debouncedCallback = useRef(debounce(callback, delay));
  
  return useCallback((...args) => {
    debouncedCallback.current(...args);
  }, []);
};

/**
 * Hook for memoizing expensive calculations
 * @param {Function} factory - Factory function for the value
 * @param {Array} deps - Dependencies array
 * @returns {any} Memoized value
 */
export const useExpensiveMemo = (factory, deps) => {
  return useMemo(() => {
    const startTime = performance.now();
    const result = factory();
    const endTime = performance.now();
    
    if (import.meta.env.DEV && (endTime - startTime) > 100) {
      console.warn(`Expensive computation took ${endTime - startTime}ms`);
    }
    
    return result;
  }, deps);
};

/**
 * Data sampling utility for reducing chart data points
 * @param {Array} data - Original data array
 * @param {number} maxPoints - Maximum number of points to keep
 * @returns {Array} Sampled data
 */
export const sampleData = (data, maxPoints = 100) => {
  if (!data || data.length <= maxPoints) {
    return data;
  }
  
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

/**
 * Batch state updates to prevent unnecessary re-renders
 * @param {Function} updateFn - State update function
 * @param {number} delay - Batch delay in ms
 * @returns {Function} Batched update function
 */
export const batchUpdates = (updateFn, delay = 100) => {
  let updates = [];
  let timeoutId;
  
  return (update) => {
    updates.push(update);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      if (updates.length > 0) {
        updateFn(updates);
        updates = [];
      }
    }, delay);
  };
};

/**
 * Virtual scrolling utility for large lists
 * @param {Array} items - All items
 * @param {number} containerHeight - Container height in px
 * @param {number} itemHeight - Individual item height in px
 * @param {number} scrollTop - Current scroll position
 * @returns {Object} Visible items and positioning info
 */
export const getVisibleItems = (items, containerHeight, itemHeight, scrollTop) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight,
  };
};

/**
 * Memory usage monitoring utility
 */
export const memoryMonitor = {
  start() {
    if (typeof performance !== 'undefined' && performance.memory) {
      this.initialMemory = performance.memory.usedJSHeapSize;
      console.log('Memory monitoring started:', this.formatBytes(this.initialMemory));
    }
  },
  
  check(label = 'Memory check') {
    if (typeof performance !== 'undefined' && performance.memory) {
      const currentMemory = performance.memory.usedJSHeapSize;
      const diff = currentMemory - (this.initialMemory || 0);
      console.log(
        `${label}:`,
        this.formatBytes(currentMemory),
        `(${diff > 0 ? '+' : ''}${this.formatBytes(diff)})`
      );
    }
  },
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

/**
 * Component performance tracker
 * @param {string} componentName - Name of the component
 * @returns {Object} Performance tracking utilities
 */
export const createPerformanceTracker = (componentName) => {
  let renderCount = 0;
  let totalRenderTime = 0;
  
  return {
    startRender() {
      this.renderStart = performance.now();
    },
    
    endRender() {
      if (this.renderStart) {
        const renderTime = performance.now() - this.renderStart;
        renderCount++;
        totalRenderTime += renderTime;
        
        if (import.meta.env.DEV && renderTime > 16) {
          console.warn(
            `${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount})`
          );
        }
        
        this.renderStart = null;
      }
    },
    
    getStats() {
      return {
        renderCount,
        averageRenderTime: renderCount > 0 ? totalRenderTime / renderCount : 0,
        totalRenderTime,
      };
    },
  };
};
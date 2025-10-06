import { useState, useEffect } from 'react';

/**
 * Custom hook to get and listen to temperature unit changes
 * @returns {string} temperature unit ('celsius' or 'fahrenheit')
 */
export const useTemperatureUnit = () => {
  const [temperatureUnit, setTemperatureUnit] = useState('celsius');

  useEffect(() => {
    // Get initial value from localStorage
    const getTemperatureUnit = () => {
      try {
        const settings = localStorage.getItem('systemSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          return parsed.temperatureUnit || 'celsius';
        }
      } catch (error) {
        console.warn('Error reading temperature unit from localStorage:', error);
      }
      return 'celsius';
    };

    // Set initial value
    setTemperatureUnit(getTemperatureUnit());

    // Listen for localStorage changes
    const handleStorageChange = (e) => {
      if (e.key === 'systemSettings') {
        setTemperatureUnit(getTemperatureUnit());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return temperatureUnit;
};
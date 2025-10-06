/**
 * Utility functions for temperature conversion and formatting
 */

/**
 * Convert temperature between Celsius and Fahrenheit
 * @param {number} temp - Temperature value
 * @param {string} fromUnit - Source unit ('celsius' or 'fahrenheit')
 * @param {string} toUnit - Target unit ('celsius' or 'fahrenheit')
 * @returns {number} Converted temperature
 */
export const convertTemperature = (temp, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return temp;
  
  if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return (temp * 9/5) + 32;
  }
  
  if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
    return (temp - 32) * 5/9;
  }
  
  return temp;
};

/**
 * Get temperature unit symbol
 * @param {string} unit - Temperature unit ('celsius' or 'fahrenheit')
 * @returns {string} Unit symbol (°C or °F)
 */
export const getTemperatureUnitSymbol = (unit) => {
  return unit === 'fahrenheit' ? '°F' : '°C';
};

/**
 * Get temperature unit name
 * @param {string} unit - Temperature unit ('celsius' or 'fahrenheit')
 * @returns {string} Unit name (Celsius or Fahrenheit)
 */
export const getTemperatureUnitName = (unit) => {
  return unit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius';
};

/**
 * Format temperature with unit
 * @param {number} temp - Temperature value
 * @param {string} unit - Temperature unit ('celsius' or 'fahrenheit')
 * @param {boolean} round - Whether to round the value
 * @returns {string} Formatted temperature with unit
 */
export const formatTemperature = (temp, unit, round = true) => {
  const value = round ? Math.round(temp) : temp;
  const symbol = getTemperatureUnitSymbol(unit);
  return `${value}${symbol}`;
};

/**
 * Get system temperature unit from localStorage
 * @returns {string} Temperature unit ('celsius' or 'fahrenheit')
 */
export const getSystemTemperatureUnit = () => {
  try {
    const settings = localStorage.getItem('systemSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.temperatureUnit || 'celsius';
    }
  } catch (error) {
    console.warn('Error reading temperature unit from localStorage:', error);
  }
  return 'celsius'; // Default to Celsius
};
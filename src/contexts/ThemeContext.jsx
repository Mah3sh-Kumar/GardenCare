import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or system preference
  const getInitialTheme = () => {
    const saved = localStorage.getItem('farmflow-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme by toggling `dark` class on <html>
  const applyTheme = (t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  // Run once on theme change
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('farmflow-theme', theme);
  }, [theme]);

  // Toggle function
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Set theme manually (for settings page)
  const setThemeDirectly = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeDirectly }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

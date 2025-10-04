// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiSettings,
  FiDroplet,
  FiActivity,
  FiDatabase,
  FiCpu,
  FiX,
} from 'react-icons/fi';
import { FaLeaf } from 'react-icons/fa';
import StickyAlert from './StickyAlert';
import { useTheme } from '../contexts/ThemeContext';

const links = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <FiHome />,
    description: 'Overview of your garden',
  },
  {
    to: '/plants',
    label: 'Plants',
    icon: <FaLeaf />,
    description: 'Manage plant zones',
  },
  {
    to: '/schedule',
    label: 'Watering',
    icon: <FiDroplet />,
    description: 'Schedule and controls',
  },
  {
    to: '/sensors',
    label: 'Sensors Data',
    icon: <FiDatabase />,
    description: 'Sensor data and status',
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: <FiActivity />,
    description: 'Data analysis and trends',
  },
  {
    to: '/system',
    label: 'System',
    icon: <FiCpu />,
    description: 'System status and logs',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <FiSettings />,
    description: 'Preferences and configuration',
  },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { theme } = useTheme();

  const darkMode = theme === 'dark';

  // Close sidebar when escape key is pressed
  React.useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [setIsOpen]);

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } h-full ${
          darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
        } flex flex-col justify-between w-64 lg:w-64 transition-all duration-300 ease-in-out border-r ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        } shadow-soft lg:shadow-sm`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Mobile Header (Sticky) */}
        <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Project Name / Logo */}
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <FaLeaf className="text-white text-sm" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">GardenCare</span>
          </h1>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            aria-label="Close sidebar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2" role="navigation">
          <div className="mb-6">
            <h2
              className={`text-xs font-semibold uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              } mb-4 flex items-center`}
            >
              <span className="mr-2">📊</span>
              Smart Garden Control
            </h2>
          </div>

          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)} // Close sidebar on mobile when link is clicked
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative min-h-[52px] ${
                  isActive
                    ? darkMode
                      ? 'bg-gradient-to-r from-green-900/60 to-green-800/40 text-green-300 font-semibold shadow-lg border border-green-700/50 transform scale-[1.02]'
                      : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 font-semibold shadow-md border border-green-200 transform scale-[1.02]'
                    : darkMode
                      ? 'text-gray-300 hover:bg-gray-700/80 hover:text-gray-100 hover:transform hover:scale-[1.01]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:transform hover:scale-[1.01]'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={link.description}
              >
                {/* Active indicator */}
                {isActive && (
                  <>
                    <div
                      className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-10 rounded-r-full ${
                        darkMode ? 'bg-green-400' : 'bg-green-500'
                      }`}
                      aria-hidden="true"
                    ></div>
                    <div
                      className={`absolute inset-0 rounded-xl opacity-20 ${
                        darkMode ? 'bg-green-400' : 'bg-green-500'
                      }`}
                      aria-hidden="true"
                    ></div>
                  </>
                )}

                <span
                  className={`text-xl transition-all duration-200 flex-shrink-0 ${
                    isActive
                      ? darkMode
                        ? 'text-green-300 transform scale-110'
                        : 'text-green-600 transform scale-110'
                      : darkMode
                        ? 'text-gray-300 group-hover:text-gray-100 group-hover:transform group-hover:scale-105'
                        : 'text-gray-400 group-hover:text-gray-600 group-hover:transform group-hover:scale-105'
                  }`}
                >
                  {link.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block truncate text-sm">
                    {link.label}
                  </span>
                  <p
                    className={`text-xs mt-0.5 truncate leading-tight ${
                      isActive
                        ? darkMode
                          ? 'text-green-200/80'
                          : 'text-green-600/80'
                        : darkMode
                          ? 'text-gray-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {link.description}
                  </p>
                </div>

                {/* Hover indicator */}
                <div
                  className={`absolute inset-0 rounded-lg transition-opacity duration-200 ${
                    darkMode ? 'bg-green-400/10' : 'bg-green-500/5'
                  } opacity-0 group-hover:opacity-100`}
                  aria-hidden="true"
                ></div>
              </Link>
            );
          })}
        </nav>

        {/* Sticky Alert at Bottom */}
        <div className="p-3.5 border-t border-gray-200 dark:border-gray-700">
          <StickyAlert
            message="⚠ Moisture level critically low in Zone 3"
            type="warning"
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

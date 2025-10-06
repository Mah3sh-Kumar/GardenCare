import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, setThemeDirectly } = useTheme();
  const { notifications, unreadCount, clearAllAlerts } = useNotifications();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  // Utility functions for notification display
  const getAlertTitle = (type) => {
    switch (type) {
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      case 'info':
        return 'Information';
      default:
        return 'Notification';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdowns on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Handler for the theme toggle
  const handleToggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeDirectly(newTheme);
  };

  // Handler for logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handler for clearing all notifications
  const clearAllNotifications = async () => {
    try {
      await clearAllAlerts();
      setShowNotifications(false);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  return (
    <header
      className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} border-b shadow-soft sticky top-0 z-30 backdrop-blur-sm bg-opacity-95`}
    >
      <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className={`mr-3 lg:hidden p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            aria-label="Toggle sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1
            className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} flex items-center`}
          >
            <span className="mr-2" aria-hidden="true">
              🌿
            </span>
            <span className="hidden xs:inline">GardenCare</span>
            <span className="xs:hidden">GardenCare</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-yellow-300 hover:text-yellow-200 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            aria-label="Toggle dark mode"
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              className={`relative p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
              onClick={() => setShowNotifications((prev) => !prev)}
              aria-label="View notifications"
              aria-haspopup="true"
              aria-expanded={showNotifications ? 'true' : 'false'}
            >
              <span className="sr-only">View notifications</span>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                className={`origin-top-right absolute right-0 mt-2 w-80 max-w-xs rounded-lg shadow-soft z-50 border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
                tabIndex={-1}
              >
                <div className="py-3 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span
                    className={`font-semibold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
                  >
                    Notifications ({unreadCount} unread)
                  </span>
                  <button
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowNotifications(false)}
                    aria-label="Close notifications"
                  >
                    ✕
                  </button>
                </div>
                <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif, idx) => {
                      // Transform notification data for display
                      const displayNotif = {
                        id: notif.id || idx,
                        title: getAlertTitle(notif.type),
                        description: notif.message,
                        time: formatTimeAgo(notif.timestamp),
                        read: notif.is_read,
                        icon: getAlertIcon(notif.type),
                        type: notif.type
                      };
                      
                      return (
                      <li
                        key={displayNotif.id}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer border-l-4 ${
                          !displayNotif.read 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-transparent'
                        }`}
                      >
                        <span className="mt-1 text-lg flex-shrink-0" aria-hidden="true">
                          {displayNotif.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div
                              className={`text-sm font-medium truncate pr-2 ${
                                displayNotif.read 
                                  ? 'text-gray-500 dark:text-gray-400' 
                                  : theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}
                            >
                              {displayNotif.title}
                            </div>
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                              {displayNotif.time}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {displayNotif.description}
                          </div>
                        </div>
                        {!displayNotif.read && (
                          <span
                            className="ml-1 mt-2 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"
                            aria-hidden="true"
                          ></span>
                        )}
                      </li>
                    )})
                  ) : (
                    <li className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <span className="text-4xl" aria-hidden="true">🌿</span>
                        <div className="text-center">
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                            All caught up!
                          </p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                            No new notifications at the moment
                          </p>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
                {unreadCount > 0 && (
                  <div className="py-2 px-4 border-t border-gray-200 dark:border-gray-700 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllNotifications}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className={`flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User menu"
              aria-haspopup="true"
              aria-expanded={showProfileMenu ? 'true' : 'false'}
            >
              <span className="sr-only">Open user menu</span>
              <div
                className={`h-8 w-8 rounded-full ${theme === 'dark' ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800'} flex items-center justify-center font-medium`}
              >
                {user ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
            </button>

            {showProfileMenu && (
              <div
                className={`origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-soft border z-50 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="py-1">
                  <div
                    className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} border-b border-gray-200 dark:border-gray-600`}
                  >
                    <div className="font-medium truncate">{user?.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Signed in
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-200 hover:bg-gray-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-200 hover:bg-gray-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Header from '../Header';
import Sidebar from '../Sidebar';

const AuthenticatedLayout = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when window is resized to larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    const closeSidebarOnRouteChange = () => {
      if (window.innerWidth < 1024) { // lg breakpoint
        setSidebarOpen(false);
      }
    };

    // We'll use a simple approach for now, but in a real app you might want to listen to route changes
    closeSidebarOnRouteChange();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-green-50/30'}`}>
      {/* Header */}
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Layout Container */}
      <div className="flex flex-1 lg:h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-transparent'} lg:h-[calc(100vh-4rem)]`}>
          <div className="p-4 sm:p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;
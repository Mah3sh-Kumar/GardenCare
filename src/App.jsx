import React, { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Import Dashboard directly to avoid dynamic import issues during development
import Dashboard from './components/Dashboard';

// Lazy load other components with fallback handling
const PlantsPage = React.lazy(() => import('./pages/PlantsPage'));
const WateringSchedulePage = React.lazy(() => import('./pages/WateringSchedulePage'));
const SensorsPage = React.lazy(() => import('./pages/SensorsPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const SystemPage = React.lazy(() => import('./pages/SystemPage'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ToastProvider>
              <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route path="/" element={<AuthenticatedLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route 
                    path="dashboard" 
                    element={<Dashboard />}
                  />
                  <Route 
                    path="plants" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <PlantsPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="schedule" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <WateringSchedulePage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="sensors" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SensorsPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="analytics" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AnalyticsPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="system" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SystemPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="settings" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SettingsPage />
                      </Suspense>
                    } 
                  />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </ToastProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  </ErrorBoundary>
);
}

export default App;

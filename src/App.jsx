import React, { Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Import Dashboard directly to avoid dynamic import issues during development
import Dashboard from './components/Dashboard';

// Lazy load other components with fallback handling
const PlantsPage = React.lazy(() => 
  import('./pages/PlantsPage').catch(() => ({ default: () => <div>Page not available</div> }))
);
const WateringSchedulePage = React.lazy(() => 
  import('./pages/WateringSchedulePage').catch(() => ({ default: () => <div>Page not available</div> }))
);
const SensorsPage = React.lazy(() => 
  import('./pages/SensorsPage').catch(() => ({ default: () => <div>Page not available</div> }))
);
const AnalyticsPage = React.lazy(() => 
  import('./pages/AnalyticsPage').catch(() => ({ default: () => <div>Page not available</div> }))
);
const SettingsPage = React.lazy(() => 
  import('./pages/SettingsPage').catch(() => ({ default: () => <div>Page not available</div> }))
);
const SystemPage = React.lazy(() => 
  import('./pages/SystemPage').catch(() => ({ default: () => <div>Page not available</div> }))
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

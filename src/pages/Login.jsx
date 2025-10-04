import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error: authError } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Use auth error if available
  const displayError = error || authError;

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      // Provide more specific error messages
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message.includes('Supabase client not initialized')) {
        setError(
          'Authentication service is not properly configured. Please contact support.',
        );
      } else {
        setError(
          err.message ||
            'Failed to login. Please check your credentials and try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'
      }`}
    >
      <div
        className={`max-w-md w-full space-y-8 ${isDark ? 'bg-gray-800' : 'bg-white'} p-6 sm:p-8 rounded-2xl shadow-soft border ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <span className="text-4xl animate-pulse" aria-hidden="true">
              🌿
            </span>
          </div>
          <h1
            className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}
          >
            Welcome Back to GardenCare
          </h1>
          <h2
            className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Sign in to monitor your smart garden 🌱
          </h2>
        </div>

        {displayError && (
          <div
            className={`p-4 rounded-lg border-l-4 border-red-500 ${
              isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
            }`}
            role="alert"
          >
            <div className="flex items-center">
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">{displayError}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500 placeholder-gray-500'
                }`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                aria-describedby={displayError ? 'login-error' : undefined}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`w-full px-4 py-3 pr-12 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500 placeholder-gray-500'
                  }`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  aria-describedby={displayError ? 'login-error' : undefined}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                    isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 ${
                loading || !email || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform hover:-translate-y-0.5 hover:shadow-lg'
              }`}
              aria-describedby={displayError ? 'login-error' : undefined}
            >
              {loading ? (
                <>
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"
                    aria-hidden="true"
                  ></div>
                  Signing you in...
                </>
              ) : (
                <>
                  <span className="mr-2">🔑</span>
                  Sign in to Dashboard
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center space-y-4">
          <p
            className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Don't have an account?{' '}
            <RouterLink
              to="/signup"
              className={`font-medium transition-colors ${isDark
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-green-600 hover:text-green-500'
                } underline underline-offset-2`}
            >
              Create your garden account 🌱
            </RouterLink>
          </p>
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} space-y-1`}>
            <p>📊 Monitor sensors in real-time</p>
            <p>💧 Automate watering schedules</p>
            <p>🌿 Track plant health & growth</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

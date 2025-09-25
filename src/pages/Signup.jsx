import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { signup, error: authError } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Use auth error if available
  const displayError = error || authError;

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const { data, error } = await signup(email, password);

      if (error) throw error;

      setSuccessMsg('Success! Please check your email for verification link.');

      // In development, we might want to redirect directly
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Signup error:', err);
      // Provide more specific error messages
      if (err.message.includes('User already registered')) {
        setError('An account with this email already exists.');
      } else if (err.message.includes('Supabase client not initialized')) {
        setError(
          'Authentication service is not properly configured. Please contact support.',
        );
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
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
          <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl" aria-hidden="true">
              🌿
            </span>
          </div>
          <h1
            className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Create Account
          </h1>
          <h2
            className={`mt-2 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Sign up for your GardenCare account
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

        {successMsg && (
          <div
            className={`p-4 rounded-lg border-l-4 border-green-500 ${
              isDark
                ? 'bg-green-900/20 text-green-300'
                : 'bg-green-50 text-green-700'
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
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
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500 placeholder-gray-500'
                }`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className={`block text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                } mb-2`}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500 placeholder-gray-500'
                }`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || successMsg}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors ${
                loading || successMsg
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              }`}
            >
              {loading ? (
                <>
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"
                    aria-hidden="true"
                  ></div>
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p
            className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className={`font-medium transition-colors ${
                isDark
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-green-600 hover:text-green-500'
              }`}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

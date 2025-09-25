import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';

// Create the auth context
export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing user on mount
  useEffect(() => {
    async function loadUser() {
      try {
        // Check if supabase client is initialized
        if (!supabase) {
          throw new Error(
            'Supabase client not initialized. Check your environment variables.',
          );
        }

        const { user: currentUser, error } = await getCurrentUser();
        if (error) throw error;
        setUser(currentUser);
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // Initial user load
    loadUser();

    // Only subscribe to auth changes if supabase is initialized
    if (supabase) {
      // Subscribe to auth changes
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
          }
          setLoading(false);
        },
      );

      // Cleanup subscription
      return () => {
        if (authListener?.subscription?.unsubscribe) {
          authListener.subscription.unsubscribe();
        }
      };
    } else {
      setLoading(false);
    }
  }, []);

  // Auth functions
  const login = async (email, password) => {
    try {
      // Check if supabase client is initialized
      if (!supabase) {
        throw new Error(
          'Supabase client not initialized. Check your environment variables.',
        );
      }

      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    try {
      // Check if supabase client is initialized
      if (!supabase) {
        throw new Error(
          'Supabase client not initialized. Check your environment variables.',
        );
      }

      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Check if supabase client is initialized
      if (!supabase) {
        throw new Error(
          'Supabase client not initialized. Check your environment variables.',
        );
      }

      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

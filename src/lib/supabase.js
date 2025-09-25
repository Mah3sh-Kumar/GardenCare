import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client with enhanced configuration for v2 compatibility
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'farmflow-dashboard/1.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
}) : null;

// Function to create a fresh Supabase client for special cases
// This is needed for components that need a separate client instance
export const createFreshClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Cannot create fresh client: Missing Supabase environment variables');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'farmflow-dashboard/1.0.0'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 20
      }
    }
  });
};

// Authentication functions
export const signIn = async (email, password) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized. Check your environment variables.') };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email, password) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized. Check your environment variables.') };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) {
    return { error: new Error('Supabase client not initialized. Check your environment variables.') };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  if (!supabase) {
    return { user: null, error: new Error('Supabase client not initialized. Check your environment variables.') };
  }
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
};

// Real-time subscription helpers
export const createRealtimeSubscription = (table, callback, filter = null) => {
  if (!supabase) {
    console.error('Cannot create subscription: Supabase client not initialized');
    return null;
  }

  let subscription = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        ...(filter && { filter: filter })
      },
      (payload) => {
        console.log(`Real-time update for ${table}:`, payload);
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
};

// Helper to unsubscribe from real-time updates
export const unsubscribeRealtimeSubscription = (subscription) => {
  if (subscription && supabase) {
    supabase.removeChannel(subscription);
  }
};

// Database query helpers with optimized RLS support
export const queryWithAuth = async (tableName, query) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await query;
  return { data, error, user };
};

// Enhanced error handling for common Supabase v2 issues
export const handleSupabaseError = (error) => {
  if (!error) return null;

  // Common error patterns and user-friendly messages
  const errorPatterns = {
    'JWT expired': 'Your session has expired. Please sign in again.',
    'Invalid JWT': 'Authentication error. Please sign in again.',
    'Row Level Security': 'You do not have permission to access this data.',
    'column does not exist': 'Database schema error. Please contact support.',
    'relation does not exist': 'Database table not found. Please contact support.'
  };

  for (const [pattern, message] of Object.entries(errorPatterns)) {
    if (error.message.includes(pattern)) {
      return { ...error, userMessage: message };
    }
  }

  return { ...error, userMessage: 'An unexpected error occurred. Please try again.' };
};

// Function to force schema refresh by creating a fresh client
// This helps resolve schema caching issues that can occur with Supabase
export const forceSchemaRefresh = async () => {
  try {
    // Create a fresh client to bypass schema cache
    const freshClient = createFreshClient();
    
    if (!freshClient) {
      return { success: false, error: new Error('Failed to create fresh client') };
    }

    // Test the fresh client by querying a simple table
    const { data, error } = await freshClient
      .from('devices')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Schema refresh test failed:', error);
      return { success: false, error };
    }

    console.log('Schema refresh successful');
    return { success: true, data };
  } catch (error) {
    console.error('Error during schema refresh:', error);
    return { success: false, error };
  }
};

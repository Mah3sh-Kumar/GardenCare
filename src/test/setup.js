import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase client globally
const createMockQuery = () => {
  const query = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn()
  };
  
  // Methods that should return promises (terminal operations)
  query.select.mockResolvedValue({ data: [], error: null });
  query.insert.mockResolvedValue({ data: [], error: null });
  query.single.mockResolvedValue({ data: null, error: null });
  
  // Methods that should return the query object for chaining (non-terminal operations)
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  
  return query;
};

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }))
  },
  from: vi.fn(() => createMockQuery()),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    unsubscribe: vi.fn()
  })),
  removeChannel: vi.fn()
};

// Mock the Supabase module
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Make mock available globally for tests
global.mockSupabaseClient = mockSupabaseClient;

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
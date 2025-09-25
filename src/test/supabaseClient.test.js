import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the actual implementations to test
let supabase, signUp, signIn, signOut, getCurrentUser;

describe('supabaseClient', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import fresh modules after clearing mocks
    const module = await import('../lib/supabaseClient');
    supabase = module.supabase;
    signUp = module.signUp;
    signIn = module.signIn;
    signOut = module.signOut;
    getCurrentUser = module.getCurrentUser;
  });

  describe('supabase client', () => {
    it('should export a supabase client instance', () => {
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.from).toBeDefined();
    });

    it('should have auth methods available', () => {
      expect(typeof supabase.auth.signUp).toBe('function');
      expect(typeof supabase.auth.signInWithPassword).toBe('function');
      expect(typeof supabase.auth.signOut).toBe('function');
    });

    it('should have database query methods available', () => {
      const query = supabase.from('test_table');
      expect(query).toBeDefined();
      expect(typeof query.select).toBe('function');
      expect(typeof query.insert).toBe('function');
      expect(typeof query.update).toBe('function');
      expect(typeof query.delete).toBe('function');
    });
  });

  describe('authentication helpers', () => {
    describe('signUp', () => {
      it('should call supabase auth signUp with correct parameters', async () => {
        const mockResponse = { data: { user: { id: '123' } }, error: null };
        global.mockSupabaseClient.auth.signUp.mockResolvedValue(mockResponse);

        const email = 'test@example.com';
        const password = 'testpassword';
        const result = await signUp(email, password);

        expect(global.mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email,
          password
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle signUp errors', async () => {
        const mockError = { data: null, error: { message: 'Invalid email' } };
        global.mockSupabaseClient.auth.signUp.mockResolvedValue(mockError);

        const result = await signUp('invalid-email', 'password');

        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('Invalid email');
      });
    });

    describe('signIn', () => {
      it('should call supabase auth signInWithPassword with correct parameters', async () => {
        const mockResponse = { data: { user: { id: '123' } }, error: null };
        global.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(mockResponse);

        const email = 'test@example.com';
        const password = 'testpassword';
        const result = await signIn(email, password);

        expect(global.mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email,
          password
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle signIn errors', async () => {
        const mockError = { data: null, error: { message: 'Invalid credentials' } };
        global.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(mockError);

        const result = await signIn('test@example.com', 'wrongpassword');

        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('Invalid credentials');
      });
    });

    describe('signOut', () => {
      it('should call supabase auth signOut', async () => {
        const mockResponse = { error: null };
        global.mockSupabaseClient.auth.signOut.mockResolvedValue(mockResponse);

        const result = await signOut();

        expect(global.mockSupabaseClient.auth.signOut).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCurrentUser', () => {
      it('should call supabase auth getUser', async () => {
        const mockResponse = { data: { user: { id: '123', email: 'test@example.com' } }, error: null };
        global.mockSupabaseClient.auth.getUser.mockResolvedValue(mockResponse);

        const result = await getCurrentUser();

        expect(global.mockSupabaseClient.auth.getUser).toHaveBeenCalled();
        // The actual implementation returns { user: data?.user, error }
        expect(result).toEqual({ user: { id: '123', email: 'test@example.com' }, error: null });
      });

      it('should handle getCurrentUser errors', async () => {
        const mockError = { data: { user: null }, error: { message: 'User not found' } };
        global.mockSupabaseClient.auth.getUser.mockResolvedValue(mockError);

        const result = await getCurrentUser();

        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('User not found');
      });
    });
  });

  describe('database operations', () => {
    it('should perform select queries', async () => {
      const mockQuery = global.mockSupabaseClient.from('sensor_data');
      mockQuery.select.mockResolvedValue({ data: [{ id: 1 }], error: null });
      
      const result = await mockQuery.select('*');
      
      expect(global.mockSupabaseClient.from).toHaveBeenCalledWith('sensor_data');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(result.data).toEqual([{ id: 1 }]);
    });

    it('should perform insert operations', async () => {
      const data = { temperature: 25.5, humidity: 60 };
      const mockQuery = global.mockSupabaseClient.from('sensor_data');
      mockQuery.insert.mockResolvedValue({ data: [{ id: 1, ...data }], error: null });
      
      const result = await mockQuery.insert(data);
      
      expect(global.mockSupabaseClient.from).toHaveBeenCalledWith('sensor_data');
      expect(mockQuery.insert).toHaveBeenCalledWith(data);
      expect(result.data[0]).toMatchObject(data);
    });

    it('should perform chained operations', async () => {
      const data = { name: 'Updated Zone' };
      const mockQuery = global.mockSupabaseClient.from('zones');
      
      // Simulate chaining by returning the query object from update and eq
      const updateResult = mockQuery.update(data);
      expect(updateResult).toBe(mockQuery); // Should return the query object for chaining
      
      const eqResult = updateResult.eq('id', 1);
      expect(eqResult).toBe(mockQuery); // Should return the query object for chaining
      
      expect(global.mockSupabaseClient.from).toHaveBeenCalledWith('zones');
      expect(mockQuery.update).toHaveBeenCalledWith(data);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1);
    });

    it('should perform delete operations', async () => {
      const mockQuery = global.mockSupabaseClient.from('zones');
      
      // Simulate chaining
      const deleteResult = mockQuery.delete();
      expect(deleteResult).toBe(mockQuery);
      
      const eqResult = deleteResult.eq('id', 1);
      expect(eqResult).toBe(mockQuery);
      
      expect(global.mockSupabaseClient.from).toHaveBeenCalledWith('zones');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1);
    });
  });
});
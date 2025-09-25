import { supabase } from '../lib/supabaseClient';

// Profile Service for managing user profiles
export class ProfileService {
  // Fetch user profile
  static async fetchProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Try to fetch existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create one
      if (profileError && profileError.code === 'PGRST116') {
        // No profile found, create a new one
        const defaultName = user.email?.split('@')[0] || 'Garden Enthusiast';
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: defaultName,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newProfile;
      } else if (profileError) {
        throw profileError;
      }

      return profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(name) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update({
            name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  // Ensure profile exists (create if it doesn't)
  static async ensureProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code === 'PGRST116') {
        // No profile found, create a new one
        const defaultName = user.email?.split('@')[0] || 'Garden Enthusiast';
        const { data, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: defaultName,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return data;
      } else if (selectError) {
        throw selectError;
      }

      return existingProfile;
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      throw error;
    }
  }
}

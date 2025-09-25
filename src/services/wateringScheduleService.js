import { supabase, queryWithAuth, handleSupabaseError } from '../lib/supabase';

// Watering Schedule Service with real-time capabilities
export class WateringScheduleService {
  // Fetch all watering schedules with zone details
  static async fetchWateringSchedules() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('watering_schedules')
        .select(
          `
          id,
          name,
          cron_expression,
          duration,
          is_active,
          created_at,
          zone_id,
          zones (
            id,
            name, 
            soil_type,
            description
          )
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching watering schedules:', handledError);
        throw handledError;
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchWateringSchedules:', error);
      return [];
    }
  }

  // Create a new watering schedule
  static async createWateringSchedule(scheduleData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('watering_schedules')
        .insert([
          {
            zone_id: scheduleData.zone_id,
            name: scheduleData.name,
            cron_expression: scheduleData.cron_expression,
            duration: scheduleData.duration,
            is_active:
              scheduleData.is_active !== undefined
                ? scheduleData.is_active
                : true,
            user_id: user.id,
          },
        ])
        .select(
          `
          id,
          name,
          cron_expression,
          duration,
          is_active,
          created_at,
          zone_id,
          zones (
            id,
            name, 
            soil_type,
            description
          )
        `,
        )
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error creating watering schedule:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in createWateringSchedule:', error);
      throw error;
    }
  }

  // Update an existing watering schedule
  static async updateWateringSchedule(scheduleId, updates) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('watering_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .eq('user_id', user.id)
        .select(
          `
          id,
          name,
          cron_expression,
          duration,
          is_active,
          created_at,
          zone_id,
          zones (
            id,
            name, 
            soil_type,
            description
          )
        `,
        )
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error updating watering schedule:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in updateWateringSchedule:', error);
      throw error;
    }
  }

  // Delete a watering schedule
  static async deleteWateringSchedule(scheduleId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('watering_schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error deleting watering schedule:', handledError);
        throw handledError;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteWateringSchedule:', error);
      throw error;
    }
  }

  // Toggle schedule active status
  static async toggleScheduleStatus(scheduleId, isActive) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('watering_schedules')
        .update({ is_active: isActive })
        .eq('id', scheduleId)
        .eq('user_id', user.id)
        .select(
          `
          id,
          name,
          cron_expression,
          duration,
          is_active,
          created_at,
          zone_id,
          zones (
            id,
            name, 
            soil_type,
            description
          )
        `,
        )
        .single();

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error toggling schedule status:', handledError);
        throw handledError;
      }

      return data;
    } catch (error) {
      console.error('Error in toggleScheduleStatus:', error);
      throw error;
    }
  }

  // Get zones for dropdown
  static async fetchZones() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zones')
        .select('id, name, description, soil_type')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        const handledError = handleSupabaseError(error);
        console.error('Error fetching zones:', handledError);
        throw handledError;
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchZones:', error);
      return [];
    }
  }

  // Real-time subscription for watering schedules
  static subscribeToWateringSchedules(callback) {
    if (!supabase) {
      console.error(
        'Cannot create subscription: Supabase client not initialized',
      );
      return null;
    }

    const subscription = supabase
      .channel('watering_schedules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watering_schedules',
        },
        (payload) => {
          console.log('Watering schedule change:', payload);
          callback(payload);
        },
      )
      .subscribe();

    return subscription;
  }

  // Unsubscribe from watering schedules
  static unsubscribe(subscription) {
    if (subscription && supabase) {
      supabase.removeChannel(subscription);
    }
  }

  // Convert frequency to cron expression
  static frequencyToCron(frequency) {
    switch (frequency) {
      case 'Daily':
        return '0 7 * * *'; // Every day at 7 AM
      case 'Every 2 days':
        return '0 7 */2 * *'; // Every 2 days at 7 AM
      case 'Every 3 days':
        return '0 7 */3 * *'; // Every 3 days at 7 AM
      case 'Weekly':
        return '0 7 * * 0'; // Every Sunday at 7 AM
      default:
        return '0 7 * * *'; // Default to daily
    }
  }

  // Convert cron expression to user-friendly frequency
  static cronToFrequency(cronExpression) {
    switch (cronExpression) {
      case '0 7 * * *':
        return 'Daily';
      case '0 7 */2 * *':
        return 'Every 2 days';
      case '0 7 */3 * *':
        return 'Every 3 days';
      case '0 7 * * 0':
        return 'Weekly';
      default:
        return cronExpression; // Return as-is if not recognized
    }
  }

  // Get frequency options for dropdown
  static getFrequencyOptions() {
    return ['Daily', 'Every 2 days', 'Every 3 days', 'Weekly'];
  }
}

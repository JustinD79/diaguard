import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id?: string;
  user_id: string;
  full_name?: string;
  date_of_birth?: string;
  phone?: string;
  height?: string;
  weight?: string;
  diabetes_type?: 'type1' | 'type2' | 'gestational' | 'prediabetes' | 'none';
  diagnosis_date?: string;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmergencyContact {
  id?: string;
  user_id: string;
  name: string;
  relationship: string;
  phone: string;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export class UserProfileService {
  // Profile Management
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  static async createOrUpdateProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profile, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  // Emergency Contacts Management
  static async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      throw new Error('Failed to fetch emergency contacts');
    }
  }

  static async addEmergencyContact(contact: Omit<EmergencyContact, 'id' | 'created_at' | 'updated_at'>): Promise<EmergencyContact> {
    try {
      // If setting as primary, unset other primary contacts
      if (contact.is_primary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', contact.user_id);
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert(contact)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw new Error('Failed to add emergency contact');
    }
  }

  static async updateEmergencyContact(id: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact> {
    try {
      // If setting as primary, unset other primary contacts
      if (updates.is_primary) {
        const { data: contact } = await supabase
          .from('emergency_contacts')
          .select('user_id')
          .eq('id', id)
          .single();

        if (contact) {
          await supabase
            .from('emergency_contacts')
            .update({ is_primary: false })
            .eq('user_id', contact.user_id)
            .neq('id', id);
        }
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      throw new Error('Failed to update emergency contact');
    }
  }

  static async deleteEmergencyContact(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw new Error('Failed to delete emergency contact');
    }
  }
}
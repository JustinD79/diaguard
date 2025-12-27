import { supabase } from '@/lib/supabase';

/**
 * Family Profile Service
 * FDA-SAFE: Manages family profiles for meal sharing and awareness
 * Does NOT share medical data or treatment plans
 */

export interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyProfile {
  id: string;
  family_group_id: string;
  user_id: string | null;
  name: string;
  date_of_birth: string | null;
  relationship: string | null;
  avatar_url: string | null;
  is_primary: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProfilePermissions {
  id: string;
  family_group_id: string;
  profile_id: string;
  granted_by: string;
  can_view_meals: boolean;
  can_view_reports: boolean;
  can_edit_profile: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealShare {
  id: string;
  meal_id: string;
  family_group_id: string;
  shared_by: string;
  shared_with_profile_id: string | null;
  created_at: string;
}

export interface FamilyGroupWithProfiles extends FamilyGroup {
  profiles: FamilyProfile[];
  member_count: number;
}

export class FamilyProfileService {
  /**
   * Create a new family group
   */
  static async createFamilyGroup(userId: string, name: string): Promise<FamilyGroup> {
    const { data, error } = await supabase
      .from('family_groups')
      .insert({
        name,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all family groups for a user
   */
  static async getUserFamilyGroups(userId: string): Promise<FamilyGroupWithProfiles[]> {
    const { data, error } = await supabase
      .from('family_groups')
      .select(
        `
        *,
        profiles:family_profiles(*)
      `
      )
      .or(`created_by.eq.${userId},profiles.user_id.eq.${userId}`);

    if (error) throw error;

    return (data || []).map(group => ({
      ...group,
      profiles: group.profiles || [],
      member_count: (group.profiles || []).length,
    }));
  }

  /**
   * Get a specific family group with profiles
   */
  static async getFamilyGroup(groupId: string): Promise<FamilyGroupWithProfiles | null> {
    const { data, error } = await supabase
      .from('family_groups')
      .select(
        `
        *,
        profiles:family_profiles(*)
      `
      )
      .eq('id', groupId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      profiles: data.profiles || [],
      member_count: (data.profiles || []).length,
    };
  }

  /**
   * Update family group name
   */
  static async updateFamilyGroup(groupId: string, name: string): Promise<FamilyGroup> {
    const { data, error } = await supabase
      .from('family_groups')
      .update({ name })
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a family group
   */
  static async deleteFamilyGroup(groupId: string): Promise<void> {
    const { error } = await supabase.from('family_groups').delete().eq('id', groupId);

    if (error) throw error;
  }

  /**
   * Add a profile to a family group
   */
  static async addFamilyProfile(
    familyGroupId: string,
    profileData: {
      name: string;
      date_of_birth?: string;
      relationship?: string;
      avatar_url?: string;
      user_id?: string;
      is_primary?: boolean;
      preferences?: Record<string, any>;
    }
  ): Promise<FamilyProfile> {
    const { data, error } = await supabase
      .from('family_profiles')
      .insert({
        family_group_id: familyGroupId,
        ...profileData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all profiles in a family group
   */
  static async getFamilyProfiles(familyGroupId: string): Promise<FamilyProfile[]> {
    const { data, error } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('family_group_id', familyGroupId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update a family profile
   */
  static async updateFamilyProfile(
    profileId: string,
    updates: Partial<FamilyProfile>
  ): Promise<FamilyProfile> {
    const { data, error } = await supabase
      .from('family_profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a family profile
   */
  static async deleteFamilyProfile(profileId: string): Promise<void> {
    const { error } = await supabase.from('family_profiles').delete().eq('id', profileId);

    if (error) throw error;
  }

  /**
   * Set permissions for a family profile
   */
  static async setProfilePermissions(
    familyGroupId: string,
    profileId: string,
    grantedBy: string,
    permissions: {
      can_view_meals: boolean;
      can_view_reports: boolean;
      can_edit_profile: boolean;
    }
  ): Promise<ProfilePermissions> {
    const { data, error } = await supabase
      .from('family_profile_permissions')
      .upsert(
        {
          family_group_id: familyGroupId,
          profile_id: profileId,
          granted_by: grantedBy,
          ...permissions,
        },
        {
          onConflict: 'family_group_id,profile_id',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get permissions for a profile
   */
  static async getProfilePermissions(profileId: string): Promise<ProfilePermissions | null> {
    const { data, error } = await supabase
      .from('family_profile_permissions')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Share a meal with family
   */
  static async shareMealWithFamily(
    mealId: string,
    familyGroupId: string,
    sharedBy: string,
    sharedWithProfileId?: string
  ): Promise<MealShare> {
    const { data, error } = await supabase
      .from('family_meal_shares')
      .insert({
        meal_id: mealId,
        family_group_id: familyGroupId,
        shared_by: sharedBy,
        shared_with_profile_id: sharedWithProfileId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get shared meals for a family group
   */
  static async getSharedMeals(familyGroupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('family_meal_shares')
      .select(
        `
        *,
        meal:meal_logs(*),
        shared_by_user:auth.users!family_meal_shares_shared_by_fkey(email),
        profile:family_profiles(name)
      `
      )
      .eq('family_group_id', familyGroupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Unshare a meal
   */
  static async unshareMeal(shareId: string): Promise<void> {
    const { error } = await supabase.from('family_meal_shares').delete().eq('id', shareId);

    if (error) throw error;
  }

  /**
   * Check if user can view a profile's meals
   */
  static async canViewProfileMeals(
    userId: string,
    profileId: string
  ): Promise<boolean> {
    // Check if user is family creator or has explicit permission
    const { data: profile } = await supabase
      .from('family_profiles')
      .select('family_group_id, user_id')
      .eq('id', profileId)
      .single();

    if (!profile) return false;

    // User's own profile
    if (profile.user_id === userId) return true;

    // Check if user is family creator
    const { data: group } = await supabase
      .from('family_groups')
      .select('created_by')
      .eq('id', profile.family_group_id)
      .single();

    if (group?.created_by === userId) return true;

    // Check explicit permissions
    const { data: permissions } = await supabase
      .from('family_profile_permissions')
      .select('can_view_meals')
      .eq('profile_id', profileId)
      .maybeSingle();

    return permissions?.can_view_meals || false;
  }

  /**
   * Get family statistics (FDA-safe, descriptive only)
   */
  static async getFamilyStatistics(
    familyGroupId: string,
    daysBack: number = 7
  ): Promise<{
    total_shared_meals: number;
    profiles_count: number;
    recent_shares: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const [sharedMeals, profiles] = await Promise.all([
      supabase
        .from('family_meal_shares')
        .select('id, created_at')
        .eq('family_group_id', familyGroupId),
      supabase
        .from('family_profiles')
        .select('id')
        .eq('family_group_id', familyGroupId),
    ]);

    const recentShares = (sharedMeals.data || []).filter(
      share => new Date(share.created_at) >= startDate
    ).length;

    return {
      total_shared_meals: (sharedMeals.data || []).length,
      profiles_count: (profiles.data || []).length,
      recent_shares: recentShares,
    };
  }

  /**
   * Calculate age from date of birth
   */
  static calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Generate family summary (FDA-safe)
   */
  static generateFamilySummary(group: FamilyGroupWithProfiles): string {
    const lines: string[] = [];

    lines.push(`👨‍👩‍👧‍👦 ${group.name}`);
    lines.push(`Members: ${group.member_count}`);
    lines.push('');

    if (group.profiles.length > 0) {
      lines.push('Family Members:');
      group.profiles.forEach(profile => {
        const age = profile.date_of_birth
          ? ` (${this.calculateAge(profile.date_of_birth)}yo)`
          : '';
        const relationship = profile.relationship ? ` - ${profile.relationship}` : '';
        lines.push(`• ${profile.name}${age}${relationship}`);
      });
    }

    return lines.join('\n');
  }
}

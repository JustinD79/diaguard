import { supabase } from '../lib/supabase';

export interface Achievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_type: 'logging_streak' | 'meal_milestone' | 'exercise' | 'hydration' | 'special';
  icon: string;
  earned_at: string;
  metadata?: Record<string, any>;
}

export interface UserStats {
  id: string;
  user_id: string;
  current_streak_days: number;
  longest_streak_days: number;
  total_meals_logged: number;
  total_scans: number;
  total_exercise_minutes: number;
  last_login: string;
  updated_at: string;
}

export class AchievementService {
  static readonly ACHIEVEMENTS = {
    FIRST_MEAL: {
      id: 'first_meal',
      name: 'First Meal Logged',
      description: 'Log your first meal',
      type: 'meal_milestone' as const,
      icon: 'utensils',
    },
    MEALS_10: {
      id: 'meals_10',
      name: '10 Meals Logged',
      description: 'Log 10 meals',
      type: 'meal_milestone' as const,
      icon: 'award',
    },
    MEALS_50: {
      id: 'meals_50',
      name: '50 Meals Logged',
      description: 'Log 50 meals',
      type: 'meal_milestone' as const,
      icon: 'star',
    },
    MEALS_100: {
      id: 'meals_100',
      name: '100 Meals Logged',
      description: 'Log 100 meals',
      type: 'meal_milestone' as const,
      icon: 'trophy',
    },
    STREAK_3: {
      id: 'streak_3',
      name: '3-Day Streak',
      description: 'Log meals for 3 consecutive days',
      type: 'logging_streak' as const,
      icon: 'flame',
    },
    STREAK_7: {
      id: 'streak_7',
      name: '7-Day Streak',
      description: 'Log meals for 7 consecutive days',
      type: 'logging_streak' as const,
      icon: 'fire',
    },
    STREAK_30: {
      id: 'streak_30',
      name: '30-Day Streak',
      description: 'Log meals for 30 consecutive days',
      type: 'logging_streak' as const,
      icon: 'rocket',
    },
    EXERCISE_FIRST: {
      id: 'exercise_first',
      name: 'First Workout',
      description: 'Log your first exercise session',
      type: 'exercise' as const,
      icon: 'activity',
    },
    EXERCISE_10_HOURS: {
      id: 'exercise_10_hours',
      name: '10 Hours of Exercise',
      description: 'Complete 10 hours of exercise',
      type: 'exercise' as const,
      icon: 'trending-up',
    },
    HYDRATION_GOAL: {
      id: 'hydration_goal',
      name: 'Hydration Hero',
      description: 'Meet your hydration goal for 7 days',
      type: 'hydration' as const,
      icon: 'droplet',
    },
    EARLY_ADOPTER: {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'One of the first users',
      type: 'special' as const,
      icon: 'zap',
    },
  };

  static async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }
  }

  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return await this.initializeUserStats(userId);
      }

      return data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  static async initializeUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          current_streak_days: 0,
          longest_streak_days: 0,
          total_meals_logged: 0,
          total_scans: 0,
          total_exercise_minutes: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing user stats:', error);
      return null;
    }
  }

  static async awardAchievement(
    userId: string,
    achievementKey: keyof typeof AchievementService.ACHIEVEMENTS,
    metadata?: Record<string, any>
  ): Promise<Achievement | null> {
    try {
      const achievement = this.ACHIEVEMENTS[achievementKey];

      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          achievement_name: achievement.name,
          achievement_description: achievement.description,
          achievement_type: achievement.type,
          icon: achievement.icon,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return null;
    }
  }

  static async checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    try {
      const stats = await this.getUserStats(userId);
      if (!stats) return newAchievements;

      const existingAchievements = await this.getUserAchievements(userId);
      const earnedIds = new Set(existingAchievements.map(a => a.achievement_id));

      if (stats.total_meals_logged === 1 && !earnedIds.has('first_meal')) {
        const achievement = await this.awardAchievement(userId, 'FIRST_MEAL');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.total_meals_logged >= 10 && !earnedIds.has('meals_10')) {
        const achievement = await this.awardAchievement(userId, 'MEALS_10');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.total_meals_logged >= 50 && !earnedIds.has('meals_50')) {
        const achievement = await this.awardAchievement(userId, 'MEALS_50');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.total_meals_logged >= 100 && !earnedIds.has('meals_100')) {
        const achievement = await this.awardAchievement(userId, 'MEALS_100');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.current_streak_days >= 3 && !earnedIds.has('streak_3')) {
        const achievement = await this.awardAchievement(userId, 'STREAK_3');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.current_streak_days >= 7 && !earnedIds.has('streak_7')) {
        const achievement = await this.awardAchievement(userId, 'STREAK_7');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.current_streak_days >= 30 && !earnedIds.has('streak_30')) {
        const achievement = await this.awardAchievement(userId, 'STREAK_30');
        if (achievement) newAchievements.push(achievement);
      }

      if (stats.total_exercise_minutes >= 600 && !earnedIds.has('exercise_10_hours')) {
        const achievement = await this.awardAchievement(userId, 'EXERCISE_10_HOURS');
        if (achievement) newAchievements.push(achievement);
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return newAchievements;
    }
  }

  static async updateStreak(userId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: todayMeals } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .limit(1);

      const { data: yesterdayMeals } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())
        .limit(1);

      const stats = await this.getUserStats(userId);
      if (!stats) return;

      let newStreak = stats.current_streak_days;

      if (todayMeals && todayMeals.length > 0) {
        if (yesterdayMeals && yesterdayMeals.length > 0) {
          newStreak += 1;
        } else if (stats.current_streak_days === 0) {
          newStreak = 1;
        }
      } else if (!yesterdayMeals || yesterdayMeals.length === 0) {
        newStreak = 0;
      }

      const longestStreak = Math.max(stats.longest_streak_days, newStreak);

      await supabase
        .from('user_stats')
        .update({
          current_streak_days: newStreak,
          longest_streak_days: longestStreak,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }
}

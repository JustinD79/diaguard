import { supabase } from '../lib/supabase';

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_ml: number;
  beverage_type: 'water' | 'tea' | 'coffee' | 'juice' | 'sports_drink' | 'other';
  created_at: string;
  logged_time: string;
}

export interface HydrationGoal {
  id: string;
  user_id: string;
  daily_goal_ml: number;
  updated_at: string;
}

export interface DailyHydrationSummary {
  date: string;
  total_ml: number;
  goal_ml: number;
  percentage: number;
  logs: HydrationLog[];
  goal_met: boolean;
}

export class HydrationService {
  static async logHydration(
    userId: string,
    amountMl: number,
    beverageType: HydrationLog['beverage_type'] = 'water'
  ): Promise<HydrationLog | null> {
    try {
      const { data, error } = await supabase
        .from('hydration_logs')
        .insert({
          user_id: userId,
          amount_ml: amountMl,
          beverage_type: beverageType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging hydration:', error);
      return null;
    }
  }

  static async getHydrationLogs(
    userId: string,
    date: Date = new Date()
  ): Promise<HydrationLog[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_time', startOfDay.toISOString())
        .lte('logged_time', endOfDay.toISOString())
        .order('logged_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching hydration logs:', error);
      return [];
    }
  }

  static async getDailyHydrationSummary(
    userId: string,
    date: Date = new Date()
  ): Promise<DailyHydrationSummary> {
    try {
      const logs = await this.getHydrationLogs(userId, date);
      const goal = await this.getHydrationGoal(userId);

      const total_ml = logs.reduce((sum, log) => sum + log.amount_ml, 0);
      const percentage = goal.daily_goal_ml > 0
        ? Math.round((total_ml / goal.daily_goal_ml) * 100)
        : 0;

      return {
        date: date.toISOString().split('T')[0],
        total_ml,
        goal_ml: goal.daily_goal_ml,
        percentage,
        logs,
        goal_met: total_ml >= goal.daily_goal_ml,
      };
    } catch (error) {
      console.error('Error getting daily hydration summary:', error);
      return {
        date: date.toISOString().split('T')[0],
        total_ml: 0,
        goal_ml: 2000,
        percentage: 0,
        logs: [],
        goal_met: false,
      };
    }
  }

  static async getHydrationGoal(userId: string): Promise<HydrationGoal> {
    try {
      const { data, error } = await supabase
        .from('daily_hydration_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return await this.setHydrationGoal(userId, 2000);
      }

      return data;
    } catch (error) {
      console.error('Error fetching hydration goal:', error);
      return {
        id: '',
        user_id: userId,
        daily_goal_ml: 2000,
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async setHydrationGoal(
    userId: string,
    goalMl: number
  ): Promise<HydrationGoal> {
    try {
      const { data, error } = await supabase
        .from('daily_hydration_goals')
        .upsert({
          user_id: userId,
          daily_goal_ml: goalMl,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting hydration goal:', error);
      return {
        id: '',
        user_id: userId,
        daily_goal_ml: goalMl,
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async deleteHydrationLog(logId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting hydration log:', error);
      return false;
    }
  }

  static async getWeeklyHydration(userId: string): Promise<DailyHydrationSummary[]> {
    const summaries: DailyHydrationSummary[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const summary = await this.getDailyHydrationSummary(userId, date);
      summaries.push(summary);
    }

    return summaries;
  }

  static getQuickAmounts(): Array<{ label: string; ml: number }> {
    return [
      { label: 'Small Glass', ml: 200 },
      { label: 'Large Glass', ml: 350 },
      { label: 'Water Bottle', ml: 500 },
      { label: 'Large Bottle', ml: 750 },
      { label: '1 Liter', ml: 1000 },
    ];
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface HydrationGoal {
  id: string;
  user_id: string;
  daily_goal_ml: number;
  reminder_frequency_hours: number;
  reminder_enabled: boolean;
  preferred_unit: 'ml' | 'oz' | 'L';
  custom_containers: Array<{ name: string; ml: number }>;
  created_at: string;
  updated_at: string;
}

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  container_type: string;
  notes?: string;
  created_at: string;
}

export interface HydrationAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_intake_ml: number;
  goal_progress_percent: number;
  log_count: number;
  created_at: string;
  updated_at: string;
}

export const HydrationTrackingService = {
  async getOrCreateGoal(userId: string): Promise<HydrationGoal> {
    const { data, error } = await supabase
      .from('hydration_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) return data as HydrationGoal;

    const { data: newGoal, error: createError } = await supabase
      .from('hydration_goals')
      .insert({
        user_id: userId,
        daily_goal_ml: 2000,
        reminder_frequency_hours: 2,
        reminder_enabled: true,
        preferred_unit: 'ml',
      })
      .select()
      .single();

    if (createError) throw createError;
    return newGoal as HydrationGoal;
  },

  async updateGoal(userId: string, updates: Partial<HydrationGoal>): Promise<HydrationGoal> {
    const { data, error } = await supabase
      .from('hydration_goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as HydrationGoal;
  },

  async logWater(userId: string, amount_ml: number, container_type: string, notes?: string): Promise<HydrationLog> {
    const { data, error } = await supabase
      .from('hydration_logs')
      .insert({
        user_id: userId,
        amount_ml,
        container_type,
        notes,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update daily analytics
    await this.updateDailyAnalytics(userId, new Date());

    return data as HydrationLog;
  },

  async getTodayLogs(userId: string): Promise<HydrationLog[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HydrationLog[];
  },

  async getLogsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<HydrationLog[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${start}T00:00:00`)
      .lte('logged_at', `${end}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HydrationLog[];
  },

  async deleteLog(logId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('hydration_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) throw error;

    // Recalculate analytics for affected date
    const todayAnalytics = await supabase
      .from('hydration_analytics')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (todayAnalytics.data) {
      await this.updateDailyAnalytics(userId, new Date(todayAnalytics.data.date));
    }
  },

  async updateDailyAnalytics(userId: string, date: Date): Promise<HydrationAnalytics> {
    const dateStr = date.toISOString().split('T')[0];
    const startTime = `${dateStr}T00:00:00`;
    const endTime = `${dateStr}T23:59:59`;

    // Get all logs for the day
    const { data: logs, error: logsError } = await supabase
      .from('hydration_logs')
      .select('amount_ml')
      .eq('user_id', userId)
      .gte('logged_at', startTime)
      .lte('logged_at', endTime);

    if (logsError) throw logsError;

    // Get user's daily goal
    const goal = await this.getOrCreateGoal(userId);

    const totalIntake = (logs || []).reduce((sum, log) => sum + (log.amount_ml || 0), 0);
    const progressPercent = Math.round((totalIntake / goal.daily_goal_ml) * 100);

    const { data, error } = await supabase
      .from('hydration_analytics')
      .upsert(
        {
          user_id: userId,
          date: dateStr,
          total_intake_ml: totalIntake,
          goal_progress_percent: progressPercent,
          log_count: logs?.length || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as HydrationAnalytics;
  },

  async getAnalyticsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<HydrationAnalytics[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('hydration_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as HydrationAnalytics[];
  },

  async getWeeklyTrend(userId: string): Promise<HydrationAnalytics[]> {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.getAnalyticsForDateRange(userId, sevenDaysAgo, today);
  },

  async calculateAverageDaily(userId: string, days: number = 7): Promise<number> {
    const analytics = await this.getWeeklyTrend(userId);
    if (analytics.length === 0) return 0;

    const total = analytics.reduce((sum, a) => sum + a.total_intake_ml, 0);
    return Math.round(total / analytics.length);
  },

  convertUnits(amount: number, from: 'ml' | 'oz' | 'L', to: 'ml' | 'oz' | 'L'): number {
    const mlValue =
      from === 'ml' ? amount : from === 'oz' ? amount * 29.5735 : amount * 1000;

    return to === 'ml' ? mlValue : to === 'oz' ? mlValue / 29.5735 : mlValue / 1000;
  },
};

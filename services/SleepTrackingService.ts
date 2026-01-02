import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface SleepGoal {
  id: string;
  user_id: string;
  target_hours: number;
  bedtime_hour: number;
  bedtime_minute: number;
  wake_time_hour: number;
  wake_time_minute: number;
  reminder_enabled: boolean;
  sleep_reminder_minutes_before: number;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  duration_minutes: number;
  quality_score?: number;
  sleep_stages?: Record<string, unknown>;
  interruptions: number;
  notes?: string;
  created_at: string;
}

export interface SleepAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_duration_minutes: number;
  average_quality_score: number;
  log_count: number;
  goal_achievement_percent: number;
  created_at: string;
  updated_at: string;
}

export interface SleepPattern {
  id: string;
  user_id: string;
  period_start_date: string;
  period_end_date: string;
  average_duration_minutes: number;
  average_quality_score: number;
  most_common_bedtime: string;
  most_common_wake_time: string;
  consistency_score: number;
  trend: string;
  insights: Record<string, unknown>;
  created_at: string;
}

export const SleepTrackingService = {
  async getOrCreateGoal(userId: string): Promise<SleepGoal> {
    const { data, error } = await supabase
      .from('sleep_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) return data as SleepGoal;

    const { data: newGoal, error: createError } = await supabase
      .from('sleep_goals')
      .insert({
        user_id: userId,
        target_hours: 8.0,
        bedtime_hour: 22,
        bedtime_minute: 0,
        wake_time_hour: 6,
        wake_time_minute: 30,
        reminder_enabled: true,
        sleep_reminder_minutes_before: 30,
      })
      .select()
      .single();

    if (createError) throw createError;
    return newGoal as SleepGoal;
  },

  async updateGoal(userId: string, updates: Partial<SleepGoal>): Promise<SleepGoal> {
    const { data, error } = await supabase
      .from('sleep_goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as SleepGoal;
  },

  async logSleep(
    userId: string,
    sleepStart: Date,
    sleepEnd: Date,
    qualityScore?: number,
    notes?: string
  ): Promise<SleepLog> {
    const durationMinutes = Math.round(
      (sleepEnd.getTime() - sleepStart.getTime()) / (1000 * 60)
    );

    const { data, error } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: userId,
        sleep_start: sleepStart.toISOString(),
        sleep_end: sleepEnd.toISOString(),
        duration_minutes: durationMinutes,
        quality_score: qualityScore,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Update daily analytics
    await this.updateDailyAnalytics(userId, sleepEnd);

    return data as SleepLog;
  },

  async getTodayLogs(userId: string): Promise<SleepLog[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('sleep_end', `${today}T00:00:00`)
      .lte('sleep_end', `${today}T23:59:59`)
      .order('sleep_start', { ascending: false });

    if (error) throw error;
    return (data || []) as SleepLog[];
  },

  async getLogsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<SleepLog[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('sleep_end', `${start}T00:00:00`)
      .lte('sleep_end', `${end}T23:59:59`)
      .order('sleep_start', { ascending: false });

    if (error) throw error;
    return (data || []) as SleepLog[];
  },

  async deleteLog(logId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async updateDailyAnalytics(userId: string, date: Date): Promise<SleepAnalytics> {
    const dateStr = date.toISOString().split('T')[0];

    // Get all logs that end on this date
    const startTime = `${dateStr}T00:00:00`;
    const endTime = `${dateStr}T23:59:59`;

    const { data: logs, error: logsError } = await supabase
      .from('sleep_logs')
      .select('duration_minutes, quality_score')
      .eq('user_id', userId)
      .gte('sleep_end', startTime)
      .lte('sleep_end', endTime);

    if (logsError) throw logsError;

    const goal = await this.getOrCreateGoal(userId);
    const targetMinutes = goal.target_hours * 60;

    const totalDuration = (logs || []).reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const avgQuality =
      logs && logs.length > 0
        ? (logs.reduce((sum, log) => sum + (log.quality_score || 0), 0) / logs.length).toFixed(1)
        : 0;
    const goalAchievement = Math.round((totalDuration / targetMinutes) * 100);

    const { data, error } = await supabase
      .from('sleep_analytics')
      .upsert(
        {
          user_id: userId,
          date: dateStr,
          total_duration_minutes: totalDuration,
          average_quality_score: parseFloat(String(avgQuality)),
          log_count: logs?.length || 0,
          goal_achievement_percent: goalAchievement,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as SleepAnalytics;
  },

  async getAnalyticsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<SleepAnalytics[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sleep_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as SleepAnalytics[];
  },

  async getWeeklyPattern(userId: string): Promise<SleepPattern | null> {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = oneWeekAgo.toISOString().split('T')[0];
    const weekEnd = today.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sleep_patterns')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start_date', weekStart)
      .eq('period_end_date', weekEnd)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data as SleepPattern | null;
  },

  async generateWeeklyPattern(userId: string): Promise<SleepPattern> {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = oneWeekAgo.toISOString().split('T')[0];
    const weekEnd = today.toISOString().split('T')[0];

    const logs = await this.getLogsForDateRange(userId, oneWeekAgo, today);

    const avgDuration = logs.length > 0
      ? Math.round(logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / logs.length)
      : 0;

    const avgQuality =
      logs.length > 0
        ? parseFloat((logs.reduce((sum, log) => sum + (log.quality_score || 0), 0) / logs.length).toFixed(1))
        : 0;

    const { data, error } = await supabase
      .from('sleep_patterns')
      .upsert(
        {
          user_id: userId,
          period_start_date: weekStart,
          period_end_date: weekEnd,
          average_duration_minutes: avgDuration,
          average_quality_score: avgQuality,
          consistency_score: logs.length >= 5 ? 8.5 : logs.length >= 3 ? 6.0 : 3.0,
          trend: 'stable',
          insights: {
            logsCount: logs.length,
            daysCovered: logs.length,
          },
        },
        { onConflict: 'user_id,period_start_date,period_end_date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as SleepPattern;
  },

  async getAverageNightDuration(userId: string, days: number = 7): Promise<number> {
    const analytics = await this.getWeeklyPattern(userId);
    if (!analytics) {
      const logs = await this.getLogsForDateRange(
        userId,
        new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        new Date()
      );
      return logs.length > 0
        ? Math.round(logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / logs.length)
        : 0;
    }
    return analytics.average_duration_minutes;
  },
};

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface MentalWellnessGoal {
  id: string;
  user_id: string;
  mood_check_in_frequency: string;
  stress_awareness_enabled: boolean;
  breathing_reminders_enabled: boolean;
  reflection_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  mood_score: number;
  mood_emoji: string;
  primary_emotion: string;
  secondary_emotions: string[];
  triggers?: Record<string, unknown>;
  notes?: string;
  location?: string;
  activity?: string;
  logged_at: string;
  created_at: string;
}

export interface StressLevel {
  id: string;
  user_id: string;
  stress_score: number;
  stress_category: string;
  sources: string[];
  physical_symptoms: string[];
  coping_strategy: string;
  effectiveness_rating: number;
  logged_at: string;
  created_at: string;
}

export interface WellnessReflection {
  id: string;
  user_id: string;
  week_starting_date: string;
  mood_summary: string;
  stress_patterns: string;
  highlights: string;
  challenges: string;
  accomplishments: string;
  insights: string;
  goals_for_next_week: string;
  average_mood_score: number;
  average_stress_score: number;
  created_at: string;
  updated_at: string;
}

export interface CopingStrategy {
  id: string;
  user_id: string;
  strategy_name: string;
  category: string;
  description: string;
  effectiveness_history: Record<string, unknown>;
  frequency_used: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface WellnessAnalytics {
  id: string;
  user_id: string;
  date: string;
  average_mood_score: number;
  mood_log_count: number;
  average_stress_score: number;
  stress_log_count: number;
  top_mood: string;
  top_stress_source: string;
  most_used_coping_strategy: string;
  created_at: string;
  updated_at: string;
}

export const MentalWellnessService = {
  async getOrCreateGoal(userId: string): Promise<MentalWellnessGoal> {
    const { data, error } = await supabase
      .from('mental_wellness_goals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) return data as MentalWellnessGoal;

    const { data: newGoal, error: createError } = await supabase
      .from('mental_wellness_goals')
      .insert({
        user_id: userId,
        mood_check_in_frequency: 'daily',
        stress_awareness_enabled: true,
        breathing_reminders_enabled: true,
        reflection_frequency: 'weekly',
      })
      .select()
      .single();

    if (createError) throw createError;
    return newGoal as MentalWellnessGoal;
  },

  async updateGoal(userId: string, updates: Partial<MentalWellnessGoal>): Promise<MentalWellnessGoal> {
    const { data, error } = await supabase
      .from('mental_wellness_goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as MentalWellnessGoal;
  },

  async logMood(
    userId: string,
    moodScore: number,
    primaryEmotion: string,
    moodEmoji: string,
    secondaryEmotions: string[] = [],
    notes?: string
  ): Promise<MoodLog> {
    const { data, error } = await supabase
      .from('mood_logs')
      .insert({
        user_id: userId,
        mood_score: moodScore,
        mood_emoji: moodEmoji,
        primary_emotion: primaryEmotion,
        secondary_emotions: secondaryEmotions,
        notes,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update daily analytics
    await this.updateDailyAnalytics(userId, new Date());

    return data as MoodLog;
  },

  async logStress(
    userId: string,
    stressScore: number,
    category: string,
    sources: string[] = [],
    copingStrategy: string = '',
    effectivenessRating: number = 3
  ): Promise<StressLevel> {
    const { data, error } = await supabase
      .from('stress_levels')
      .insert({
        user_id: userId,
        stress_score: stressScore,
        stress_category: category,
        sources,
        coping_strategy: copingStrategy,
        effectiveness_rating: effectivenessRating,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update daily analytics
    await this.updateDailyAnalytics(userId, new Date());

    return data as StressLevel;
  },

  async getTodayMoodLogs(userId: string): Promise<MoodLog[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MoodLog[];
  },

  async getTodayStressLogs(userId: string): Promise<StressLevel[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('stress_levels')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return (data || []) as StressLevel[];
  },

  async getMoodLogsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<MoodLog[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${start}T00:00:00`)
      .lte('logged_at', `${end}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MoodLog[];
  },

  async getStressLogsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<StressLevel[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('stress_levels')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${start}T00:00:00`)
      .lte('logged_at', `${end}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return (data || []) as StressLevel[];
  },

  async createWeeklyReflection(
    userId: string,
    weekStartDate: Date,
    reflection: Omit<WellnessReflection, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<WellnessReflection> {
    const weekStart = weekStartDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('wellness_reflections')
      .upsert(
        {
          user_id: userId,
          week_starting_date: weekStart,
          ...reflection,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,week_starting_date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as WellnessReflection;
  },

  async getWeeklyReflection(userId: string, weekStartDate: Date): Promise<WellnessReflection | null> {
    const weekStart = weekStartDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('wellness_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('week_starting_date', weekStart)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data as WellnessReflection | null;
  },

  async addCopingStrategy(userId: string, strategy: Omit<CopingStrategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<CopingStrategy> {
    const { data, error } = await supabase
      .from('coping_strategies')
      .insert({
        user_id: userId,
        ...strategy,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CopingStrategy;
  },

  async getUserCopingStrategies(userId: string): Promise<CopingStrategy[]> {
    const { data, error } = await supabase
      .from('coping_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('frequency_used', { ascending: false });

    if (error) throw error;
    return (data || []) as CopingStrategy[];
  },

  async updateDailyAnalytics(userId: string, date: Date): Promise<WellnessAnalytics> {
    const dateStr = date.toISOString().split('T')[0];

    const moodLogs = await this.getMoodLogsForDateRange(userId, date, date);
    const stressLogs = await this.getStressLogsForDateRange(userId, date, date);

    const avgMoodScore =
      moodLogs.length > 0 ? parseFloat((moodLogs.reduce((sum, m) => sum + m.mood_score, 0) / moodLogs.length).toFixed(1)) : 0;
    const avgStressScore =
      stressLogs.length > 0 ? parseFloat((stressLogs.reduce((sum, s) => sum + s.stress_score, 0) / stressLogs.length).toFixed(1)) : 0;

    const topMood =
      moodLogs.length > 0
        ? moodLogs.reduce((a, b) => (a.mood_score > b.mood_score ? a : b)).primary_emotion
        : '';

    const topStressSource =
      stressLogs.length > 0
        ? stressLogs.reduce((a, b) => (a.stress_score > b.stress_score ? a : b)).stress_category
        : '';

    const { data, error } = await supabase
      .from('wellness_analytics')
      .upsert(
        {
          user_id: userId,
          date: dateStr,
          average_mood_score: avgMoodScore,
          mood_log_count: moodLogs.length,
          average_stress_score: avgStressScore,
          stress_log_count: stressLogs.length,
          top_mood: topMood,
          top_stress_source: topStressSource,
          most_used_coping_strategy: '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) throw error;
    return data as WellnessAnalytics;
  },

  async getAnalyticsForDateRange(userId: string, startDate: Date, endDate: Date): Promise<WellnessAnalytics[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('wellness_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as WellnessAnalytics[];
  },

  async getWeeklyAverage(userId: string, days: number = 7): Promise<{ avgMood: number; avgStress: number }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const analytics = await this.getAnalyticsForDateRange(userId, startDate, endDate);

    const avgMood =
      analytics.length > 0
        ? parseFloat((analytics.reduce((sum, a) => sum + a.average_mood_score, 0) / analytics.length).toFixed(1))
        : 0;
    const avgStress =
      analytics.length > 0
        ? parseFloat((analytics.reduce((sum, a) => sum + a.average_stress_score, 0) / analytics.length).toFixed(1))
        : 0;

    return { avgMood, avgStress };
  },
};

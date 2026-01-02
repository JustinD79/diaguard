import { createClient } from '@supabase/supabase-js';
import { HydrationTrackingService } from './HydrationTrackingService';
import { SleepTrackingService } from './SleepTrackingService';
import { MentalWellnessService } from './MentalWellnessService';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface LifestyleCorrelation {
  id: string;
  user_id: string;
  factor_1: string;
  factor_2: string;
  correlation_coefficient: number;
  correlation_strength: string;
  sample_size: number;
  time_period: string;
  is_significant: boolean;
  notes?: string;
  analysis_date: string;
  created_at: string;
  updated_at: string;
}

export interface LifestyleInsight {
  id: string;
  user_id: string;
  insight_type: string;
  insight_title: string;
  insight_description: string;
  related_data: Record<string, unknown>;
  confidence_level: number;
  actionable_recommendations: string[];
  generated_at: string;
  is_read: boolean;
  importance_level: string;
  created_at: string;
}

export interface LifestyleRecommendation {
  id: string;
  user_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  action_steps: string[];
  expected_benefits: string[];
  priority_score: number;
  time_frame: string;
  related_factors: string[];
  is_active: boolean;
  accepted_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export const LifestyleCorrelationService = {
  async analyzeCorrelations(userId: string, days: number = 30): Promise<LifestyleCorrelation[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const hydrationAnalytics = await HydrationTrackingService.getAnalyticsForDateRange(userId, startDate, endDate);
    const sleepAnalytics = await SleepTrackingService.getAnalyticsForDateRange(userId, startDate, endDate);
    const wellnessAnalytics = await MentalWellnessService.getAnalyticsForDateRange(userId, startDate, endDate);

    const correlations: LifestyleCorrelation[] = [];

    // Hydration vs Sleep Quality
    if (hydrationAnalytics.length > 0 && sleepAnalytics.length > 0) {
      const hydrCorr = this.calculatePearsonCorrelation(
        hydrationAnalytics.map(h => h.goal_progress_percent),
        sleepAnalytics.map(s => s.average_quality_score)
      );

      if (hydrCorr !== null && hydrCorr.samples >= 5) {
        const { data, error } = await supabase
          .from('lifestyle_correlations')
          .upsert(
            {
              user_id: userId,
              factor_1: 'hydration_progress',
              factor_2: 'sleep_quality',
              correlation_coefficient: hydrCorr.correlation,
              correlation_strength: this.getStrength(hydrCorr.correlation),
              sample_size: hydrCorr.samples,
              time_period: `${days}days`,
              is_significant: Math.abs(hydrCorr.correlation) > 0.3,
              analysis_date: new Date().toISOString().split('T')[0],
            },
            { onConflict: 'user_id,factor_1,factor_2,analysis_date' }
          )
          .select()
          .single();

        if (!error && data) correlations.push(data as LifestyleCorrelation);
      }
    }

    // Sleep vs Mood
    if (sleepAnalytics.length > 0 && wellnessAnalytics.length > 0) {
      const sleepMoodCorr = this.calculatePearsonCorrelation(
        sleepAnalytics.map(s => s.total_duration_minutes),
        wellnessAnalytics.map(w => w.average_mood_score)
      );

      if (sleepMoodCorr !== null && sleepMoodCorr.samples >= 5) {
        const { data, error } = await supabase
          .from('lifestyle_correlations')
          .upsert(
            {
              user_id: userId,
              factor_1: 'sleep_duration',
              factor_2: 'mood',
              correlation_coefficient: sleepMoodCorr.correlation,
              correlation_strength: this.getStrength(sleepMoodCorr.correlation),
              sample_size: sleepMoodCorr.samples,
              time_period: `${days}days`,
              is_significant: Math.abs(sleepMoodCorr.correlation) > 0.3,
              analysis_date: new Date().toISOString().split('T')[0],
            },
            { onConflict: 'user_id,factor_1,factor_2,analysis_date' }
          )
          .select()
          .single();

        if (!error && data) correlations.push(data as LifestyleCorrelation);
      }
    }

    // Stress vs Sleep
    if (sleepAnalytics.length > 0 && wellnessAnalytics.length > 0) {
      const stressSleepcorr = this.calculatePearsonCorrelation(
        wellnessAnalytics.map(w => w.average_stress_score),
        sleepAnalytics.map(s => s.average_quality_score),
        true
      );

      if (stressSleepcorr !== null && stressSleepcorr.samples >= 5) {
        const { data, error } = await supabase
          .from('lifestyle_correlations')
          .upsert(
            {
              user_id: userId,
              factor_1: 'stress_level',
              factor_2: 'sleep_quality',
              correlation_coefficient: stressSleepcorr.correlation,
              correlation_strength: this.getStrength(stressSleepcorr.correlation),
              sample_size: stressSleepcorr.samples,
              time_period: `${days}days`,
              is_significant: Math.abs(stressSleepcorr.correlation) > 0.3,
              analysis_date: new Date().toISOString().split('T')[0],
            },
            { onConflict: 'user_id,factor_1,factor_2,analysis_date' }
          )
          .select()
          .single();

        if (!error && data) correlations.push(data as LifestyleCorrelation);
      }
    }

    return correlations;
  },

  async generateInsights(userId: string): Promise<LifestyleInsight[]> {
    const insights: LifestyleInsight[] = [];

    const weeklyHydration = await HydrationTrackingService.getWeeklyTrend(userId);
    const weeklySleep = await SleepTrackingService.getWeeklyPattern(userId);
    const weeklyWellness = await MentalWellnessService.getWeeklyAverage(userId);

    // Hydration insight
    if (weeklyHydration.length > 0) {
      const avgProgress = Math.round(
        weeklyHydration.reduce((sum, h) => sum + h.goal_progress_percent, 0) / weeklyHydration.length
      );

      let insightText = '';
      if (avgProgress >= 100) {
        insightText = 'Excellent hydration! You consistently meet your daily water intake goal.';
      } else if (avgProgress >= 75) {
        insightText = 'Good hydration progress. Try to increase your water intake slightly to reach your goals.';
      } else {
        insightText = 'Your hydration levels are below target. Increase water intake throughout the day.';
      }

      const { data, error } = await supabase
        .from('lifestyle_insights')
        .insert({
          user_id: userId,
          insight_type: 'hydration',
          insight_title: 'Weekly Hydration Summary',
          insight_description: insightText,
          related_data: { avgProgress, daysTracked: weeklyHydration.length },
          confidence_level: 0.95,
          actionable_recommendations:
            avgProgress < 100 ? ['Increase water intake by 250ml daily', 'Set hourly reminder'] : ['Maintain current habit'],
          importance_level: avgProgress < 75 ? 'high' : 'medium',
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) insights.push(data as LifestyleInsight);
    }

    // Sleep insight
    if (weeklySleep) {
      const goal = await SleepTrackingService.getOrCreateGoal(userId);
      const sleepHours = (weeklySleep.average_duration_minutes / 60).toFixed(1);
      const goalHours = goal.target_hours.toFixed(1);

      const { data, error } = await supabase
        .from('lifestyle_insights')
        .insert({
          user_id: userId,
          insight_type: 'sleep',
          insight_title: 'Sleep Pattern Analysis',
          insight_description: `Your average sleep is ${sleepHours} hours, target is ${goalHours} hours. Quality score: ${weeklySleep.average_quality_score}/10.`,
          related_data: weeklySleep.insights,
          confidence_level: 0.9,
          actionable_recommendations:
            parseFloat(sleepHours) < parseFloat(goalHours)
              ? ['Move bedtime 30 minutes earlier', 'Reduce screen time before bed']
              : ['Sleep schedule is on track'],
          importance_level: parseFloat(sleepHours) < parseFloat(goalHours) ? 'high' : 'low',
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) insights.push(data as LifestyleInsight);
    }

    // Mental wellness insight
    if (weeklyWellness.avgMood > 0) {
      const moodStatus = weeklyWellness.avgMood >= 7 ? 'excellent' : weeklyWellness.avgMood >= 5 ? 'good' : 'needs attention';
      const stressStatus = weeklyWellness.avgStress <= 4 ? 'well managed' : weeklyWellness.avgStress <= 6 ? 'moderate' : 'high';

      const { data, error } = await supabase
        .from('lifestyle_insights')
        .insert({
          user_id: userId,
          insight_type: 'mental_wellness',
          insight_title: 'Mental Wellness Status',
          insight_description: `Mood is ${moodStatus} (${weeklyWellness.avgMood}/10). Stress levels are ${stressStatus} (${weeklyWellness.avgStress}/10).`,
          related_data: { avgMood: weeklyWellness.avgMood, avgStress: weeklyWellness.avgStress },
          confidence_level: 0.85,
          actionable_recommendations:
            weeklyWellness.avgMood < 5 ? ['Schedule mindfulness session', 'Connect with support'] : ['Keep up good practices'],
          importance_level: weeklyWellness.avgMood < 5 ? 'high' : 'low',
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) insights.push(data as LifestyleInsight);
    }

    return insights;
  },

  async createRecommendation(
    userId: string,
    recommendation: Omit<LifestyleRecommendation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<LifestyleRecommendation> {
    const { data, error } = await supabase
      .from('lifestyle_recommendations')
      .insert({
        user_id: userId,
        ...recommendation,
      })
      .select()
      .single();

    if (error) throw error;
    return data as LifestyleRecommendation;
  },

  async getUserRecommendations(userId: string): Promise<LifestyleRecommendation[]> {
    const { data, error } = await supabase
      .from('lifestyle_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority_score', { ascending: false });

    if (error) throw error;
    return (data || []) as LifestyleRecommendation[];
  },

  calculatePearsonCorrelation(
    x: number[],
    y: number[],
    inverse: boolean = false
  ): { correlation: number; samples: number } | null {
    if (x.length !== y.length || x.length < 3) return null;

    const n = x.length;
    const yAdjusted = inverse ? y.map(val => 10 - val) : y;

    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = yAdjusted.reduce((a, b) => a + b) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (yAdjusted[i] - meanY), 0);

    const sumXVar = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);
    const sumYVar = yAdjusted.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);

    const denominator = Math.sqrt(sumXVar * sumYVar);

    if (denominator === 0) return null;

    const correlation = numerator / denominator;
    return { correlation: Math.round(correlation * 100) / 100, samples: n };
  },

  getStrength(correlation: number): string {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) return 'very strong';
    if (absCorr >= 0.5) return 'strong';
    if (absCorr >= 0.3) return 'moderate';
    if (absCorr >= 0.1) return 'weak';
    return 'very weak';
  },

  async getInsights(userId: string, limit: number = 10): Promise<LifestyleInsight[]> {
    const { data, error } = await supabase
      .from('lifestyle_insights')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as LifestyleInsight[];
  },

  async markInsightAsRead(insightId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lifestyle_insights')
      .update({ is_read: true })
      .eq('id', insightId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

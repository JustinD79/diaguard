import { supabase } from '../lib/supabase';

export type ExerciseType = 'walking' | 'running' | 'cycling' | 'swimming' | 'gym' | 'sports' | 'yoga' | 'hiit' | 'strength' | 'cardio' | 'other';
export type IntensityLevel = 'light' | 'moderate' | 'vigorous';
export type GlucoseImpactLevel = 'significant_drop' | 'moderate_drop' | 'stable' | 'moderate_rise' | 'significant_rise' | 'unknown';

export interface ExerciseLog {
  id: string;
  user_id: string;
  exercise_type: ExerciseType;
  intensity: IntensityLevel;
  duration_minutes: number;
  calories_burned?: number;
  distance?: number;
  glucose_before?: number;
  glucose_after?: number;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  notes?: string;
  created_at: string;
  exercise_time: string;
  source?: 'manual' | 'strava' | 'fitbit' | 'garmin' | 'apple_health' | 'google_fit';
  external_id?: string;
  weather_conditions?: string;
  perceived_exertion?: number;
}

export interface ExerciseStats {
  total_workouts: number;
  total_minutes: number;
  total_calories: number;
  total_distance: number;
  average_duration: number;
  favorite_exercise: string;
  streak_days: number;
  weekly_goal_progress: number;
}

export interface GlucoseCorrelation {
  exercise_type: ExerciseType;
  intensity: IntensityLevel;
  average_glucose_change: number;
  typical_drop_mg_dl: number;
  time_to_lowest: number;
  recovery_time: number;
  sample_count: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExerciseTimeRecommendation {
  time_of_day: 'morning' | 'midday' | 'afternoon' | 'evening';
  hour_range: string;
  glucose_stability_score: number;
  recommended_types: ExerciseType[];
  avoid_if_glucose_below: number;
  reasoning: string;
}

export interface PostExerciseCarbNeed {
  exercise_type: ExerciseType;
  duration_minutes: number;
  intensity: IntensityLevel;
  recommended_carbs_grams: number;
  timing_advice: string;
  carb_sources: string[];
  hypo_risk_level: 'low' | 'moderate' | 'high';
}

export interface ActivityPattern {
  day_of_week: number;
  time_of_day: string;
  exercise_count: number;
  average_duration: number;
  average_calories: number;
  glucose_impact: GlucoseImpactLevel;
}

export interface WeeklyActivitySummary {
  week_start: string;
  total_workouts: number;
  total_duration: number;
  total_calories: number;
  most_active_day: string;
  glucose_correlations: GlucoseCorrelation[];
  patterns: ActivityPattern[];
}

export class ExerciseTrackingService {
  static async logExercise(
    userId: string,
    exercise: Omit<ExerciseLog, 'id' | 'user_id' | 'created_at'>
  ): Promise<ExerciseLog | null> {
    try {
      const caloriesBurned = exercise.calories_burned || this.estimateCalories(
        exercise.exercise_type,
        exercise.intensity,
        exercise.duration_minutes
      );

      const { data, error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: userId,
          ...exercise,
          calories_burned: caloriesBurned,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging exercise:', error);
      return null;
    }
  }

  static async getExerciseLogs(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExerciseLog[]> {
    try {
      let query = supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .order('exercise_time', { ascending: false });

      if (startDate) {
        query = query.gte('exercise_time', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('exercise_time', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exercise logs:', error);
      return [];
    }
  }

  static async getExerciseStats(
    userId: string,
    days: number = 30
  ): Promise<ExerciseStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await this.getExerciseLogs(userId, startDate);

      const stats: ExerciseStats = {
        total_workouts: logs.length,
        total_minutes: logs.reduce((sum, log) => sum + log.duration_minutes, 0),
        total_calories: logs.reduce((sum, log) => sum + (log.calories_burned || 0), 0),
        total_distance: logs.reduce((sum, log) => sum + (log.distance || 0), 0),
        average_duration: 0,
        favorite_exercise: '',
      };

      if (stats.total_workouts > 0) {
        stats.average_duration = Math.round(stats.total_minutes / stats.total_workouts);

        const exerciseCounts: Record<string, number> = {};
        logs.forEach(log => {
          exerciseCounts[log.exercise_type] = (exerciseCounts[log.exercise_type] || 0) + 1;
        });

        stats.favorite_exercise = Object.entries(exerciseCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || '';
      }

      return stats;
    } catch (error) {
      console.error('Error calculating exercise stats:', error);
      return {
        total_workouts: 0,
        total_minutes: 0,
        total_calories: 0,
        total_distance: 0,
        average_duration: 0,
        favorite_exercise: '',
      };
    }
  }

  static async deleteExerciseLog(logId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting exercise log:', error);
      return false;
    }
  }

  static async updateExerciseLog(
    logId: string,
    updates: Partial<ExerciseLog>
  ): Promise<ExerciseLog | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .update(updates)
        .eq('id', logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating exercise log:', error);
      return null;
    }
  }

  static estimateCalories(
    exerciseType: string,
    intensity: string,
    durationMinutes: number
  ): number {
    const baseMET: Record<string, Record<string, number>> = {
      walking: { light: 3.5, moderate: 4.5, vigorous: 5.5 },
      running: { light: 6, moderate: 8, vigorous: 11 },
      cycling: { light: 4, moderate: 8, vigorous: 12 },
      swimming: { light: 4, moderate: 7, vigorous: 10 },
      gym: { light: 3, moderate: 5, vigorous: 8 },
      sports: { light: 4, moderate: 6, vigorous: 10 },
      yoga: { light: 2.5, moderate: 3, vigorous: 4 },
      other: { light: 3, moderate: 5, vigorous: 7 },
    };

    const met = baseMET[exerciseType]?.[intensity] || 5;
    const averageWeight = 70;
    return Math.round(met * averageWeight * (durationMinutes / 60));
  }

  static async getGlucoseImpact(userId: string, logId: string): Promise<{
    glucose_change: number;
    impact: 'increased' | 'decreased' | 'stable' | 'unknown';
  }> {
    try {
      const { data } = await supabase
        .from('exercise_logs')
        .select('glucose_before, glucose_after')
        .eq('id', logId)
        .single();

      if (!data || !data.glucose_before || !data.glucose_after) {
        return { glucose_change: 0, impact: 'unknown' };
      }

      const change = data.glucose_after - data.glucose_before;
      let impact: 'increased' | 'decreased' | 'stable' | 'unknown';

      if (change > 10) impact = 'increased';
      else if (change < -10) impact = 'decreased';
      else impact = 'stable';

      return { glucose_change: change, impact };
    } catch (error) {
      console.error('Error calculating glucose impact:', error);
      return { glucose_change: 0, impact: 'unknown' };
    }
  }

  static async getGlucoseCorrelations(
    userId: string,
    days: number = 90
  ): Promise<GlucoseCorrelation[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('exercise_time', startDate.toISOString())
        .not('glucose_before', 'is', null)
        .not('glucose_after', 'is', null);

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const groupedData: Record<string, {
        changes: number[];
        durations: number[];
      }> = {};

      logs.forEach(log => {
        const key = `${log.exercise_type}_${log.intensity}`;
        if (!groupedData[key]) {
          groupedData[key] = { changes: [], durations: [] };
        }
        const change = log.glucose_after - log.glucose_before;
        groupedData[key].changes.push(change);
        groupedData[key].durations.push(log.duration_minutes);
      });

      const correlations: GlucoseCorrelation[] = Object.entries(groupedData).map(([key, data]) => {
        const [exercise_type, intensity] = key.split('_') as [ExerciseType, IntensityLevel];
        const avgChange = data.changes.reduce((a, b) => a + b, 0) / data.changes.length;
        const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;

        const drops = data.changes.filter(c => c < 0);
        const typicalDrop = drops.length > 0 ? Math.abs(drops.reduce((a, b) => a + b, 0) / drops.length) : 0;

        return {
          exercise_type,
          intensity,
          average_glucose_change: Math.round(avgChange),
          typical_drop_mg_dl: Math.round(typicalDrop),
          time_to_lowest: this.estimateTimeToLowest(exercise_type, intensity, avgDuration),
          recovery_time: this.estimateRecoveryTime(exercise_type, intensity),
          sample_count: data.changes.length,
          confidence: data.changes.length >= 10 ? 'high' : data.changes.length >= 5 ? 'medium' : 'low',
        };
      });

      return correlations.sort((a, b) => b.sample_count - a.sample_count);
    } catch (error) {
      console.error('Error getting glucose correlations:', error);
      return [];
    }
  }

  static async getBestExerciseTimes(
    userId: string
  ): Promise<ExerciseTimeRecommendation[]> {
    try {
      const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .not('glucose_before', 'is', null)
        .not('glucose_after', 'is', null)
        .order('exercise_time', { ascending: false })
        .limit(100);

      if (error) throw error;

      const timeSlots: Record<string, {
        exercises: any[];
        glucoseStability: number[];
      }> = {
        morning: { exercises: [], glucoseStability: [] },
        midday: { exercises: [], glucoseStability: [] },
        afternoon: { exercises: [], glucoseStability: [] },
        evening: { exercises: [], glucoseStability: [] },
      };

      (logs || []).forEach(log => {
        const hour = new Date(log.exercise_time).getHours();
        let slot: string;
        if (hour >= 5 && hour < 11) slot = 'morning';
        else if (hour >= 11 && hour < 14) slot = 'midday';
        else if (hour >= 14 && hour < 18) slot = 'afternoon';
        else slot = 'evening';

        timeSlots[slot].exercises.push(log);
        const change = Math.abs(log.glucose_after - log.glucose_before);
        const stability = Math.max(0, 100 - change);
        timeSlots[slot].glucoseStability.push(stability);
      });

      const recommendations: ExerciseTimeRecommendation[] = [];

      const timeRanges: Record<string, { timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening'; range: string }> = {
        morning: { timeOfDay: 'morning', range: '5:00 AM - 11:00 AM' },
        midday: { timeOfDay: 'midday', range: '11:00 AM - 2:00 PM' },
        afternoon: { timeOfDay: 'afternoon', range: '2:00 PM - 6:00 PM' },
        evening: { timeOfDay: 'evening', range: '6:00 PM - 10:00 PM' },
      };

      Object.entries(timeSlots).forEach(([slot, data]) => {
        const avgStability = data.glucoseStability.length > 0
          ? data.glucoseStability.reduce((a, b) => a + b, 0) / data.glucoseStability.length
          : 50;

        const exerciseTypes = data.exercises.reduce((acc: Record<string, number>, log) => {
          acc[log.exercise_type] = (acc[log.exercise_type] || 0) + 1;
          return acc;
        }, {});

        const sortedTypes = Object.entries(exerciseTypes)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([type]) => type as ExerciseType);

        recommendations.push({
          time_of_day: timeRanges[slot].timeOfDay,
          hour_range: timeRanges[slot].range,
          glucose_stability_score: Math.round(avgStability),
          recommended_types: sortedTypes.length > 0 ? sortedTypes : ['walking', 'yoga'],
          avoid_if_glucose_below: slot === 'morning' ? 100 : 80,
          reasoning: this.getTimeSlotReasoning(slot, avgStability),
        });
      });

      return recommendations.sort((a, b) => b.glucose_stability_score - a.glucose_stability_score);
    } catch (error) {
      console.error('Error getting best exercise times:', error);
      return this.getDefaultTimeRecommendations();
    }
  }

  static calculatePostExerciseCarbNeeds(
    exerciseType: ExerciseType,
    durationMinutes: number,
    intensity: IntensityLevel,
    currentGlucose?: number
  ): PostExerciseCarbNeed {
    const baseCarbs = this.getBaseCarbsForExercise(exerciseType, intensity);
    const durationMultiplier = Math.max(1, durationMinutes / 30);
    let recommendedCarbs = Math.round(baseCarbs * durationMultiplier);

    let hypoRiskLevel: 'low' | 'moderate' | 'high' = 'low';

    if (currentGlucose !== undefined) {
      if (currentGlucose < 100) {
        recommendedCarbs = Math.round(recommendedCarbs * 1.5);
        hypoRiskLevel = 'high';
      } else if (currentGlucose < 130) {
        recommendedCarbs = Math.round(recommendedCarbs * 1.2);
        hypoRiskLevel = 'moderate';
      }
    }

    if (intensity === 'vigorous') {
      recommendedCarbs = Math.round(recommendedCarbs * 1.3);
      hypoRiskLevel = hypoRiskLevel === 'low' ? 'moderate' : hypoRiskLevel;
    }

    const isAerobic = ['running', 'cycling', 'swimming', 'cardio'].includes(exerciseType);
    const timingAdvice = isAerobic
      ? 'Consume within 30-60 minutes post-exercise for optimal glycogen replenishment'
      : 'Consume within 60-90 minutes post-exercise; monitor glucose for delayed drops';

    return {
      exercise_type: exerciseType,
      duration_minutes: durationMinutes,
      intensity,
      recommended_carbs_grams: recommendedCarbs,
      timing_advice: timingAdvice,
      carb_sources: this.getRecommendedCarbSources(hypoRiskLevel, recommendedCarbs),
      hypo_risk_level: hypoRiskLevel,
    };
  }

  static async getActivityPatterns(
    userId: string,
    weeks: number = 4
  ): Promise<ActivityPattern[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));

      const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('exercise_time', startDate.toISOString());

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const patternMap: Record<string, {
        count: number;
        totalDuration: number;
        totalCalories: number;
        glucoseChanges: number[];
      }> = {};

      logs.forEach(log => {
        const date = new Date(log.exercise_time);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        const key = `${dayOfWeek}_${timeOfDay}`;

        if (!patternMap[key]) {
          patternMap[key] = { count: 0, totalDuration: 0, totalCalories: 0, glucoseChanges: [] };
        }

        patternMap[key].count++;
        patternMap[key].totalDuration += log.duration_minutes;
        patternMap[key].totalCalories += log.calories_burned || 0;

        if (log.glucose_before && log.glucose_after) {
          patternMap[key].glucoseChanges.push(log.glucose_after - log.glucose_before);
        }
      });

      return Object.entries(patternMap).map(([key, data]) => {
        const [dayOfWeek, timeOfDay] = key.split('_');
        const avgGlucoseChange = data.glucoseChanges.length > 0
          ? data.glucoseChanges.reduce((a, b) => a + b, 0) / data.glucoseChanges.length
          : 0;

        return {
          day_of_week: parseInt(dayOfWeek),
          time_of_day: timeOfDay,
          exercise_count: data.count,
          average_duration: Math.round(data.totalDuration / data.count),
          average_calories: Math.round(data.totalCalories / data.count),
          glucose_impact: this.categorizeGlucoseImpact(avgGlucoseChange),
        };
      });
    } catch (error) {
      console.error('Error getting activity patterns:', error);
      return [];
    }
  }

  static async getWeeklySummary(userId: string): Promise<WeeklyActivitySummary | null> {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('exercise_time', weekStart.toISOString());

      if (error) throw error;

      const dayTotals: Record<number, number> = {};
      let totalDuration = 0;
      let totalCalories = 0;

      (logs || []).forEach(log => {
        const day = new Date(log.exercise_time).getDay();
        dayTotals[day] = (dayTotals[day] || 0) + log.duration_minutes;
        totalDuration += log.duration_minutes;
        totalCalories += log.calories_burned || 0;
      });

      const mostActiveDay = Object.entries(dayTotals)
        .sort(([, a], [, b]) => b - a)[0];

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const [correlations, patterns] = await Promise.all([
        this.getGlucoseCorrelations(userId, 7),
        this.getActivityPatterns(userId, 1),
      ]);

      return {
        week_start: weekStart.toISOString(),
        total_workouts: logs?.length || 0,
        total_duration: totalDuration,
        total_calories: totalCalories,
        most_active_day: mostActiveDay ? dayNames[parseInt(mostActiveDay[0])] : 'None',
        glucose_correlations: correlations,
        patterns,
      };
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return null;
    }
  }

  static async calculateStreak(userId: string): Promise<number> {
    try {
      const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('exercise_time')
        .eq('user_id', userId)
        .order('exercise_time', { ascending: false })
        .limit(60);

      if (error) throw error;
      if (!logs || logs.length === 0) return 0;

      const exerciseDays = new Set(
        logs.map(log => new Date(log.exercise_time).toDateString())
      );

      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toDateString();

        if (exerciseDays.has(dateStr)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  static getExerciseRecommendations(
    currentGlucose: number,
    timeOfDay: 'morning' | 'afternoon' | 'evening'
  ): { recommended: ExerciseType[]; avoid: ExerciseType[]; advice: string } {
    const recommended: ExerciseType[] = [];
    const avoid: ExerciseType[] = [];
    let advice = '';

    if (currentGlucose < 80) {
      avoid.push('running', 'hiit', 'swimming', 'cardio');
      recommended.push('yoga', 'walking');
      advice = 'Your glucose is low. Consider having a snack (15-20g carbs) and waiting 15-30 minutes before light exercise.';
    } else if (currentGlucose < 100) {
      avoid.push('hiit', 'running');
      recommended.push('walking', 'yoga', 'strength');
      advice = 'With glucose around 100 mg/dL, stick to moderate activities and have a small snack ready if needed.';
    } else if (currentGlucose > 250) {
      avoid.push('hiit', 'running', 'cardio');
      recommended.push('walking', 'yoga');
      advice = 'High glucose detected. Light activity may help lower glucose, but avoid intense exercise until glucose is below 250 mg/dL.';
    } else {
      recommended.push('walking', 'cycling', 'swimming', 'gym', 'yoga');
      if (currentGlucose > 150) {
        recommended.push('running', 'hiit');
        advice = 'Good glucose level for any type of exercise. Higher intensity activities may help reduce glucose.';
      } else {
        recommended.push('strength');
        advice = 'Optimal glucose range for exercise. Monitor during longer sessions and have carbs available.';
      }
    }

    if (timeOfDay === 'morning') {
      advice += ' Morning exercise may cause dawn phenomenon; monitor closely.';
    } else if (timeOfDay === 'evening') {
      advice += ' Evening exercise may cause delayed glucose drops during sleep; consider a bedtime snack.';
    }

    return { recommended, avoid, advice };
  }

  private static estimateTimeToLowest(
    exerciseType: ExerciseType,
    intensity: IntensityLevel,
    duration: number
  ): number {
    const baseTime: Record<ExerciseType, number> = {
      walking: 45,
      running: 30,
      cycling: 35,
      swimming: 40,
      gym: 60,
      sports: 45,
      yoga: 60,
      hiit: 20,
      strength: 90,
      cardio: 30,
      other: 45,
    };

    let time = baseTime[exerciseType] || 45;

    if (intensity === 'vigorous') time *= 0.8;
    if (intensity === 'light') time *= 1.2;

    return Math.round(time + duration * 0.3);
  }

  private static estimateRecoveryTime(
    exerciseType: ExerciseType,
    intensity: IntensityLevel
  ): number {
    const baseRecovery: Record<ExerciseType, number> = {
      walking: 60,
      running: 120,
      cycling: 90,
      swimming: 90,
      gym: 180,
      sports: 120,
      yoga: 30,
      hiit: 180,
      strength: 240,
      cardio: 120,
      other: 90,
    };

    let time = baseRecovery[exerciseType] || 90;

    if (intensity === 'vigorous') time *= 1.5;
    if (intensity === 'light') time *= 0.7;

    return Math.round(time);
  }

  private static getBaseCarbsForExercise(
    exerciseType: ExerciseType,
    intensity: IntensityLevel
  ): number {
    const baseCarbs: Record<ExerciseType, Record<IntensityLevel, number>> = {
      walking: { light: 5, moderate: 10, vigorous: 15 },
      running: { light: 20, moderate: 30, vigorous: 45 },
      cycling: { light: 15, moderate: 25, vigorous: 40 },
      swimming: { light: 15, moderate: 25, vigorous: 40 },
      gym: { light: 10, moderate: 15, vigorous: 25 },
      sports: { light: 15, moderate: 25, vigorous: 35 },
      yoga: { light: 0, moderate: 5, vigorous: 10 },
      hiit: { light: 20, moderate: 35, vigorous: 50 },
      strength: { light: 10, moderate: 15, vigorous: 20 },
      cardio: { light: 15, moderate: 30, vigorous: 45 },
      other: { light: 10, moderate: 15, vigorous: 25 },
    };

    return baseCarbs[exerciseType]?.[intensity] || 15;
  }

  private static getRecommendedCarbSources(
    risk: 'low' | 'moderate' | 'high',
    grams: number
  ): string[] {
    if (risk === 'high' || grams < 20) {
      return ['Glucose tablets', 'Fruit juice', 'Sports drink', 'Banana'];
    } else if (risk === 'moderate' || grams < 40) {
      return ['Banana', 'Apple with peanut butter', 'Granola bar', 'Trail mix'];
    } else {
      return ['Whole grain toast with honey', 'Oatmeal with fruit', 'Smoothie', 'Rice cakes with almond butter'];
    }
  }

  private static getTimeSlotReasoning(slot: string, stability: number): string {
    const reasons: Record<string, string> = {
      morning: stability > 70
        ? 'Morning exercise works well for you with stable glucose response'
        : 'Morning exercise may cause glucose variability; ensure adequate breakfast',
      midday: stability > 70
        ? 'Midday is optimal with consistent glucose patterns'
        : 'Consider timing around meals for better glucose stability',
      afternoon: stability > 70
        ? 'Afternoon exercise shows good glucose control'
        : 'Post-lunch timing may cause unpredictable glucose responses',
      evening: stability > 70
        ? 'Evening workouts work well; monitor for delayed glucose effects'
        : 'Evening exercise may affect overnight glucose; consider carb timing',
    };
    return reasons[slot] || 'Based on your exercise history';
  }

  private static getDefaultTimeRecommendations(): ExerciseTimeRecommendation[] {
    return [
      {
        time_of_day: 'afternoon',
        hour_range: '2:00 PM - 6:00 PM',
        glucose_stability_score: 75,
        recommended_types: ['walking', 'cycling', 'gym'],
        avoid_if_glucose_below: 80,
        reasoning: 'Afternoon is generally optimal when glucose is most stable after meals',
      },
      {
        time_of_day: 'morning',
        hour_range: '5:00 AM - 11:00 AM',
        glucose_stability_score: 65,
        recommended_types: ['walking', 'yoga'],
        avoid_if_glucose_below: 100,
        reasoning: 'Morning exercise may require carb intake to prevent hypoglycemia',
      },
      {
        time_of_day: 'midday',
        hour_range: '11:00 AM - 2:00 PM',
        glucose_stability_score: 70,
        recommended_types: ['walking', 'gym'],
        avoid_if_glucose_below: 90,
        reasoning: 'Midday works well when timed appropriately around lunch',
      },
      {
        time_of_day: 'evening',
        hour_range: '6:00 PM - 10:00 PM',
        glucose_stability_score: 60,
        recommended_types: ['walking', 'yoga', 'strength'],
        avoid_if_glucose_below: 100,
        reasoning: 'Evening exercise may cause delayed glucose drops; have a bedtime snack',
      },
    ];
  }

  private static categorizeGlucoseImpact(change: number): GlucoseImpactLevel {
    if (change < -40) return 'significant_drop';
    if (change < -15) return 'moderate_drop';
    if (change > 40) return 'significant_rise';
    if (change > 15) return 'moderate_rise';
    return 'stable';
  }
}

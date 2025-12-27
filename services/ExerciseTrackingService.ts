import { supabase } from '../lib/supabase';

export interface ExerciseLog {
  id: string;
  user_id: string;
  exercise_type: 'walking' | 'running' | 'cycling' | 'swimming' | 'gym' | 'sports' | 'yoga' | 'other';
  intensity: 'light' | 'moderate' | 'vigorous';
  duration_minutes: number;
  calories_burned?: number;
  distance?: number;
  glucose_before?: number;
  glucose_after?: number;
  notes?: string;
  created_at: string;
  exercise_time: string;
}

export interface ExerciseStats {
  total_workouts: number;
  total_minutes: number;
  total_calories: number;
  total_distance: number;
  average_duration: number;
  favorite_exercise: string;
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
}

import { supabase } from '../lib/supabase';

export interface GlucoseReading {
  id: string;
  user_id: string;
  glucose_value: number;
  reading_type: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime' | 'random';
  meal_log_id?: string;
  notes?: string;
  source: 'manual' | 'cgm' | 'meter';
  created_at: string;
  reading_time: string;
}

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
  coefficient_of_variation: number;
  total_readings: number;
}

export class GlucoseReadingService {
  static async addReading(
    userId: string,
    reading: Omit<GlucoseReading, 'id' | 'user_id' | 'created_at'>
  ): Promise<GlucoseReading | null> {
    try {
      const { data, error } = await supabase
        .from('glucose_readings')
        .insert({
          user_id: userId,
          ...reading,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding glucose reading:', error);
      return null;
    }
  }

  static async getReadings(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<GlucoseReading[]> {
    try {
      let query = supabase
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .order('reading_time', { ascending: false });

      if (startDate) {
        query = query.gte('reading_time', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('reading_time', endDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching glucose readings:', error);
      return [];
    }
  }

  static async deleteReading(readingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('glucose_readings')
        .delete()
        .eq('id', readingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting glucose reading:', error);
      return false;
    }
  }

  static async updateReading(
    readingId: string,
    updates: Partial<GlucoseReading>
  ): Promise<GlucoseReading | null> {
    try {
      const { data, error } = await supabase
        .from('glucose_readings')
        .update(updates)
        .eq('id', readingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating glucose reading:', error);
      return null;
    }
  }

  static async getGlucoseStats(
    userId: string,
    days: number = 30
  ): Promise<GlucoseStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const readings = await this.getReadings(userId, startDate);

      if (readings.length === 0) {
        return {
          average: 0,
          min: 0,
          max: 0,
          standardDeviation: 0,
          coefficient_of_variation: 0,
          total_readings: 0,
        };
      }

      const values = readings.map(r => r.glucose_value);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficient_of_variation = average > 0 ? (standardDeviation / average) * 100 : 0;

      return {
        average: Math.round(average),
        min,
        max,
        standardDeviation: Math.round(standardDeviation * 10) / 10,
        coefficient_of_variation: Math.round(coefficient_of_variation * 10) / 10,
        total_readings: readings.length,
      };
    } catch (error) {
      console.error('Error calculating glucose stats:', error);
      return {
        average: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        coefficient_of_variation: 0,
        total_readings: 0,
      };
    }
  }

  static estimateA1C(averageGlucose: number): number {
    return Math.round(((averageGlucose + 46.7) / 28.7) * 10) / 10;
  }

  static classifyReading(value: number, targetMin: number = 70, targetMax: number = 180): {
    classification: 'low' | 'in_range' | 'high';
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
  } {
    let classification: 'low' | 'in_range' | 'high';
    let severity: 'normal' | 'mild' | 'moderate' | 'severe';

    if (value < targetMin) {
      classification = 'low';
      if (value < 54) severity = 'severe';
      else if (value < 60) severity = 'moderate';
      else severity = 'mild';
    } else if (value > targetMax) {
      classification = 'high';
      if (value > 250) severity = 'severe';
      else if (value > 200) severity = 'moderate';
      else severity = 'mild';
    } else {
      classification = 'in_range';
      severity = 'normal';
    }

    return { classification, severity };
  }
}

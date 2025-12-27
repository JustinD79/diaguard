import { supabase } from '../lib/supabase';
import { GlucoseReadingService, GlucoseReading } from './GlucoseReadingService';

export interface TimeInRangeData {
  id: string;
  user_id: string;
  date: string;
  readings_count: number;
  time_in_range_percentage: number;
  time_above_range_percentage: number;
  time_below_range_percentage: number;
  average_glucose: number;
  glucose_variability: number;
  estimated_a1c: number;
  created_at: string;
  updated_at: string;
}

export interface AGPData {
  median: number[];
  percentile_25: number[];
  percentile_75: number[];
  percentile_10: number[];
  percentile_90: number[];
  target_range: { min: number; max: number };
}

export class TimeInRangeAnalyticsService {
  static readonly DEFAULT_TARGET_MIN = 70;
  static readonly DEFAULT_TARGET_MAX = 180;

  static async calculateDailyTIR(
    userId: string,
    date: Date,
    targetMin: number = this.DEFAULT_TARGET_MIN,
    targetMax: number = this.DEFAULT_TARGET_MAX
  ): Promise<TimeInRangeData | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const readings = await GlucoseReadingService.getReadings(
        userId,
        startOfDay,
        endOfDay
      );

      if (readings.length === 0) {
        return null;
      }

      const inRange = readings.filter(r => r.glucose_value >= targetMin && r.glucose_value <= targetMax).length;
      const aboveRange = readings.filter(r => r.glucose_value > targetMax).length;
      const belowRange = readings.filter(r => r.glucose_value < targetMin).length;

      const time_in_range_percentage = (inRange / readings.length) * 100;
      const time_above_range_percentage = (aboveRange / readings.length) * 100;
      const time_below_range_percentage = (belowRange / readings.length) * 100;

      const values = readings.map(r => r.glucose_value);
      const average_glucose = values.reduce((sum, val) => sum + val, 0) / values.length;

      const variance = values.reduce((sum, val) => sum + Math.pow(val - average_glucose, 2), 0) / values.length;
      const glucose_variability = Math.sqrt(variance);

      const estimated_a1c = GlucoseReadingService.estimateA1C(average_glucose);

      const { data, error } = await supabase
        .from('time_in_range_analytics')
        .upsert({
          user_id: userId,
          date: date.toISOString().split('T')[0],
          readings_count: readings.length,
          time_in_range_percentage: Math.round(time_in_range_percentage * 10) / 10,
          time_above_range_percentage: Math.round(time_above_range_percentage * 10) / 10,
          time_below_range_percentage: Math.round(time_below_range_percentage * 10) / 10,
          average_glucose: Math.round(average_glucose),
          glucose_variability: Math.round(glucose_variability * 10) / 10,
          estimated_a1c,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating daily TIR:', error);
      return null;
    }
  }

  static async getTIRHistory(
    userId: string,
    days: number = 30
  ): Promise<TimeInRangeData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('time_in_range_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching TIR history:', error);
      return [];
    }
  }

  static async getAverageTIR(
    userId: string,
    days: number = 30
  ): Promise<{
    average_tir: number;
    average_above: number;
    average_below: number;
    average_glucose: number;
    estimated_a1c: number;
    days_with_data: number;
  }> {
    try {
      const history = await this.getTIRHistory(userId, days);

      if (history.length === 0) {
        return {
          average_tir: 0,
          average_above: 0,
          average_below: 0,
          average_glucose: 0,
          estimated_a1c: 0,
          days_with_data: 0,
        };
      }

      const totalTIR = history.reduce((sum, day) => sum + day.time_in_range_percentage, 0);
      const totalAbove = history.reduce((sum, day) => sum + day.time_above_range_percentage, 0);
      const totalBelow = history.reduce((sum, day) => sum + day.time_below_range_percentage, 0);
      const totalGlucose = history.reduce((sum, day) => sum + day.average_glucose, 0);

      const average_tir = Math.round((totalTIR / history.length) * 10) / 10;
      const average_above = Math.round((totalAbove / history.length) * 10) / 10;
      const average_below = Math.round((totalBelow / history.length) * 10) / 10;
      const average_glucose = Math.round(totalGlucose / history.length);
      const estimated_a1c = GlucoseReadingService.estimateA1C(average_glucose);

      return {
        average_tir,
        average_above,
        average_below,
        average_glucose,
        estimated_a1c,
        days_with_data: history.length,
      };
    } catch (error) {
      console.error('Error calculating average TIR:', error);
      return {
        average_tir: 0,
        average_above: 0,
        average_below: 0,
        average_glucose: 0,
        estimated_a1c: 0,
        days_with_data: 0,
      };
    }
  }

  static async generateAGP(
    userId: string,
    days: number = 14,
    targetMin: number = this.DEFAULT_TARGET_MIN,
    targetMax: number = this.DEFAULT_TARGET_MAX
  ): Promise<AGPData> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const readings = await GlucoseReadingService.getReadings(userId, startDate);

      const hourlyData: number[][] = Array.from({ length: 24 }, () => []);

      readings.forEach(reading => {
        const hour = new Date(reading.reading_time).getHours();
        hourlyData[hour].push(reading.glucose_value);
      });

      const percentile = (arr: number[], p: number): number => {
        if (arr.length === 0) return 0;
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
      };

      const median = hourlyData.map(values => percentile(values, 50));
      const percentile_25 = hourlyData.map(values => percentile(values, 25));
      const percentile_75 = hourlyData.map(values => percentile(values, 75));
      const percentile_10 = hourlyData.map(values => percentile(values, 10));
      const percentile_90 = hourlyData.map(values => percentile(values, 90));

      return {
        median,
        percentile_25,
        percentile_75,
        percentile_10,
        percentile_90,
        target_range: { min: targetMin, max: targetMax },
      };
    } catch (error) {
      console.error('Error generating AGP:', error);
      return {
        median: Array(24).fill(0),
        percentile_25: Array(24).fill(0),
        percentile_75: Array(24).fill(0),
        percentile_10: Array(24).fill(0),
        percentile_90: Array(24).fill(0),
        target_range: { min: targetMin, max: targetMax },
      };
    }
  }

  static async getTIRGoalStatus(
    userId: string,
    days: number = 7
  ): Promise<{
    current_tir: number;
    goal_tir: number;
    goal_met: boolean;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    try {
      const recentAverage = await this.getAverageTIR(userId, days);
      const previousPeriod = await this.getAverageTIR(userId, days * 2);

      const goal_tir = 70;
      const current_tir = recentAverage.average_tir;
      const previous_tir = previousPeriod.average_tir;

      let trend: 'improving' | 'declining' | 'stable';
      const diff = current_tir - previous_tir;

      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'declining';
      else trend = 'stable';

      return {
        current_tir,
        goal_tir,
        goal_met: current_tir >= goal_tir,
        trend,
      };
    } catch (error) {
      console.error('Error getting TIR goal status:', error);
      return {
        current_tir: 0,
        goal_tir: 70,
        goal_met: false,
        trend: 'stable',
      };
    }
  }
}

import { supabase } from '@/lib/supabase';

export interface GlucoseReading {
  id: string;
  user_id: string;
  glucose_value: number;
  reading_time: string;
  reading_type: 'cgm' | 'finger_stick' | 'flash';
  trend_direction?: string;
  source?: string;
}

export interface TimeInRangeResult {
  period: 'day' | 'week' | 'month' | '90days';
  start_date: string;
  end_date: string;
  total_readings: number;
  very_low_count: number;
  low_count: number;
  in_range_count: number;
  high_count: number;
  very_high_count: number;
  very_low_pct: number;
  low_pct: number;
  in_range_pct: number;
  high_pct: number;
  very_high_pct: number;
  target_tir: number;
  meets_target: boolean;
}

export interface A1CEstimation {
  estimated_a1c: number;
  average_glucose: number;
  glucose_management_indicator: number;
  reading_count: number;
  days_of_data: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'improving' | 'stable' | 'worsening';
  previous_estimate?: number;
  change_from_previous?: number;
}

export interface GlycemicVariability {
  standard_deviation: number;
  coefficient_of_variation: number;
  mean_amplitude_glycemic_excursions: number;
  interquartile_range: number;
  stability_score: number;
  stability_rating: 'excellent' | 'good' | 'fair' | 'poor';
  average_glucose: number;
  min_glucose: number;
  max_glucose: number;
  glucose_range: number;
}

export interface GlucoseDistribution {
  buckets: Array<{
    range_start: number;
    range_end: number;
    count: number;
    percentage: number;
    label: string;
  }>;
  peak_range: string;
  median_glucose: number;
}

export interface GlucosePattern {
  pattern_type: 'dawn_phenomenon' | 'post_meal_spike' | 'nocturnal_hypo' | 'afternoon_drop' | 'exercise_effect';
  frequency: number;
  average_magnitude: number;
  typical_time: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface DailyGlucoseProfile {
  hour: number;
  average_glucose: number;
  min_glucose: number;
  max_glucose: number;
  reading_count: number;
  in_range_pct: number;
}

export interface TrendPrediction {
  direction: 'improving' | 'stable' | 'worsening';
  projected_a1c_30days: number;
  projected_tir_30days: number;
  confidence: number;
  factors: string[];
}

const GLUCOSE_RANGES = {
  VERY_LOW: { min: 0, max: 54 },
  LOW: { min: 54, max: 70 },
  IN_RANGE: { min: 70, max: 180 },
  HIGH: { min: 180, max: 250 },
  VERY_HIGH: { min: 250, max: 999 },
};

const TARGET_TIR = 70;

export class GlucoseAnalyticsService {
  static async getTimeInRange(
    userId: string,
    period: 'day' | 'week' | 'month' | '90days' = 'week'
  ): Promise<TimeInRangeResult> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value, reading_time')
        .eq('user_id', userId)
        .gte('reading_time', startDate.toISOString())
        .lte('reading_time', endDate.toISOString());

      if (error) throw error;

      const total = readings?.length || 0;
      if (total === 0) {
        return this.getEmptyTIRResult(period, startDate, endDate);
      }

      const counts = {
        very_low: 0,
        low: 0,
        in_range: 0,
        high: 0,
        very_high: 0,
      };

      readings.forEach(r => {
        const g = r.glucose_value;
        if (g < GLUCOSE_RANGES.VERY_LOW.max) counts.very_low++;
        else if (g < GLUCOSE_RANGES.LOW.max) counts.low++;
        else if (g <= GLUCOSE_RANGES.IN_RANGE.max) counts.in_range++;
        else if (g <= GLUCOSE_RANGES.HIGH.max) counts.high++;
        else counts.very_high++;
      });

      const inRangePct = Math.round((counts.in_range / total) * 100);

      return {
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_readings: total,
        very_low_count: counts.very_low,
        low_count: counts.low,
        in_range_count: counts.in_range,
        high_count: counts.high,
        very_high_count: counts.very_high,
        very_low_pct: Math.round((counts.very_low / total) * 100),
        low_pct: Math.round((counts.low / total) * 100),
        in_range_pct: inRangePct,
        high_pct: Math.round((counts.high / total) * 100),
        very_high_pct: Math.round((counts.very_high / total) * 100),
        target_tir: TARGET_TIR,
        meets_target: inRangePct >= TARGET_TIR,
      };
    } catch (error) {
      console.error('Error calculating TIR:', error);
      return this.getEmptyTIRResult(period, new Date(), new Date());
    }
  }

  static async getA1CEstimation(userId: string): Promise<A1CEstimation> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value, reading_time')
        .eq('user_id', userId)
        .gte('reading_time', startDate.toISOString())
        .order('reading_time', { ascending: true });

      if (error) throw error;

      if (!readings || readings.length === 0) {
        return this.getEmptyA1CResult();
      }

      const avgGlucose = readings.reduce((sum, r) => sum + r.glucose_value, 0) / readings.length;

      const estimatedA1C = this.calculateA1CFromAverage(avgGlucose);
      const gmi = this.calculateGMI(avgGlucose);

      const firstDate = new Date(readings[0].reading_time);
      const lastDate = new Date(readings[readings.length - 1].reading_time);
      const daysOfData = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (daysOfData >= 60 && readings.length >= 100) confidence = 'high';
      else if (daysOfData >= 30 && readings.length >= 50) confidence = 'medium';

      const previousEstimate = await this.getPreviousA1CEstimate(userId, startDate);
      let trend: 'improving' | 'stable' | 'worsening' = 'stable';
      let changeFromPrevious: number | undefined;

      if (previousEstimate !== null) {
        changeFromPrevious = estimatedA1C - previousEstimate;
        if (changeFromPrevious < -0.3) trend = 'improving';
        else if (changeFromPrevious > 0.3) trend = 'worsening';
      }

      return {
        estimated_a1c: Math.round(estimatedA1C * 10) / 10,
        average_glucose: Math.round(avgGlucose),
        glucose_management_indicator: Math.round(gmi * 10) / 10,
        reading_count: readings.length,
        days_of_data: daysOfData,
        confidence,
        trend,
        previous_estimate: previousEstimate !== null ? Math.round(previousEstimate * 10) / 10 : undefined,
        change_from_previous: changeFromPrevious !== undefined ? Math.round(changeFromPrevious * 10) / 10 : undefined,
      };
    } catch (error) {
      console.error('Error estimating A1C:', error);
      return this.getEmptyA1CResult();
    }
  }

  static async getGlycemicVariability(
    userId: string,
    days: number = 14
  ): Promise<GlycemicVariability> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value')
        .eq('user_id', userId)
        .gte('reading_time', startDate.toISOString());

      if (error) throw error;

      if (!readings || readings.length < 10) {
        return this.getEmptyVariabilityResult();
      }

      const values = readings.map(r => r.glucose_value).sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const min = values[0];
      const max = values[values.length - 1];

      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const sd = Math.sqrt(variance);

      const cv = (sd / mean) * 100;

      const q1 = values[Math.floor(values.length * 0.25)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;

      const mage = this.calculateMAGE(readings.map(r => r.glucose_value));

      const stabilityScore = this.calculateStabilityScore(cv, sd, mage);
      const stabilityRating = this.getStabilityRating(stabilityScore);

      return {
        standard_deviation: Math.round(sd * 10) / 10,
        coefficient_of_variation: Math.round(cv * 10) / 10,
        mean_amplitude_glycemic_excursions: Math.round(mage * 10) / 10,
        interquartile_range: Math.round(iqr),
        stability_score: stabilityScore,
        stability_rating: stabilityRating,
        average_glucose: Math.round(mean),
        min_glucose: min,
        max_glucose: max,
        glucose_range: max - min,
      };
    } catch (error) {
      console.error('Error calculating variability:', error);
      return this.getEmptyVariabilityResult();
    }
  }

  static async getGlucoseDistribution(
    userId: string,
    days: number = 14
  ): Promise<GlucoseDistribution> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value')
        .eq('user_id', userId)
        .gte('reading_time', startDate.toISOString());

      if (error) throw error;

      if (!readings || readings.length === 0) {
        return this.getEmptyDistribution();
      }

      const bucketSize = 20;
      const buckets: Record<number, number> = {};

      readings.forEach(r => {
        const bucket = Math.floor(r.glucose_value / bucketSize) * bucketSize;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
      });

      const total = readings.length;
      const distributionBuckets = Object.entries(buckets)
        .map(([start, count]) => ({
          range_start: parseInt(start),
          range_end: parseInt(start) + bucketSize,
          count,
          percentage: Math.round((count / total) * 100),
          label: `${start}-${parseInt(start) + bucketSize}`,
        }))
        .sort((a, b) => a.range_start - b.range_start);

      const peakBucket = distributionBuckets.reduce((max, b) =>
        b.count > max.count ? b : max
      , distributionBuckets[0]);

      const sortedValues = readings.map(r => r.glucose_value).sort((a, b) => a - b);
      const median = sortedValues[Math.floor(sortedValues.length / 2)];

      return {
        buckets: distributionBuckets,
        peak_range: peakBucket.label,
        median_glucose: median,
      };
    } catch (error) {
      console.error('Error getting distribution:', error);
      return this.getEmptyDistribution();
    }
  }

  static async detectPatterns(userId: string, days: number = 14): Promise<GlucosePattern[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value, reading_time')
        .eq('user_id', userId)
        .gte('reading_time', startDate.toISOString())
        .order('reading_time', { ascending: true });

      if (error) throw error;

      if (!readings || readings.length < 20) return [];

      const patterns: GlucosePattern[] = [];

      const dawnResult = this.detectDawnPhenomenon(readings);
      if (dawnResult) patterns.push(dawnResult);

      const nocturnal = this.detectNocturnalHypo(readings);
      if (nocturnal) patterns.push(nocturnal);

      const afternoon = this.detectAfternoonDrop(readings);
      if (afternoon) patterns.push(afternoon);

      return patterns;
    } catch (error) {
      console.error('Error detecting patterns:', error);
      return [];
    }
  }

  static async getDailyGlucoseProfile(
    userId: string,
    days: number = 14
  ): Promise<DailyGlucoseProfile[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value, reading_time')
        .eq('user_id', userId)
        .gte('reading_time', startDate.toISOString());

      if (error) throw error;

      if (!readings || readings.length === 0) return [];

      const hourlyData: Record<number, number[]> = {};
      for (let h = 0; h < 24; h++) hourlyData[h] = [];

      readings.forEach(r => {
        const hour = new Date(r.reading_time).getHours();
        hourlyData[hour].push(r.glucose_value);
      });

      return Object.entries(hourlyData).map(([hour, values]) => {
        if (values.length === 0) {
          return {
            hour: parseInt(hour),
            average_glucose: 0,
            min_glucose: 0,
            max_glucose: 0,
            reading_count: 0,
            in_range_pct: 0,
          };
        }

        const sorted = values.sort((a, b) => a - b);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const inRange = values.filter(v => v >= 70 && v <= 180).length;

        return {
          hour: parseInt(hour),
          average_glucose: Math.round(avg),
          min_glucose: sorted[0],
          max_glucose: sorted[sorted.length - 1],
          reading_count: values.length,
          in_range_pct: Math.round((inRange / values.length) * 100),
        };
      }).sort((a, b) => a.hour - b.hour);
    } catch (error) {
      console.error('Error getting daily profile:', error);
      return [];
    }
  }

  static async getTrendPrediction(userId: string): Promise<TrendPrediction> {
    try {
      const [currentTIR, previousTIR, currentA1C] = await Promise.all([
        this.getTimeInRange(userId, 'week'),
        this.getTimeInRange(userId, 'month'),
        this.getA1CEstimation(userId),
      ]);

      const tirTrend = currentTIR.in_range_pct - previousTIR.in_range_pct;
      const factors: string[] = [];

      let direction: 'improving' | 'stable' | 'worsening' = 'stable';
      if (tirTrend > 5) {
        direction = 'improving';
        factors.push('Time in range increasing');
      } else if (tirTrend < -5) {
        direction = 'worsening';
        factors.push('Time in range decreasing');
      }

      if (currentA1C.trend === 'improving') {
        factors.push('Estimated A1C trending down');
        if (direction !== 'improving') direction = 'improving';
      } else if (currentA1C.trend === 'worsening') {
        factors.push('Estimated A1C trending up');
        if (direction !== 'worsening') direction = 'worsening';
      }

      let projectedA1C = currentA1C.estimated_a1c;
      if (direction === 'improving') projectedA1C -= 0.2;
      else if (direction === 'worsening') projectedA1C += 0.2;

      let projectedTIR = currentTIR.in_range_pct;
      if (direction === 'improving') projectedTIR = Math.min(100, projectedTIR + 5);
      else if (direction === 'worsening') projectedTIR = Math.max(0, projectedTIR - 5);

      if (factors.length === 0) factors.push('Metrics stable');

      return {
        direction,
        projected_a1c_30days: Math.round(projectedA1C * 10) / 10,
        projected_tir_30days: projectedTIR,
        confidence: currentA1C.confidence === 'high' ? 0.8 : currentA1C.confidence === 'medium' ? 0.6 : 0.4,
        factors,
      };
    } catch (error) {
      console.error('Error getting trend prediction:', error);
      return {
        direction: 'stable',
        projected_a1c_30days: 0,
        projected_tir_30days: 0,
        confidence: 0,
        factors: ['Insufficient data'],
      };
    }
  }

  static async getComprehensiveAnalytics(userId: string): Promise<{
    tir_daily: TimeInRangeResult;
    tir_weekly: TimeInRangeResult;
    tir_monthly: TimeInRangeResult;
    tir_90days: TimeInRangeResult;
    a1c: A1CEstimation;
    variability: GlycemicVariability;
    distribution: GlucoseDistribution;
    patterns: GlucosePattern[];
    daily_profile: DailyGlucoseProfile[];
    trend: TrendPrediction;
  }> {
    const [
      tir_daily,
      tir_weekly,
      tir_monthly,
      tir_90days,
      a1c,
      variability,
      distribution,
      patterns,
      daily_profile,
      trend,
    ] = await Promise.all([
      this.getTimeInRange(userId, 'day'),
      this.getTimeInRange(userId, 'week'),
      this.getTimeInRange(userId, 'month'),
      this.getTimeInRange(userId, '90days'),
      this.getA1CEstimation(userId),
      this.getGlycemicVariability(userId),
      this.getGlucoseDistribution(userId),
      this.detectPatterns(userId),
      this.getDailyGlucoseProfile(userId),
      this.getTrendPrediction(userId),
    ]);

    return {
      tir_daily,
      tir_weekly,
      tir_monthly,
      tir_90days,
      a1c,
      variability,
      distribution,
      patterns,
      daily_profile,
      trend,
    };
  }

  private static getPeriodDates(period: 'day' | 'week' | 'month' | '90days'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    return { startDate, endDate };
  }

  private static calculateA1CFromAverage(avgGlucose: number): number {
    return (avgGlucose + 46.7) / 28.7;
  }

  private static calculateGMI(avgGlucose: number): number {
    return 3.31 + (0.02392 * avgGlucose);
  }

  private static calculateMAGE(values: number[]): number {
    if (values.length < 5) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const sd = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);

    const excursions: number[] = [];
    let lastPeak = values[0];
    let lastValley = values[0];
    let lookingForPeak = values[1] > values[0];

    for (let i = 1; i < values.length; i++) {
      if (lookingForPeak) {
        if (values[i] > lastPeak) {
          lastPeak = values[i];
        } else if (lastPeak - values[i] > sd) {
          const excursion = lastPeak - lastValley;
          if (excursion > sd) excursions.push(excursion);
          lastValley = values[i];
          lookingForPeak = false;
        }
      } else {
        if (values[i] < lastValley) {
          lastValley = values[i];
        } else if (values[i] - lastValley > sd) {
          const excursion = lastPeak - lastValley;
          if (excursion > sd) excursions.push(excursion);
          lastPeak = values[i];
          lookingForPeak = true;
        }
      }
    }

    return excursions.length > 0 ? excursions.reduce((a, b) => a + b, 0) / excursions.length : 0;
  }

  private static calculateStabilityScore(cv: number, sd: number, mage: number): number {
    let score = 100;

    if (cv > 36) score -= 30;
    else if (cv > 33) score -= 15;

    if (sd > 50) score -= 25;
    else if (sd > 40) score -= 10;

    if (mage > 100) score -= 25;
    else if (mage > 70) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private static getStabilityRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  private static async getPreviousA1CEstimate(userId: string, beforeDate: Date): Promise<number | null> {
    try {
      const prevStartDate = new Date(beforeDate);
      prevStartDate.setDate(prevStartDate.getDate() - 90);

      const { data: readings, error } = await supabase
        .from('glucose_readings')
        .select('glucose_value')
        .eq('user_id', userId)
        .gte('reading_time', prevStartDate.toISOString())
        .lt('reading_time', beforeDate.toISOString());

      if (error || !readings || readings.length < 30) return null;

      const avgGlucose = readings.reduce((sum, r) => sum + r.glucose_value, 0) / readings.length;
      return this.calculateA1CFromAverage(avgGlucose);
    } catch {
      return null;
    }
  }

  private static detectDawnPhenomenon(readings: { glucose_value: number; reading_time: string }[]): GlucosePattern | null {
    const earlyMorningReadings = readings.filter(r => {
      const hour = new Date(r.reading_time).getHours();
      return hour >= 4 && hour <= 7;
    });

    const nightReadings = readings.filter(r => {
      const hour = new Date(r.reading_time).getHours();
      return hour >= 0 && hour <= 3;
    });

    if (earlyMorningReadings.length < 5 || nightReadings.length < 5) return null;

    const earlyAvg = earlyMorningReadings.reduce((s, r) => s + r.glucose_value, 0) / earlyMorningReadings.length;
    const nightAvg = nightReadings.reduce((s, r) => s + r.glucose_value, 0) / nightReadings.length;

    const rise = earlyAvg - nightAvg;

    if (rise > 20) {
      return {
        pattern_type: 'dawn_phenomenon',
        frequency: Math.round((earlyMorningReadings.length / 14) * 100),
        average_magnitude: Math.round(rise),
        typical_time: '4:00 AM - 7:00 AM',
        confidence: rise > 40 ? 'high' : rise > 30 ? 'medium' : 'low',
        description: `Glucose rises an average of ${Math.round(rise)} mg/dL in early morning hours`,
        recommendation: 'Consider discussing with your healthcare provider about adjusting overnight basal insulin or timing of evening meals',
      };
    }

    return null;
  }

  private static detectNocturnalHypo(readings: { glucose_value: number; reading_time: string }[]): GlucosePattern | null {
    const nightReadings = readings.filter(r => {
      const hour = new Date(r.reading_time).getHours();
      return hour >= 0 && hour <= 5;
    });

    const hypoEvents = nightReadings.filter(r => r.glucose_value < 70);
    const hypoRate = nightReadings.length > 0 ? (hypoEvents.length / nightReadings.length) * 100 : 0;

    if (hypoRate > 10 && hypoEvents.length >= 2) {
      const avgLow = hypoEvents.reduce((s, r) => s + r.glucose_value, 0) / hypoEvents.length;
      return {
        pattern_type: 'nocturnal_hypo',
        frequency: Math.round(hypoRate),
        average_magnitude: Math.round(70 - avgLow),
        typical_time: '12:00 AM - 5:00 AM',
        confidence: hypoRate > 20 ? 'high' : 'medium',
        description: `Nighttime glucose drops below 70 mg/dL approximately ${Math.round(hypoRate)}% of nights`,
        recommendation: 'Consider a bedtime snack with protein and complex carbs, and discuss with your provider about overnight basal rates',
      };
    }

    return null;
  }

  private static detectAfternoonDrop(readings: { glucose_value: number; reading_time: string }[]): GlucosePattern | null {
    const afternoonReadings = readings.filter(r => {
      const hour = new Date(r.reading_time).getHours();
      return hour >= 14 && hour <= 17;
    });

    const morningReadings = readings.filter(r => {
      const hour = new Date(r.reading_time).getHours();
      return hour >= 10 && hour <= 12;
    });

    if (afternoonReadings.length < 5 || morningReadings.length < 5) return null;

    const afternoonAvg = afternoonReadings.reduce((s, r) => s + r.glucose_value, 0) / afternoonReadings.length;
    const morningAvg = morningReadings.reduce((s, r) => s + r.glucose_value, 0) / morningReadings.length;

    const drop = morningAvg - afternoonAvg;

    if (drop > 30) {
      return {
        pattern_type: 'afternoon_drop',
        frequency: Math.round((afternoonReadings.length / 14) * 100),
        average_magnitude: Math.round(drop),
        typical_time: '2:00 PM - 5:00 PM',
        confidence: drop > 50 ? 'high' : 'medium',
        description: `Glucose typically drops ${Math.round(drop)} mg/dL in the afternoon`,
        recommendation: 'Consider a small afternoon snack or discuss lunch insulin timing with your provider',
      };
    }

    return null;
  }

  private static getEmptyTIRResult(period: 'day' | 'week' | 'month' | '90days', startDate: Date, endDate: Date): TimeInRangeResult {
    return {
      period,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      total_readings: 0,
      very_low_count: 0,
      low_count: 0,
      in_range_count: 0,
      high_count: 0,
      very_high_count: 0,
      very_low_pct: 0,
      low_pct: 0,
      in_range_pct: 0,
      high_pct: 0,
      very_high_pct: 0,
      target_tir: TARGET_TIR,
      meets_target: false,
    };
  }

  private static getEmptyA1CResult(): A1CEstimation {
    return {
      estimated_a1c: 0,
      average_glucose: 0,
      glucose_management_indicator: 0,
      reading_count: 0,
      days_of_data: 0,
      confidence: 'low',
      trend: 'stable',
    };
  }

  private static getEmptyVariabilityResult(): GlycemicVariability {
    return {
      standard_deviation: 0,
      coefficient_of_variation: 0,
      mean_amplitude_glycemic_excursions: 0,
      interquartile_range: 0,
      stability_score: 0,
      stability_rating: 'poor',
      average_glucose: 0,
      min_glucose: 0,
      max_glucose: 0,
      glucose_range: 0,
    };
  }

  private static getEmptyDistribution(): GlucoseDistribution {
    return {
      buckets: [],
      peak_range: 'N/A',
      median_glucose: 0,
    };
  }
}

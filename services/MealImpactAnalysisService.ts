import { supabase } from '@/lib/supabase';

export interface MealGlucoseResponse {
  meal_id: string;
  meal_name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_time: string;
  total_carbs: number;
  glucose_before: number;
  glucose_1hr: number | null;
  glucose_2hr: number | null;
  glucose_peak: number;
  peak_time_minutes: number;
  glucose_rise: number;
  time_to_return: number | null;
  area_under_curve: number;
  response_rating: 'excellent' | 'good' | 'moderate' | 'poor';
  foods: string[];
}

export interface FoodImpactScore {
  food_name: string;
  occurrences: number;
  avg_glucose_rise: number;
  avg_peak_time: number;
  avg_carbs_per_serving: number;
  impact_score: number;
  impact_rating: 'low' | 'moderate' | 'high';
  best_pairing: string | null;
  worst_pairing: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface MealRanking {
  rank: number;
  meal_id: string;
  meal_name: string;
  meal_type: string;
  total_carbs: number;
  glucose_response_score: number;
  foods: string[];
  date: string;
}

export interface OptimalMealTiming {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  optimal_time_range: string;
  avg_glucose_response: number;
  best_hour: number;
  worst_hour: number;
  recommendation: string;
  sample_size: number;
}

export interface MealPatternInsight {
  insight_type: 'positive' | 'negative' | 'neutral';
  category: 'food_combination' | 'timing' | 'portion' | 'meal_type';
  title: string;
  description: string;
  supporting_data: string;
  actionable_tip: string;
}

export interface DailyMealSummary {
  date: string;
  total_meals: number;
  total_carbs: number;
  avg_glucose_response: number;
  best_meal: string | null;
  worst_meal: string | null;
  in_range_meals_pct: number;
}

export interface MealComparisonResult {
  meal_a: {
    name: string;
    avg_glucose_rise: number;
    avg_peak_time: number;
    occurrences: number;
  };
  meal_b: {
    name: string;
    avg_glucose_rise: number;
    avg_peak_time: number;
    occurrences: number;
  };
  comparison: {
    glucose_rise_diff: number;
    peak_time_diff: number;
    recommended: 'a' | 'b' | 'equal';
    reasoning: string;
  };
}

export class MealImpactAnalysisService {
  static async getMealGlucoseResponses(
    userId: string,
    days: number = 30
  ): Promise<MealGlucoseResponse[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: meals, error } = await supabase
        .from('meal_logs')
        .select(`
          id,
          meal_type,
          meal_time,
          total_carbs,
          notes,
          meal_foods (
            food_name,
            carbs
          )
        `)
        .eq('user_id', userId)
        .gte('meal_time', startDate.toISOString())
        .order('meal_time', { ascending: false });

      if (error) throw error;
      if (!meals || meals.length === 0) return [];

      const responses: MealGlucoseResponse[] = [];

      for (const meal of meals) {
        const mealTime = new Date(meal.meal_time);
        const before = new Date(mealTime.getTime() - 30 * 60000);
        const after1hr = new Date(mealTime.getTime() + 60 * 60000);
        const after2hr = new Date(mealTime.getTime() + 120 * 60000);
        const after3hr = new Date(mealTime.getTime() + 180 * 60000);

        const { data: glucoseReadings } = await supabase
          .from('glucose_readings')
          .select('glucose_value, reading_time')
          .eq('user_id', userId)
          .gte('reading_time', before.toISOString())
          .lte('reading_time', after3hr.toISOString())
          .order('reading_time', { ascending: true });

        if (!glucoseReadings || glucoseReadings.length < 2) continue;

        const beforeReading = this.findClosestReading(glucoseReadings, before);
        const reading1hr = this.findClosestReading(glucoseReadings, after1hr, 30);
        const reading2hr = this.findClosestReading(glucoseReadings, after2hr, 30);

        if (!beforeReading) continue;

        const peakReading = glucoseReadings.reduce((max, r) =>
          r.glucose_value > max.glucose_value ? r : max
        );

        const peakTimeMinutes = Math.round(
          (new Date(peakReading.reading_time).getTime() - mealTime.getTime()) / 60000
        );

        const glucoseRise = peakReading.glucose_value - beforeReading.glucose_value;

        const returnReading = glucoseReadings.find((r, i) => {
          if (i === 0) return false;
          const prevReading = glucoseReadings[i - 1];
          return (
            new Date(r.reading_time) > new Date(peakReading.reading_time) &&
            r.glucose_value <= beforeReading.glucose_value + 20 &&
            prevReading.glucose_value > beforeReading.glucose_value + 20
          );
        });

        const timeToReturn = returnReading
          ? Math.round((new Date(returnReading.reading_time).getTime() - mealTime.getTime()) / 60000)
          : null;

        const auc = this.calculateAUC(glucoseReadings, beforeReading.glucose_value, mealTime);

        const foods = (meal.meal_foods || []).map((f: any) => f.food_name);
        const mealName = foods.length > 0 ? foods.slice(0, 3).join(', ') : meal.notes || 'Unnamed meal';

        responses.push({
          meal_id: meal.id,
          meal_name: mealName,
          meal_type: meal.meal_type,
          meal_time: meal.meal_time,
          total_carbs: meal.total_carbs || 0,
          glucose_before: beforeReading.glucose_value,
          glucose_1hr: reading1hr?.glucose_value || null,
          glucose_2hr: reading2hr?.glucose_value || null,
          glucose_peak: peakReading.glucose_value,
          peak_time_minutes: peakTimeMinutes,
          glucose_rise: glucoseRise,
          time_to_return: timeToReturn,
          area_under_curve: auc,
          response_rating: this.rateGlucoseResponse(glucoseRise, peakReading.glucose_value),
          foods,
        });
      }

      return responses;
    } catch (error) {
      console.error('Error getting meal glucose responses:', error);
      return [];
    }
  }

  static async getFoodImpactScores(
    userId: string,
    days: number = 60
  ): Promise<FoodImpactScore[]> {
    try {
      const responses = await this.getMealGlucoseResponses(userId, days);
      if (responses.length === 0) return [];

      const foodData: Record<string, {
        rises: number[];
        peakTimes: number[];
        carbs: number[];
        pairings: Record<string, number[]>;
      }> = {};

      responses.forEach(response => {
        response.foods.forEach(food => {
          if (!foodData[food]) {
            foodData[food] = { rises: [], peakTimes: [], carbs: [], pairings: {} };
          }

          foodData[food].rises.push(response.glucose_rise);
          foodData[food].peakTimes.push(response.peak_time_minutes);

          response.foods.forEach(otherFood => {
            if (otherFood !== food) {
              if (!foodData[food].pairings[otherFood]) {
                foodData[food].pairings[otherFood] = [];
              }
              foodData[food].pairings[otherFood].push(response.glucose_rise);
            }
          });
        });
      });

      const { data: mealFoods } = await supabase
        .from('meal_foods')
        .select('food_name, carbs')
        .eq('user_id', userId);

      if (mealFoods) {
        mealFoods.forEach(f => {
          if (foodData[f.food_name] && f.carbs) {
            foodData[f.food_name].carbs.push(f.carbs);
          }
        });
      }

      const scores: FoodImpactScore[] = Object.entries(foodData)
        .filter(([, data]) => data.rises.length >= 2)
        .map(([food, data]) => {
          const avgRise = data.rises.reduce((a, b) => a + b, 0) / data.rises.length;
          const avgPeakTime = data.peakTimes.reduce((a, b) => a + b, 0) / data.peakTimes.length;
          const avgCarbs = data.carbs.length > 0
            ? data.carbs.reduce((a, b) => a + b, 0) / data.carbs.length
            : 0;

          let bestPairing: string | null = null;
          let worstPairing: string | null = null;
          let bestAvg = Infinity;
          let worstAvg = -Infinity;

          Object.entries(data.pairings).forEach(([pairing, rises]) => {
            if (rises.length >= 2) {
              const pairingAvg = rises.reduce((a, b) => a + b, 0) / rises.length;
              if (pairingAvg < bestAvg) {
                bestAvg = pairingAvg;
                bestPairing = pairing;
              }
              if (pairingAvg > worstAvg) {
                worstAvg = pairingAvg;
                worstPairing = pairing;
              }
            }
          });

          const impactScore = this.calculateImpactScore(avgRise, avgPeakTime);

          return {
            food_name: food,
            occurrences: data.rises.length,
            avg_glucose_rise: Math.round(avgRise),
            avg_peak_time: Math.round(avgPeakTime),
            avg_carbs_per_serving: Math.round(avgCarbs),
            impact_score: impactScore,
            impact_rating: impactScore < 40 ? 'low' : impactScore < 70 ? 'moderate' : 'high',
            best_pairing: bestPairing,
            worst_pairing: worstPairing,
            confidence: data.rises.length >= 10 ? 'high' : data.rises.length >= 5 ? 'medium' : 'low',
          };
        })
        .sort((a, b) => a.impact_score - b.impact_score);

      return scores;
    } catch (error) {
      console.error('Error calculating food impact scores:', error);
      return [];
    }
  }

  static async getBestAndWorstMeals(
    userId: string,
    limit: number = 5
  ): Promise<{ best: MealRanking[]; worst: MealRanking[] }> {
    try {
      const responses = await this.getMealGlucoseResponses(userId, 30);
      if (responses.length === 0) return { best: [], worst: [] };

      const ranked = responses.map((r, index) => ({
        rank: 0,
        meal_id: r.meal_id,
        meal_name: r.meal_name,
        meal_type: r.meal_type,
        total_carbs: r.total_carbs,
        glucose_response_score: this.calculateResponseScore(r),
        foods: r.foods,
        date: r.meal_time.split('T')[0],
      }));

      ranked.sort((a, b) => a.glucose_response_score - b.glucose_response_score);

      const best = ranked.slice(0, limit).map((m, i) => ({ ...m, rank: i + 1 }));
      const worst = ranked.slice(-limit).reverse().map((m, i) => ({ ...m, rank: i + 1 }));

      return { best, worst };
    } catch (error) {
      console.error('Error getting best/worst meals:', error);
      return { best: [], worst: [] };
    }
  }

  static async getOptimalMealTiming(userId: string): Promise<OptimalMealTiming[]> {
    try {
      const responses = await this.getMealGlucoseResponses(userId, 60);
      if (responses.length < 10) return this.getDefaultTimingRecommendations();

      const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      const results: OptimalMealTiming[] = [];

      for (const mealType of mealTypes) {
        const typeResponses = responses.filter(r => r.meal_type === mealType);
        if (typeResponses.length < 3) {
          results.push(this.getDefaultTimingForMealType(mealType));
          continue;
        }

        const hourlyData: Record<number, number[]> = {};
        typeResponses.forEach(r => {
          const hour = new Date(r.meal_time).getHours();
          if (!hourlyData[hour]) hourlyData[hour] = [];
          hourlyData[hour].push(r.glucose_rise);
        });

        const hourlyAvgs = Object.entries(hourlyData)
          .filter(([, rises]) => rises.length >= 2)
          .map(([hour, rises]) => ({
            hour: parseInt(hour),
            avg: rises.reduce((a, b) => a + b, 0) / rises.length,
          }));

        if (hourlyAvgs.length === 0) {
          results.push(this.getDefaultTimingForMealType(mealType));
          continue;
        }

        const bestHour = hourlyAvgs.reduce((min, h) => h.avg < min.avg ? h : min);
        const worstHour = hourlyAvgs.reduce((max, h) => h.avg > max.avg ? h : max);

        const avgResponse = typeResponses.reduce((s, r) => s + r.glucose_rise, 0) / typeResponses.length;

        results.push({
          meal_type: mealType,
          optimal_time_range: `${this.formatHour(bestHour.hour)} - ${this.formatHour(bestHour.hour + 1)}`,
          avg_glucose_response: Math.round(avgResponse),
          best_hour: bestHour.hour,
          worst_hour: worstHour.hour,
          recommendation: this.getTimingRecommendation(mealType, bestHour.hour, worstHour.hour, bestHour.avg - worstHour.avg),
          sample_size: typeResponses.length,
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting optimal meal timing:', error);
      return this.getDefaultTimingRecommendations();
    }
  }

  static async getMealPatternInsights(userId: string): Promise<MealPatternInsight[]> {
    try {
      const [responses, foodScores, timing] = await Promise.all([
        this.getMealGlucoseResponses(userId, 30),
        this.getFoodImpactScores(userId, 30),
        this.getOptimalMealTiming(userId),
      ]);

      const insights: MealPatternInsight[] = [];

      const lowImpactFoods = foodScores.filter(f => f.impact_rating === 'low' && f.occurrences >= 3);
      if (lowImpactFoods.length > 0) {
        insights.push({
          insight_type: 'positive',
          category: 'food_combination',
          title: 'Foods That Work Well For You',
          description: `${lowImpactFoods.slice(0, 3).map(f => f.food_name).join(', ')} consistently show minimal glucose impact`,
          supporting_data: `Average glucose rise: ${Math.round(lowImpactFoods[0].avg_glucose_rise)} mg/dL`,
          actionable_tip: 'Consider incorporating these foods more regularly as glucose-friendly options',
        });
      }

      const highImpactFoods = foodScores.filter(f => f.impact_rating === 'high' && f.occurrences >= 3);
      if (highImpactFoods.length > 0) {
        insights.push({
          insight_type: 'negative',
          category: 'food_combination',
          title: 'Foods That Cause Larger Glucose Spikes',
          description: `${highImpactFoods.slice(0, 3).map(f => f.food_name).join(', ')} tend to cause higher glucose responses`,
          supporting_data: `Average glucose rise: ${Math.round(highImpactFoods[0].avg_glucose_rise)} mg/dL`,
          actionable_tip: 'Try pairing these with protein or fiber, or reduce portion sizes',
        });
      }

      const goodPairings = foodScores
        .filter(f => f.best_pairing && f.occurrences >= 3)
        .slice(0, 2);

      goodPairings.forEach(food => {
        if (food.best_pairing) {
          insights.push({
            insight_type: 'positive',
            category: 'food_combination',
            title: 'Effective Food Pairing',
            description: `${food.food_name} paired with ${food.best_pairing} shows better glucose response`,
            supporting_data: `Based on ${food.occurrences} meals`,
            actionable_tip: `When eating ${food.food_name}, consider adding ${food.best_pairing}`,
          });
        }
      });

      timing.forEach(t => {
        if (t.sample_size >= 5 && Math.abs(t.best_hour - t.worst_hour) >= 2) {
          const diff = Math.abs(
            responses.filter(r => new Date(r.meal_time).getHours() === t.best_hour)
              .reduce((s, r) => s + r.glucose_rise, 0) -
            responses.filter(r => new Date(r.meal_time).getHours() === t.worst_hour)
              .reduce((s, r) => s + r.glucose_rise, 0)
          );

          if (diff > 20) {
            insights.push({
              insight_type: 'neutral',
              category: 'timing',
              title: `Optimal ${t.meal_type.charAt(0).toUpperCase() + t.meal_type.slice(1)} Timing`,
              description: `Your ${t.meal_type} shows better glucose response around ${this.formatHour(t.best_hour)}`,
              supporting_data: `Based on ${t.sample_size} meals`,
              actionable_tip: t.recommendation,
            });
          }
        }
      });

      const goodMeals = responses.filter(r => r.response_rating === 'excellent' || r.response_rating === 'good');
      if (goodMeals.length > responses.length * 0.6) {
        insights.push({
          insight_type: 'positive',
          category: 'meal_type',
          title: 'Great Meal Choices',
          description: `${Math.round((goodMeals.length / responses.length) * 100)}% of your meals have good glucose responses`,
          supporting_data: `${goodMeals.length} out of ${responses.length} meals`,
          actionable_tip: 'Keep up the great work with your food choices!',
        });
      }

      return insights;
    } catch (error) {
      console.error('Error getting meal pattern insights:', error);
      return [];
    }
  }

  static async getDailyMealSummaries(
    userId: string,
    days: number = 7
  ): Promise<DailyMealSummary[]> {
    try {
      const responses = await this.getMealGlucoseResponses(userId, days);
      if (responses.length === 0) return [];

      const dailyData: Record<string, MealGlucoseResponse[]> = {};

      responses.forEach(r => {
        const date = r.meal_time.split('T')[0];
        if (!dailyData[date]) dailyData[date] = [];
        dailyData[date].push(r);
      });

      return Object.entries(dailyData)
        .map(([date, meals]) => {
          const totalCarbs = meals.reduce((s, m) => s + m.total_carbs, 0);
          const avgResponse = meals.reduce((s, m) => s + m.glucose_rise, 0) / meals.length;
          const inRangeMeals = meals.filter(m =>
            m.response_rating === 'excellent' || m.response_rating === 'good'
          );

          const bestMeal = meals.reduce((best, m) =>
            this.calculateResponseScore(m) < this.calculateResponseScore(best) ? m : best
          );
          const worstMeal = meals.reduce((worst, m) =>
            this.calculateResponseScore(m) > this.calculateResponseScore(worst) ? m : worst
          );

          return {
            date,
            total_meals: meals.length,
            total_carbs: Math.round(totalCarbs),
            avg_glucose_response: Math.round(avgResponse),
            best_meal: bestMeal.meal_name,
            worst_meal: meals.length > 1 ? worstMeal.meal_name : null,
            in_range_meals_pct: Math.round((inRangeMeals.length / meals.length) * 100),
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting daily meal summaries:', error);
      return [];
    }
  }

  static async compareMeals(
    userId: string,
    mealNameA: string,
    mealNameB: string
  ): Promise<MealComparisonResult | null> {
    try {
      const responses = await this.getMealGlucoseResponses(userId, 90);

      const mealsA = responses.filter(r =>
        r.meal_name.toLowerCase().includes(mealNameA.toLowerCase()) ||
        r.foods.some(f => f.toLowerCase().includes(mealNameA.toLowerCase()))
      );

      const mealsB = responses.filter(r =>
        r.meal_name.toLowerCase().includes(mealNameB.toLowerCase()) ||
        r.foods.some(f => f.toLowerCase().includes(mealNameB.toLowerCase()))
      );

      if (mealsA.length < 2 || mealsB.length < 2) return null;

      const avgRiseA = mealsA.reduce((s, m) => s + m.glucose_rise, 0) / mealsA.length;
      const avgRiseB = mealsB.reduce((s, m) => s + m.glucose_rise, 0) / mealsB.length;
      const avgPeakA = mealsA.reduce((s, m) => s + m.peak_time_minutes, 0) / mealsA.length;
      const avgPeakB = mealsB.reduce((s, m) => s + m.peak_time_minutes, 0) / mealsB.length;

      const riseDiff = avgRiseA - avgRiseB;
      const peakDiff = avgPeakA - avgPeakB;

      let recommended: 'a' | 'b' | 'equal' = 'equal';
      let reasoning = 'Both options have similar glucose impact';

      if (Math.abs(riseDiff) > 15) {
        if (riseDiff < 0) {
          recommended = 'a';
          reasoning = `${mealNameA} causes ${Math.abs(Math.round(riseDiff))} mg/dL less glucose rise`;
        } else {
          recommended = 'b';
          reasoning = `${mealNameB} causes ${Math.abs(Math.round(riseDiff))} mg/dL less glucose rise`;
        }
      }

      return {
        meal_a: {
          name: mealNameA,
          avg_glucose_rise: Math.round(avgRiseA),
          avg_peak_time: Math.round(avgPeakA),
          occurrences: mealsA.length,
        },
        meal_b: {
          name: mealNameB,
          avg_glucose_rise: Math.round(avgRiseB),
          avg_peak_time: Math.round(avgPeakB),
          occurrences: mealsB.length,
        },
        comparison: {
          glucose_rise_diff: Math.round(riseDiff),
          peak_time_diff: Math.round(peakDiff),
          recommended,
          reasoning,
        },
      };
    } catch (error) {
      console.error('Error comparing meals:', error);
      return null;
    }
  }

  private static findClosestReading(
    readings: { glucose_value: number; reading_time: string }[],
    targetTime: Date,
    maxMinutes: number = 60
  ): { glucose_value: number; reading_time: string } | null {
    let closest = null;
    let minDiff = Infinity;

    readings.forEach(r => {
      const diff = Math.abs(new Date(r.reading_time).getTime() - targetTime.getTime());
      if (diff < minDiff && diff <= maxMinutes * 60000) {
        minDiff = diff;
        closest = r;
      }
    });

    return closest;
  }

  private static calculateAUC(
    readings: { glucose_value: number; reading_time: string }[],
    baseline: number,
    startTime: Date
  ): number {
    let auc = 0;

    for (let i = 1; i < readings.length; i++) {
      const t1 = (new Date(readings[i - 1].reading_time).getTime() - startTime.getTime()) / 60000;
      const t2 = (new Date(readings[i].reading_time).getTime() - startTime.getTime()) / 60000;
      const v1 = Math.max(0, readings[i - 1].glucose_value - baseline);
      const v2 = Math.max(0, readings[i].glucose_value - baseline);

      auc += ((v1 + v2) / 2) * (t2 - t1);
    }

    return Math.round(auc);
  }

  private static rateGlucoseResponse(
    rise: number,
    peak: number
  ): 'excellent' | 'good' | 'moderate' | 'poor' {
    if (rise <= 30 && peak <= 140) return 'excellent';
    if (rise <= 50 && peak <= 160) return 'good';
    if (rise <= 80 && peak <= 180) return 'moderate';
    return 'poor';
  }

  private static calculateImpactScore(avgRise: number, avgPeakTime: number): number {
    const riseScore = Math.min(100, (avgRise / 100) * 80);
    const timeScore = avgPeakTime < 30 ? 20 : avgPeakTime > 90 ? 0 : 10;
    return Math.round(riseScore + timeScore);
  }

  private static calculateResponseScore(response: MealGlucoseResponse): number {
    let score = response.glucose_rise;

    if (response.glucose_peak > 180) score += (response.glucose_peak - 180) * 0.5;
    if (response.peak_time_minutes < 30) score += 10;
    if (response.time_to_return && response.time_to_return > 180) score += 20;

    return score;
  }

  private static formatHour(hour: number): string {
    const h = hour % 24;
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    if (h < 12) return `${h}:00 AM`;
    return `${h - 12}:00 PM`;
  }

  private static getTimingRecommendation(
    mealType: string,
    bestHour: number,
    worstHour: number,
    diff: number
  ): string {
    if (Math.abs(diff) < 20) {
      return `Your ${mealType} timing is consistent - keep it up!`;
    }

    return `Try having ${mealType} around ${this.formatHour(bestHour)} for better glucose response`;
  }

  private static getDefaultTimingRecommendations(): OptimalMealTiming[] {
    return [
      {
        meal_type: 'breakfast',
        optimal_time_range: '7:00 AM - 9:00 AM',
        avg_glucose_response: 0,
        best_hour: 8,
        worst_hour: 10,
        recommendation: 'Eating breakfast within 1-2 hours of waking typically helps maintain stable glucose',
        sample_size: 0,
      },
      {
        meal_type: 'lunch',
        optimal_time_range: '12:00 PM - 1:00 PM',
        avg_glucose_response: 0,
        best_hour: 12,
        worst_hour: 15,
        recommendation: 'A consistent lunch time helps establish predictable glucose patterns',
        sample_size: 0,
      },
      {
        meal_type: 'dinner',
        optimal_time_range: '6:00 PM - 7:00 PM',
        avg_glucose_response: 0,
        best_hour: 18,
        worst_hour: 21,
        recommendation: 'Earlier dinners (3+ hours before bed) often result in better overnight glucose',
        sample_size: 0,
      },
      {
        meal_type: 'snack',
        optimal_time_range: '3:00 PM - 4:00 PM',
        avg_glucose_response: 0,
        best_hour: 15,
        worst_hour: 22,
        recommendation: 'Afternoon snacks can help prevent late-day glucose dips',
        sample_size: 0,
      },
    ];
  }

  private static getDefaultTimingForMealType(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): OptimalMealTiming {
    const defaults = this.getDefaultTimingRecommendations();
    return defaults.find(d => d.meal_type === mealType) || defaults[0];
  }
}

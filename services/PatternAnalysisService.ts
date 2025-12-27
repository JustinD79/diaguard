import { MealLoggingService, MealWithFoods } from './MealLoggingService';

/**
 * FDA-SAFE Pattern Analysis Service
 * Provides DESCRIPTIVE meal pattern insights
 * NO predictions, NO medical advice, NO treatment recommendations
 */

export interface MealPattern {
  period: string;
  totalMeals: number;
  averageCarbs: number;
  averageCalories: number;
  averageProtein: number;
  averageFat: number;
  mostCommonMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  carbTrend: 'stable' | 'increasing' | 'decreasing';
}

export interface CarbDistribution {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  averageCarbs: number;
  mealCount: number;
  percentage: number;
}

export interface DailyPattern {
  date: string;
  totalCarbs: number;
  totalCalories: number;
  mealCount: number;
  meals: Array<{
    type: string;
    carbs: number;
    time: string;
  }>;
}

export interface NutritionalTrend {
  nutrient: 'carbs' | 'protein' | 'fat' | 'calories';
  average: number;
  highest: number;
  lowest: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  dataPoints: Array<{ date: string; value: number }>;
}

export class PatternAnalysisService {
  /**
   * Analyze overall meal patterns for a user
   * DESCRIPTIVE ONLY - no predictions or recommendations
   */
  static async analyzeMealPatterns(
    userId: string,
    daysBack: number = 30
  ): Promise<MealPattern> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const meals = await MealLoggingService.getMealsByDateRange(
      userId,
      startDate.toISOString(),
      new Date().toISOString()
    );

    if (meals.length === 0) {
      return {
        period: `Last ${daysBack} days`,
        totalMeals: 0,
        averageCarbs: 0,
        averageCalories: 0,
        averageProtein: 0,
        averageFat: 0,
        mostCommonMealType: 'snack',
        carbTrend: 'stable',
      };
    }

    // Calculate averages
    const totalCarbs = meals.reduce((sum, m) => sum + m.total_carbs, 0);
    const totalCalories = meals.reduce((sum, m) => sum + m.total_calories, 0);

    // Calculate protein and fat from foods
    let totalProtein = 0;
    let totalFat = 0;
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        if (food.nutrition_data) {
          totalProtein += food.nutrition_data.protein || 0;
          totalFat += food.nutrition_data.fat || 0;
        }
      });
    });

    // Find most common meal type
    const mealTypeCounts = meals.reduce((acc, meal) => {
      acc[meal.meal_type] = (acc[meal.meal_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonMealType = Object.entries(mealTypeCounts).sort(
      ([, a], [, b]) => b - a
    )[0][0] as 'breakfast' | 'lunch' | 'dinner' | 'snack';

    // Calculate carb trend (simple linear regression slope)
    const carbTrend = this.calculateTrend(
      meals.map(m => ({ date: m.timestamp, value: m.total_carbs }))
    );

    return {
      period: `Last ${daysBack} days`,
      totalMeals: meals.length,
      averageCarbs: totalCarbs / meals.length,
      averageCalories: totalCalories / meals.length,
      averageProtein: totalProtein / meals.length,
      averageFat: totalFat / meals.length,
      mostCommonMealType,
      carbTrend,
    };
  }

  /**
   * Analyze carb distribution across meal types
   */
  static async analyzeCarbDistribution(
    userId: string,
    daysBack: number = 30
  ): Promise<CarbDistribution[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const meals = await MealLoggingService.getMealsByDateRange(
      userId,
      startDate.toISOString(),
      new Date().toISOString()
    );

    if (meals.length === 0) return [];

    const distribution = meals.reduce((acc, meal) => {
      if (!acc[meal.meal_type]) {
        acc[meal.meal_type] = { totalCarbs: 0, count: 0 };
      }
      acc[meal.meal_type].totalCarbs += meal.total_carbs;
      acc[meal.meal_type].count += 1;
      return acc;
    }, {} as Record<string, { totalCarbs: number; count: number }>);

    const totalMeals = meals.length;

    return Object.entries(distribution).map(([mealType, data]) => ({
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      averageCarbs: data.totalCarbs / data.count,
      mealCount: data.count,
      percentage: (data.count / totalMeals) * 100,
    }));
  }

  /**
   * Get daily patterns for visualization
   */
  static async getDailyPatterns(
    userId: string,
    daysBack: number = 7
  ): Promise<DailyPattern[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const meals = await MealLoggingService.getMealsByDateRange(
      userId,
      startDate.toISOString(),
      new Date().toISOString()
    );

    // Group meals by date
    const mealsByDate = meals.reduce((acc, meal) => {
      const date = new Date(meal.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(meal);
      return acc;
    }, {} as Record<string, MealWithFoods[]>);

    return Object.entries(mealsByDate).map(([date, dayMeals]) => ({
      date,
      totalCarbs: dayMeals.reduce((sum, m) => sum + m.total_carbs, 0),
      totalCalories: dayMeals.reduce((sum, m) => sum + m.total_calories, 0),
      mealCount: dayMeals.length,
      meals: dayMeals.map(m => ({
        type: m.meal_type,
        carbs: m.total_carbs,
        time: new Date(m.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    }));
  }

  /**
   * Analyze nutritional trends over time
   */
  static async analyzeNutritionalTrends(
    userId: string,
    daysBack: number = 30
  ): Promise<NutritionalTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const meals = await MealLoggingService.getMealsByDateRange(
      userId,
      startDate.toISOString(),
      new Date().toISOString()
    );

    if (meals.length === 0) return [];

    // Group by date and calculate daily totals
    const dailyData = meals.reduce((acc, meal) => {
      const date = new Date(meal.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { carbs: 0, calories: 0, protein: 0, fat: 0 };
      }
      acc[date].carbs += meal.total_carbs;
      acc[date].calories += meal.total_calories;

      meal.foods.forEach(food => {
        if (food.nutrition_data) {
          acc[date].protein += food.nutrition_data.protein || 0;
          acc[date].fat += food.nutrition_data.fat || 0;
        }
      });
      return acc;
    }, {} as Record<string, { carbs: number; calories: number; protein: number; fat: number }>);

    const dates = Object.keys(dailyData).sort();

    // Calculate trends for each nutrient
    const nutrients: Array<'carbs' | 'protein' | 'fat' | 'calories'> = [
      'carbs',
      'protein',
      'fat',
      'calories',
    ];

    return nutrients.map(nutrient => {
      const values = dates.map(date => dailyData[date][nutrient]);
      const dataPoints = dates.map(date => ({
        date,
        value: dailyData[date][nutrient],
      }));

      return {
        nutrient,
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        highest: Math.max(...values),
        lowest: Math.min(...values),
        trend: this.calculateTrend(dataPoints),
        dataPoints,
      };
    });
  }

  /**
   * Generate descriptive summary of patterns (FDA-SAFE)
   */
  static generatePatternSummary(pattern: MealPattern): string {
    const lines: string[] = [];

    lines.push(`📊 Meal Pattern Summary (${pattern.period})`);
    lines.push('');
    lines.push(`Total meals logged: ${pattern.totalMeals}`);
    lines.push(`Most common meal type: ${pattern.mostCommonMealType}`);
    lines.push('');
    lines.push('Average per meal:');
    lines.push(`• Carbohydrates: ${pattern.averageCarbs.toFixed(1)}g`);
    lines.push(`• Protein: ${pattern.averageProtein.toFixed(1)}g`);
    lines.push(`• Fat: ${pattern.averageFat.toFixed(1)}g`);
    lines.push(`• Calories: ${pattern.averageCalories.toFixed(0)}`);
    lines.push('');
    lines.push(`Carb intake trend: ${pattern.carbTrend}`);
    lines.push('');
    lines.push('💡 Note: These are descriptive statistics based on your logged meals.');
    lines.push('This information is for awareness only and does not constitute medical advice.');

    return lines.join('\n');
  }

  /**
   * Generate insights about carb distribution
   */
  static generateDistributionInsights(distribution: CarbDistribution[]): string {
    if (distribution.length === 0) {
      return 'No meal data available for analysis.';
    }

    const lines: string[] = [];
    lines.push('🍽️ Carb Distribution by Meal Type');
    lines.push('');

    distribution.forEach(dist => {
      const emoji = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍎',
      }[dist.mealType];

      lines.push(`${emoji} ${dist.mealType.charAt(0).toUpperCase() + dist.mealType.slice(1)}:`);
      lines.push(`  • ${dist.mealCount} meals (${dist.percentage.toFixed(1)}% of total)`);
      lines.push(`  • Average carbs: ${dist.averageCarbs.toFixed(1)}g`);
      lines.push('');
    });

    lines.push('💡 This shows how carbohydrates are distributed across your meal types.');

    return lines.join('\n');
  }

  /**
   * Calculate trend direction (simple linear regression slope)
   */
  private static calculateTrend(
    dataPoints: Array<{ date: string; value: number }>
  ): 'stable' | 'increasing' | 'decreasing' {
    if (dataPoints.length < 2) return 'stable';

    const n = dataPoints.length;
    const xValues = dataPoints.map((_, i) => i);
    const yValues = dataPoints.map(d => d.value);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
    const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Threshold: if slope is less than 0.5 units per day, consider stable
    if (Math.abs(slope) < 0.5) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Compare current period to previous period
   */
  static async compareTimePeriods(
    userId: string,
    daysInPeriod: number = 7
  ): Promise<{
    current: MealPattern;
    previous: MealPattern;
    changes: {
      carbChange: number;
      carbChangePercent: number;
      calorieChange: number;
      mealCountChange: number;
    };
  }> {
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - daysInPeriod);

    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - (daysInPeriod * 2));
    const previousEnd = new Date();
    previousEnd.setDate(previousEnd.getDate() - daysInPeriod);

    const [currentMeals, previousMeals] = await Promise.all([
      MealLoggingService.getMealsByDateRange(
        userId,
        currentStart.toISOString(),
        new Date().toISOString()
      ),
      MealLoggingService.getMealsByDateRange(
        userId,
        previousStart.toISOString(),
        previousEnd.toISOString()
      ),
    ]);

    const currentPattern = this.calculatePatternFromMeals(
      currentMeals,
      `Last ${daysInPeriod} days`
    );
    const previousPattern = this.calculatePatternFromMeals(
      previousMeals,
      `Previous ${daysInPeriod} days`
    );

    const carbChange = currentPattern.averageCarbs - previousPattern.averageCarbs;
    const carbChangePercent =
      previousPattern.averageCarbs > 0
        ? (carbChange / previousPattern.averageCarbs) * 100
        : 0;

    return {
      current: currentPattern,
      previous: previousPattern,
      changes: {
        carbChange,
        carbChangePercent,
        calorieChange: currentPattern.averageCalories - previousPattern.averageCalories,
        mealCountChange: currentPattern.totalMeals - previousPattern.totalMeals,
      },
    };
  }

  /**
   * Helper to calculate pattern from meals array
   */
  private static calculatePatternFromMeals(
    meals: MealWithFoods[],
    period: string
  ): MealPattern {
    if (meals.length === 0) {
      return {
        period,
        totalMeals: 0,
        averageCarbs: 0,
        averageCalories: 0,
        averageProtein: 0,
        averageFat: 0,
        mostCommonMealType: 'snack',
        carbTrend: 'stable',
      };
    }

    const totalCarbs = meals.reduce((sum, m) => sum + m.total_carbs, 0);
    const totalCalories = meals.reduce((sum, m) => sum + m.total_calories, 0);

    let totalProtein = 0;
    let totalFat = 0;
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        if (food.nutrition_data) {
          totalProtein += food.nutrition_data.protein || 0;
          totalFat += food.nutrition_data.fat || 0;
        }
      });
    });

    const mealTypeCounts = meals.reduce((acc, meal) => {
      acc[meal.meal_type] = (acc[meal.meal_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonMealType = Object.entries(mealTypeCounts).sort(
      ([, a], [, b]) => b - a
    )[0][0] as 'breakfast' | 'lunch' | 'dinner' | 'snack';

    const carbTrend = this.calculateTrend(
      meals.map(m => ({ date: m.timestamp, value: m.total_carbs }))
    );

    return {
      period,
      totalMeals: meals.length,
      averageCarbs: totalCarbs / meals.length,
      averageCalories: totalCalories / meals.length,
      averageProtein: totalProtein / meals.length,
      averageFat: totalFat / meals.length,
      mostCommonMealType,
      carbTrend,
    };
  }
}

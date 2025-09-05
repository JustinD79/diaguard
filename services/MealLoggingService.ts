import { supabase } from '@/lib/supabase';

export interface UserMeal {
  id?: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timestamp: string;
  total_carbs: number;
  total_calories: number;
  total_insulin: number;
  notes?: string;
  created_at?: string;
}

export interface MealFood {
  id?: string;
  meal_id: string;
  food_name: string;
  nutrition_data: any;
  quantity: number;
  scan_method: 'camera' | 'barcode' | 'manual' | 'search';
  confidence_score?: number;
  created_at?: string;
}

export interface MealWithFoods extends UserMeal {
  foods: MealFood[];
}

export class MealLoggingService {
  static async logMeal(meal: Omit<UserMeal, 'id' | 'created_at'>, foods: Omit<MealFood, 'id' | 'meal_id' | 'created_at'>[]): Promise<MealWithFoods> {
    try {
      // Insert meal
      const { data: mealData, error: mealError } = await supabase
        .from('user_meals')
        .insert(meal)
        .select()
        .single();

      if (mealError) {
        throw mealError;
      }

      // Insert foods
      const foodsWithMealId = foods.map(food => ({
        ...food,
        meal_id: mealData.id
      }));

      const { data: foodsData, error: foodsError } = await supabase
        .from('meal_foods')
        .insert(foodsWithMealId)
        .select();

      if (foodsError) {
        throw foodsError;
      }

      return {
        ...mealData,
        foods: foodsData || []
      };
    } catch (error) {
      console.error('Error logging meal:', error);
      throw new Error('Failed to log meal');
    }
  }

  static async getUserMeals(userId: string, limit: number = 50): Promise<MealWithFoods[]> {
    try {
      const { data: meals, error: mealsError } = await supabase
        .from('user_meals')
        .select(`
          *,
          meal_foods (*)
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (mealsError) {
        throw mealsError;
      }

      return meals?.map(meal => ({
        ...meal,
        foods: meal.meal_foods || []
      })) || [];
    } catch (error) {
      console.error('Error fetching user meals:', error);
      throw new Error('Failed to fetch user meals');
    }
  }

  static async getMealsByDateRange(userId: string, startDate: string, endDate: string): Promise<MealWithFoods[]> {
    try {
      const { data: meals, error } = await supabase
        .from('user_meals')
        .select(`
          *,
          meal_foods (*)
        `)
        .eq('user_id', userId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      return meals?.map(meal => ({
        ...meal,
        foods: meal.meal_foods || []
      })) || [];
    } catch (error) {
      console.error('Error fetching meals by date range:', error);
      throw new Error('Failed to fetch meals');
    }
  }

  static async updateMeal(mealId: string, updates: Partial<UserMeal>): Promise<UserMeal> {
    try {
      const { data, error } = await supabase
        .from('user_meals')
        .update(updates)
        .eq('id', mealId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating meal:', error);
      throw new Error('Failed to update meal');
    }
  }

  static async deleteMeal(mealId: string): Promise<void> {
    try {
      // Delete meal foods first (cascade should handle this, but being explicit)
      await supabase
        .from('meal_foods')
        .delete()
        .eq('meal_id', mealId);

      // Delete meal
      const { error } = await supabase
        .from('user_meals')
        .delete()
        .eq('id', mealId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      throw new Error('Failed to delete meal');
    }
  }

  static async getDailyStats(userId: string, date: string): Promise<DailyMealStats> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const meals = await this.getMealsByDateRange(
        userId,
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      const stats = meals.reduce((acc, meal) => ({
        totalCarbs: acc.totalCarbs + meal.total_carbs,
        totalCalories: acc.totalCalories + meal.total_calories,
        totalInsulin: acc.totalInsulin + meal.total_insulin,
        mealsLogged: acc.mealsLogged + 1
      }), {
        totalCarbs: 0,
        totalCalories: 0,
        totalInsulin: 0,
        mealsLogged: 0
      });

      return {
        date,
        ...stats,
        avgCarbsPerMeal: stats.mealsLogged > 0 ? stats.totalCarbs / stats.mealsLogged : 0,
        avgCaloriesPerMeal: stats.mealsLogged > 0 ? stats.totalCalories / stats.mealsLogged : 0
      };
    } catch (error) {
      console.error('Error calculating daily stats:', error);
      throw new Error('Failed to calculate daily stats');
    }
  }

  static async getWeeklyStats(userId: string): Promise<DailyMealStats[]> {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const meals = await this.getMealsByDateRange(
        userId,
        weekAgo.toISOString(),
        today.toISOString()
      );

      // Group meals by date
      const mealsByDate = meals.reduce((acc, meal) => {
        const date = new Date(meal.timestamp).toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(meal);
        return acc;
      }, {} as { [date: string]: MealWithFoods[] });

      // Calculate stats for each day
      const weeklyStats: DailyMealStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        
        const dayMeals = mealsByDate[dateString] || [];
        const dayStats = dayMeals.reduce((acc, meal) => ({
          totalCarbs: acc.totalCarbs + meal.total_carbs,
          totalCalories: acc.totalCalories + meal.total_calories,
          totalInsulin: acc.totalInsulin + meal.total_insulin,
          mealsLogged: acc.mealsLogged + 1
        }), {
          totalCarbs: 0,
          totalCalories: 0,
          totalInsulin: 0,
          mealsLogged: 0
        });

        weeklyStats.push({
          date: date.toISOString().split('T')[0],
          ...dayStats,
          avgCarbsPerMeal: dayStats.mealsLogged > 0 ? dayStats.totalCarbs / dayStats.mealsLogged : 0,
          avgCaloriesPerMeal: dayStats.mealsLogged > 0 ? dayStats.totalCalories / dayStats.mealsLogged : 0
        });
      }

      return weeklyStats;
    } catch (error) {
      console.error('Error calculating weekly stats:', error);
      throw new Error('Failed to calculate weekly stats');
    }
  }
}

export interface DailyMealStats {
  date: string;
  totalCarbs: number;
  totalCalories: number;
  totalInsulin: number;
  mealsLogged: number;
  avgCarbsPerMeal: number;
  avgCaloriesPerMeal: number;
}
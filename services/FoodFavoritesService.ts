import { supabase } from '../lib/supabase';

export interface FoodFavorite {
  id: string;
  user_id: string;
  food_name: string;
  nutrition_data: {
    carbs: number;
    protein: number;
    fat: number;
    calories: number;
    fiber?: number;
    sugars?: number;
    serving_size?: string;
  };
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
  favorite_count: number;
  last_eaten: string;
  image_url?: string;
  source: 'ai_scan' | 'barcode' | 'manual' | 'template';
  created_at: string;
  updated_at: string;
}

export interface MealTemplate {
  id: string;
  user_id: string;
  template_name: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Array<{
    food_name: string;
    nutrition_data: any;
    portion?: string;
  }>;
  total_nutrition: {
    carbs: number;
    protein: number;
    fat: number;
    calories: number;
  };
  created_at: string;
  updated_at: string;
}

export interface RecentMeal {
  id: string;
  user_id: string;
  meal_name: string;
  meal_type?: string;
  food_items: Array<{
    name: string;
    nutrition: any;
    portion?: string;
  }>;
  total_nutrition: {
    carbs: number;
    protein: number;
    fat: number;
    calories: number;
  };
  logged_at: string;
  location?: string;
  notes?: string;
  times_repeated: number;
  last_repeated_at: string;
}

export interface FoodSuggestion {
  food_identifier: string;
  food_name: string;
  food_type: string;
  usage_count: number;
  last_used_at: string;
  relevance_score: number;
}

export class FoodFavoritesService {
  static async addToFavorites(
    userId: string,
    foodData: Omit<FoodFavorite, 'id' | 'user_id' | 'favorite_count' | 'created_at' | 'updated_at'>
  ): Promise<FoodFavorite | null> {
    try {
      const existing = await this.getFavoriteByName(userId, foodData.food_name);

      if (existing) {
        return await this.incrementFavoriteCount(existing.id);
      }

      const { data, error } = await supabase
        .from('food_favorites')
        .insert({
          user_id: userId,
          ...foodData,
          favorite_count: 1,
        })
        .select()
        .single();

      if (error) throw error;

      await this.updateFoodUsageStats(userId, data.id, foodData.food_name, 'favorite', foodData.meal_type);

      return data;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return null;
    }
  }

  static async getFavorites(
    userId: string,
    mealType?: string
  ): Promise<FoodFavorite[]> {
    try {
      let query = supabase
        .from('food_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('favorite_count', { ascending: false })
        .order('last_eaten', { ascending: false });

      if (mealType && mealType !== 'any') {
        query = query.or(`meal_type.eq.${mealType},meal_type.eq.any`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
  }

  static async getRecentFoods(userId: string, limit: number = 10): Promise<FoodFavorite[]> {
    try {
      const { data, error } = await supabase
        .from('food_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('last_eaten', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent foods:', error);
      return [];
    }
  }

  static async getFavoriteByName(
    userId: string,
    foodName: string
  ): Promise<FoodFavorite | null> {
    try {
      const { data, error } = await supabase
        .from('food_favorites')
        .select('*')
        .eq('user_id', userId)
        .ilike('food_name', foodName)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching favorite by name:', error);
      return null;
    }
  }

  static async incrementFavoriteCount(favoriteId: string): Promise<FoodFavorite | null> {
    try {
      const { data: current } = await supabase
        .from('food_favorites')
        .select('favorite_count')
        .eq('id', favoriteId)
        .single();

      const { data, error } = await supabase
        .from('food_favorites')
        .update({
          favorite_count: (current?.favorite_count || 0) + 1,
          last_eaten: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', favoriteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error incrementing favorite count:', error);
      return null;
    }
  }

  static async removeFavorite(favoriteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('food_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  }

  static async createMealTemplate(
    userId: string,
    template: Omit<MealTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<MealTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('meal_templates')
        .insert({
          user_id: userId,
          ...template,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating meal template:', error);
      return null;
    }
  }

  static async getMealTemplates(userId: string): Promise<MealTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching meal templates:', error);
      return [];
    }
  }

  static async deleteMealTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting meal template:', error);
      return false;
    }
  }

  static async logFavoriteFood(
    userId: string,
    favorite: FoodFavorite
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userId,
          food_name: favorite.food_name,
          carbs: favorite.nutrition_data.carbs,
          protein: favorite.nutrition_data.protein,
          fat: favorite.nutrition_data.fat,
          calories: favorite.nutrition_data.calories,
          fiber: favorite.nutrition_data.fiber || 0,
          sugars: favorite.nutrition_data.sugars || 0,
          meal_type: favorite.meal_type !== 'any' ? favorite.meal_type : null,
          portion_size: favorite.nutrition_data.serving_size,
          image_url: favorite.image_url,
          notes: 'Logged from favorites',
        });

      if (error) throw error;

      await this.incrementFavoriteCount(favorite.id);
      await this.updateFoodUsageStats(userId, favorite.id, favorite.food_name, 'favorite', favorite.meal_type);

      return true;
    } catch (error) {
      console.error('Error logging favorite food:', error);
      return false;
    }
  }

  static async saveRecentMeal(
    userId: string,
    mealData: Omit<RecentMeal, 'id' | 'user_id' | 'times_repeated' | 'last_repeated_at'>
  ): Promise<RecentMeal | null> {
    try {
      const existingMeal = await this.findSimilarRecentMeal(userId, mealData.meal_name, mealData.food_items);

      if (existingMeal) {
        const { data, error } = await supabase
          .from('recent_meals')
          .update({
            times_repeated: existingMeal.times_repeated + 1,
            last_repeated_at: new Date().toISOString(),
          })
          .eq('id', existingMeal.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('recent_meals')
        .insert({
          user_id: userId,
          meal_name: mealData.meal_name,
          meal_type: mealData.meal_type,
          food_items: mealData.food_items,
          total_nutrition: mealData.total_nutrition,
          logged_at: mealData.logged_at,
          location: mealData.location,
          notes: mealData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await this.updateFoodUsageStats(userId, data.id, mealData.meal_name, 'recent', mealData.meal_type);

      return data;
    } catch (error) {
      console.error('Error saving recent meal:', error);
      return null;
    }
  }

  static async getRecentMeals(userId: string, limit: number = 20): Promise<RecentMeal[]> {
    try {
      const { data, error } = await supabase
        .from('recent_meals')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent meals:', error);
      return [];
    }
  }

  static async getFrequentMeals(userId: string, limit: number = 10): Promise<RecentMeal[]> {
    try {
      const { data, error } = await supabase
        .from('recent_meals')
        .select('*')
        .eq('user_id', userId)
        .gte('times_repeated', 2)
        .order('times_repeated', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching frequent meals:', error);
      return [];
    }
  }

  static async repeatMeal(userId: string, mealId: string): Promise<boolean> {
    try {
      const { data: meal, error: fetchError } = await supabase
        .from('recent_meals')
        .select('*')
        .eq('id', mealId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !meal) throw fetchError || new Error('Meal not found');

      const { error: logError } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userId,
          food_name: meal.meal_name,
          carbs: meal.total_nutrition.carbs,
          protein: meal.total_nutrition.protein,
          fat: meal.total_nutrition.fat,
          calories: meal.total_nutrition.calories,
          meal_type: meal.meal_type,
          notes: `Repeated from: ${meal.meal_name}`,
        });

      if (logError) throw logError;

      await supabase
        .from('recent_meals')
        .update({
          times_repeated: meal.times_repeated + 1,
          last_repeated_at: new Date().toISOString(),
        })
        .eq('id', mealId);

      await this.updateFoodUsageStats(userId, mealId, meal.meal_name, 'recent', meal.meal_type);

      return true;
    } catch (error) {
      console.error('Error repeating meal:', error);
      return false;
    }
  }

  static async getSmartSuggestions(
    userId: string,
    mealType?: string,
    limit: number = 10
  ): Promise<FoodSuggestion[]> {
    try {
      const { data, error } = await supabase.rpc('get_smart_food_suggestions', {
        p_user_id: userId,
        p_meal_type: mealType || null,
        p_limit: limit,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting smart suggestions:', error);
      return [];
    }
  }

  static async getTimeBasedSuggestions(
    userId: string,
    limit: number = 5
  ): Promise<FoodSuggestion[]> {
    const currentHour = new Date().getHours();
    let mealType: string;

    if (currentHour >= 5 && currentHour < 11) {
      mealType = 'breakfast';
    } else if (currentHour >= 11 && currentHour < 15) {
      mealType = 'lunch';
    } else if (currentHour >= 15 && currentHour < 20) {
      mealType = 'dinner';
    } else {
      mealType = 'snack';
    }

    return this.getSmartSuggestions(userId, mealType, limit);
  }

  private static async findSimilarRecentMeal(
    userId: string,
    mealName: string,
    foodItems: any[]
  ): Promise<RecentMeal | null> {
    try {
      const { data, error } = await supabase
        .from('recent_meals')
        .select('*')
        .eq('user_id', userId)
        .ilike('meal_name', mealName)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding similar meal:', error);
      return null;
    }
  }

  private static async updateFoodUsageStats(
    userId: string,
    foodIdentifier: string,
    foodName: string,
    foodType: string,
    mealType?: string
  ): Promise<void> {
    try {
      await supabase.rpc('update_food_usage_stats', {
        p_user_id: userId,
        p_food_identifier: foodIdentifier,
        p_food_name: foodName,
        p_food_type: foodType,
        p_meal_type: mealType || null,
      });
    } catch (error) {
      console.error('Error updating food usage stats:', error);
    }
  }
}

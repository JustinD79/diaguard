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

      return true;
    } catch (error) {
      console.error('Error logging favorite food:', error);
      return false;
    }
  }
}

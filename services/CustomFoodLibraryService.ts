import { supabase } from '../lib/supabase';

export interface CustomFood {
  id: string;
  user_id: string;
  food_name: string;
  description?: string;
  food_type: 'recipe' | 'homemade' | 'packaged' | 'meal' | 'ingredient';
  serving_size?: string;
  servings_per_recipe: number;
  nutritional_data: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber?: number;
    sugars?: number;
    sodium?: number;
    saturated_fat?: number;
    cholesterol?: number;
  };
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  }>;
  preparation_steps?: string[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  cuisine_type?: string;
  dietary_tags?: string[];
  allergens?: string[];
  equipment_needed?: string[];
  photo_urls?: string[];
  video_url?: string;
  source_url?: string;
  notes?: string;
  is_favorite: boolean;
  times_made: number;
  last_made_at?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface SharedRecipe {
  id: string;
  custom_food_id: string;
  shared_by: string;
  share_scope: 'family' | 'public' | 'link';
  share_link_token?: string;
  recipe_data: any;
  views_count: number;
  saves_count: number;
  likes_count: number;
  comments_count: number;
  avg_rating: number;
  is_featured: boolean;
  tags?: string[];
  created_at: string;
}

export interface RecipeReview {
  id: string;
  shared_recipe_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  would_make_again?: boolean;
  modifications?: string;
  photo_urls?: string[];
  helpful_count: number;
  created_at: string;
}

export interface RecipeSave {
  id: string;
  shared_recipe_id: string;
  user_id: string;
  collection_name: string;
  notes?: string;
  created_at: string;
}

export class CustomFoodLibraryService {
  static async createCustomFood(
    userId: string,
    foodData: Omit<CustomFood, 'id' | 'user_id' | 'is_favorite' | 'times_made' | 'last_made_at' | 'created_at' | 'updated_at'>
  ): Promise<CustomFood | null> {
    try {
      const { data, error } = await supabase
        .from('custom_foods')
        .insert({
          user_id: userId,
          food_name: foodData.food_name,
          description: foodData.description,
          food_type: foodData.food_type,
          serving_size: foodData.serving_size,
          servings_per_recipe: foodData.servings_per_recipe || 1,
          nutritional_data: foodData.nutritional_data,
          ingredients: foodData.ingredients,
          preparation_steps: foodData.preparation_steps,
          prep_time_minutes: foodData.prep_time_minutes,
          cook_time_minutes: foodData.cook_time_minutes,
          difficulty: foodData.difficulty,
          category: foodData.category,
          cuisine_type: foodData.cuisine_type,
          dietary_tags: foodData.dietary_tags,
          allergens: foodData.allergens,
          equipment_needed: foodData.equipment_needed,
          photo_urls: foodData.photo_urls,
          video_url: foodData.video_url,
          source_url: foodData.source_url,
          notes: foodData.notes,
          rating: foodData.rating,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating custom food:', error);
      return null;
    }
  }

  static async updateCustomFood(
    foodId: string,
    userId: string,
    updates: Partial<CustomFood>
  ): Promise<CustomFood | null> {
    try {
      const { data, error } = await supabase
        .from('custom_foods')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', foodId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating custom food:', error);
      return null;
    }
  }

  static async deleteCustomFood(foodId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_foods')
        .delete()
        .eq('id', foodId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting custom food:', error);
      return false;
    }
  }

  static async getMyCustomFoods(
    userId: string,
    foodType?: string
  ): Promise<CustomFood[]> {
    try {
      let query = supabase
        .from('custom_foods')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (foodType) {
        query = query.eq('food_type', foodType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching custom foods:', error);
      return [];
    }
  }

  static async getMyRecipes(userId: string): Promise<CustomFood[]> {
    return this.getMyCustomFoods(userId, 'recipe');
  }

  static async getFavoriteCustomFoods(userId: string): Promise<CustomFood[]> {
    try {
      const { data, error } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching favorite custom foods:', error);
      return [];
    }
  }

  static async toggleFavorite(foodId: string, userId: string): Promise<boolean> {
    try {
      const { data: food, error: fetchError } = await supabase
        .from('custom_foods')
        .select('is_favorite')
        .eq('id', foodId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('custom_foods')
        .update({
          is_favorite: !food.is_favorite,
          updated_at: new Date().toISOString(),
        })
        .eq('id', foodId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }

  static async searchMyFoods(userId: string, query: string): Promise<CustomFood[]> {
    try {
      const { data, error } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('user_id', userId)
        .ilike('food_name', `%${query}%`)
        .order('times_made', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching custom foods:', error);
      return [];
    }
  }

  static async logCustomFood(
    userId: string,
    food: CustomFood,
    servings: number = 1,
    mealType?: string
  ): Promise<boolean> {
    try {
      const multiplier = servings / (food.servings_per_recipe || 1);

      const { error: logError } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userId,
          food_name: food.food_name,
          carbs: Math.round(food.nutritional_data.carbs * multiplier * 10) / 10,
          protein: Math.round(food.nutritional_data.protein * multiplier * 10) / 10,
          fat: Math.round(food.nutritional_data.fat * multiplier * 10) / 10,
          calories: Math.round(food.nutritional_data.calories * multiplier),
          fiber: food.nutritional_data.fiber ? Math.round(food.nutritional_data.fiber * multiplier * 10) / 10 : 0,
          sugars: food.nutritional_data.sugars ? Math.round(food.nutritional_data.sugars * multiplier * 10) / 10 : 0,
          portion_size: `${servings} serving${servings !== 1 ? 's' : ''}`,
          meal_type: mealType,
          notes: `Custom ${food.food_type}`,
        });

      if (logError) throw logError;

      await supabase
        .from('custom_foods')
        .update({
          times_made: food.times_made + 1,
          last_made_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', food.id);

      await supabase.rpc('update_food_usage_stats', {
        p_user_id: userId,
        p_food_identifier: food.id,
        p_food_name: food.food_name,
        p_food_type: 'custom',
        p_meal_type: mealType || null,
      });

      return true;
    } catch (error) {
      console.error('Error logging custom food:', error);
      return false;
    }
  }

  static async shareRecipe(
    userId: string,
    customFoodId: string,
    shareScope: 'family' | 'public' | 'link',
    tags?: string[]
  ): Promise<SharedRecipe | null> {
    try {
      const { data: food, error: foodError } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('id', customFoodId)
        .eq('user_id', userId)
        .single();

      if (foodError || !food) throw foodError || new Error('Food not found');

      const shareLinkToken = shareScope === 'link'
        ? this.generateShareToken()
        : null;

      const searchableText = [
        food.food_name,
        food.description,
        food.category,
        food.cuisine_type,
        ...(food.dietary_tags || []),
        ...(tags || []),
      ].filter(Boolean).join(' ');

      const { data, error } = await supabase
        .from('shared_recipes')
        .insert({
          custom_food_id: customFoodId,
          shared_by: userId,
          share_scope: shareScope,
          share_link_token: shareLinkToken,
          recipe_data: food,
          tags: tags,
          searchable_text: searchableText,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sharing recipe:', error);
      return null;
    }
  }

  static async getPublicRecipes(
    limit: number = 30,
    offset: number = 0,
    searchQuery?: string
  ): Promise<SharedRecipe[]> {
    try {
      let query = supabase
        .from('shared_recipes')
        .select('*')
        .eq('share_scope', 'public')
        .order('likes_count', { ascending: false })
        .range(offset, offset + limit - 1);

      if (searchQuery) {
        query = query.textSearch('searchable_text', searchQuery);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching public recipes:', error);
      return [];
    }
  }

  static async getFeaturedRecipes(limit: number = 10): Promise<SharedRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('shared_recipes')
        .select('*')
        .eq('share_scope', 'public')
        .eq('is_featured', true)
        .order('featured_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching featured recipes:', error);
      return [];
    }
  }

  static async getRecipeByShareLink(token: string): Promise<SharedRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('shared_recipes')
        .select('*')
        .eq('share_link_token', token)
        .single();

      if (error) throw error;

      await supabase
        .from('shared_recipes')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id);

      return data;
    } catch (error) {
      console.error('Error fetching recipe by share link:', error);
      return null;
    }
  }

  static async saveRecipe(
    userId: string,
    sharedRecipeId: string,
    collectionName: string = 'Saved Recipes',
    notes?: string
  ): Promise<RecipeSave | null> {
    try {
      const { data, error } = await supabase
        .from('recipe_saves')
        .insert({
          shared_recipe_id: sharedRecipeId,
          user_id: userId,
          collection_name: collectionName,
          notes: notes,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('shared_recipes')
        .update({
          saves_count: await this.getSaveCount(sharedRecipeId),
        })
        .eq('id', sharedRecipeId);

      return data;
    } catch (error) {
      console.error('Error saving recipe:', error);
      return null;
    }
  }

  static async unsaveRecipe(userId: string, sharedRecipeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipe_saves')
        .delete()
        .eq('shared_recipe_id', sharedRecipeId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase
        .from('shared_recipes')
        .update({
          saves_count: await this.getSaveCount(sharedRecipeId),
        })
        .eq('id', sharedRecipeId);

      return true;
    } catch (error) {
      console.error('Error unsaving recipe:', error);
      return false;
    }
  }

  static async getMySavedRecipes(userId: string): Promise<RecipeSave[]> {
    try {
      const { data, error } = await supabase
        .from('recipe_saves')
        .select('*, shared_recipes(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
      return [];
    }
  }

  static async reviewRecipe(
    userId: string,
    sharedRecipeId: string,
    rating: number,
    reviewText?: string,
    wouldMakeAgain?: boolean,
    modifications?: string,
    photoUrls?: string[]
  ): Promise<RecipeReview | null> {
    try {
      const { data, error } = await supabase
        .from('recipe_reviews')
        .upsert({
          shared_recipe_id: sharedRecipeId,
          user_id: userId,
          rating: rating,
          review_text: reviewText,
          would_make_again: wouldMakeAgain,
          modifications: modifications,
          photo_urls: photoUrls,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'shared_recipe_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;

      const avgRating = await this.calculateAverageRating(sharedRecipeId);
      await supabase
        .from('shared_recipes')
        .update({ avg_rating: avgRating })
        .eq('id', sharedRecipeId);

      return data;
    } catch (error) {
      console.error('Error reviewing recipe:', error);
      return null;
    }
  }

  static async getRecipeReviews(sharedRecipeId: string): Promise<RecipeReview[]> {
    try {
      const { data, error } = await supabase
        .from('recipe_reviews')
        .select('*')
        .eq('shared_recipe_id', sharedRecipeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  }

  static async likeRecipe(sharedRecipeId: string): Promise<boolean> {
    try {
      const { data: recipe, error: fetchError } = await supabase
        .from('shared_recipes')
        .select('likes_count')
        .eq('id', sharedRecipeId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('shared_recipes')
        .update({ likes_count: (recipe.likes_count || 0) + 1 })
        .eq('id', sharedRecipeId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error liking recipe:', error);
      return false;
    }
  }

  static async importRecipeFromUrl(
    userId: string,
    url: string
  ): Promise<CustomFood | null> {
    try {
      const placeholder: Omit<CustomFood, 'id' | 'user_id' | 'is_favorite' | 'times_made' | 'last_made_at' | 'created_at' | 'updated_at'> = {
        food_name: 'Imported Recipe',
        description: `Imported from: ${url}`,
        food_type: 'recipe',
        servings_per_recipe: 4,
        nutritional_data: {
          calories: 0,
          carbs: 0,
          protein: 0,
          fat: 0,
        },
        ingredients: [],
        preparation_steps: [],
        source_url: url,
        notes: 'Please update nutritional information manually after importing.',
      };

      return await this.createCustomFood(userId, placeholder);
    } catch (error) {
      console.error('Error importing recipe from URL:', error);
      return null;
    }
  }

  static async duplicateCustomFood(
    userId: string,
    originalFoodId: string
  ): Promise<CustomFood | null> {
    try {
      const { data: original, error: fetchError } = await supabase
        .from('custom_foods')
        .select('*')
        .eq('id', originalFoodId)
        .single();

      if (fetchError || !original) throw fetchError || new Error('Food not found');

      const duplicate = {
        food_name: `${original.food_name} (Copy)`,
        description: original.description,
        food_type: original.food_type,
        serving_size: original.serving_size,
        servings_per_recipe: original.servings_per_recipe,
        nutritional_data: original.nutritional_data,
        ingredients: original.ingredients,
        preparation_steps: original.preparation_steps,
        prep_time_minutes: original.prep_time_minutes,
        cook_time_minutes: original.cook_time_minutes,
        difficulty: original.difficulty,
        category: original.category,
        cuisine_type: original.cuisine_type,
        dietary_tags: original.dietary_tags,
        allergens: original.allergens,
        equipment_needed: original.equipment_needed,
        photo_urls: original.photo_urls,
        notes: original.notes,
      };

      return await this.createCustomFood(userId, duplicate);
    } catch (error) {
      console.error('Error duplicating custom food:', error);
      return null;
    }
  }

  static async copySharedRecipeToLibrary(
    userId: string,
    sharedRecipeId: string
  ): Promise<CustomFood | null> {
    try {
      const { data: shared, error: fetchError } = await supabase
        .from('shared_recipes')
        .select('recipe_data')
        .eq('id', sharedRecipeId)
        .single();

      if (fetchError || !shared) throw fetchError || new Error('Recipe not found');

      const recipeData = shared.recipe_data;

      return await this.createCustomFood(userId, {
        food_name: recipeData.food_name,
        description: recipeData.description,
        food_type: 'recipe',
        serving_size: recipeData.serving_size,
        servings_per_recipe: recipeData.servings_per_recipe || 1,
        nutritional_data: recipeData.nutritional_data,
        ingredients: recipeData.ingredients || [],
        preparation_steps: recipeData.preparation_steps,
        prep_time_minutes: recipeData.prep_time_minutes,
        cook_time_minutes: recipeData.cook_time_minutes,
        difficulty: recipeData.difficulty,
        category: recipeData.category,
        cuisine_type: recipeData.cuisine_type,
        dietary_tags: recipeData.dietary_tags,
        allergens: recipeData.allergens,
        equipment_needed: recipeData.equipment_needed,
        photo_urls: recipeData.photo_urls,
        notes: `Copied from community recipe. Original: ${recipeData.food_name}`,
      });
    } catch (error) {
      console.error('Error copying shared recipe:', error);
      return null;
    }
  }

  static async getRecipeCategories(): Promise<string[]> {
    const defaultCategories = [
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snacks',
      'Desserts',
      'Beverages',
      'Appetizers',
      'Salads',
      'Soups',
      'Main Course',
      'Side Dishes',
      'Baked Goods',
    ];
    return defaultCategories;
  }

  static async getCuisineTypes(): Promise<string[]> {
    const defaultCuisines = [
      'American',
      'Italian',
      'Mexican',
      'Chinese',
      'Japanese',
      'Indian',
      'Thai',
      'Mediterranean',
      'French',
      'Greek',
      'Korean',
      'Vietnamese',
      'Middle Eastern',
      'Caribbean',
      'Southern',
    ];
    return defaultCuisines;
  }

  private static generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private static async getSaveCount(sharedRecipeId: string): Promise<number> {
    const { count } = await supabase
      .from('recipe_saves')
      .select('*', { count: 'exact', head: true })
      .eq('shared_recipe_id', sharedRecipeId);

    return count || 0;
  }

  private static async calculateAverageRating(sharedRecipeId: string): Promise<number> {
    const { data } = await supabase
      .from('recipe_reviews')
      .select('rating')
      .eq('shared_recipe_id', sharedRecipeId);

    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / data.length) * 10) / 10;
  }
}

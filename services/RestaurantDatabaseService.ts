import { supabase } from '../lib/supabase';

export interface RestaurantChain {
  id: string;
  chain_name: string;
  logo_url?: string;
  website_url?: string;
  cuisine_type: string[];
  country_availability: string[];
  has_nutritional_data: boolean;
  data_source?: string;
  data_last_updated?: string;
  is_verified: boolean;
  created_at: string;
}

export interface RestaurantMenuItem {
  id: string;
  restaurant_chain_id: string;
  item_name: string;
  description?: string;
  category?: string;
  serving_size?: string;
  calories: number;
  total_carbs: number;
  dietary_fiber?: number;
  sugars?: number;
  protein: number;
  total_fat: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  net_carbs: number;
  glycemic_index?: number;
  glycemic_load?: number;
  allergens: string[];
  dietary_tags: string[];
  price_usd?: number;
  is_available: boolean;
  image_url?: string;
  nutritional_source?: string;
  verified_at?: string;
  created_at: string;
}

export interface UserRestaurantContribution {
  id: string;
  user_id: string;
  restaurant_name: string;
  is_chain: boolean;
  restaurant_chain_id?: string;
  location?: string;
  item_name: string;
  description?: string;
  serving_size?: string;
  nutritional_data: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber?: number;
    sugars?: number;
    sodium?: number;
  };
  photo_url?: string;
  submission_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  upvotes: number;
  downvotes: number;
  times_logged: number;
  created_at: string;
}

export interface RestaurantSearchResult {
  type: 'chain' | 'menu_item' | 'contribution';
  data: RestaurantChain | RestaurantMenuItem | UserRestaurantContribution;
  chain_name?: string;
}

export class RestaurantDatabaseService {
  static async searchRestaurants(query: string, limit: number = 20): Promise<RestaurantChain[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_chains')
        .select('*')
        .ilike('chain_name', `%${query}%`)
        .eq('has_nutritional_data', true)
        .order('chain_name')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching restaurants:', error);
      return [];
    }
  }

  static async getPopularRestaurants(limit: number = 20): Promise<RestaurantChain[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_chains')
        .select('*')
        .eq('has_nutritional_data', true)
        .eq('is_verified', true)
        .order('chain_name')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular restaurants:', error);
      return [];
    }
  }

  static async getRestaurantsByCuisine(cuisineType: string, limit: number = 20): Promise<RestaurantChain[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_chains')
        .select('*')
        .contains('cuisine_type', [cuisineType])
        .eq('has_nutritional_data', true)
        .order('chain_name')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching restaurants by cuisine:', error);
      return [];
    }
  }

  static async getRestaurantMenu(
    chainId: string,
    category?: string
  ): Promise<RestaurantMenuItem[]> {
    try {
      let query = supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('restaurant_chain_id', chainId)
        .eq('is_available', true)
        .order('category')
        .order('item_name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching restaurant menu:', error);
      return [];
    }
  }

  static async getMenuCategories(chainId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('category')
        .eq('restaurant_chain_id', chainId)
        .eq('is_available', true);

      if (error) throw error;

      const categories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      return categories.sort();
    } catch (error) {
      console.error('Error fetching menu categories:', error);
      return [];
    }
  }

  static async searchMenuItems(
    query: string,
    chainId?: string,
    limit: number = 30
  ): Promise<RestaurantMenuItem[]> {
    try {
      let dbQuery = supabase
        .from('restaurant_menu_items')
        .select('*')
        .ilike('item_name', `%${query}%`)
        .eq('is_available', true)
        .order('item_name')
        .limit(limit);

      if (chainId) {
        dbQuery = dbQuery.eq('restaurant_chain_id', chainId);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching menu items:', error);
      return [];
    }
  }

  static async getMenuItemDetails(itemId: string): Promise<RestaurantMenuItem | null> {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching menu item details:', error);
      return null;
    }
  }

  static async getLowCarbOptions(
    chainId: string,
    maxCarbs: number = 20,
    limit: number = 20
  ): Promise<RestaurantMenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('restaurant_chain_id', chainId)
        .eq('is_available', true)
        .lte('net_carbs', maxCarbs)
        .order('net_carbs')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching low carb options:', error);
      return [];
    }
  }

  static async getHighProteinOptions(
    chainId: string,
    minProtein: number = 25,
    limit: number = 20
  ): Promise<RestaurantMenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('restaurant_chain_id', chainId)
        .eq('is_available', true)
        .gte('protein', minProtein)
        .order('protein', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching high protein options:', error);
      return [];
    }
  }

  static async filterByDietaryTags(
    chainId: string,
    tags: string[],
    limit: number = 30
  ): Promise<RestaurantMenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('restaurant_chain_id', chainId)
        .eq('is_available', true)
        .overlaps('dietary_tags', tags)
        .order('item_name')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error filtering by dietary tags:', error);
      return [];
    }
  }

  static async filterByAllergens(
    chainId: string,
    excludeAllergens: string[],
    limit: number = 50
  ): Promise<RestaurantMenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('restaurant_chain_id', chainId)
        .eq('is_available', true)
        .order('item_name');

      if (error) throw error;

      const filtered = (data || []).filter(item => {
        const itemAllergens = item.allergens || [];
        return !excludeAllergens.some(allergen =>
          itemAllergens.map((a: string) => a.toLowerCase()).includes(allergen.toLowerCase())
        );
      });

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error filtering by allergens:', error);
      return [];
    }
  }

  static async contributeRestaurantMeal(
    userId: string,
    contribution: Omit<UserRestaurantContribution, 'id' | 'user_id' | 'submission_status' | 'upvotes' | 'downvotes' | 'times_logged' | 'created_at'>
  ): Promise<UserRestaurantContribution | null> {
    try {
      const { data, error } = await supabase
        .from('user_restaurant_contributions')
        .insert({
          user_id: userId,
          restaurant_name: contribution.restaurant_name,
          is_chain: contribution.is_chain,
          restaurant_chain_id: contribution.restaurant_chain_id,
          location: contribution.location,
          item_name: contribution.item_name,
          description: contribution.description,
          serving_size: contribution.serving_size,
          nutritional_data: contribution.nutritional_data,
          photo_url: contribution.photo_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error contributing restaurant meal:', error);
      return null;
    }
  }

  static async getMyContributions(userId: string): Promise<UserRestaurantContribution[]> {
    try {
      const { data, error } = await supabase
        .from('user_restaurant_contributions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching my contributions:', error);
      return [];
    }
  }

  static async getApprovedContributions(
    restaurantName?: string,
    limit: number = 50
  ): Promise<UserRestaurantContribution[]> {
    try {
      let query = supabase
        .from('user_restaurant_contributions')
        .select('*')
        .eq('submission_status', 'approved')
        .order('times_logged', { ascending: false })
        .limit(limit);

      if (restaurantName) {
        query = query.ilike('restaurant_name', `%${restaurantName}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching approved contributions:', error);
      return [];
    }
  }

  static async voteOnContribution(
    contributionId: string,
    isUpvote: boolean
  ): Promise<boolean> {
    try {
      const { data: contribution, error: fetchError } = await supabase
        .from('user_restaurant_contributions')
        .select('upvotes, downvotes')
        .eq('id', contributionId)
        .single();

      if (fetchError) throw fetchError;

      const updateData = isUpvote
        ? { upvotes: (contribution.upvotes || 0) + 1 }
        : { downvotes: (contribution.downvotes || 0) + 1 };

      const { error } = await supabase
        .from('user_restaurant_contributions')
        .update(updateData)
        .eq('id', contributionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error voting on contribution:', error);
      return false;
    }
  }

  static async logContributedMeal(
    userId: string,
    contribution: UserRestaurantContribution
  ): Promise<boolean> {
    try {
      const { error: logError } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userId,
          food_name: `${contribution.restaurant_name} - ${contribution.item_name}`,
          carbs: contribution.nutritional_data.carbs,
          protein: contribution.nutritional_data.protein,
          fat: contribution.nutritional_data.fat,
          calories: contribution.nutritional_data.calories,
          fiber: contribution.nutritional_data.fiber || 0,
          sugars: contribution.nutritional_data.sugars || 0,
          portion_size: contribution.serving_size,
          notes: `From ${contribution.restaurant_name}`,
        });

      if (logError) throw logError;

      await supabase
        .from('user_restaurant_contributions')
        .update({
          times_logged: contribution.times_logged + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contribution.id);

      return true;
    } catch (error) {
      console.error('Error logging contributed meal:', error);
      return false;
    }
  }

  static async logMenuItem(
    userId: string,
    chainName: string,
    menuItem: RestaurantMenuItem,
    mealType?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userId,
          food_name: `${chainName} - ${menuItem.item_name}`,
          carbs: menuItem.total_carbs,
          protein: menuItem.protein,
          fat: menuItem.total_fat,
          calories: menuItem.calories,
          fiber: menuItem.dietary_fiber || 0,
          sugars: menuItem.sugars || 0,
          portion_size: menuItem.serving_size,
          meal_type: mealType,
          notes: `From ${chainName}`,
        });

      if (error) throw error;

      await supabase.rpc('update_food_usage_stats', {
        p_user_id: userId,
        p_food_identifier: menuItem.id,
        p_food_name: `${chainName} - ${menuItem.item_name}`,
        p_food_type: 'restaurant',
        p_meal_type: mealType || null,
      });

      return true;
    } catch (error) {
      console.error('Error logging menu item:', error);
      return false;
    }
  }

  static async searchAll(query: string, limit: number = 30): Promise<RestaurantSearchResult[]> {
    try {
      const [chains, menuItems, contributions] = await Promise.all([
        this.searchRestaurants(query, 10),
        this.searchMenuItems(query, undefined, 15),
        this.searchContributions(query, 5),
      ]);

      const results: RestaurantSearchResult[] = [
        ...chains.map(chain => ({ type: 'chain' as const, data: chain })),
        ...menuItems.map(item => ({ type: 'menu_item' as const, data: item })),
        ...contributions.map(contrib => ({ type: 'contribution' as const, data: contrib })),
      ];

      return results.slice(0, limit);
    } catch (error) {
      console.error('Error searching all:', error);
      return [];
    }
  }

  private static async searchContributions(
    query: string,
    limit: number
  ): Promise<UserRestaurantContribution[]> {
    try {
      const { data, error } = await supabase
        .from('user_restaurant_contributions')
        .select('*')
        .eq('submission_status', 'approved')
        .or(`restaurant_name.ilike.%${query}%,item_name.ilike.%${query}%`)
        .order('times_logged', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching contributions:', error);
      return [];
    }
  }

  static async getCuisineTypes(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_chains')
        .select('cuisine_type');

      if (error) throw error;

      const allCuisines = data?.flatMap(item => item.cuisine_type || []) || [];
      return [...new Set(allCuisines)].sort();
    } catch (error) {
      console.error('Error fetching cuisine types:', error);
      return [];
    }
  }

  static async getRestaurantChainById(chainId: string): Promise<RestaurantChain | null> {
    try {
      const { data, error } = await supabase
        .from('restaurant_chains')
        .select('*')
        .eq('id', chainId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching restaurant chain:', error);
      return null;
    }
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

interface OfflineAction {
  id: string;
  type: 'meal_log' | 'glucose_reading' | 'exercise_log' | 'hydration_log';
  data: any;
  timestamp: number;
  synced: boolean;
}

interface OfflineCache {
  favorites: any[];
  recentMeals: any[];
  userProfile: any;
  lastSync: number;
}

export class EnhancedOfflineService {
  private static readonly OFFLINE_QUEUE_KEY = '@offline_action_queue';
  private static readonly OFFLINE_CACHE_KEY = '@offline_cache';
  private static readonly SYNC_INTERVAL = 30000;

  static async initializeOfflineSupport(): Promise<void> {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncOfflineData();
      }
    });

    setInterval(async () => {
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        await this.syncOfflineData();
      }
    }, this.SYNC_INTERVAL);
  }

  static async isOnline(): Promise<boolean> {
    const netState = await NetInfo.fetch();
    return netState.isConnected === true;
  }

  static async queueOfflineAction(
    type: OfflineAction['type'],
    data: any
  ): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const newAction: OfflineAction = {
        id: Date.now().toString(),
        type,
        data,
        timestamp: Date.now(),
        synced: false,
      };

      queue.push(newAction);
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error queueing offline action:', error);
    }
  }

  static async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  static async syncOfflineData(): Promise<{
    synced: number;
    failed: number;
  }> {
    const result = { synced: 0, failed: 0 };

    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        return result;
      }

      const queue = await this.getOfflineQueue();
      const unsyncedActions = queue.filter(action => !action.synced);

      for (const action of unsyncedActions) {
        try {
          await this.syncAction(action);
          action.synced = true;
          result.synced++;
        } catch (error) {
          console.error('Error syncing action:', error);
          result.failed++;
        }
      }

      const updatedQueue = queue.filter(action => !action.synced);
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));

      await this.updateCache();
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }

    return result;
  }

  private static async syncAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'meal_log':
        await supabase.from('meal_logs').insert(action.data);
        break;
      case 'glucose_reading':
        await supabase.from('glucose_readings').insert(action.data);
        break;
      case 'exercise_log':
        await supabase.from('exercise_logs').insert(action.data);
        break;
      case 'hydration_log':
        await supabase.from('hydration_logs').insert(action.data);
        break;
    }
  }

  static async cacheData(key: keyof OfflineCache, data: any): Promise<void> {
    try {
      const cache = await this.getCache();
      cache[key] = data;
      cache.lastSync = Date.now();
      await AsyncStorage.setItem(this.OFFLINE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  static async getCache(): Promise<OfflineCache> {
    try {
      const cacheJson = await AsyncStorage.getItem(this.OFFLINE_CACHE_KEY);
      return cacheJson
        ? JSON.parse(cacheJson)
        : {
            favorites: [],
            recentMeals: [],
            userProfile: null,
            lastSync: 0,
          };
    } catch (error) {
      console.error('Error getting cache:', error);
      return {
        favorites: [],
        recentMeals: [],
        userProfile: null,
        lastSync: 0,
      };
    }
  }

  static async getCachedData(key: keyof OfflineCache): Promise<any> {
    const cache = await this.getCache();
    return cache[key];
  }

  static async updateCache(): Promise<void> {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: favorites } = await supabase
        .from('food_favorites')
        .select('*')
        .eq('user_id', user.id)
        .limit(20);

      const { data: recentMeals } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: userProfile } = await supabase
        .from('user_medical_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      await this.cacheData('favorites', favorites || []);
      await this.cacheData('recentMeals', recentMeals || []);
      await this.cacheData('userProfile', userProfile);
    } catch (error) {
      console.error('Error updating cache:', error);
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.OFFLINE_CACHE_KEY);
      await AsyncStorage.removeItem(this.OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  static async getPendingSyncCount(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.filter(action => !action.synced).length;
  }
}

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineService {
  private static readonly CACHE_PREFIX = 'offline_cache_';
  private static readonly QUEUE_KEY = 'offline_queue';
  private static readonly MAX_CACHE_SIZE = 50; // MB
  private static readonly MAX_QUEUE_SIZE = 1000;

  /**
   * Cache data for offline access
   */
  static async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: ttl || (24 * 60 * 60 * 1000), // Default 24 hours
      };

      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      );

      // Clean up old cache entries
      await this.cleanupCache();
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  /**
   * Retrieve cached data
   */
  static async getCachedData(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheEntry.timestamp > cacheEntry.ttl) {
        await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Failed to retrieve cached data:', error);
      return null;
    }
  }

  /**
   * Queue operations for when back online
   */
  static async queueOperation(operation: OfflineOperation): Promise<void> {
    try {
      const queue = await this.getOperationQueue();
      queue.push({
        ...operation,
        id: this.generateOperationId(),
        timestamp: Date.now(),
        retryCount: 0
      });

      // Limit queue size
      if (queue.length > this.MAX_QUEUE_SIZE) {
        queue.splice(0, queue.length - this.MAX_QUEUE_SIZE);
      }

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  }

  /**
   * Process queued operations when back online
   */
  static async processQueue(): Promise<void> {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.onLine) return;

    try {
      const queue = await this.getOperationQueue();
      const processedIds: string[] = [];

      for (const operation of queue) {
        try {
          await this.executeOperation(operation);
          processedIds.push(operation.id);
        } catch (error) {
          console.error(`Failed to execute operation ${operation.id}:`, error);
          
          // Increment retry count
          operation.retryCount++;
          
          // Remove if max retries reached
          if (operation.retryCount >= 3) {
            processedIds.push(operation.id);
          }
        }
      }

      // Remove processed operations
      const remainingQueue = queue.filter(op => !processedIds.includes(op.id));
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  }

  /**
   * Get offline data for specific features
   */
  static async getOfflineData(feature: string): Promise<any> {
    const offlineData: Record<string, () => Promise<any>> = {
      'food_database': () => this.getCachedData('food_database'),
      'user_profile': () => this.getCachedData('user_profile'),
      'recent_meals': () => this.getCachedData('recent_meals'),
      'insulin_settings': () => this.getCachedData('insulin_settings'),
      'emergency_contacts': () => this.getCachedData('emergency_contacts')
    };

    const dataProvider = offlineData[feature];
    return dataProvider ? await dataProvider() : null;
  }

  /**
   * Store essential data for offline use
   */
  static async storeEssentialData(data: EssentialOfflineData): Promise<void> {
    const promises = [
      this.cacheData('user_profile', data.userProfile),
      this.cacheData('insulin_settings', data.insulinSettings),
      this.cacheData('recent_meals', data.recentMeals),
      this.cacheData('emergency_contacts', data.emergencyContacts),
      this.cacheData('food_database', data.commonFoods)
    ];

    await Promise.all(promises);
  }

  /**
   * Check if app can function offline
   */
  static async canFunctionOffline(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const essentialData = [
      'user_profile',
      'insulin_settings',
      'emergency_contacts'
    ];

    for (const key of essentialData) {
      const data = await this.getCachedData(key);
      if (!data) return false;
    }

    return true;
  }

  /**
   * Get offline capabilities status
   */
  static async getOfflineStatus(): Promise<OfflineStatus> {
    const canFunction = await this.canFunctionOffline();
    const queue = await this.getOperationQueue();
    const cacheSize = await this.getCacheSize();

    return {
      canFunctionOffline: canFunction,
      queuedOperations: queue.length,
      cacheSize,
      lastSync: await this.getLastSyncTime()
    };
  }

  /**
   * Private helper methods
   */
  private static async getOperationQueue(): Promise<QueuedOperation[]> {
    try {
      const queue = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }

  private static async executeOperation(operation: QueuedOperation): Promise<void> {
    const { type, endpoint, method, data } = operation;

    switch (type) {
      case 'api_call':
        await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : undefined
        });
        break;
      
      case 'data_sync':
        // Implement data synchronization logic
        break;
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  private static generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async cleanupCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      // Remove expired entries
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheEntry = JSON.parse(cached);
          const now = Date.now();
          
          if (now - cacheEntry.timestamp > cacheEntry.ttl) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  private static async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      
      return Math.round(totalSize / (1024 * 1024)); // Convert to MB
    } catch {
      return 0;
    }
  }

  private static async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem('last_sync_time');
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch {
      return null;
    }
  }
}

// Type definitions
export interface OfflineOperation {
  type: 'api_call' | 'data_sync' | 'file_upload';
  endpoint: string;
  method: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
}

export interface QueuedOperation extends OfflineOperation {
  id: string;
  timestamp: number;
  retryCount: number;
}

export interface EssentialOfflineData {
  userProfile: any;
  insulinSettings: any;
  recentMeals: any[];
  emergencyContacts: any[];
  commonFoods: any[];
}

export interface OfflineStatus {
  canFunctionOffline: boolean;
  queuedOperations: number;
  cacheSize: number;
  lastSync: Date | null;
}
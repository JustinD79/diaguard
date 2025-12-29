import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CGMIntegrationService, GlucoseReading } from './CGMIntegrationService';

export type WatchType = 'apple_watch' | 'wear_os' | 'fitbit' | 'garmin';

export type WatchSyncType = 'glucose' | 'meal' | 'exercise' | 'hydration' | 'full_sync';

export interface WatchComplicationData {
  glucoseValue?: number;
  glucoseTrend?: string;
  trendArrow?: string;
  lastUpdateTime?: string;
  timeInRange?: number;
  carbsToday?: number;
  insulinToday?: number;
  status?: 'normal' | 'high' | 'low' | 'urgent';
}

export interface WatchSyncLog {
  id?: string;
  userId: string;
  watchType: WatchType;
  watchIdentifier?: string;
  syncType: WatchSyncType;
  recordsSynced: number;
  syncStatus: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  syncTime: string;
}

export class AppleWatchIntegrationService {
  private static readonly WATCH_SYNC_KEY = 'watch_last_sync';
  private static readonly WATCH_DATA_KEY = 'watch_complication_data';

  static async syncGlucoseToWatch(
    userId: string,
    watchType: WatchType = 'apple_watch'
  ): Promise<boolean> {
    try {
      const device = await CGMIntegrationService.getActiveCGMDevice(userId);
      if (!device) {
        return false;
      }

      const latestReading = await CGMIntegrationService.fetchLatestGlucoseReading(
        userId,
        device.id
      );

      if (!latestReading) {
        return false;
      }

      const complicationData: WatchComplicationData = {
        glucoseValue: latestReading.glucoseValue,
        glucoseTrend: latestReading.trendDirection,
        trendArrow: this.getTrendArrow(latestReading.trendDirection),
        lastUpdateTime: latestReading.readingTime,
        status: this.getGlucoseStatus(latestReading.glucoseValue),
      };

      await AsyncStorage.setItem(
        this.WATCH_DATA_KEY,
        JSON.stringify(complicationData)
      );

      await this.logWatchSync(
        userId,
        watchType,
        'glucose',
        1,
        'success'
      );

      return true;
    } catch (error) {
      console.error('Error syncing glucose to watch:', error);
      await this.logWatchSync(
        userId,
        watchType,
        'glucose',
        0,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  static async syncMealToWatch(
    userId: string,
    mealData: {
      carbs: number;
      calories: number;
      mealType: string;
    },
    watchType: WatchType = 'apple_watch'
  ): Promise<boolean> {
    try {
      const existingData = await this.getWatchComplicationData();

      const updatedData: WatchComplicationData = {
        ...existingData,
        carbsToday: (existingData?.carbsToday || 0) + mealData.carbs,
      };

      await AsyncStorage.setItem(
        this.WATCH_DATA_KEY,
        JSON.stringify(updatedData)
      );

      await this.logWatchSync(
        userId,
        watchType,
        'meal',
        1,
        'success'
      );

      return true;
    } catch (error) {
      console.error('Error syncing meal to watch:', error);
      await this.logWatchSync(
        userId,
        watchType,
        'meal',
        0,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  static async syncTimeInRangeToWatch(
    userId: string,
    timeInRangePercent: number,
    watchType: WatchType = 'apple_watch'
  ): Promise<boolean> {
    try {
      const existingData = await this.getWatchComplicationData();

      const updatedData: WatchComplicationData = {
        ...existingData,
        timeInRange: timeInRangePercent,
      };

      await AsyncStorage.setItem(
        this.WATCH_DATA_KEY,
        JSON.stringify(updatedData)
      );

      return true;
    } catch (error) {
      console.error('Error syncing time in range to watch:', error);
      return false;
    }
  }

  static async getWatchComplicationData(): Promise<WatchComplicationData | null> {
    try {
      const data = await AsyncStorage.getItem(this.WATCH_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting watch complication data:', error);
      return null;
    }
  }

  static async performFullSync(
    userId: string,
    watchType: WatchType = 'apple_watch'
  ): Promise<{ success: boolean; recordsSynced: number }> {
    try {
      let recordsSynced = 0;

      const glucoseSync = await this.syncGlucoseToWatch(userId, watchType);
      if (glucoseSync) recordsSynced++;

      const tirStats = await CGMIntegrationService.calculateTimeInRange(
        userId,
        new Date()
      );

      if (tirStats) {
        await this.syncTimeInRangeToWatch(
          userId,
          tirStats.timeInRangePercent,
          watchType
        );
        recordsSynced++;
      }

      await this.logWatchSync(
        userId,
        watchType,
        'full_sync',
        recordsSynced,
        'success'
      );

      return { success: true, recordsSynced };
    } catch (error) {
      console.error('Error performing full watch sync:', error);
      await this.logWatchSync(
        userId,
        watchType,
        'full_sync',
        0,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return { success: false, recordsSynced: 0 };
    }
  }

  static async getLastSyncTime(watchType: WatchType): Promise<Date | null> {
    try {
      const syncTime = await AsyncStorage.getItem(
        `${this.WATCH_SYNC_KEY}_${watchType}`
      );
      return syncTime ? new Date(syncTime) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  static async updateLastSyncTime(watchType: WatchType): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.WATCH_SYNC_KEY}_${watchType}`,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  static async logWatchSync(
    userId: string,
    watchType: WatchType,
    syncType: WatchSyncType,
    recordsSynced: number,
    syncStatus: 'success' | 'partial' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase.from('watch_sync_log').insert({
        user_id: userId,
        watch_type: watchType,
        sync_type: syncType,
        records_synced: recordsSynced,
        sync_status: syncStatus,
        error_message: errorMessage,
        sync_time: new Date().toISOString(),
      });

      if (syncStatus === 'success') {
        await this.updateLastSyncTime(watchType);
      }
    } catch (error) {
      console.error('Error logging watch sync:', error);
    }
  }

  static async getSyncHistory(
    userId: string,
    limit: number = 50
  ): Promise<WatchSyncLog[]> {
    try {
      const { data, error } = await supabase
        .from('watch_sync_log')
        .select('*')
        .eq('user_id', userId)
        .order('sync_time', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(this.mapWatchSyncLog);
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  static async getSyncStatistics(
    userId: string,
    daysBack: number = 7
  ): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    successRate: number;
    lastSyncTime?: string;
  }> {
    try {
      const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('watch_sync_log')
        .select('sync_status, sync_time')
        .eq('user_id', userId)
        .gte('sync_time', startTime.toISOString());

      if (error) throw error;

      const totalSyncs = data.length;
      const successfulSyncs = data.filter((log) => log.sync_status === 'success').length;
      const failedSyncs = data.filter((log) => log.sync_status === 'failed').length;
      const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;
      const lastSyncTime = data.length > 0 ? data[0].sync_time : undefined;

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        successRate,
        lastSyncTime,
      };
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
      };
    }
  }

  static async scheduleBackgroundSync(
    userId: string,
    intervalMinutes: number = 15
  ): Promise<void> {
    try {
      setInterval(async () => {
        await this.performFullSync(userId);
      }, intervalMinutes * 60 * 1000);
    } catch (error) {
      console.error('Error scheduling background sync:', error);
    }
  }

  private static getTrendArrow(trend?: string): string {
    const arrowMap: Record<string, string> = {
      'rapid_rise': '↑↑',
      'rise': '↑',
      'slow_rise': '↗',
      'stable': '→',
      'slow_fall': '↘',
      'fall': '↓',
      'rapid_fall': '↓↓',
    };
    return trend ? arrowMap[trend] : '→';
  }

  private static getGlucoseStatus(
    value: number
  ): 'normal' | 'high' | 'low' | 'urgent' {
    if (value < 54) return 'urgent';
    if (value < 70) return 'low';
    if (value > 180) return 'high';
    return 'normal';
  }

  private static mapWatchSyncLog(data: any): WatchSyncLog {
    return {
      id: data.id,
      userId: data.user_id,
      watchType: data.watch_type,
      watchIdentifier: data.watch_identifier,
      syncType: data.sync_type,
      recordsSynced: data.records_synced,
      syncStatus: data.sync_status,
      errorMessage: data.error_message,
      syncTime: data.sync_time,
    };
  }
}

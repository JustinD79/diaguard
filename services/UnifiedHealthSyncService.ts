import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import { AppleHealthIntegrationService } from './AppleHealthIntegrationService';
import { GoogleFitIntegrationService } from './GoogleFitIntegrationService';

export interface HealthConnection {
  id: string;
  provider: string;
  isActive: boolean;
  lastSyncAt?: string;
  autoSyncEnabled: boolean;
  errorCount: number;
}

export interface SyncConfig {
  id: string;
  dataType: string;
  syncDirection: 'export_only' | 'import_only' | 'bidirectional';
  isEnabled: boolean;
  syncFrequencyMinutes: number;
  lastSyncAt?: string;
}

export class UnifiedHealthSyncService {
  static async autoConnectHealthApp(userId: string): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await AppleHealthIntegrationService.connectHealthKit(userId);
      } else if (Platform.OS === 'android') {
        return await GoogleFitIntegrationService.connectGoogleFit(userId);
      }
      return false;
    } catch (error) {
      console.error('Error auto-connecting health app:', error);
      return false;
    }
  }

  static async getAllConnections(
    userId: string
  ): Promise<HealthConnection[]> {
    try {
      const { data, error } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        isActive: conn.is_active,
        lastSyncAt: conn.last_sync_at,
        autoSyncEnabled: conn.auto_sync_enabled,
        errorCount: conn.error_count,
      }));
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }

  static async getActiveConnections(
    userId: string
  ): Promise<HealthConnection[]> {
    try {
      const { data, error } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        isActive: conn.is_active,
        lastSyncAt: conn.last_sync_at,
        autoSyncEnabled: conn.auto_sync_enabled,
        errorCount: conn.error_count,
      }));
    } catch (error) {
      console.error('Error getting active connections:', error);
      return [];
    }
  }

  static async toggleConnection(
    connectionId: string,
    isActive: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('health_app_connections')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling connection:', error);
      return false;
    }
  }

  static async toggleAutoSync(
    connectionId: string,
    autoSyncEnabled: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('health_app_connections')
        .update({
          auto_sync_enabled: autoSyncEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling auto sync:', error);
      return false;
    }
  }

  static async getSyncConfigs(userId: string): Promise<SyncConfig[]> {
    try {
      const { data, error } = await supabase
        .from('sync_configurations')
        .select('*')
        .eq('user_id', userId)
        .order('data_type');

      if (error) throw error;

      return (data || []).map((config) => ({
        id: config.id,
        dataType: config.data_type,
        syncDirection: config.sync_direction,
        isEnabled: config.is_enabled,
        syncFrequencyMinutes: config.sync_frequency_minutes,
        lastSyncAt: config.last_sync_at,
      }));
    } catch (error) {
      console.error('Error getting sync configs:', error);
      return [];
    }
  }

  static async updateSyncConfig(
    configId: string,
    updates: Partial<SyncConfig>
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.isEnabled !== undefined) {
        updateData.is_enabled = updates.isEnabled;
      }
      if (updates.syncFrequencyMinutes !== undefined) {
        updateData.sync_frequency_minutes = updates.syncFrequencyMinutes;
      }
      if (updates.syncDirection !== undefined) {
        updateData.sync_direction = updates.syncDirection;
      }

      const { error } = await supabase
        .from('sync_configurations')
        .update(updateData)
        .eq('id', configId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating sync config:', error);
      return false;
    }
  }

  static async syncAllActiveConnections(userId: string): Promise<void> {
    try {
      const connections = await this.getActiveConnections(userId);

      for (const connection of connections) {
        await this.syncConnection(userId, connection.provider);
      }
    } catch (error) {
      console.error('Error syncing all connections:', error);
    }
  }

  static async syncConnection(
    userId: string,
    provider: string
  ): Promise<boolean> {
    try {
      if (provider === 'apple_health') {
        await AppleHealthIntegrationService.syncActivityData(userId);
      } else if (provider === 'google_fit') {
        await GoogleFitIntegrationService.syncActivityData(userId);
      }

      return true;
    } catch (error) {
      console.error(`Error syncing ${provider}:`, error);
      return false;
    }
  }

  static async exportMealToHealthApps(
    userId: string,
    mealData: {
      foodName: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      timestamp: Date;
    }
  ): Promise<{ success: boolean; exports: { [key: string]: boolean } }> {
    const exports: { [key: string]: boolean } = {};

    try {
      const connections = await this.getActiveConnections(userId);

      for (const connection of connections) {
        try {
          if (connection.provider === 'apple_health') {
            const success =
              await AppleHealthIntegrationService.exportMealToHealthKit(
                userId,
                mealData
              );
            exports.apple_health = success;
          } else if (connection.provider === 'google_fit') {
            const success =
              await GoogleFitIntegrationService.exportNutritionData(
                userId,
                mealData
              );
            exports.google_fit = success;
          }
        } catch (error) {
          console.error(`Error exporting to ${connection.provider}:`, error);
          exports[connection.provider] = false;
        }
      }

      return {
        success: Object.values(exports).some((s) => s),
        exports,
      };
    } catch (error) {
      console.error('Error exporting meal to health apps:', error);
      return { success: false, exports };
    }
  }


  static async getActivitySummary(userId: string): Promise<any> {
    try {
      const connections = await this.getActiveConnections(userId);

      let steps = 0;
      let caloriesBurned = 0;
      let distance = 0;

      for (const connection of connections) {
        try {
          if (connection.provider === 'apple_health') {
            const activityData =
              await AppleHealthIntegrationService.syncActivityData(userId);
            if (activityData) {
              steps += activityData.steps || 0;
              caloriesBurned +=
                activityData.activeCalories + activityData.basalCalories || 0;
            }
          } else if (connection.provider === 'google_fit') {
            const activityData =
              await GoogleFitIntegrationService.syncActivityData(userId);
            if (activityData) {
              steps += activityData.steps || 0;
              caloriesBurned += activityData.calories || 0;
              distance += activityData.distance || 0;
            }
          }
        } catch (error) {
          console.error(
            `Error getting activity from ${connection.provider}:`,
            error
          );
        }
      }

      return {
        steps,
        caloriesBurned,
        distance,
        date: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting activity summary:', error);
      return {
        steps: 0,
        caloriesBurned: 0,
        distance: 0,
        date: new Date().toISOString(),
      };
    }
  }

  static async getSyncHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('health_sync_history')
        .select(
          `
          *,
          health_app_connections (
            provider
          )
        `
        )
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  static async getRecentSyncErrors(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('health_sync_history')
        .select(
          `
          *,
          health_app_connections (
            provider
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'failed')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sync errors:', error);
      return [];
    }
  }

  static async clearSyncErrors(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('health_app_connections')
        .update({
          error_count: 0,
          last_error: null,
          last_error_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing sync errors:', error);
      return false;
    }
  }

  static async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('health_app_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      return false;
    }
  }

  static async scheduleSyncJob(
    userId: string,
    connectionId: string,
    syncConfigId: string,
    priority: number = 5
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('health_sync_queue').insert({
        user_id: userId,
        connection_id: connectionId,
        sync_config_id: syncConfigId,
        priority,
        scheduled_for: new Date().toISOString(),
        status: 'queued',
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error scheduling sync job:', error);
      return false;
    }
  }

  static async getPendingSyncs(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_pending_health_syncs', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting pending syncs:', error);
      return [];
    }
  }

  static async getConflicts(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('health_sync_conflicts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting conflicts:', error);
      return [];
    }
  }

  static async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'external',
    resolutionData?: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('health_sync_conflicts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolution,
          resolution_data: resolutionData,
        })
        .eq('id', conflictId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return false;
    }
  }
}

import { supabase } from '@/lib/supabase';
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';

export interface HealthKitConfig {
  permissions: {
    read: string[];
    write: string[];
  };
}

export class AppleHealthIntegrationService {
  private static readonly PERMISSIONS: HealthKitPermissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
        AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
        AppleHealthKit.Constants.Permissions.DietaryProtein,
        AppleHealthKit.Constants.Permissions.DietaryFatTotal,
        AppleHealthKit.Constants.Permissions.DietarySugar,
        AppleHealthKit.Constants.Permissions.DietaryFiber,
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.Weight,
      ],
      write: [
        AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
        AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
        AppleHealthKit.Constants.Permissions.DietaryProtein,
        AppleHealthKit.Constants.Permissions.DietaryFatTotal,
        AppleHealthKit.Constants.Permissions.DietarySugar,
        AppleHealthKit.Constants.Permissions.DietaryFiber,
        AppleHealthKit.Constants.Permissions.Water,
      ],
    },
  };

  static async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(this.PERMISSIONS, (error: string) => {
        if (error) {
          console.error('Error initializing HealthKit:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  static async checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((error: string, available: boolean) => {
        if (error) {
          console.error('Error checking HealthKit availability:', error);
          resolve(false);
        } else {
          resolve(available);
        }
      });
    });
  }

  static async connectHealthKit(userId: string): Promise<boolean> {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        throw new Error('HealthKit is not available on this device');
      }

      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize HealthKit');
      }

      const { data: existingConnection } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'apple_health')
        .maybeSingle();

      if (existingConnection) {
        await supabase
          .from('health_app_connections')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConnection.id);
      } else {
        await supabase.from('health_app_connections').insert({
          user_id: userId,
          provider: 'apple_health',
          is_active: true,
          scopes: [
            'read_nutrition',
            'write_nutrition',
            'read_activity',
          ],
          connection_metadata: {
            platform: 'ios',
            initialized_at: new Date().toISOString(),
          },
        });
      }

      await this.createDefaultSyncConfigs(userId);

      return true;
    } catch (error) {
      console.error('Error connecting to HealthKit:', error);
      return false;
    }
  }

  static async exportMealToHealthKit(
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
  ): Promise<boolean> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new Error('No active HealthKit connection');
      }

      const syncHistoryId = await this.createSyncHistory(
        userId,
        connection.id,
        'export_only',
        'nutrition'
      );

      await this.saveDietaryEnergy(mealData.calories, mealData.timestamp);
      await this.saveDietaryCarbs(mealData.carbs, mealData.timestamp);
      await this.saveDietaryProtein(mealData.protein, mealData.timestamp);
      await this.saveDietaryFat(mealData.fat, mealData.timestamp);

      if (mealData.fiber) {
        await this.saveDietaryFiber(mealData.fiber, mealData.timestamp);
      }

      if (mealData.sugar) {
        await this.saveDietarySugar(mealData.sugar, mealData.timestamp);
      }

      await this.recordExportedData(
        userId,
        connection.id,
        syncHistoryId,
        'nutrition',
        mealData
      );

      await this.completeSyncHistory(syncHistoryId, 'completed', 1, 1);

      return true;
    } catch (error) {
      console.error('Error exporting meal to HealthKit:', error);
      return false;
    }
  }


  static async syncActivityData(userId: string): Promise<any> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new Error('No active HealthKit connection');
      }

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      const [steps, activeEnergy, basalEnergy] = await Promise.all([
        this.getSteps(startOfDay, new Date()),
        this.getActiveEnergy(startOfDay, new Date()),
        this.getBasalEnergy(startOfDay, new Date()),
      ]);

      return {
        steps: steps?.value || 0,
        activeCalories: activeEnergy?.value || 0,
        basalCalories: basalEnergy?.value || 0,
        totalCalories:
          (activeEnergy?.value || 0) + (basalEnergy?.value || 0),
        date: today.toISOString(),
      };
    } catch (error) {
      console.error('Error syncing activity data:', error);
      return null;
    }
  }


  private static async saveDietaryEnergy(
    calories: number,
    date: Date
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        value: calories,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveDietaryEnergy(
        options,
        (error: string, result: string) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private static async saveDietaryCarbs(
    carbs: number,
    date: Date
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        value: carbs,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveDietaryCarbohydrates(
        options,
        (error: string, result: string) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private static async saveDietaryProtein(
    protein: number,
    date: Date
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        value: protein,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveDietaryProtein(
        options,
        (error: string, result: string) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private static async saveDietaryFat(fat: number, date: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        value: fat,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveDietaryFat(
        options,
        (error: string, result: string) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private static async saveDietaryFiber(
    fiber: number,
    date: Date
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        value: fiber,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveDietaryFiber(
        options,
        (error: string, result: string) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private static async saveDietarySugar(
    sugar: number,
    date: Date
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        value: sugar,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveDietarySugar(
        options,
        (error: string, result: string) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      );
    });
  }


  private static async getSteps(
    startDate: Date,
    endDate: Date
  ): Promise<HealthValue | null> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getStepCount(
        options,
        (error: string, result: HealthValue) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  private static async getActiveEnergy(
    startDate: Date,
    endDate: Date
  ): Promise<HealthValue | null> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getActiveEnergyBurned(
        options,
        (error: string, result: HealthValue) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  private static async getBasalEnergy(
    startDate: Date,
    endDate: Date
  ): Promise<HealthValue | null> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getBasalEnergyBurned(
        options,
        (error: string, result: HealthValue) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  private static async getActiveConnection(userId: string): Promise<any> {
    const { data } = await supabase
      .from('health_app_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'apple_health')
      .eq('is_active', true)
      .maybeSingle();

    return data;
  }

  private static async createSyncHistory(
    userId: string,
    connectionId: string,
    direction: string,
    dataType: string
  ): Promise<string> {
    const { data } = await supabase
      .from('health_sync_history')
      .insert({
        user_id: userId,
        connection_id: connectionId,
        sync_type: 'automatic',
        sync_direction: direction,
        data_type: dataType,
        status: 'in_progress',
      })
      .select()
      .single();

    return data.id;
  }

  private static async completeSyncHistory(
    syncHistoryId: string,
    status: string,
    processed: number,
    succeeded: number
  ): Promise<void> {
    await supabase
      .from('health_sync_history')
      .update({
        status,
        completed_at: new Date().toISOString(),
        records_processed: processed,
        records_succeeded: succeeded,
      })
      .eq('id', syncHistoryId);
  }

  private static async recordExportedData(
    userId: string,
    connectionId: string,
    syncHistoryId: string,
    dataType: string,
    data: any
  ): Promise<void> {
    await supabase.from('exported_health_data').insert({
      user_id: userId,
      connection_id: connectionId,
      sync_history_id: syncHistoryId,
      data_type: dataType,
      local_record_id: `meal_${Date.now()}`,
      local_table_name: 'meal_logs',
      exported_data: data,
      export_status: 'confirmed',
      exported_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
    });
  }


  private static async createDefaultSyncConfigs(
    userId: string
  ): Promise<void> {
    const { data: connection } = await supabase
      .from('health_app_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'apple_health')
      .single();

    if (!connection) return;

    const configs = [
      {
        user_id: userId,
        connection_id: connection.id,
        data_type: 'nutrition',
        sync_direction: 'export_only',
        is_enabled: true,
      },
      {
        user_id: userId,
        connection_id: connection.id,
        data_type: 'exercise',
        sync_direction: 'import_only',
        is_enabled: true,
      },
    ];

    for (const config of configs) {
      await supabase
        .from('sync_configurations')
        .upsert(config, { onConflict: 'connection_id,data_type' });
    }
  }
}

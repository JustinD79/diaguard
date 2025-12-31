import { supabase } from '@/lib/supabase';

export type NutritionProvider = 'myfitnesspal' | 'cronometer' | 'loseit' | 'fatsecret';

export interface NutritionEntry {
  id: string;
  foodName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servings?: number;
  timestamp: Date;
  source: NutritionProvider | 'local';
  externalId?: string;
}

export interface SyncConfig {
  provider: NutritionProvider;
  syncDirection: 'export_only' | 'import_only' | 'bidirectional';
  autoSync: boolean;
  syncFrequencyMinutes: number;
  conflictResolution: 'newest_wins' | 'external_wins' | 'local_wins' | 'manual';
  dataTypes: string[];
}

export interface SyncResult {
  success: boolean;
  exported: number;
  imported: number;
  conflicts: number;
  errors: string[];
  syncedAt: string;
}

export interface ProviderConnection {
  id: string;
  provider: NutritionProvider;
  isConnected: boolean;
  lastSyncAt: string | null;
  syncConfig: SyncConfig;
  errorCount: number;
  lastError?: string;
}

export class ThirdPartyNutritionSyncService {
  static async connectProvider(
    userId: string,
    provider: NutritionProvider,
    authData: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
    }
  ): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('health_app_connections')
          .update({
            is_active: true,
            access_token: authData.accessToken,
            refresh_token: authData.refreshToken,
            token_expires_at: authData.expiresAt?.toISOString(),
            error_count: 0,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('health_app_connections').insert({
          user_id: userId,
          provider: provider,
          is_active: true,
          access_token: authData.accessToken,
          refresh_token: authData.refreshToken,
          token_expires_at: authData.expiresAt?.toISOString(),
          scopes: ['read_nutrition', 'write_nutrition'],
          connection_metadata: {
            connected_at: new Date().toISOString(),
          },
        });
      }

      await this.createDefaultSyncConfig(userId, provider);

      return true;
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
      return false;
    }
  }

  static async disconnectProvider(
    userId: string,
    provider: NutritionProvider
  ): Promise<boolean> {
    try {
      await supabase
        .from('health_app_connections')
        .update({
          is_active: false,
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', provider);

      return true;
    } catch (error) {
      console.error(`Error disconnecting from ${provider}:`, error);
      return false;
    }
  }

  static async getConnectedProviders(userId: string): Promise<ProviderConnection[]> {
    try {
      const { data, error } = await supabase
        .from('health_app_connections')
        .select('*, sync_configurations(*)')
        .eq('user_id', userId)
        .in('provider', ['myfitnesspal', 'cronometer', 'loseit', 'fatsecret']);

      if (error) throw error;

      return (data || []).map(conn => ({
        id: conn.id,
        provider: conn.provider as NutritionProvider,
        isConnected: conn.is_active,
        lastSyncAt: conn.last_sync_at,
        syncConfig: this.extractSyncConfig(conn.sync_configurations, conn.provider),
        errorCount: conn.error_count || 0,
        lastError: conn.last_error,
      }));
    } catch (error) {
      console.error('Error getting connected providers:', error);
      return [];
    }
  }

  static async syncNutritionData(
    userId: string,
    provider: NutritionProvider,
    options: {
      startDate?: Date;
      endDate?: Date;
      direction?: 'export' | 'import' | 'both';
    } = {}
  ): Promise<SyncResult> {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate = new Date(),
      direction = 'both',
    } = options;

    const result: SyncResult = {
      success: false,
      exported: 0,
      imported: 0,
      conflicts: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    try {
      const connection = await this.getActiveConnection(userId, provider);
      if (!connection) {
        result.errors.push(`No active connection for ${provider}`);
        return result;
      }

      const syncHistoryId = await this.createSyncHistory(
        userId,
        connection.id,
        direction === 'both' ? 'bidirectional' : direction === 'export' ? 'export_only' : 'import_only',
        'nutrition'
      );

      if (direction === 'export' || direction === 'both') {
        const exportResult = await this.exportLocalMeals(userId, connection, startDate, endDate, syncHistoryId);
        result.exported = exportResult.count;
        result.errors.push(...exportResult.errors);
      }

      if (direction === 'import' || direction === 'both') {
        const importResult = await this.importExternalMeals(userId, connection, provider, startDate, endDate, syncHistoryId);
        result.imported = importResult.count;
        result.conflicts = importResult.conflicts;
        result.errors.push(...importResult.errors);
      }

      await this.completeSyncHistory(
        syncHistoryId,
        result.errors.length === 0 ? 'completed' : 'partial',
        result.exported + result.imported,
        result.exported + result.imported - result.errors.length
      );

      await supabase.rpc('update_connection_last_sync', {
        p_connection_id: connection.id,
      });

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      console.error(`Error syncing with ${provider}:`, error);
      result.errors.push(error.message || 'Unknown error');
      return result;
    }
  }

  static async exportMealToProvider(
    userId: string,
    provider: NutritionProvider,
    meal: NutritionEntry
  ): Promise<boolean> {
    try {
      const connection = await this.getActiveConnection(userId, provider);
      if (!connection) {
        throw new Error(`No active connection for ${provider}`);
      }

      const syncHistoryId = await this.createSyncHistory(
        userId,
        connection.id,
        'export_only',
        'nutrition'
      );

      const externalId = await this.sendMealToProvider(provider, connection, meal);

      await supabase.from('exported_health_data').insert({
        user_id: userId,
        connection_id: connection.id,
        sync_history_id: syncHistoryId,
        data_type: 'nutrition',
        local_record_id: meal.id,
        local_table_name: 'meal_logs',
        external_record_id: externalId,
        exported_data: meal,
        export_status: 'confirmed',
        exported_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      });

      await this.completeSyncHistory(syncHistoryId, 'completed', 1, 1);

      return true;
    } catch (error) {
      console.error(`Error exporting meal to ${provider}:`, error);
      return false;
    }
  }

  static async importMealsFromProvider(
    userId: string,
    provider: NutritionProvider,
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<NutritionEntry[]> {
    try {
      const connection = await this.getActiveConnection(userId, provider);
      if (!connection) {
        throw new Error(`No active connection for ${provider}`);
      }

      const externalMeals = await this.fetchMealsFromProvider(provider, connection, startDate, endDate);

      const syncHistoryId = await this.createSyncHistory(
        userId,
        connection.id,
        'import_only',
        'nutrition'
      );

      const importedMeals: NutritionEntry[] = [];

      for (const externalMeal of externalMeals) {
        const localMeal = this.convertToLocalFormat(externalMeal, provider);

        const existingImport = await this.checkForExistingImport(
          connection.id,
          externalMeal.id,
          'nutrition'
        );

        if (!existingImport) {
          await this.saveMealLocally(userId, localMeal);

          await supabase.from('imported_health_data').insert({
            user_id: userId,
            connection_id: connection.id,
            sync_history_id: syncHistoryId,
            data_type: 'nutrition',
            external_record_id: externalMeal.id,
            local_record_id: localMeal.id,
            local_table_name: 'meal_logs',
            imported_data: externalMeal,
            import_status: 'stored',
            imported_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          });

          importedMeals.push(localMeal);
        }
      }

      await this.completeSyncHistory(
        syncHistoryId,
        'completed',
        externalMeals.length,
        importedMeals.length
      );

      return importedMeals;
    } catch (error) {
      console.error(`Error importing meals from ${provider}:`, error);
      return [];
    }
  }

  static async updateSyncConfig(
    userId: string,
    provider: NutritionProvider,
    config: Partial<SyncConfig>
  ): Promise<boolean> {
    try {
      const connection = await this.getActiveConnection(userId, provider);
      if (!connection) return false;

      await supabase
        .from('sync_configurations')
        .update({
          sync_direction: config.syncDirection,
          is_enabled: config.autoSync !== false,
          sync_frequency_minutes: config.syncFrequencyMinutes,
          conflict_resolution: config.conflictResolution,
          updated_at: new Date().toISOString(),
        })
        .eq('connection_id', connection.id)
        .eq('data_type', 'nutrition');

      return true;
    } catch (error) {
      console.error('Error updating sync config:', error);
      return false;
    }
  }

  static async getSyncHistory(
    userId: string,
    provider?: NutritionProvider,
    limit: number = 20
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('health_sync_history')
        .select('*, health_app_connections(provider)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (provider) {
        const { data: connections } = await supabase
          .from('health_app_connections')
          .select('id')
          .eq('user_id', userId)
          .eq('provider', provider);

        if (connections && connections.length > 0) {
          query = query.in(
            'connection_id',
            connections.map(c => c.id)
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  static async resolveSyncConflict(
    conflictId: string,
    resolution: 'use_local' | 'use_external' | 'merge'
  ): Promise<boolean> {
    try {
      const { data: conflict, error: fetchError } = await supabase
        .from('health_sync_conflicts')
        .select('*')
        .eq('id', conflictId)
        .single();

      if (fetchError || !conflict) throw fetchError || new Error('Conflict not found');

      let resolvedData: any;

      switch (resolution) {
        case 'use_local':
          resolvedData = conflict.local_data;
          break;
        case 'use_external':
          resolvedData = conflict.external_data;
          break;
        case 'merge':
          resolvedData = this.mergeNutritionData(conflict.local_data, conflict.external_data);
          break;
      }

      await supabase
        .from('health_sync_conflicts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolution,
          resolution_data: resolvedData,
        })
        .eq('id', conflictId);

      return true;
    } catch (error) {
      console.error('Error resolving sync conflict:', error);
      return false;
    }
  }

  static async getPendingConflicts(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('health_sync_conflicts')
        .select('*, health_app_connections(provider)')
        .eq('user_id', userId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting pending conflicts:', error);
      return [];
    }
  }

  static getProviderInfo(provider: NutritionProvider): {
    name: string;
    description: string;
    features: string[];
    authUrl?: string;
  } {
    const providerInfo: Record<NutritionProvider, any> = {
      myfitnesspal: {
        name: 'MyFitnessPal',
        description: 'Sync your food diary with one of the most popular nutrition tracking apps',
        features: ['Food diary sync', 'Barcode database', 'Recipe import', 'Goal tracking'],
      },
      cronometer: {
        name: 'Cronometer',
        description: 'Comprehensive nutrition tracking with detailed micronutrient data',
        features: ['Detailed micronutrients', 'Food diary sync', 'Biometric tracking', 'Custom foods'],
      },
      loseit: {
        name: 'Lose It!',
        description: 'Weight loss focused nutrition tracking and goal setting',
        features: ['Calorie tracking', 'Weight goals', 'Food photos', 'Community support'],
      },
      fatsecret: {
        name: 'FatSecret',
        description: 'Free calorie counter and diet tracker with food database',
        features: ['Food diary', 'Exercise logging', 'Community recipes', 'Barcode scanner'],
      },
    };

    return providerInfo[provider];
  }

  private static async getActiveConnection(
    userId: string,
    provider: NutritionProvider
  ): Promise<any> {
    const { data } = await supabase
      .from('health_app_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    return data;
  }

  private static async createDefaultSyncConfig(
    userId: string,
    provider: NutritionProvider
  ): Promise<void> {
    const { data: connection } = await supabase
      .from('health_app_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (!connection) return;

    await supabase.from('sync_configurations').upsert({
      user_id: userId,
      connection_id: connection.id,
      data_type: 'nutrition',
      sync_direction: 'bidirectional',
      is_enabled: true,
      sync_frequency_minutes: 60,
      conflict_resolution: 'newest_wins',
    }, {
      onConflict: 'connection_id,data_type',
    });
  }

  private static extractSyncConfig(
    configs: any[],
    provider: string
  ): SyncConfig {
    const nutritionConfig = configs?.find(c => c.data_type === 'nutrition');

    return {
      provider: provider as NutritionProvider,
      syncDirection: nutritionConfig?.sync_direction || 'bidirectional',
      autoSync: nutritionConfig?.is_enabled ?? true,
      syncFrequencyMinutes: nutritionConfig?.sync_frequency_minutes || 60,
      conflictResolution: nutritionConfig?.conflict_resolution || 'newest_wins',
      dataTypes: ['nutrition'],
    };
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
        sync_type: 'manual',
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

  private static async exportLocalMeals(
    userId: string,
    connection: any,
    startDate: Date,
    endDate: Date,
    syncHistoryId: string
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];

    try {
      const { data: meals, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const { data: alreadyExported } = await supabase
        .from('exported_health_data')
        .select('local_record_id')
        .eq('connection_id', connection.id)
        .eq('data_type', 'nutrition');

      const exportedIds = new Set(alreadyExported?.map(e => e.local_record_id) || []);

      const mealsToExport = (meals || []).filter(m => !exportedIds.has(m.id));

      for (const meal of mealsToExport) {
        try {
          const externalId = `ext_${meal.id}_${Date.now()}`;

          await supabase.from('exported_health_data').insert({
            user_id: userId,
            connection_id: connection.id,
            sync_history_id: syncHistoryId,
            data_type: 'nutrition',
            local_record_id: meal.id,
            local_table_name: 'meal_logs',
            external_record_id: externalId,
            exported_data: meal,
            export_status: 'confirmed',
            exported_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
          });
        } catch (mealError: any) {
          errors.push(`Failed to export meal ${meal.id}: ${mealError.message}`);
        }
      }

      return { count: mealsToExport.length - errors.length, errors };
    } catch (error: any) {
      errors.push(`Export failed: ${error.message}`);
      return { count: 0, errors };
    }
  }

  private static async importExternalMeals(
    userId: string,
    connection: any,
    provider: NutritionProvider,
    startDate: Date,
    endDate: Date,
    syncHistoryId: string
  ): Promise<{ count: number; conflicts: number; errors: string[] }> {
    const errors: string[] = [];
    let conflicts = 0;

    try {
      const externalMeals = await this.fetchMealsFromProvider(provider, connection, startDate, endDate);

      let importCount = 0;

      for (const externalMeal of externalMeals) {
        try {
          const existingImport = await this.checkForExistingImport(
            connection.id,
            externalMeal.id,
            'nutrition'
          );

          if (existingImport) continue;

          const localConflict = await this.checkForLocalConflict(userId, externalMeal);

          if (localConflict) {
            await this.recordConflict(
              userId,
              connection.id,
              syncHistoryId,
              localConflict,
              externalMeal
            );
            conflicts++;
            continue;
          }

          const localMeal = this.convertToLocalFormat(externalMeal, provider);
          await this.saveMealLocally(userId, localMeal);

          await supabase.from('imported_health_data').insert({
            user_id: userId,
            connection_id: connection.id,
            sync_history_id: syncHistoryId,
            data_type: 'nutrition',
            external_record_id: externalMeal.id,
            local_record_id: localMeal.id,
            local_table_name: 'meal_logs',
            imported_data: externalMeal,
            import_status: 'stored',
            imported_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          });

          importCount++;
        } catch (mealError: any) {
          errors.push(`Failed to import meal: ${mealError.message}`);
        }
      }

      return { count: importCount, conflicts, errors };
    } catch (error: any) {
      errors.push(`Import failed: ${error.message}`);
      return { count: 0, conflicts: 0, errors };
    }
  }

  private static async fetchMealsFromProvider(
    provider: NutritionProvider,
    connection: any,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return [];
  }

  private static async sendMealToProvider(
    provider: NutritionProvider,
    connection: any,
    meal: NutritionEntry
  ): Promise<string> {
    return `${provider}_${meal.id}_${Date.now()}`;
  }

  private static convertToLocalFormat(
    externalMeal: any,
    provider: NutritionProvider
  ): NutritionEntry {
    return {
      id: `imported_${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      foodName: externalMeal.name || externalMeal.food_name || 'Unknown Food',
      mealType: externalMeal.meal_type || 'snack',
      calories: externalMeal.calories || 0,
      carbs: externalMeal.carbs || externalMeal.carbohydrates || 0,
      protein: externalMeal.protein || 0,
      fat: externalMeal.fat || 0,
      fiber: externalMeal.fiber || 0,
      sugar: externalMeal.sugar || 0,
      sodium: externalMeal.sodium || 0,
      servingSize: externalMeal.serving_size || '1 serving',
      servings: externalMeal.servings || 1,
      timestamp: new Date(externalMeal.timestamp || externalMeal.date || Date.now()),
      source: provider,
      externalId: externalMeal.id,
    };
  }

  private static async saveMealLocally(
    userId: string,
    meal: NutritionEntry
  ): Promise<void> {
    await supabase.from('meal_logs').insert({
      user_id: userId,
      food_name: meal.foodName,
      meal_type: meal.mealType,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      fiber: meal.fiber || 0,
      sugars: meal.sugar || 0,
      portion_size: meal.servingSize,
      notes: `Imported from ${meal.source}`,
    });
  }

  private static async checkForExistingImport(
    connectionId: string,
    externalRecordId: string,
    dataType: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('imported_health_data')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('external_record_id', externalRecordId)
      .eq('data_type', dataType)
      .maybeSingle();

    return !!data;
  }

  private static async checkForLocalConflict(
    userId: string,
    externalMeal: any
  ): Promise<any | null> {
    const mealDate = new Date(externalMeal.timestamp || externalMeal.date);
    const startTime = new Date(mealDate.getTime() - 30 * 60 * 1000);
    const endTime = new Date(mealDate.getTime() + 30 * 60 * 1000);

    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .ilike('food_name', `%${externalMeal.name || externalMeal.food_name}%`)
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
      .maybeSingle();

    return data;
  }

  private static async recordConflict(
    userId: string,
    connectionId: string,
    syncHistoryId: string,
    localData: any,
    externalData: any
  ): Promise<void> {
    await supabase.from('health_sync_conflicts').insert({
      user_id: userId,
      connection_id: connectionId,
      sync_history_id: syncHistoryId,
      data_type: 'nutrition',
      local_data: localData,
      external_data: externalData,
      conflict_type: 'duplicate_entry',
    });
  }

  private static mergeNutritionData(local: any, external: any): any {
    return {
      ...local,
      ...external,
      calories: Math.round((local.calories + external.calories) / 2),
      carbs: Math.round(((local.carbs || 0) + (external.carbs || 0)) / 2),
      protein: Math.round(((local.protein || 0) + (external.protein || 0)) / 2),
      fat: Math.round(((local.fat || 0) + (external.fat || 0)) / 2),
      merged: true,
      merge_timestamp: new Date().toISOString(),
    };
  }
}

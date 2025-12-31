import { supabase } from '@/lib/supabase';
import { ExerciseLog, ExerciseType, IntensityLevel } from './ExerciseTrackingService';

export type FitnessProvider = 'strava' | 'fitbit' | 'garmin' | 'polar' | 'wahoo';

export interface FitnessAppConnection {
  id: string;
  provider: FitnessProvider;
  isConnected: boolean;
  lastSyncAt: string | null;
  athleteId?: string;
  athleteName?: string;
  syncEnabled: boolean;
  autoImport: boolean;
}

export interface ExternalWorkout {
  id: string;
  externalId: string;
  provider: FitnessProvider;
  name: string;
  type: string;
  startDate: Date;
  durationSeconds: number;
  distanceMeters?: number;
  calories?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  elevationGain?: number;
  averagePace?: number;
  averageSpeed?: number;
  movingTime?: number;
  deviceName?: string;
  mapPolyline?: string;
  metadata?: Record<string, any>;
}

export interface SyncOptions {
  startDate?: Date;
  endDate?: Date;
  activityTypes?: string[];
  limit?: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  activities: ExerciseLog[];
  errors: string[];
}

export class FitnessAppIntegrationService {
  static async connectProvider(
    userId: string,
    provider: FitnessProvider,
    authData: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
      athleteId?: string;
      athleteName?: string;
    }
  ): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

      const connectionData = {
        user_id: userId,
        provider,
        is_active: true,
        access_token: authData.accessToken,
        refresh_token: authData.refreshToken,
        token_expires_at: authData.expiresAt?.toISOString(),
        provider_user_id: authData.athleteId,
        auto_sync_enabled: true,
        connection_metadata: {
          athlete_name: authData.athleteName,
          connected_at: new Date().toISOString(),
        },
      };

      if (existing) {
        await supabase
          .from('health_app_connections')
          .update({
            ...connectionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('health_app_connections').insert(connectionData);
      }

      await this.createSyncConfiguration(userId, provider);
      return true;
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
      return false;
    }
  }

  static async disconnectProvider(
    userId: string,
    provider: FitnessProvider
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
      console.error(`Error disconnecting ${provider}:`, error);
      return false;
    }
  }

  static async getConnectedProviders(userId: string): Promise<FitnessAppConnection[]> {
    try {
      const { data, error } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .in('provider', ['strava', 'fitbit', 'garmin', 'polar', 'wahoo']);

      if (error) throw error;

      return (data || []).map(conn => ({
        id: conn.id,
        provider: conn.provider as FitnessProvider,
        isConnected: conn.is_active,
        lastSyncAt: conn.last_sync_at,
        athleteId: conn.provider_user_id,
        athleteName: conn.connection_metadata?.athlete_name,
        syncEnabled: conn.auto_sync_enabled,
        autoImport: conn.auto_sync_enabled,
      }));
    } catch (error) {
      console.error('Error getting connected providers:', error);
      return [];
    }
  }

  static async importWorkouts(
    userId: string,
    provider: FitnessProvider,
    options: SyncOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      activities: [],
      errors: [],
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
        'import_only',
        'exercise'
      );

      const externalWorkouts = await this.fetchWorkoutsFromProvider(
        provider,
        connection,
        options
      );

      for (const workout of externalWorkouts) {
        try {
          const existingImport = await this.checkExistingImport(
            connection.id,
            workout.externalId
          );

          if (existingImport) {
            result.skipped++;
            continue;
          }

          const exerciseLog = await this.convertAndSaveWorkout(
            userId,
            connection.id,
            syncHistoryId,
            workout
          );

          if (exerciseLog) {
            result.activities.push(exerciseLog);
            result.imported++;
          } else {
            result.failed++;
          }
        } catch (workoutError: any) {
          result.failed++;
          result.errors.push(`Failed to import workout ${workout.id}: ${workoutError.message}`);
        }
      }

      await this.completeSyncHistory(
        syncHistoryId,
        result.errors.length === 0 ? 'completed' : 'partial',
        externalWorkouts.length,
        result.imported
      );

      await supabase.rpc('update_connection_last_sync', {
        p_connection_id: connection.id,
      });

      return result;
    } catch (error: any) {
      result.errors.push(`Import failed: ${error.message}`);
      return result;
    }
  }

  static async syncAllProviders(userId: string): Promise<Record<FitnessProvider, ImportResult>> {
    const results: Record<string, ImportResult> = {};
    const connections = await this.getConnectedProviders(userId);

    for (const connection of connections) {
      if (connection.isConnected && connection.syncEnabled) {
        results[connection.provider] = await this.importWorkouts(userId, connection.provider);
      }
    }

    return results as Record<FitnessProvider, ImportResult>;
  }

  static async getRecentWorkouts(
    userId: string,
    provider?: FitnessProvider,
    limit: number = 20
  ): Promise<ExerciseLog[]> {
    try {
      let query = supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .order('exercise_time', { ascending: false })
        .limit(limit);

      if (provider) {
        query = query.eq('source', provider);
      } else {
        query = query.in('source', ['strava', 'fitbit', 'garmin', 'polar', 'wahoo']);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting recent workouts:', error);
      return [];
    }
  }

  static async toggleAutoImport(
    userId: string,
    provider: FitnessProvider,
    enabled: boolean
  ): Promise<boolean> {
    try {
      await supabase
        .from('health_app_connections')
        .update({
          auto_sync_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', provider);

      return true;
    } catch (error) {
      console.error('Error toggling auto import:', error);
      return false;
    }
  }

  static getProviderInfo(provider: FitnessProvider): {
    name: string;
    icon: string;
    description: string;
    authUrl: string;
    features: string[];
    supportedActivities: string[];
  } {
    const providerInfo: Record<FitnessProvider, any> = {
      strava: {
        name: 'Strava',
        icon: 'strava',
        description: 'Sync running, cycling, and swimming activities',
        authUrl: 'https://www.strava.com/oauth/authorize',
        features: ['Auto-sync workouts', 'GPS data', 'Heart rate', 'Power data'],
        supportedActivities: ['Run', 'Ride', 'Swim', 'Walk', 'Hike', 'Workout'],
      },
      fitbit: {
        name: 'Fitbit',
        icon: 'fitbit',
        description: 'Import activities, steps, and health metrics',
        authUrl: 'https://www.fitbit.com/oauth2/authorize',
        features: ['Daily activity', 'Sleep data', 'Heart rate zones', 'Exercise sessions'],
        supportedActivities: ['Walk', 'Run', 'Bike', 'Swim', 'Weights', 'Workout'],
      },
      garmin: {
        name: 'Garmin Connect',
        icon: 'garmin',
        description: 'Sync activities from Garmin devices',
        authUrl: 'https://connect.garmin.com/oauthConfirm',
        features: ['Detailed metrics', 'Training load', 'Recovery time', 'VO2 max'],
        supportedActivities: ['Running', 'Cycling', 'Swimming', 'Strength', 'Yoga', 'Walking'],
      },
      polar: {
        name: 'Polar Flow',
        icon: 'polar',
        description: 'Import training sessions from Polar devices',
        authUrl: 'https://flow.polar.com/oauth2/authorization',
        features: ['Training benefit', 'Cardio load', 'Sleep analysis', 'Recovery status'],
        supportedActivities: ['Running', 'Cycling', 'Swimming', 'Gym', 'Other sport'],
      },
      wahoo: {
        name: 'Wahoo',
        icon: 'wahoo',
        description: 'Sync workouts from Wahoo ELEMNT devices',
        authUrl: 'https://api.wahooligan.com/oauth/authorize',
        features: ['Structured workouts', 'Power data', 'Indoor training', 'Routes'],
        supportedActivities: ['Cycling', 'Running', 'Gym'],
      },
    };

    return providerInfo[provider];
  }

  static async getSyncStatus(
    userId: string,
    provider: FitnessProvider
  ): Promise<{
    isConnected: boolean;
    lastSync: string | null;
    totalImported: number;
    pendingSync: boolean;
    errorCount: number;
    lastError?: string;
  }> {
    try {
      const { data: connection } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .maybeSingle();

      if (!connection) {
        return {
          isConnected: false,
          lastSync: null,
          totalImported: 0,
          pendingSync: false,
          errorCount: 0,
        };
      }

      const { count: importedCount } = await supabase
        .from('exercise_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', provider);

      return {
        isConnected: connection.is_active,
        lastSync: connection.last_sync_at,
        totalImported: importedCount || 0,
        pendingSync: connection.auto_sync_enabled && this.shouldSync(connection.last_sync_at),
        errorCount: connection.error_count || 0,
        lastError: connection.last_error,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isConnected: false,
        lastSync: null,
        totalImported: 0,
        pendingSync: false,
        errorCount: 0,
      };
    }
  }

  private static async getActiveConnection(
    userId: string,
    provider: FitnessProvider
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

  private static async createSyncConfiguration(
    userId: string,
    provider: FitnessProvider
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
      data_type: 'exercise',
      sync_direction: 'import_only',
      is_enabled: true,
      sync_frequency_minutes: 60,
    }, {
      onConflict: 'connection_id,data_type',
    });
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

  private static async fetchWorkoutsFromProvider(
    provider: FitnessProvider,
    connection: any,
    options: SyncOptions
  ): Promise<ExternalWorkout[]> {
    return [];
  }

  private static async checkExistingImport(
    connectionId: string,
    externalId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('imported_health_data')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('external_record_id', externalId)
      .eq('data_type', 'exercise')
      .maybeSingle();

    return !!data;
  }

  private static async convertAndSaveWorkout(
    userId: string,
    connectionId: string,
    syncHistoryId: string,
    workout: ExternalWorkout
  ): Promise<ExerciseLog | null> {
    try {
      const exerciseType = this.mapActivityType(workout.type, workout.provider);
      const intensity = this.estimateIntensity(workout);

      const { data: exerciseLog, error } = await supabase
        .from('exercise_logs')
        .insert({
          user_id: userId,
          exercise_type: exerciseType,
          intensity,
          duration_minutes: Math.round(workout.durationSeconds / 60),
          calories_burned: workout.calories,
          distance: workout.distanceMeters ? workout.distanceMeters / 1000 : null,
          heart_rate_avg: workout.averageHeartRate,
          heart_rate_max: workout.maxHeartRate,
          exercise_time: workout.startDate.toISOString(),
          source: workout.provider,
          external_id: workout.externalId,
          notes: workout.name,
          metadata: {
            elevation_gain: workout.elevationGain,
            average_pace: workout.averagePace,
            device: workout.deviceName,
          },
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('imported_health_data').insert({
        user_id: userId,
        connection_id: connectionId,
        sync_history_id: syncHistoryId,
        data_type: 'exercise',
        external_record_id: workout.externalId,
        local_record_id: exerciseLog.id,
        local_table_name: 'exercise_logs',
        imported_data: workout,
        import_status: 'stored',
        imported_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });

      return exerciseLog;
    } catch (error) {
      console.error('Error saving workout:', error);
      return null;
    }
  }

  private static mapActivityType(
    externalType: string,
    provider: FitnessProvider
  ): ExerciseType {
    const normalizedType = externalType.toLowerCase();

    const typeMap: Record<string, ExerciseType> = {
      run: 'running',
      running: 'running',
      ride: 'cycling',
      cycling: 'cycling',
      bike: 'cycling',
      swim: 'swimming',
      swimming: 'swimming',
      walk: 'walking',
      walking: 'walking',
      hike: 'walking',
      workout: 'gym',
      weights: 'strength',
      strength_training: 'strength',
      yoga: 'yoga',
      hiit: 'hiit',
      cardio: 'cardio',
      sport: 'sports',
      soccer: 'sports',
      basketball: 'sports',
      tennis: 'sports',
    };

    return typeMap[normalizedType] || 'other';
  }

  private static estimateIntensity(workout: ExternalWorkout): IntensityLevel {
    if (workout.averageHeartRate) {
      const maxHR = 220 - 30;
      const hrPercent = (workout.averageHeartRate / maxHR) * 100;

      if (hrPercent >= 80) return 'vigorous';
      if (hrPercent >= 60) return 'moderate';
      return 'light';
    }

    if (workout.calories && workout.durationSeconds) {
      const calPerMin = (workout.calories / workout.durationSeconds) * 60;
      if (calPerMin >= 10) return 'vigorous';
      if (calPerMin >= 6) return 'moderate';
      return 'light';
    }

    return 'moderate';
  }

  private static shouldSync(lastSyncAt: string | null): boolean {
    if (!lastSyncAt) return true;
    const lastSync = new Date(lastSyncAt);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= 1;
  }
}

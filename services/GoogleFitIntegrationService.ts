import { supabase } from '@/lib/supabase';
import GoogleFit, { Scopes } from 'react-native-google-fit';

export interface GoogleFitConfig {
  scopes: string[];
}

export class GoogleFitIntegrationService {
  private static readonly SCOPES = [
    Scopes.FITNESS_ACTIVITY_READ,
    Scopes.FITNESS_ACTIVITY_WRITE,
    Scopes.FITNESS_BODY_READ,
    Scopes.FITNESS_NUTRITION_READ,
    Scopes.FITNESS_NUTRITION_WRITE,
    Scopes.FITNESS_LOCATION_READ,
  ];

  static async initialize(): Promise<boolean> {
    try {
      const options = {
        scopes: this.SCOPES,
      };

      await GoogleFit.checkIsAuthorized();
      const isAuthorized = GoogleFit.isAuthorized;

      if (!isAuthorized) {
        await GoogleFit.authorize(options);
      }

      return GoogleFit.isAuthorized;
    } catch (error) {
      console.error('Error initializing Google Fit:', error);
      return false;
    }
  }

  static async connectGoogleFit(userId: string): Promise<boolean> {
    try {
      const authorized = await this.initialize();
      if (!authorized) {
        throw new Error('Failed to authorize Google Fit');
      }

      const { data: existingConnection } = await supabase
        .from('health_app_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google_fit')
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
          provider: 'google_fit',
          is_active: true,
          scopes: this.SCOPES,
          connection_metadata: {
            platform: 'android',
            initialized_at: new Date().toISOString(),
          },
        });
      }

      await this.createDefaultSyncConfigs(userId);

      return true;
    } catch (error) {
      console.error('Error connecting to Google Fit:', error);
      return false;
    }
  }

  static async disconnectGoogleFit(userId: string): Promise<boolean> {
    try {
      await GoogleFit.disconnect();

      await supabase
        .from('health_app_connections')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'google_fit');

      return true;
    } catch (error) {
      console.error('Error disconnecting from Google Fit:', error);
      return false;
    }
  }

  static async syncActivityData(
    userId: string,
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<any> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new Error('No active Google Fit connection');
      }

      const syncHistoryId = await this.createSyncHistory(
        userId,
        connection.id,
        'import_only',
        'exercise'
      );

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const [steps, calories, distance, activities] = await Promise.all([
        GoogleFit.getDailyStepCountSamples(options),
        GoogleFit.getDailyCalorieSamples(options),
        GoogleFit.getDailyDistanceSamples(options),
        GoogleFit.getActivitySamples(options),
      ]);

      const activityData = {
        steps: this.aggregateSteps(steps),
        calories: this.aggregateCalories(calories),
        distance: this.aggregateDistance(distance),
        activities: activities || [],
        date: new Date().toISOString(),
      };

      await this.saveActivityData(userId, activityData);

      await this.completeSyncHistory(syncHistoryId, 'completed', 1, 1);

      return activityData;
    } catch (error) {
      console.error('Error syncing activity data:', error);
      return null;
    }
  }

  static async exportNutritionData(
    userId: string,
    mealData: {
      foodName: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
      fiber?: number;
      timestamp: Date;
    }
  ): Promise<boolean> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new Error('No active Google Fit connection');
      }

      const syncHistoryId = await this.createSyncHistory(
        userId,
        connection.id,
        'export_only',
        'nutrition'
      );

      const nutritionOptions = {
        startDate: mealData.timestamp.toISOString(),
        endDate: mealData.timestamp.toISOString(),
        nutrients: {
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fat: mealData.fat,
          fiber: mealData.fiber || 0,
        },
        meal_type: this.getMealTypeFromTime(mealData.timestamp),
        food_name: mealData.foodName,
      };

      await GoogleFit.saveFood(nutritionOptions as any);

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
      console.error('Error exporting nutrition data:', error);
      return false;
    }
  }

  static async getStepsToday(userId: string): Promise<number> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) return 0;

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      const options = {
        startDate: startOfDay.toISOString(),
        endDate: new Date().toISOString(),
      };

      const steps = await GoogleFit.getDailyStepCountSamples(options);
      return this.aggregateSteps(steps);
    } catch (error) {
      console.error('Error getting steps:', error);
      return 0;
    }
  }

  static async getCaloriesBurnedToday(userId: string): Promise<number> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) return 0;

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      const options = {
        startDate: startOfDay.toISOString(),
        endDate: new Date().toISOString(),
        basalCalculation: true,
      };

      const calories = await GoogleFit.getDailyCalorieSamples(options);
      return this.aggregateCalories(calories);
    } catch (error) {
      console.error('Error getting calories burned:', error);
      return 0;
    }
  }

  static async getHeartRateSamples(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) return [];

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const heartRateData = await GoogleFit.getHeartRateSamples(options);
      return heartRateData || [];
    } catch (error) {
      console.error('Error getting heart rate samples:', error);
      return [];
    }
  }

  static async getWeightSamples(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) return [];

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        unit: 'kg',
      };

      const weightData = await GoogleFit.getWeightSamples(options);
      return weightData || [];
    } catch (error) {
      console.error('Error getting weight samples:', error);
      return [];
    }
  }

  static async recordWorkout(
    userId: string,
    workout: {
      activityType: string;
      startDate: Date;
      endDate: Date;
      calories?: number;
      distance?: number;
    }
  ): Promise<boolean> {
    try {
      const connection = await this.getActiveConnection(userId);
      if (!connection) {
        throw new Error('No active Google Fit connection');
      }

      const options = {
        id: `workout_${Date.now()}`,
        name: workout.activityType,
        startDate: workout.startDate.toISOString(),
        endDate: workout.endDate.toISOString(),
        activityType: this.mapActivityType(workout.activityType),
        calories: workout.calories,
        distance: workout.distance,
      };

      await GoogleFit.saveActivity(options as any);

      return true;
    } catch (error) {
      console.error('Error recording workout:', error);
      return false;
    }
  }

  private static aggregateSteps(stepsData: any[]): number {
    if (!stepsData || stepsData.length === 0) return 0;

    return stepsData.reduce((total, dayData) => {
      if (dayData.steps && Array.isArray(dayData.steps)) {
        const dailyTotal = dayData.steps.reduce(
          (sum: number, step: any) => sum + (step.value || 0),
          0
        );
        return total + dailyTotal;
      }
      return total + (dayData.value || 0);
    }, 0);
  }

  private static aggregateCalories(caloriesData: any[]): number {
    if (!caloriesData || caloriesData.length === 0) return 0;

    return caloriesData.reduce((total, dayData) => {
      if (dayData.calorie && Array.isArray(dayData.calorie)) {
        const dailyTotal = dayData.calorie.reduce(
          (sum: number, cal: any) => sum + (cal.value || 0),
          0
        );
        return total + dailyTotal;
      }
      return total + (dayData.value || 0);
    }, 0);
  }

  private static aggregateDistance(distanceData: any[]): number {
    if (!distanceData || distanceData.length === 0) return 0;

    return distanceData.reduce((total, dayData) => {
      if (dayData.distance && Array.isArray(dayData.distance)) {
        const dailyTotal = dayData.distance.reduce(
          (sum: number, dist: any) => sum + (dist.value || 0),
          0
        );
        return total + dailyTotal;
      }
      return total + (dayData.value || 0);
    }, 0);
  }

  private static getMealTypeFromTime(timestamp: Date): number {
    const hour = timestamp.getHours();

    if (hour >= 5 && hour < 11) return 1;
    if (hour >= 11 && hour < 15) return 2;
    if (hour >= 15 && hour < 20) return 3;
    return 4;
  }

  private static mapActivityType(activityType: string): string {
    const activityMap: { [key: string]: string } = {
      walking: 'walking',
      running: 'running',
      cycling: 'biking',
      swimming: 'swimming',
      gym: 'strength_training',
      yoga: 'yoga',
      other: 'other',
    };

    return activityMap[activityType.toLowerCase()] || 'other';
  }

  private static async saveActivityData(
    userId: string,
    activityData: any
  ): Promise<void> {
    try {
      await supabase.from('exercise_logs').insert({
        user_id: userId,
        exercise_type: 'other',
        intensity: 'moderate',
        duration_minutes: 0,
        calories_burned: activityData.calories,
        distance: activityData.distance,
        notes: `Google Fit sync: ${activityData.steps} steps`,
        metadata: {
          source: 'google_fit',
          steps: activityData.steps,
          activities: activityData.activities,
        },
      });
    } catch (error) {
      console.error('Error saving activity data:', error);
    }
  }

  private static async getActiveConnection(userId: string): Promise<any> {
    const { data } = await supabase
      .from('health_app_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google_fit')
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
      .eq('provider', 'google_fit')
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
      {
        user_id: userId,
        connection_id: connection.id,
        data_type: 'calories_burned',
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

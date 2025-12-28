import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserAction {
  userId: string;
  actionType: string;
  actionData: any;
  timestamp: string;
  sessionId?: string;
}

export class UserActionTrackingService {
  private static sessionId: string | null = null;
  private static actionQueue: UserAction[] = [];
  private static isProcessing = false;

  static async initializeSession(userId: string): Promise<void> {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('current_session_id', this.sessionId);

    await this.trackAction(userId, 'session_start', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  static async trackAction(
    userId: string,
    actionType: string,
    actionData: any = {}
  ): Promise<void> {
    const action: UserAction = {
      userId,
      actionType,
      actionData,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId || undefined,
    };

    this.actionQueue.push(action);
    this.processQueue();
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.actionQueue.length === 0) return;

    this.isProcessing = true;

    try {
      const actionsToProcess = [...this.actionQueue];
      this.actionQueue = [];

      await AsyncStorage.setItem(
        `action_log_${Date.now()}`,
        JSON.stringify(actionsToProcess)
      );

      console.log(`Tracked ${actionsToProcess.length} user actions`);
    } catch (error) {
      console.error('Error processing action queue:', error);
      this.actionQueue.push(...this.actionQueue);
    } finally {
      this.isProcessing = false;
    }
  }

  static async trackFoodLog(
    userId: string,
    foodData: {
      foodName: string;
      carbs: number;
      protein: number;
      fat: number;
      calories: number;
      mealType?: string;
    }
  ): Promise<void> {
    await this.trackAction(userId, 'food_logged', foodData);
    await this.updateUserStats(userId, 'total_meals_logged');
  }

  static async trackFoodScan(
    userId: string,
    scanData: {
      scanType: 'ai_food' | 'barcode' | 'manual';
      success: boolean;
      processingTime?: number;
    }
  ): Promise<void> {
    await this.trackAction(userId, 'food_scanned', scanData);

    try {
      await supabase.from('scan_usage_log').insert({
        user_id: userId,
        scan_type: scanData.scanType,
        success: scanData.success,
        metadata: { processingTime: scanData.processingTime },
      });
    } catch (error) {
      console.error('Error logging scan usage:', error);
    }

    await this.updateUserStats(userId, 'total_scans');
  }

  static async trackExerciseLog(
    userId: string,
    exerciseData: {
      exerciseType: string;
      duration: number;
      intensity: string;
    }
  ): Promise<void> {
    await this.trackAction(userId, 'exercise_logged', exerciseData);
    await this.updateUserStats(userId, 'total_exercise_minutes', exerciseData.duration);
  }

  static async trackHydrationLog(
    userId: string,
    hydrationData: {
      amountMl: number;
      beverageType: string;
    }
  ): Promise<void> {
    await this.trackAction(userId, 'hydration_logged', hydrationData);
  }

  static async trackScreenView(
    userId: string,
    screenName: string,
    timeSpent?: number
  ): Promise<void> {
    await this.trackAction(userId, 'screen_view', {
      screenName,
      timeSpent,
    });
  }

  static async trackFeatureUsage(
    userId: string,
    featureName: string,
    metadata?: any
  ): Promise<void> {
    await this.trackAction(userId, 'feature_used', {
      featureName,
      ...metadata,
    });
  }

  static async trackGoalUpdate(
    userId: string,
    goalType: string,
    oldValue: number,
    newValue: number
  ): Promise<void> {
    await this.trackAction(userId, 'goal_updated', {
      goalType,
      oldValue,
      newValue,
    });
  }

  static async updateStreak(userId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: todayMeals } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('logged_at', todayISO)
        .limit(1);

      if (todayMeals && todayMeals.length > 0) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString();

        const { data: yesterdayMeals } = await supabase
          .from('meal_logs')
          .select('id')
          .eq('user_id', userId)
          .gte('logged_at', yesterdayISO)
          .lt('logged_at', todayISO)
          .limit(1);

        const { data: currentStats } = await supabase
          .from('user_stats')
          .select('current_streak_days, longest_streak_days')
          .eq('user_id', userId)
          .maybeSingle();

        let newStreak = 1;
        if (yesterdayMeals && yesterdayMeals.length > 0) {
          newStreak = (currentStats?.current_streak_days || 0) + 1;
        }

        const longestStreak = Math.max(
          newStreak,
          currentStats?.longest_streak_days || 0
        );

        await supabase
          .from('user_stats')
          .upsert({
            user_id: userId,
            current_streak_days: newStreak,
            longest_streak_days: longestStreak,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (newStreak > (currentStats?.current_streak_days || 0)) {
          await this.trackAction(userId, 'streak_updated', {
            newStreak,
            longestStreak,
          });
        }
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }

  private static async updateUserStats(
    userId: string,
    field: string,
    incrementBy: number = 1
  ): Promise<void> {
    try {
      const { data: stats } = await supabase
        .from('user_stats')
        .select(field)
        .eq('user_id', userId)
        .maybeSingle();

      const currentValue = stats ? (stats[field] || 0) : 0;
      const newValue = currentValue + incrementBy;

      await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          [field]: newValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error(`Error updating user stat ${field}:`, error);
    }
  }

  static async trackAchievement(
    userId: string,
    achievementId: string,
    achievementName: string
  ): Promise<void> {
    await this.trackAction(userId, 'achievement_earned', {
      achievementId,
      achievementName,
    });
  }

  static async getActionHistory(
    userId: string,
    actionType?: string,
    limit: number = 100
  ): Promise<UserAction[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const actionKeys = keys.filter((key) => key.startsWith('action_log_'));
      const actionLogs = await AsyncStorage.multiGet(actionKeys);

      const allActions: UserAction[] = [];
      actionLogs.forEach(([, value]) => {
        if (value) {
          const actions = JSON.parse(value) as UserAction[];
          allActions.push(
            ...actions.filter(
              (action) =>
                action.userId === userId &&
                (!actionType || action.actionType === actionType)
            )
          );
        }
      });

      return allActions
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting action history:', error);
      return [];
    }
  }

  static async endSession(userId: string): Promise<void> {
    await this.trackAction(userId, 'session_end', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });

    this.sessionId = null;
    await AsyncStorage.removeItem('current_session_id');
  }
}

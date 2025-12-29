import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderType =
  | 'meal'
  | 'medication'
  | 'glucose_test'
  | 'a1c_test'
  | 'exercise'
  | 'hydration'
  | 'appointment'
  | 'refill'
  | 'custom';

export type ReminderFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom_days'
  | 'as_needed';

export type ReminderStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface Reminder {
  id?: string;
  userId: string;
  reminderType: ReminderType;
  title: string;
  message?: string;
  frequency: ReminderFrequency;
  status: ReminderStatus;
  scheduledTime: string;
  scheduledDays: number[];
  startDate?: string;
  endDate?: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  priority: 'low' | 'default' | 'high' | 'urgent';
  allowSnooze: boolean;
  snoozeDurationMinutes: number;
  maxSnoozeCount: number;
  isSmartReminder: boolean;
  smartTriggerConditions?: any;
  medicationName?: string;
  medicationDosage?: string;
  medicationType?: 'insulin' | 'oral' | 'injection' | 'other';
  refillThresholdDays?: number;
  testType?: 'fasting' | 'pre_meal' | 'post_meal' | '2hr_post_meal' | 'bedtime' | 'a1c';
  metadata?: any;
  nextTriggerAt?: string;
}

export interface SmartReminderRule {
  id?: string;
  userId: string;
  ruleName: string;
  ruleType:
    | 'missing_meal'
    | 'high_carb_followup'
    | 'inactivity'
    | 'high_glucose_followup'
    | 'low_glucose_followup'
    | 'pre_meal_test'
    | 'post_meal_test'
    | 'medication_adherence'
    | 'custom';
  isEnabled: boolean;
  triggerConditions: any;
  reminderTemplate: any;
  minTimeBetweenTriggersMinutes: number;
  maxTriggersPerDay: number;
  lastTriggeredAt?: string;
  triggerCountToday: number;
  priority: number;
}

export class EnhancedReminderService {
  private static notificationListeners: Array<() => void> = [];

  static async initializeNotifications(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  static async setupNotificationListeners(
    onReceive?: (notification: Notifications.Notification) => void,
    onInteraction?: (response: Notifications.NotificationResponse) => void
  ): Promise<void> {
    if (Platform.OS === 'web') return;

    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      onReceive?.(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification interaction:', response);
      onInteraction?.(response);

      const { reminderId, action } = response.notification.request.content.data as any;

      if (action === 'complete' && reminderId) {
        this.completeReminder(reminderId);
      } else if (action === 'snooze' && reminderId) {
        this.snoozeReminder(reminderId, 10);
      }
    });

    this.notificationListeners.push(
      () => receivedListener.remove(),
      () => responseListener.remove()
    );
  }

  static cleanupListeners(): void {
    this.notificationListeners.forEach((cleanup) => cleanup());
    this.notificationListeners = [];
  }

  static async createReminder(reminder: Reminder): Promise<Reminder | null> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: reminder.userId,
          reminder_type: reminder.reminderType,
          title: reminder.title,
          message: reminder.message,
          frequency: reminder.frequency,
          status: reminder.status || 'active',
          scheduled_time: reminder.scheduledTime,
          scheduled_days: reminder.scheduledDays,
          start_date: reminder.startDate,
          end_date: reminder.endDate,
          sound_enabled: reminder.soundEnabled,
          vibration_enabled: reminder.vibrationEnabled,
          priority: reminder.priority,
          allow_snooze: reminder.allowSnooze,
          snooze_duration_minutes: reminder.snoozeDurationMinutes,
          max_snooze_count: reminder.maxSnoozeCount,
          is_smart_reminder: reminder.isSmartReminder,
          smart_trigger_conditions: reminder.smartTriggerConditions,
          medication_name: reminder.medicationName,
          medication_dosage: reminder.medicationDosage,
          medication_type: reminder.medicationType,
          refill_threshold_days: reminder.refillThresholdDays,
          test_type: reminder.testType,
          metadata: reminder.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      const nextTrigger = await this.calculateNextTriggerTime(data.id);
      await supabase
        .from('reminders')
        .update({ next_trigger_at: nextTrigger })
        .eq('id', data.id);

      if (data.status === 'active') {
        await this.scheduleLocalNotification(this.mapReminder(data));
      }

      return this.mapReminder(data);
    } catch (error) {
      console.error('Error creating reminder:', error);
      return null;
    }
  }

  static async createMealReminder(
    userId: string,
    mealType: string,
    scheduledTime: string,
    days: number[] = [1, 2, 3, 4, 5, 6, 7]
  ): Promise<Reminder | null> {
    const mealNames: Record<string, string> = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
    };

    return this.createReminder({
      userId,
      reminderType: 'meal',
      title: `Log ${mealNames[mealType] || mealType}`,
      message: `Time to log your ${mealType} and track your carbs`,
      frequency: 'daily',
      status: 'active',
      scheduledTime,
      scheduledDays: days,
      soundEnabled: true,
      vibrationEnabled: true,
      priority: 'default',
      allowSnooze: true,
      snoozeDurationMinutes: 10,
      maxSnoozeCount: 3,
      isSmartReminder: false,
      metadata: { mealType },
    });
  }

  static async createMedicationReminder(
    userId: string,
    medicationName: string,
    medicationDosage: string,
    medicationType: 'insulin' | 'oral' | 'injection' | 'other',
    scheduledTime: string,
    days: number[] = [1, 2, 3, 4, 5, 6, 7]
  ): Promise<Reminder | null> {
    return this.createReminder({
      userId,
      reminderType: 'medication',
      title: `Take ${medicationName}`,
      message: `Time for your ${medicationDosage} dose of ${medicationName}`,
      frequency: 'daily',
      status: 'active',
      scheduledTime,
      scheduledDays: days,
      soundEnabled: true,
      vibrationEnabled: true,
      priority: 'high',
      allowSnooze: true,
      snoozeDurationMinutes: 5,
      maxSnoozeCount: 2,
      isSmartReminder: false,
      medicationName,
      medicationDosage,
      medicationType,
    });
  }

  static async createTestingReminder(
    userId: string,
    testType: 'fasting' | 'pre_meal' | 'post_meal' | '2hr_post_meal' | 'bedtime',
    scheduledTime: string,
    days: number[] = [1, 2, 3, 4, 5, 6, 7]
  ): Promise<Reminder | null> {
    const testMessages: Record<string, string> = {
      fasting: 'Time for your fasting glucose check',
      pre_meal: 'Check your glucose before eating',
      post_meal: 'Time to check your post-meal glucose',
      '2hr_post_meal': 'Check your glucose 2 hours after meal',
      bedtime: 'Check your glucose before bed',
    };

    return this.createReminder({
      userId,
      reminderType: 'glucose_test',
      title: 'Glucose Check',
      message: testMessages[testType],
      frequency: 'daily',
      status: 'active',
      scheduledTime,
      scheduledDays: days,
      soundEnabled: true,
      vibrationEnabled: true,
      priority: 'high',
      allowSnooze: true,
      snoozeDurationMinutes: 5,
      maxSnoozeCount: 2,
      isSmartReminder: false,
      testType,
    });
  }

  static async createA1CTestReminder(
    userId: string,
    testDate: string
  ): Promise<Reminder | null> {
    return this.createReminder({
      userId,
      reminderType: 'a1c_test',
      title: 'A1C Test Scheduled',
      message: 'You have an A1C test coming up. Schedule your appointment if you haven\'t already.',
      frequency: 'one_time',
      status: 'active',
      scheduledTime: '09:00',
      scheduledDays: [1, 2, 3, 4, 5, 6, 7],
      startDate: testDate,
      soundEnabled: true,
      vibrationEnabled: true,
      priority: 'high',
      allowSnooze: false,
      snoozeDurationMinutes: 0,
      maxSnoozeCount: 0,
      isSmartReminder: false,
      testType: 'a1c',
    });
  }

  static async createSmartReminder(rule: SmartReminderRule): Promise<SmartReminderRule | null> {
    try {
      const { data, error } = await supabase
        .from('smart_reminder_rules')
        .insert({
          user_id: rule.userId,
          rule_name: rule.ruleName,
          rule_type: rule.ruleType,
          is_enabled: rule.isEnabled,
          trigger_conditions: rule.triggerConditions,
          reminder_template: rule.reminderTemplate,
          min_time_between_triggers_minutes: rule.minTimeBetweenTriggersMinutes,
          max_triggers_per_day: rule.maxTriggersPerDay,
          priority: rule.priority,
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapSmartRule(data);
    } catch (error) {
      console.error('Error creating smart reminder:', error);
      return null;
    }
  }

  static async triggerSmartReminder(
    userId: string,
    ruleType: string,
    context: any
  ): Promise<boolean> {
    try {
      const { data: rules, error } = await supabase
        .from('smart_reminder_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('rule_type', ruleType)
        .eq('is_enabled', true);

      if (error) throw error;
      if (!rules || rules.length === 0) return false;

      for (const rule of rules) {
        const canTrigger = await this.canTriggerSmartRule(rule);

        if (canTrigger && this.evaluateTriggerConditions(rule.trigger_conditions, context)) {
          const template = rule.reminder_template;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: template.title || 'Smart Reminder',
              body: template.message || '',
              sound: template.soundEnabled !== false ? 'default' : undefined,
              priority: this.mapPriorityToAndroid(template.priority || 'default'),
              data: {
                smartRuleId: rule.id,
                ruleType: rule.rule_type,
                context,
              },
            },
            trigger: null,
          });

          await supabase
            .from('smart_reminder_rules')
            .update({
              last_triggered_at: new Date().toISOString(),
              trigger_count_today: rule.trigger_count_today + 1,
            })
            .eq('id', rule.id);

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error triggering smart reminder:', error);
      return false;
    }
  }

  static async checkMissingMeal(
    userId: string,
    mealType: string,
    hoursElapsed: number
  ): Promise<void> {
    await this.triggerSmartReminder(userId, 'missing_meal', {
      mealType,
      hoursElapsed,
    });
  }

  static async checkHighCarbFollowup(
    userId: string,
    carbAmount: number,
    mealTime: string
  ): Promise<void> {
    if (carbAmount > 60) {
      setTimeout(async () => {
        await this.triggerSmartReminder(userId, 'high_carb_followup', {
          carbAmount,
          mealTime,
        });
      }, 2 * 60 * 60 * 1000);
    }
  }

  private static async canTriggerSmartRule(rule: any): Promise<boolean> {
    if (rule.trigger_count_today >= rule.max_triggers_per_day) {
      return false;
    }

    if (rule.last_triggered_at) {
      const lastTrigger = new Date(rule.last_triggered_at);
      const now = new Date();
      const minutesSince = (now.getTime() - lastTrigger.getTime()) / 60000;

      if (minutesSince < rule.min_time_between_triggers_minutes) {
        return false;
      }
    }

    return true;
  }

  private static evaluateTriggerConditions(conditions: any, context: any): boolean {
    if (conditions.hoursElapsed && context.hoursElapsed) {
      return context.hoursElapsed >= conditions.hoursElapsed;
    }

    if (conditions.carbThreshold && context.carbAmount) {
      return context.carbAmount >= conditions.carbThreshold;
    }

    return true;
  }

  static async updateReminder(
    reminderId: string,
    updates: Partial<Reminder>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          title: updates.title,
          message: updates.message,
          frequency: updates.frequency,
          status: updates.status,
          scheduled_time: updates.scheduledTime,
          scheduled_days: updates.scheduledDays,
          sound_enabled: updates.soundEnabled,
          vibration_enabled: updates.vibrationEnabled,
          priority: updates.priority,
          allow_snooze: updates.allowSnooze,
          snooze_duration_minutes: updates.snoozeDurationMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId);

      if (error) throw error;

      await this.cancelLocalNotification(reminderId);
      const reminder = await this.getReminder(reminderId);
      if (reminder && reminder.status === 'active') {
        await this.scheduleLocalNotification(reminder);
      }

      return true;
    } catch (error) {
      console.error('Error updating reminder:', error);
      return false;
    }
  }

  static async deleteReminder(reminderId: string): Promise<boolean> {
    try {
      await this.cancelLocalNotification(reminderId);

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  static async getReminder(reminderId: string): Promise<Reminder | null> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (error) throw error;
      return this.mapReminder(data);
    } catch (error) {
      console.error('Error getting reminder:', error);
      return null;
    }
  }

  static async getUserReminders(
    userId: string,
    reminderType?: ReminderType,
    status?: ReminderStatus
  ): Promise<Reminder[]> {
    try {
      let query = supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_time', { ascending: true });

      if (reminderType) {
        query = query.eq('reminder_type', reminderType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.map(this.mapReminder);
    } catch (error) {
      console.error('Error getting user reminders:', error);
      return [];
    }
  }

  static async pauseReminder(reminderId: string): Promise<boolean> {
    try {
      await this.cancelLocalNotification(reminderId);

      const { error } = await supabase
        .from('reminders')
        .update({ status: 'paused' })
        .eq('id', reminderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error pausing reminder:', error);
      return false;
    }
  }

  static async resumeReminder(reminderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'active' })
        .eq('id', reminderId);

      if (error) throw error;

      const reminder = await this.getReminder(reminderId);
      if (reminder) {
        await this.scheduleLocalNotification(reminder);
      }

      return true;
    } catch (error) {
      console.error('Error resuming reminder:', error);
      return false;
    }
  }

  static async snoozeReminder(
    reminderId: string,
    durationMinutes: number
  ): Promise<boolean> {
    try {
      const snoozedUntil = new Date();
      snoozedUntil.setMinutes(snoozedUntil.getMinutes() + durationMinutes);

      const reminder = await this.getReminder(reminderId);
      if (!reminder) return false;

      await supabase.from('reminder_history').insert({
        reminder_id: reminderId,
        user_id: reminder.userId,
        scheduled_time: new Date().toISOString(),
        delivery_status: 'snoozed',
        snoozed_until: snoozedUntil.toISOString(),
        snooze_count: 1,
      });

      await this.cancelLocalNotification(reminderId);
      await this.scheduleLocalNotification(reminder, snoozedUntil);

      return true;
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      return false;
    }
  }

  static async completeReminder(
    reminderId: string,
    completionData?: any
  ): Promise<boolean> {
    try {
      const reminder = await this.getReminder(reminderId);
      if (!reminder) return false;

      await supabase.from('reminder_completions').insert({
        reminder_id: reminderId,
        user_id: reminder.userId,
        completed_at: new Date().toISOString(),
        completion_type: 'on_time',
        notes: completionData?.notes,
        metadata: completionData || {},
      });

      if (reminder.frequency === 'one_time') {
        await this.updateReminder(reminderId, { status: 'completed' });
      }

      return true;
    } catch (error) {
      console.error('Error completing reminder:', error);
      return false;
    }
  }

  private static async scheduleLocalNotification(
    reminder: Reminder,
    customTriggerTime?: Date
  ): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const triggerTime = customTriggerTime || this.getNextOccurrence(reminder);

      if (!triggerTime) return;

      const triggerDate = new Date(triggerTime);

      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id!,
        content: {
          title: reminder.title,
          body: reminder.message || '',
          sound: reminder.soundEnabled ? 'default' : undefined,
          vibrate: reminder.vibrationEnabled ? [0, 250, 250, 250] : undefined,
          priority: this.mapPriorityToAndroid(reminder.priority),
          categoryIdentifier: 'reminder',
          data: {
            reminderId: reminder.id,
            reminderType: reminder.reminderType,
          },
        },
        trigger: {
          date: triggerDate,
        },
      });

      console.log(`Scheduled notification for reminder ${reminder.id} at ${triggerDate}`);
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  private static async cancelLocalNotification(reminderId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.cancelScheduledNotificationAsync(reminderId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  private static getNextOccurrence(reminder: Reminder): Date | null {
    const now = new Date();
    const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);

    const nextOccurrence = new Date();
    nextOccurrence.setHours(hours, minutes, 0, 0);

    if (nextOccurrence <= now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }

    if (reminder.frequency === 'weekly' && reminder.scheduledDays.length > 0) {
      const currentDay = nextOccurrence.getDay() || 7;
      const nextDay = reminder.scheduledDays.find((day) => day >= currentDay);

      if (nextDay) {
        const daysToAdd = nextDay - currentDay;
        nextOccurrence.setDate(nextOccurrence.getDate() + daysToAdd);
      } else {
        const daysToAdd = 7 - currentDay + reminder.scheduledDays[0];
        nextOccurrence.setDate(nextOccurrence.getDate() + daysToAdd);
      }
    }

    return nextOccurrence;
  }

  private static async calculateNextTriggerTime(
    reminderId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_next_trigger_time', {
        p_reminder_id: reminderId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating next trigger time:', error);
      return null;
    }
  }

  private static mapPriorityToAndroid(
    priority: string
  ): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'urgent':
        return Notifications.AndroidNotificationPriority.MAX;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  private static mapReminder(data: any): Reminder {
    return {
      id: data.id,
      userId: data.user_id,
      reminderType: data.reminder_type,
      title: data.title,
      message: data.message,
      frequency: data.frequency,
      status: data.status,
      scheduledTime: data.scheduled_time,
      scheduledDays: data.scheduled_days,
      startDate: data.start_date,
      endDate: data.end_date,
      soundEnabled: data.sound_enabled,
      vibrationEnabled: data.vibration_enabled,
      priority: data.priority,
      allowSnooze: data.allow_snooze,
      snoozeDurationMinutes: data.snooze_duration_minutes,
      maxSnoozeCount: data.max_snooze_count,
      isSmartReminder: data.is_smart_reminder,
      smartTriggerConditions: data.smart_trigger_conditions,
      medicationName: data.medication_name,
      medicationDosage: data.medication_dosage,
      medicationType: data.medication_type,
      refillThresholdDays: data.refill_threshold_days,
      testType: data.test_type,
      metadata: data.metadata,
      nextTriggerAt: data.next_trigger_at,
    };
  }

  private static mapSmartRule(data: any): SmartReminderRule {
    return {
      id: data.id,
      userId: data.user_id,
      ruleName: data.rule_name,
      ruleType: data.rule_type,
      isEnabled: data.is_enabled,
      triggerConditions: data.trigger_conditions,
      reminderTemplate: data.reminder_template,
      minTimeBetweenTriggersMinutes: data.min_time_between_triggers_minutes,
      maxTriggersPerDay: data.max_triggers_per_day,
      lastTriggeredAt: data.last_triggered_at,
      triggerCountToday: data.trigger_count_today,
      priority: data.priority,
    };
  }
}

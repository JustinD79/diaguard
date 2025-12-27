import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface Reminder {
  id: string;
  user_id: string;
  reminder_type: 'meal' | 'testing' | 'exercise' | 'hydration';
  title: string;
  message: string;
  time: string;
  days_of_week: number[];
  enabled: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class ReminderService {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  static async createReminder(
    userId: string,
    reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Reminder | null> {
    try {
      const { data, error } = await supabase
        .from('user_reminders')
        .insert({
          user_id: userId,
          ...reminder,
        })
        .select()
        .single();

      if (error) throw error;

      if (data && data.enabled) {
        await this.scheduleNotification(data);
      }

      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      return null;
    }
  }

  static async getUserReminders(userId: string): Promise<Reminder[]> {
    try {
      const { data, error } = await supabase
        .from('user_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }
  }

  static async updateReminder(
    reminderId: string,
    updates: Partial<Reminder>
  ): Promise<Reminder | null> {
    try {
      const { data, error } = await supabase
        .from('user_reminders')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await this.cancelNotification(reminderId);
        if (data.enabled) {
          await this.scheduleNotification(data);
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating reminder:', error);
      return null;
    }
  }

  static async deleteReminder(reminderId: string): Promise<boolean> {
    try {
      await this.cancelNotification(reminderId);

      const { error } = await supabase
        .from('user_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  static async toggleReminder(reminderId: string, enabled: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_reminders')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        if (enabled) {
          await this.scheduleNotification(data);
        } else {
          await this.cancelNotification(reminderId);
        }
      }

      return true;
    } catch (error) {
      console.error('Error toggling reminder:', error);
      return false;
    }
  }

  private static async scheduleNotification(reminder: Reminder): Promise<void> {
    if (Platform.OS === 'web') return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const [hours, minutes] = reminder.time.split(':').map(Number);

    for (const dayOfWeek of reminder.days_of_week) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.message,
          data: { reminderId: reminder.id, type: reminder.reminder_type },
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
          weekday: dayOfWeek + 1,
        },
      });
    }
  }

  private static async cancelNotification(reminderId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  static async initializeDefaultReminders(userId: string): Promise<void> {
    const existingReminders = await this.getUserReminders(userId);
    if (existingReminders.length > 0) return;

    const defaultReminders = [
      {
        reminder_type: 'meal' as const,
        title: 'Log Breakfast',
        message: 'Remember to log your breakfast and track your carbs',
        time: '08:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
        enabled: false,
        metadata: { meal_type: 'breakfast' },
      },
      {
        reminder_type: 'meal' as const,
        title: 'Log Lunch',
        message: 'Time to log your lunch meal',
        time: '12:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
        enabled: false,
        metadata: { meal_type: 'lunch' },
      },
      {
        reminder_type: 'meal' as const,
        title: 'Log Dinner',
        message: 'Don\'t forget to log your dinner',
        time: '18:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
        enabled: false,
        metadata: { meal_type: 'dinner' },
      },
      {
        reminder_type: 'testing' as const,
        title: 'Check Blood Glucose',
        message: 'Time for your glucose check',
        time: '09:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
        enabled: false,
        metadata: {},
      },
      {
        reminder_type: 'hydration' as const,
        title: 'Drink Water',
        message: 'Stay hydrated! Have a glass of water',
        time: '14:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
        enabled: false,
        metadata: {},
      },
    ];

    for (const reminder of defaultReminders) {
      await this.createReminder(userId, reminder);
    }
  }
}

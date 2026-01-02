import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface LifestyleNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action_url?: string;
  related_module: string;
  is_read: boolean;
  is_sent: boolean;
  scheduled_for?: string;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

export const LifestyleNotificationService = {
  async createNotification(
    userId: string,
    notification: Omit<LifestyleNotification, 'id' | 'user_id' | 'is_read' | 'is_sent' | 'sent_at' | 'read_at' | 'created_at'>
  ): Promise<LifestyleNotification> {
    const { data, error } = await supabase
      .from('lifestyle_notifications')
      .insert({
        user_id: userId,
        ...notification,
        is_read: false,
        is_sent: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as LifestyleNotification;
  },

  async scheduleNotification(
    userId: string,
    notification: Omit<LifestyleNotification, 'id' | 'user_id' | 'is_read' | 'is_sent' | 'sent_at' | 'read_at' | 'created_at'>,
    scheduleTime: Date
  ): Promise<LifestyleNotification> {
    const { data, error } = await supabase
      .from('lifestyle_notifications')
      .insert({
        user_id: userId,
        ...notification,
        is_read: false,
        is_sent: false,
        scheduled_for: scheduleTime.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as LifestyleNotification;
  },

  async getUnreadNotifications(userId: string): Promise<LifestyleNotification[]> {
    const { data, error } = await supabase
      .from('lifestyle_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as LifestyleNotification[];
  },

  async getPendingNotifications(userId: string): Promise<LifestyleNotification[]> {
    const { data, error } = await supabase
      .from('lifestyle_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_sent', false)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return (data || []) as LifestyleNotification[];
  },

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lifestyle_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async markAsSent(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lifestyle_notifications')
      .update({
        is_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lifestyle_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async createHydrationReminder(userId: string, scheduleTime: Date): Promise<LifestyleNotification> {
    return this.scheduleNotification(
      userId,
      {
        notification_type: 'hydration_reminder',
        title: 'Time to hydrate',
        message: 'Remember to drink water. Your hydration goal is waiting!',
        priority: 'medium',
        related_module: 'hydration',
        action_url: '/hydration',
      },
      scheduleTime
    );
  },

  async createSleepReminder(userId: string, bedtimeHour: number, bedtimeMinute: number): Promise<LifestyleNotification> {
    const scheduleTime = new Date();
    scheduleTime.setHours(bedtimeHour, bedtimeMinute, 0);

    if (scheduleTime.getTime() < Date.now()) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }

    return this.scheduleNotification(
      userId,
      {
        notification_type: 'sleep_reminder',
        title: 'Bedtime reminder',
        message: "It's almost time for bed. Get ready to wind down.",
        priority: 'medium',
        related_module: 'sleep',
        action_url: '/sleep',
      },
      scheduleTime
    );
  },

  async createMoodCheckIn(userId: string): Promise<LifestyleNotification> {
    const scheduleTime = new Date();
    scheduleTime.setMinutes(scheduleTime.getMinutes() + 5);

    return this.scheduleNotification(
      userId,
      {
        notification_type: 'mood_check_in',
        title: 'How are you feeling?',
        message: 'Take a moment to log your mood. It helps track your wellness.',
        priority: 'low',
        related_module: 'wellness',
        action_url: '/wellness',
      },
      scheduleTime
    );
  },

  async createInsightNotification(userId: string, insight: string, insightType: string): Promise<LifestyleNotification> {
    const scheduleTime = new Date();
    scheduleTime.setMinutes(scheduleTime.getMinutes() + 2);

    return this.scheduleNotification(
      userId,
      {
        notification_type: 'insight',
        title: `New ${insightType} insight`,
        message: insight,
        priority: 'medium',
        related_module: 'lifestyle',
        action_url: '/lifestyle',
      },
      scheduleTime
    );
  },

  async createAchievementNotification(userId: string, badgeName: string): Promise<LifestyleNotification> {
    return this.createNotification(userId, {
      notification_type: 'achievement',
      title: 'Badge earned!',
      message: `Congratulations! You earned the "${badgeName}" badge.`,
      priority: 'high',
      related_module: 'lifestyle',
      action_url: '/lifestyle',
    });
  },

  async createStressAlertNotification(userId: string, stressLevel: number): Promise<LifestyleNotification> {
    const message =
      stressLevel > 7
        ? 'Your stress levels are high. Consider taking a break or practicing breathing exercises.'
        : 'Your stress is elevated. Take time for self-care today.';

    return this.createNotification(userId, {
      notification_type: 'stress_alert',
      title: 'Stress alert',
      message,
      priority: 'high',
      related_module: 'wellness',
      action_url: '/wellness',
    });
  },

  async createRecommendationNotification(userId: string, recommendation: string): Promise<LifestyleNotification> {
    const scheduleTime = new Date();
    scheduleTime.setMinutes(scheduleTime.getMinutes() + 3);

    return this.scheduleNotification(
      userId,
      {
        notification_type: 'recommendation',
        title: 'New recommendation',
        message: recommendation,
        priority: 'medium',
        related_module: 'lifestyle',
        action_url: '/lifestyle',
      },
      scheduleTime
    );
  },

  async deleteOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('lifestyle_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true)
      .lt('created_at', cutoffDate);

    if (error) throw error;
  },

  async getNotificationHistory(userId: string, limit: number = 50): Promise<LifestyleNotification[]> {
    const { data, error } = await supabase
      .from('lifestyle_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as LifestyleNotification[];
  },
};

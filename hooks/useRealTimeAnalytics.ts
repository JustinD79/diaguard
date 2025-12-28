import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DailyStats {
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalCalories: number;
  mealsLogged: number;
  exerciseMinutes: number;
  waterIntake: number;
  currentStreak: number;
}

export interface WeeklyTrend {
  date: string;
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
  meals: number;
}

export interface UserGoals {
  dailyCarbGoal: number;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyFatGoal: number;
  dailyWaterGoal: number;
  weeklyExerciseGoal: number;
}

export function useRealTimeAnalytics() {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalCarbs: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCalories: 0,
    mealsLogged: 0,
    exerciseMinutes: 0,
    waterIntake: 0,
    currentStreak: 0,
  });
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoals>({
    dailyCarbGoal: 150,
    dailyCalorieGoal: 2000,
    dailyProteinGoal: 50,
    dailyFatGoal: 65,
    dailyWaterGoal: 2000,
    weeklyExerciseGoal: 150,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyStats = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: meals, error: mealsError } = await supabase
        .from('meal_logs')
        .select('carbs, protein, fat, calories, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', todayISO);

      if (mealsError) throw mealsError;

      const stats = meals?.reduce(
        (acc, meal) => ({
          totalCarbs: acc.totalCarbs + (Number(meal.carbs) || 0),
          totalProtein: acc.totalProtein + (Number(meal.protein) || 0),
          totalFat: acc.totalFat + (Number(meal.fat) || 0),
          totalCalories: acc.totalCalories + (Number(meal.calories) || 0),
          mealsLogged: acc.mealsLogged + 1,
        }),
        {
          totalCarbs: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCalories: 0,
          mealsLogged: 0,
        }
      ) || {
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCalories: 0,
        mealsLogged: 0,
      };

      const { data: exercise, error: exerciseError } = await supabase
        .from('exercise_logs')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('exercise_time', todayISO);

      if (exerciseError) throw exerciseError;

      const exerciseMinutes = exercise?.reduce(
        (acc, ex) => acc + (Number(ex.duration_minutes) || 0),
        0
      ) || 0;

      const { data: hydration, error: hydrationError } = await supabase
        .from('hydration_logs')
        .select('amount_ml')
        .eq('user_id', user.id)
        .gte('logged_time', todayISO);

      if (hydrationError) throw hydrationError;

      const waterIntake = hydration?.reduce(
        (acc, h) => acc + (Number(h.amount_ml) || 0),
        0
      ) || 0;

      const { data: streakData, error: streakError } = await supabase
        .from('user_stats')
        .select('current_streak_days')
        .eq('user_id', user.id)
        .maybeSingle();

      if (streakError) throw streakError;

      setDailyStats({
        ...stats,
        exerciseMinutes,
        waterIntake,
        currentStreak: streakData?.current_streak_days || 0,
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching daily stats:', err);
      setError('Failed to load daily statistics');
    }
  }, [user]);

  const fetchWeeklyTrends = useCallback(async () => {
    if (!user) return;

    try {
      const trends: WeeklyTrend[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateISO = date.toISOString();

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateISO = nextDate.toISOString();

        const { data: meals } = await supabase
          .from('meal_logs')
          .select('carbs, protein, fat, calories')
          .eq('user_id', user.id)
          .gte('logged_at', dateISO)
          .lt('logged_at', nextDateISO);

        const dayStats = meals?.reduce(
          (acc, meal) => ({
            carbs: acc.carbs + (Number(meal.carbs) || 0),
            protein: acc.protein + (Number(meal.protein) || 0),
            fat: acc.fat + (Number(meal.fat) || 0),
            calories: acc.calories + (Number(meal.calories) || 0),
            meals: acc.meals + 1,
          }),
          { carbs: 0, protein: 0, fat: 0, calories: 0, meals: 0 }
        ) || { carbs: 0, protein: 0, fat: 0, calories: 0, meals: 0 };

        trends.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          ...dayStats,
        });
      }

      setWeeklyTrends(trends);
    } catch (err) {
      console.error('Error fetching weekly trends:', err);
    }
  }, [user]);

  const fetchUserGoals = useCallback(async () => {
    if (!user) return;

    try {
      const { data: hydrationGoal } = await supabase
        .from('daily_hydration_goals')
        .select('daily_goal_ml')
        .eq('user_id', user.id)
        .maybeSingle();

      if (hydrationGoal) {
        setUserGoals((prev) => ({
          ...prev,
          dailyWaterGoal: hydrationGoal.daily_goal_ml,
        }));
      }
    } catch (err) {
      console.error('Error fetching user goals:', err);
    }
  }, [user]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    let mealChannel: RealtimeChannel;
    let exerciseChannel: RealtimeChannel;
    let hydrationChannel: RealtimeChannel;

    try {
      mealChannel = supabase
        .channel('meal_logs_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meal_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchDailyStats();
            fetchWeeklyTrends();
          }
        )
        .subscribe();

      exerciseChannel = supabase
        .channel('exercise_logs_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'exercise_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchDailyStats();
          }
        )
        .subscribe();

      hydrationChannel = supabase
        .channel('hydration_logs_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hydration_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchDailyStats();
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
    }

    return () => {
      if (mealChannel) supabase.removeChannel(mealChannel);
      if (exerciseChannel) supabase.removeChannel(exerciseChannel);
      if (hydrationChannel) supabase.removeChannel(hydrationChannel);
    };
  }, [user, fetchDailyStats, fetchWeeklyTrends]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchDailyStats(),
        fetchWeeklyTrends(),
        fetchUserGoals(),
      ]).finally(() => setLoading(false));

      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user, fetchDailyStats, fetchWeeklyTrends, fetchUserGoals, setupRealtimeSubscription]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchDailyStats(),
      fetchWeeklyTrends(),
      fetchUserGoals(),
    ]);
    setLoading(false);
  }, [fetchDailyStats, fetchWeeklyTrends, fetchUserGoals]);

  return {
    dailyStats,
    weeklyTrends,
    userGoals,
    loading,
    error,
    refreshData,
  };
}

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { HydrationTrackingService, HydrationLog, HydrationGoal, HydrationAnalytics } from '@/services/HydrationTrackingService';

interface HydrationContextType {
  goal: HydrationGoal | null;
  todayLogs: HydrationLog[];
  analytics: HydrationAnalytics | null;
  isLoading: boolean;
  error: string | null;
  logWater: (amount: number, container: string, notes?: string) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  updateGoal: (updates: Partial<HydrationGoal>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const HydrationContext = createContext<HydrationContextType | undefined>(undefined);

export const HydrationProvider: React.FC<{ children: ReactNode; userId: string }> = ({ children, userId }) => {
  const [goal, setGoal] = useState<HydrationGoal | null>(null);
  const [todayLogs, setTodayLogs] = useState<HydrationLog[]>([]);
  const [analytics, setAnalytics] = useState<HydrationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [userGoal, logs, todayAnalytics] = await Promise.all([
        HydrationTrackingService.getOrCreateGoal(userId),
        HydrationTrackingService.getTodayLogs(userId),
        HydrationTrackingService.updateDailyAnalytics(userId, new Date()),
      ]);

      setGoal(userGoal);
      setTodayLogs(logs);
      setAnalytics(todayAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hydration data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const logWater = useCallback(
    async (amount: number, container: string, notes?: string) => {
      try {
        setError(null);
        await HydrationTrackingService.logWater(userId, amount, container, notes);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log water');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const deleteLog = useCallback(
    async (logId: string) => {
      try {
        setError(null);
        await HydrationTrackingService.deleteLog(logId, userId);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete log');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const updateGoal = useCallback(
    async (updates: Partial<HydrationGoal>) => {
      try {
        setError(null);
        const updatedGoal = await HydrationTrackingService.updateGoal(userId, updates);
        setGoal(updatedGoal);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update goal');
        throw err;
      }
    },
    [userId]
  );

  React.useEffect(() => {
    refreshData();
  }, [userId, refreshData]);

  const value: HydrationContextType = {
    goal,
    todayLogs,
    analytics,
    isLoading,
    error,
    logWater,
    deleteLog,
    updateGoal,
    refreshData,
  };

  return <HydrationContext.Provider value={value}>{children}</HydrationContext.Provider>;
};

export const useHydration = () => {
  const context = useContext(HydrationContext);
  if (!context) {
    throw new Error('useHydration must be used within HydrationProvider');
  }
  return context;
};

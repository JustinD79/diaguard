import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { SleepTrackingService, SleepLog, SleepGoal, SleepAnalytics, SleepPattern } from '@/services/SleepTrackingService';

interface SleepContextType {
  goal: SleepGoal | null;
  todayLogs: SleepLog[];
  analytics: SleepAnalytics | null;
  pattern: SleepPattern | null;
  isLoading: boolean;
  error: string | null;
  logSleep: (sleepStart: Date, sleepEnd: Date, quality?: number, notes?: string) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  updateGoal: (updates: Partial<SleepGoal>) => Promise<void>;
  generatePattern: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const SleepContext = createContext<SleepContextType | undefined>(undefined);

export const SleepProvider: React.FC<{ children: ReactNode; userId: string }> = ({ children, userId }) => {
  const [goal, setGoal] = useState<SleepGoal | null>(null);
  const [todayLogs, setTodayLogs] = useState<SleepLog[]>([]);
  const [analytics, setAnalytics] = useState<SleepAnalytics | null>(null);
  const [pattern, setPattern] = useState<SleepPattern | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [userGoal, logs, weekPattern] = await Promise.all([
        SleepTrackingService.getOrCreateGoal(userId),
        SleepTrackingService.getTodayLogs(userId),
        SleepTrackingService.getWeeklyPattern(userId),
      ]);

      setGoal(userGoal);
      setTodayLogs(logs);
      setPattern(weekPattern);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sleep data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const logSleep = useCallback(
    async (sleepStart: Date, sleepEnd: Date, quality?: number, notes?: string) => {
      try {
        setError(null);
        await SleepTrackingService.logSleep(userId, sleepStart, sleepEnd, quality, notes);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log sleep');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const deleteLog = useCallback(
    async (logId: string) => {
      try {
        setError(null);
        await SleepTrackingService.deleteLog(logId, userId);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete log');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const updateGoal = useCallback(
    async (updates: Partial<SleepGoal>) => {
      try {
        setError(null);
        const updatedGoal = await SleepTrackingService.updateGoal(userId, updates);
        setGoal(updatedGoal);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update goal');
        throw err;
      }
    },
    [userId]
  );

  const generatePattern = useCallback(async () => {
    try {
      setError(null);
      const newPattern = await SleepTrackingService.generateWeeklyPattern(userId);
      setPattern(newPattern);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pattern');
      throw err;
    }
  }, [userId]);

  React.useEffect(() => {
    refreshData();
  }, [userId, refreshData]);

  const value: SleepContextType = {
    goal,
    todayLogs,
    analytics,
    pattern,
    isLoading,
    error,
    logSleep,
    deleteLog,
    updateGoal,
    generatePattern,
    refreshData,
  };

  return <SleepContext.Provider value={value}>{children}</SleepContext.Provider>;
};

export const useSleep = () => {
  const context = useContext(SleepContext);
  if (!context) {
    throw new Error('useSleep must be used within SleepProvider');
  }
  return context;
};

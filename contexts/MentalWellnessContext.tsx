import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import {
  MentalWellnessService,
  MoodLog,
  StressLevel,
  MentalWellnessGoal,
  CopingStrategy,
  WellnessAnalytics,
} from '@/services/MentalWellnessService';

interface MentalWellnessContextType {
  goal: MentalWellnessGoal | null;
  moodLogs: MoodLog[];
  stressLogs: StressLevel[];
  copingStrategies: CopingStrategy[];
  analytics: WellnessAnalytics | null;
  weeklyAverage: { avgMood: number; avgStress: number } | null;
  isLoading: boolean;
  error: string | null;
  logMood: (score: number, emotion: string, emoji: string, secondary?: string[], notes?: string) => Promise<void>;
  logStress: (score: number, category: string, sources?: string[], strategy?: string, rating?: number) => Promise<void>;
  addCopingStrategy: (strategy: Omit<CopingStrategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateGoal: (updates: Partial<MentalWellnessGoal>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const MentalWellnessContext = createContext<MentalWellnessContextType | undefined>(undefined);

export const MentalWellnessProvider: React.FC<{ children: ReactNode; userId: string }> = ({ children, userId }) => {
  const [goal, setGoal] = useState<MentalWellnessGoal | null>(null);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [stressLogs, setStressLogs] = useState<StressLevel[]>([]);
  const [copingStrategies, setCopingStrategies] = useState<CopingStrategy[]>([]);
  const [analytics, setAnalytics] = useState<WellnessAnalytics | null>(null);
  const [weeklyAverage, setWeeklyAverage] = useState<{ avgMood: number; avgStress: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [userGoal, moods, stress, strategies, average] = await Promise.all([
        MentalWellnessService.getOrCreateGoal(userId),
        MentalWellnessService.getTodayMoodLogs(userId),
        MentalWellnessService.getTodayStressLogs(userId),
        MentalWellnessService.getUserCopingStrategies(userId),
        MentalWellnessService.getWeeklyAverage(userId),
      ]);

      setGoal(userGoal);
      setMoodLogs(moods);
      setStressLogs(stress);
      setCopingStrategies(strategies);
      setWeeklyAverage(average);

      // Update daily analytics
      await MentalWellnessService.updateDailyAnalytics(userId, new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wellness data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const logMood = useCallback(
    async (score: number, emotion: string, emoji: string, secondary: string[] = [], notes?: string) => {
      try {
        setError(null);
        await MentalWellnessService.logMood(userId, score, emotion, emoji, secondary, notes);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log mood');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const logStress = useCallback(
    async (score: number, category: string, sources: string[] = [], strategy: string = '', rating: number = 3) => {
      try {
        setError(null);
        await MentalWellnessService.logStress(userId, score, category, sources, strategy, rating);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log stress');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const addCopingStrategy = useCallback(
    async (strategy: Omit<CopingStrategy, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      try {
        setError(null);
        await MentalWellnessService.addCopingStrategy(userId, strategy);
        await refreshData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add coping strategy');
        throw err;
      }
    },
    [userId, refreshData]
  );

  const updateGoal = useCallback(
    async (updates: Partial<MentalWellnessGoal>) => {
      try {
        setError(null);
        const updatedGoal = await MentalWellnessService.updateGoal(userId, updates);
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

  const value: MentalWellnessContextType = {
    goal,
    moodLogs,
    stressLogs,
    copingStrategies,
    analytics,
    weeklyAverage,
    isLoading,
    error,
    logMood,
    logStress,
    addCopingStrategy,
    updateGoal,
    refreshData,
  };

  return <MentalWellnessContext.Provider value={value}>{children}</MentalWellnessContext.Provider>;
};

export const useMentalWellness = () => {
  const context = useContext(MentalWellnessContext);
  if (!context) {
    throw new Error('useMentalWellness must be used within MentalWellnessProvider');
  }
  return context;
};

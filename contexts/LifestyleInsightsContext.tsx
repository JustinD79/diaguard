import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import {
  LifestyleCorrelationService,
  LifestyleCorrelation,
  LifestyleInsight,
  LifestyleRecommendation,
} from '@/services/LifestyleCorrelationService';
import { LifestyleNotificationService, LifestyleNotification } from '@/services/LifestyleNotificationService';

interface LifestyleInsightsContextType {
  correlations: LifestyleCorrelation[];
  insights: LifestyleInsight[];
  recommendations: LifestyleRecommendation[];
  notifications: LifestyleNotification[];
  isLoading: boolean;
  error: string | null;
  analyzeCorrelations: (days?: number) => Promise<void>;
  generateInsights: () => Promise<void>;
  createRecommendation: (rec: Omit<LifestyleRecommendation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  markInsightAsRead: (insightId: string) => Promise<void>;
  getUnreadNotifications: () => Promise<void>;
  markNotificationAsRead: (notifId: string) => Promise<void>;
  deleteNotification: (notifId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const LifestyleInsightsContext = createContext<LifestyleInsightsContextType | undefined>(undefined);

export const LifestyleInsightsProvider: React.FC<{ children: ReactNode; userId: string }> = ({ children, userId }) => {
  const [correlations, setCorrelations] = useState<LifestyleCorrelation[]>([]);
  const [insights, setInsights] = useState<LifestyleInsight[]>([]);
  const [recommendations, setRecommendations] = useState<LifestyleRecommendation[]>([]);
  const [notifications, setNotifications] = useState<LifestyleNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCorrelations = useCallback(
    async (days: number = 30) => {
      try {
        setError(null);
        const newCorrelations = await LifestyleCorrelationService.analyzeCorrelations(userId, days);
        setCorrelations(newCorrelations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze correlations');
      }
    },
    [userId]
  );

  const generateInsights = useCallback(async () => {
    try {
      setError(null);
      const newInsights = await LifestyleCorrelationService.generateInsights(userId);
      setInsights(newInsights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    }
  }, [userId]);

  const createRecommendation = useCallback(
    async (rec: Omit<LifestyleRecommendation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      try {
        setError(null);
        const newRec = await LifestyleCorrelationService.createRecommendation(userId, rec);
        setRecommendations(prev => [...prev, newRec]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create recommendation');
        throw err;
      }
    },
    [userId]
  );

  const markInsightAsRead = useCallback(
    async (insightId: string) => {
      try {
        setError(null);
        await LifestyleCorrelationService.markInsightAsRead(insightId, userId);
        setInsights(prev => prev.map(i => (i.id === insightId ? { ...i, is_read: true } : i)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark insight as read');
      }
    },
    [userId]
  );

  const getUnreadNotifications = useCallback(async () => {
    try {
      setError(null);
      const unread = await LifestyleNotificationService.getUnreadNotifications(userId);
      setNotifications(unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    }
  }, [userId]);

  const markNotificationAsRead = useCallback(
    async (notifId: string) => {
      try {
        setError(null);
        await LifestyleNotificationService.markAsRead(notifId, userId);
        setNotifications(prev => prev.map(n => (n.id === notifId ? { ...n, is_read: true } : n)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      }
    },
    [userId]
  );

  const deleteNotification = useCallback(
    async (notifId: string) => {
      try {
        setError(null);
        await LifestyleNotificationService.deleteNotification(notifId, userId);
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete notification');
      }
    },
    [userId]
  );

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        analyzeCorrelations(30),
        generateInsights(),
        (async () => {
          const recs = await LifestyleCorrelationService.getUserRecommendations(userId);
          setRecommendations(recs);
        })(),
        (async () => {
          const notifs = await LifestyleNotificationService.getUnreadNotifications(userId);
          setNotifications(notifs);
        })(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh lifestyle data');
    } finally {
      setIsLoading(false);
    }
  }, [userId, analyzeCorrelations, generateInsights]);

  React.useEffect(() => {
    // Initial load - don't call refreshData yet, let it be called manually
    getUnreadNotifications();
  }, [userId, getUnreadNotifications]);

  const value: LifestyleInsightsContextType = {
    correlations,
    insights,
    recommendations,
    notifications,
    isLoading,
    error,
    analyzeCorrelations,
    generateInsights,
    createRecommendation,
    markInsightAsRead,
    getUnreadNotifications,
    markNotificationAsRead,
    deleteNotification,
    refreshData,
  };

  return <LifestyleInsightsContext.Provider value={value}>{children}</LifestyleInsightsContext.Provider>;
};

export const useLifestyleInsights = () => {
  const context = useContext(LifestyleInsightsContext);
  if (!context) {
    throw new Error('useLifestyleInsights must be used within LifestyleInsightsProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface UsageTrackingContextType {
  // Usage state
  totalUses: number;
  usesRemaining: number;
  canUse: boolean;
  
  // Usage conditions
  requiresSignIn: boolean;
  requiresPayment: boolean;
  
  // Actions
  useFeature: (feature: string) => Promise<boolean>;
  resetUsage: () => Promise<void>;
  getUsageStats: () => Promise<UsageStats>;
}

interface UsageStats {
  guestUses: number;
  userUses: number;
  monthlyLimit: number;
  currentMonth: string;
}

const UsageTrackingContext = createContext<UsageTrackingContextType | undefined>(undefined);

interface UsageTrackingProviderProps {
  children: ReactNode;
}

export function UsageTrackingProvider({ children }: UsageTrackingProviderProps) {
  const { user, isGuest } = useAuth();
  const [totalUses, setTotalUses] = useState(0);
  const [usesRemaining, setUsesRemaining] = useState(0);

  // Constants
  const GUEST_LIMIT = 3;
  const USER_MONTHLY_LIMIT = 30;

  useEffect(() => {
    loadUsageData();
  }, [user, isGuest]);

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getStorageKey = () => {
    if (user) {
      return `usage_${user.id}_${getCurrentMonth()}`;
    }
    return 'usage_guest';
  };

  const loadUsageData = async () => {
    try {
      const storageKey = getStorageKey();
      const storedUsage = await AsyncStorage.getItem(storageKey);
      const currentUsage = storedUsage ? parseInt(storedUsage) : 0;
      
      setTotalUses(currentUsage);
      
      if (user) {
        // Logged in user - 30 uses per month
        setUsesRemaining(Math.max(0, USER_MONTHLY_LIMIT - currentUsage));
      } else {
        // Guest user - 3 uses total
        setUsesRemaining(Math.max(0, GUEST_LIMIT - currentUsage));
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
      setTotalUses(0);
      setUsesRemaining(user ? USER_MONTHLY_LIMIT : GUEST_LIMIT);
    }
  };

  const useFeature = async (feature: string): Promise<boolean> => {
    // Check if user can use the feature
    if (!canUse) {
      return false;
    }

    try {
      const storageKey = getStorageKey();
      const newUsage = totalUses + 1;
      
      await AsyncStorage.setItem(storageKey, newUsage.toString());
      setTotalUses(newUsage);
      
      if (user) {
        setUsesRemaining(Math.max(0, USER_MONTHLY_LIMIT - newUsage));
      } else {
        setUsesRemaining(Math.max(0, GUEST_LIMIT - newUsage));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating usage:', error);
      return false;
    }
  };

  const resetUsage = async () => {
    try {
      const storageKey = getStorageKey();
      await AsyncStorage.removeItem(storageKey);
      setTotalUses(0);
      setUsesRemaining(user ? USER_MONTHLY_LIMIT : GUEST_LIMIT);
    } catch (error) {
      console.error('Error resetting usage:', error);
    }
  };

  const getUsageStats = async (): Promise<UsageStats> => {
    try {
      const guestUsage = await AsyncStorage.getItem('usage_guest');
      const userKey = user ? `usage_${user.id}_${getCurrentMonth()}` : null;
      const userUsage = userKey ? await AsyncStorage.getItem(userKey) : null;
      
      return {
        guestUses: guestUsage ? parseInt(guestUsage) : 0,
        userUses: userUsage ? parseInt(userUsage) : 0,
        monthlyLimit: user ? USER_MONTHLY_LIMIT : GUEST_LIMIT,
        currentMonth: getCurrentMonth(),
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        guestUses: 0,
        userUses: 0,
        monthlyLimit: user ? USER_MONTHLY_LIMIT : GUEST_LIMIT,
        currentMonth: getCurrentMonth(),
      };
    }
  };

  // Determine usage conditions
  const requiresSignIn = !user && totalUses >= GUEST_LIMIT;
  const requiresPayment = user && totalUses >= USER_MONTHLY_LIMIT;
  const canUse = !requiresSignIn && !requiresPayment;

  return (
    <UsageTrackingContext.Provider
      value={{
        totalUses,
        usesRemaining,
        canUse,
        requiresSignIn,
        requiresPayment,
        useFeature,
        resetUsage,
        getUsageStats,
      }}
    >
      {children}
    </UsageTrackingContext.Provider>
  );
}

export function useUsageTracking() {
  const context = useContext(UsageTrackingContext);
  if (context === undefined) {
    throw new Error('useUsageTracking must be used within a UsageTrackingProvider');
  }
  return context;
}
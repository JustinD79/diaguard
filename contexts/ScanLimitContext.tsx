import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from './SubscriptionContext';
import { useAuth } from './AuthContext';
import { getProductByTier } from '@/src/stripe-config';

interface ScanLimitContextType {
  scansRemaining: number;
  totalScans: number;
  canScan: boolean;
  useScan: () => Promise<boolean>;
  resetScans: () => Promise<void>;
  getScansUsedThisMonth: () => Promise<number>;
}

const ScanLimitContext = createContext<ScanLimitContextType | undefined>(undefined);

interface ScanLimitProviderProps {
  children: ReactNode;
}

export function ScanLimitProvider({ children }: ScanLimitProviderProps) {
  const { user, isGuest } = useAuth();
  const [scansRemaining, setScansRemaining] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const { hasActiveSubscription, hasPromoCodeAccess, subscriptionTier } = useSubscription();

  const getScanLimit = (): number => {
    if (hasActiveSubscription || hasPromoCodeAccess) {
      const product = getProductByTier(subscriptionTier);
      return product?.scanLimit || 999999; // unlimited if undefined
    }
    return 30; // Standard free tier
  };

  useEffect(() => {
    if ((user || isGuest) && typeof window !== 'undefined') {
      loadScanData();
    }
  }, [user, isGuest]);

  const getScanKey = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return `scans_demo_user_${year}_${month}`;
  };

  const loadScanData = async () => {
    try {
      const scanKey = getScanKey();
      const storedScans = await AsyncStorage.getItem(scanKey);
      const usedScans = storedScans ? parseInt(storedScans) : 0;
      const scanLimit = getScanLimit();
      
      setTotalScans(usedScans);
      
      if (scanLimit === 999999) {
        setScansRemaining(999999); // Unlimited
      } else {
        setScansRemaining(Math.max(0, scanLimit - usedScans));
      }
    } catch (error) {
      console.error('Error loading scan data:', error);
    }
  };

  const useScan = async (): Promise<boolean> => {
    // Guests cannot use scans
    if (isGuest || !user) {
      return false;
    }

    const scanLimit = getScanLimit();
    if (scanLimit === 999999) {
      return true; // Unlimited scans
    }

    if (scansRemaining <= 0) {
      return false; // No scans remaining
    }

    try {
      const scanKey = getScanKey();
      const newTotal = totalScans + 1;
      
      await AsyncStorage.setItem(scanKey, newTotal.toString());
      setTotalScans(newTotal);
      setScansRemaining(Math.max(0, scanLimit - newTotal));
      
      return true;
    } catch (error) {
      console.error('Error updating scan count:', error);
      return false;
    }
  };

  const resetScans = async () => {
    try {
      const scanKey = getScanKey();
      await AsyncStorage.removeItem(scanKey);
      setTotalScans(0);
      setScansRemaining(getScanLimit());
    } catch (error) {
      console.error('Error resetting scans:', error);
    }
  };

  const getScansUsedThisMonth = async (): Promise<number> => {
    try {
      const scanKey = getScanKey();
      const storedScans = await AsyncStorage.getItem(scanKey);
      return storedScans ? parseInt(storedScans) : 0;
    } catch (error) {
      console.error('Error getting scan count:', error);
      return 0;
    }
  };

  const canScan = (user || isGuest) && (hasActiveSubscription || hasPromoCodeAccess || scansRemaining > 0);

  return (
    <ScanLimitContext.Provider
      value={{
        scansRemaining,
        totalScans,
        canScan,
        useScan,
        resetScans,
        getScansUsedThisMonth,
      }}
    >
      {children}
    </ScanLimitContext.Provider>
  );
}

export function useScanLimit() {
  const context = useContext(ScanLimitContext);
  if (context === undefined) {
    throw new Error('useScanLimit must be used within a ScanLimitProvider');
  }
  return context;
}
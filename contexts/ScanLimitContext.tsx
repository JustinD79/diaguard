import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useSubscription } from './SubscriptionContext';

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
  const [scansRemaining, setScansRemaining] = useState(30);
  const [totalScans, setTotalScans] = useState(0);
  const { user } = useAuth();
  const { hasActiveSubscription, hasPromoCodeAccess } = useSubscription();

  const FREE_SCAN_LIMIT = 30;

  useEffect(() => {
    if (user) {
      loadScanData();
    }
  }, [user]);

  const getScanKey = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return `scans_${user?.id}_${year}_${month}`;
  };

  const loadScanData = async () => {
    try {
      const scanKey = getScanKey();
      const storedScans = await AsyncStorage.getItem(scanKey);
      const usedScans = storedScans ? parseInt(storedScans) : 0;
      
      setTotalScans(usedScans);
      
      if (hasActiveSubscription || hasPromoCodeAccess) {
        setScansRemaining(999); // Unlimited for premium users
      } else {
        setScansRemaining(Math.max(0, FREE_SCAN_LIMIT - usedScans));
      }
    } catch (error) {
      console.error('Error loading scan data:', error);
    }
  };

  const useScan = async (): Promise<boolean> => {
    if (hasActiveSubscription || hasPromoCodeAccess) {
      return true; // Unlimited scans for premium users
    }

    if (scansRemaining <= 0) {
      return false; // No scans remaining
    }

    try {
      const scanKey = getScanKey();
      const newTotal = totalScans + 1;
      
      await AsyncStorage.setItem(scanKey, newTotal.toString());
      setTotalScans(newTotal);
      setScansRemaining(Math.max(0, FREE_SCAN_LIMIT - newTotal));
      
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
      setScansRemaining(FREE_SCAN_LIMIT);
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

  const canScan = hasActiveSubscription || hasPromoCodeAccess || scansRemaining > 0;

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
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripeService } from '@/services/StripeService';
import { useAuth } from '@/contexts/AuthContext';
import { products } from '@/src/stripe-config';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  subscriptionPlan: string | null;
  subscriptionPlanName: string | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  isPremiumFeature: (feature: string) => boolean;
  hasPromoCodeAccess: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user, isGuest } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionPlanName, setSubscriptionPlanName] = useState<string | null>(null);
  const [hasPromoCodeAccess, setHasPromoCodeAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = async () => {
    setIsLoading(true);
    try {
      // For development, simulate subscription status
      const status = {
        hasActiveSubscription: hasPromoCodeAccess,
        subscription: null
      };
      
      setHasActiveSubscription(status.hasActiveSubscription || hasPromoCodeAccess);
      if (status.subscription) {
        const plan = StripeService.subscriptionPlans.find(
          p => p.stripePriceId === status.subscription?.priceId
        );
        setSubscriptionPlan(plan?.id || null);
        setSubscriptionPlanName(plan?.name || null);
      } else {
        setSubscriptionPlan(hasPromoCodeAccess ? 'promo_premium' : null);
        setSubscriptionPlanName(hasPromoCodeAccess ? 'Diagaurd Diamond Plan' : null);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setHasActiveSubscription(false);
      setSubscriptionPlan(null);
      setSubscriptionPlanName(null);
      setHasPromoCodeAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremiumFeature = (feature: string): boolean => {
    // Guests have very limited access
    if (isGuest || !user) {
      const guestFeatures = [
        'view_recipes',
        'basic_calculator',
        'view_emergency_info'
      ];
      return !guestFeatures.includes(feature);
    }

    // With the $15 plan, all features are included - no premium gates for logged-in users
    // Only guests are restricted
    return false;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        // Check if user has redeemed the secret promo code
        checkSecretPromoCode().then((hasSecret) => {
          setIsLoading(false);
          setHasActiveSubscription(hasSecret || true); // Demo: all logged users get access
          setHasPromoCodeAccess(hasSecret || true);
          setSubscriptionPlanName(hasSecret ? 'Lifetime Premium Access' : 'Diagaurd Diamond Plan');
        });
      } else if (isGuest) {
        // Guest users have limited access
        setIsLoading(false);
        setHasActiveSubscription(false);
        setHasPromoCodeAccess(false);
        setSubscriptionPlanName(null);
      } else {
        // Not logged in, redirect to auth
        setIsLoading(false);
        setHasActiveSubscription(false);
        setHasPromoCodeAccess(false);
        setSubscriptionPlanName(null);
      }
    }
  }, [user, isGuest]);

  const checkSecretPromoCode = async (): Promise<boolean> => {
    try {
      // Check if user has redeemed the secret code
      const redeemedCodes = await AsyncStorage.getItem('redeemed_promo_codes');
      if (redeemedCodes) {
        const codes = JSON.parse(redeemedCodes);
        return codes.includes('Cad38306');
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        hasActiveSubscription,
        subscriptionPlan,
        subscriptionPlanName,
        isLoading,
        refreshSubscription,
        isPremiumFeature,
        hasPromoCodeAccess,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
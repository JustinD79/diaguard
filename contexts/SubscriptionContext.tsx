import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripeService } from '@/services/StripeService';
import { useAuth } from '@/contexts/AuthContext';
import { products, getProductByTier, getFeaturesByTier } from '@/src/stripe-config';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  subscriptionPlan: string | null;
  subscriptionPlanName: string | null;
  subscriptionTier: 'standard' | 'gold' | 'diamond';
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
  const [subscriptionTier, setSubscriptionTier] = useState<'standard' | 'gold' | 'diamond'>('standard');
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
    // Guests have no access to any features
    if (isGuest || !user) {
      return true; // All features require login
    }

    // Check if feature is available in user's current tier
    const userFeatures = getFeaturesByTier(subscriptionTier);
    return !userFeatures.includes(feature);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        // Check if user has redeemed the secret promo code
        checkSecretPromoCode().then((hasSecret) => {
          setIsLoading(false);
          if (hasSecret) {
            setHasActiveSubscription(true);
            setSubscriptionTier('diamond');
            setSubscriptionPlanName('Lifetime Premium Access');
          } else {
            // Default to standard (free) tier for logged-in users
            setHasActiveSubscription(false);
            setSubscriptionTier('standard');
            setSubscriptionPlanName('Standard Plan');
          }
          setHasPromoCodeAccess(hasSecret || true);
        });
      } else if (isGuest) {
        // Guest users have limited access
        setIsLoading(false);
        setHasActiveSubscription(false);
        setSubscriptionTier('standard');
        setHasPromoCodeAccess(false);
        setSubscriptionPlanName(null);
      } else {
        // Not logged in, redirect to auth
        setIsLoading(false);
        setHasActiveSubscription(false);
        setSubscriptionTier('standard');
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
        subscriptionTier,
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
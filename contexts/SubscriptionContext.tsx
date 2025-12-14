import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionService } from '@/services/SubscriptionService';
import { PlanName, canUserAccessFeature } from '@/services/StripeConfig';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  subscriptionPlan: string | null;
  subscriptionPlanName: string | null;
  subscriptionTier: PlanName;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  isPremiumFeature: (feature: string) => boolean;
  hasPromoCodeAccess: boolean;
  isFamilyMember: boolean;
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
  const [subscriptionTier, setSubscriptionTier] = useState<PlanName>('free');
  const [hasPromoCodeAccess, setHasPromoCodeAccess] = useState(false);
  const [isFamilyMember, setIsFamilyMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!user || isGuest) {
      setHasActiveSubscription(false);
      setSubscriptionTier('free');
      setSubscriptionPlanName('Free Plan');
      setIsFamilyMember(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const hasPromo = await checkSecretPromoCode();

      if (hasPromo) {
        setHasActiveSubscription(true);
        setSubscriptionTier('diamond');
        setSubscriptionPlanName('Lifetime Premium Access');
        setSubscriptionPlan('promo_premium');
        setHasPromoCodeAccess(true);
        setIsFamilyMember(false);
      } else {
        const subscription = await SubscriptionService.getSubscription();

        if (subscription && ['active', 'trialing'].includes(subscription.status)) {
          setHasActiveSubscription(true);
          setSubscriptionTier(subscription.plan_name);
          setSubscriptionPlanName(SubscriptionService.formatPlanName(subscription.plan_name));
          setSubscriptionPlan(subscription.stripe_subscription_id || null);
          setIsFamilyMember(subscription.isFamilyMember || false);
          setHasPromoCodeAccess(false);
        } else {
          setHasActiveSubscription(false);
          setSubscriptionTier('free');
          setSubscriptionPlanName('Free Plan');
          setSubscriptionPlan(null);
          setIsFamilyMember(false);
          setHasPromoCodeAccess(false);
        }
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setHasActiveSubscription(false);
      setSubscriptionTier('free');
      setSubscriptionPlanName('Free Plan');
      setSubscriptionPlan(null);
      setIsFamilyMember(false);
      setHasPromoCodeAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremiumFeature = (feature: string): boolean => {
    if (isGuest || !user) {
      return true;
    }

    if (hasPromoCodeAccess) {
      return false;
    }

    return !canUserAccessFeature(subscriptionTier, feature);
  };

  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else if (isGuest) {
      setIsLoading(false);
      setHasActiveSubscription(false);
      setSubscriptionTier('free');
      setSubscriptionPlanName('Free Plan');
      setHasPromoCodeAccess(false);
      setIsFamilyMember(false);
    } else {
      setIsLoading(false);
      setHasActiveSubscription(false);
      setSubscriptionTier('free');
      setSubscriptionPlanName(null);
      setHasPromoCodeAccess(false);
      setIsFamilyMember(false);
    }
  }, [user, isGuest]);

  const checkSecretPromoCode = async (): Promise<boolean> => {
    try {
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
        isFamilyMember,
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

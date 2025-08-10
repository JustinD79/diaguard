import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StripeService } from '@/services/StripeService';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  subscriptionPlan: string | null;
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
      } else {
        setSubscriptionPlan(hasPromoCodeAccess ? 'promo_premium' : null);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setHasActiveSubscription(false);
      setSubscriptionPlan(null);
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

    const premiumFeatures = [
      'ai_food_recognition',
      'barcode_scanning',
      'portion_estimation',
      'advanced_analytics',
      'personalized_coaching',
      'recipe_recommendations',
      'export_data',
      'healthcare_integration',
      'priority_support'
    ];

    return premiumFeatures.includes(feature) && !hasActiveSubscription && !hasPromoCodeAccess;
  };

  useEffect(() => {
    if (user) {
      // Logged in users get full access for demo
      setIsLoading(false);
      setHasActiveSubscription(true);
      setHasPromoCodeAccess(true);
    } else if (isGuest) {
      // Guest users have limited access
      setIsLoading(false);
      setHasActiveSubscription(false);
      setHasPromoCodeAccess(false);
    } else {
      // Not logged in, redirect to auth
      setIsLoading(false);
      setHasActiveSubscription(false);
      setHasPromoCodeAccess(false);
    }
  }, [user, isGuest]);

  return (
    <SubscriptionContext.Provider
      value={{
        hasActiveSubscription,
        subscriptionPlan,
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
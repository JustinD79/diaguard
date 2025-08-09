import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StripeService } from '@/services/StripeService';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  subscriptionPlan: string | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  isPremiumFeature: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = async () => {
    setIsLoading(true);
    try {
      // In a real app, get the customer ID from user authentication
      const customerId = 'cus_test_customer';
      const status = await StripeService.getSubscriptionStatus(customerId);
      
      setHasActiveSubscription(status.hasActiveSubscription);
      if (status.subscription) {
        const plan = StripeService.subscriptionPlans.find(
          p => p.stripePriceId === status.subscription?.priceId
        );
        setSubscriptionPlan(plan?.id || null);
      } else {
        setSubscriptionPlan(null);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setHasActiveSubscription(false);
      setSubscriptionPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremiumFeature = (feature: string): boolean => {
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

    return premiumFeatures.includes(feature) && !hasActiveSubscription;
  };

  useEffect(() => {
    refreshSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        hasActiveSubscription,
        subscriptionPlan,
        isLoading,
        refreshSubscription,
        isPremiumFeature,
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
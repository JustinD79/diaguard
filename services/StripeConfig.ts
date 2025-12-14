export const STRIPE_CONFIG = {
  plans: {
    free: {
      name: 'Free Plan',
      description: 'Basic features for getting started',
      price: 0,
      interval: null,
      features: [
        '5 scans per day',
        'Basic nutritional info',
        'Food logging',
        'Basic reports'
      ],
      limits: {
        dailyScans: 5,
        monthlyScans: 150
      }
    },
    gold: {
      name: 'Gold Plan',
      description: 'Enhanced features for serious users',
      monthlyPriceId: process.env.EXPO_PUBLIC_STRIPE_GOLD_MONTHLY_PRICE_ID || '',
      price: 10,
      interval: 'month',
      features: [
        'Unlimited scans',
        'Advanced AI analysis',
        'Insulin calculator',
        'Recipe intelligence',
        'PDF reports',
        'Email to doctor'
      ],
      limits: {
        dailyScans: -1, // unlimited
        monthlyScans: -1
      }
    },
    diamond: {
      name: 'Diamond Plan',
      description: 'Premium features with annual savings',
      monthlyPriceId: process.env.EXPO_PUBLIC_STRIPE_DIAMOND_MONTHLY_PRICE_ID || '',
      yearlyFirstPriceId: process.env.EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_FIRST_PRICE_ID || '',
      yearlyRenewalPriceId: process.env.EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_RENEWAL_PRICE_ID || '',
      monthlyPrice: 15,
      yearlyFirstPrice: 79,
      yearlyRenewalPrice: 89,
      interval: 'month_or_year',
      features: [
        'Everything in Gold',
        'Dexcom integration',
        'Real-time glucose trends',
        'Family sharing (up to 2 users with Family Plan)',
        'Priority support',
        'Medical-grade reports'
      ],
      limits: {
        dailyScans: -1,
        monthlyScans: -1
      }
    },
    family: {
      name: 'Family Plan',
      description: 'Diamond features for 2 accounts',
      monthlyPriceId: process.env.EXPO_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID || '',
      price: 20,
      interval: 'month',
      maxMembers: 2,
      features: [
        'Everything in Diamond',
        '2 separate Diamond accounts',
        'Shared family dashboard',
        'Independent data tracking',
        'Coordinated meal planning'
      ],
      limits: {
        dailyScans: -1,
        monthlyScans: -1
      }
    }
  },

  // Stripe webhook events to handle
  webhookEvents: [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'checkout.session.completed'
  ]
};

export type PlanName = keyof typeof STRIPE_CONFIG.plans;
export type BillingInterval = 'month' | 'year';

export interface SubscriptionPlan {
  name: string;
  description: string;
  price: number;
  interval: string | null;
  features: string[];
  limits: {
    dailyScans: number;
    monthlyScans: number;
  };
  monthlyPriceId?: string;
  yearlyFirstPriceId?: string;
  yearlyRenewalPriceId?: string;
  maxMembers?: number;
}

export function getPlanConfig(planName: PlanName): SubscriptionPlan {
  return STRIPE_CONFIG.plans[planName];
}

export function getPriceId(planName: PlanName, interval: BillingInterval, isRenewal: boolean = false): string {
  const plan = STRIPE_CONFIG.plans[planName];

  if (planName === 'free') {
    return '';
  }

  if (planName === 'diamond' && interval === 'year') {
    return isRenewal ? plan.yearlyRenewalPriceId! : plan.yearlyFirstPriceId!;
  }

  return plan.monthlyPriceId || '';
}

export function calculateAnnualSavings(planName: 'diamond'): number {
  const plan = STRIPE_CONFIG.plans[planName];
  const monthlyAnnualCost = plan.monthlyPrice * 12;
  return monthlyAnnualCost - plan.yearlyFirstPrice;
}

export function getUpgradePath(currentPlan: PlanName): PlanName[] {
  const hierarchy: PlanName[] = ['free', 'gold', 'diamond', 'family'];
  const currentIndex = hierarchy.indexOf(currentPlan);
  return hierarchy.slice(currentIndex + 1);
}

export function getDowngradePath(currentPlan: PlanName): PlanName[] {
  const hierarchy: PlanName[] = ['family', 'diamond', 'gold', 'free'];
  const currentIndex = hierarchy.indexOf(currentPlan);
  return hierarchy.slice(currentIndex + 1);
}

export function canUserAccessFeature(planName: PlanName, feature: string): boolean {
  const planHierarchy = {
    free: 1,
    gold: 2,
    diamond: 3,
    family: 3
  };

  const featureRequirements: Record<string, number> = {
    unlimited_scans: 2, // Gold and above
    insulin_calculator: 2,
    recipe_intelligence: 2,
    dexcom_integration: 3, // Diamond and above
    family_sharing: 3,
    medical_reports: 3
  };

  const requiredLevel = featureRequirements[feature] || 1;
  return planHierarchy[planName] >= requiredLevel;
}

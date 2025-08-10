import { products } from '@/src/stripe-config';

export class StripeService {
  private static readonly API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

  static readonly subscriptionPlans = products.map(product => ({
    id: product.priceId,
    name: product.name,
    description: product.description,
    stripePriceId: product.priceId,
    mode: product.mode,
  }));

  static async getSubscriptionStatus(customerId: string): Promise<SubscriptionStatus> {
    try {
      // Return mock data if no valid API URL configured
      if (!this.API_BASE_URL || this.API_BASE_URL === 'http://localhost:8081') {
        return {
          hasActiveSubscription: false,
          subscription: null,
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/subscription-status/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        hasActiveSubscription: data.hasActiveSubscription || false,
        subscription: data.subscription || null,
      };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return {
        hasActiveSubscription: false,
        subscription: null,
      };
    }
  }

  static async createCheckoutSession(priceId: string): Promise<CheckoutSessionResult> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        sessionId: data.sessionId,
        url: data.url,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<CancelSubscriptionResult> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        subscriptionId: data.subscriptionId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        currentPeriodEnd: data.currentPeriodEnd,
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Type definitions
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  stripePriceId: string;
  mode: 'payment' | 'subscription';
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    priceId: string;
  } | null;
}

export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface CancelSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
  error?: string;
}
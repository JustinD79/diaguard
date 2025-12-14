import { supabase } from '@/lib/supabase';
import { PlanName, BillingInterval } from './StripeConfig';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  plan_name: PlanName;
  billing_interval?: BillingInterval;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  isFamilyMember?: boolean;
  familyMembers?: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  subscription_id: string;
  user_id: string;
  is_primary: boolean;
  joined_at: string;
  email?: string;
}

export class SubscriptionService {
  static async createCheckoutSession(
    planName: PlanName,
    billingInterval: BillingInterval
  ): Promise<{ sessionId: string; url: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planName,
          billingInterval
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return await response.json();
  }

  static async getSubscription(): Promise<Subscription | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/get-subscription?userId=${user.id}`
    );

    if (!response.ok) {
      throw new Error('Failed to get subscription');
    }

    const data = await response.json();
    return data.subscription;
  }

  static async cancelSubscription(immediate: boolean = false): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/cancel-subscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          immediate
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel subscription');
    }
  }

  static async updateSubscription(
    newPlanName: PlanName,
    newBillingInterval: BillingInterval
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/update-subscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          newPlanName,
          newBillingInterval
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update subscription');
    }
  }

  static async addFamilyMember(memberEmail: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/manage-family`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'add',
          memberEmail
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add family member');
    }
  }

  static async removeFamilyMember(memberEmail: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/manage-family`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'remove',
          memberEmail
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove family member');
    }
  }

  static async getFamilyMembers(): Promise<{
    members: FamilyMember[];
    maxMembers: number;
    availableSlots: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/manage-family`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'list'
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get family members');
    }

    return await response.json();
  }

  static formatPlanName(planName: PlanName): string {
    const names: Record<PlanName, string> = {
      free: 'Free Plan',
      gold: 'Gold Plan',
      diamond: 'Diamond Plan',
      family: 'Family Plan'
    };
    return names[planName];
  }

  static formatStatus(status: string): string {
    const statuses: Record<string, string> = {
      active: 'Active',
      canceled: 'Canceled',
      past_due: 'Past Due',
      trialing: 'Trial',
      incomplete: 'Incomplete',
      incomplete_expired: 'Expired',
      unpaid: 'Unpaid'
    };
    return statuses[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#10b981',
      trialing: '#3b82f6',
      canceled: '#6b7280',
      past_due: '#ef4444',
      incomplete: '#f59e0b',
      incomplete_expired: '#ef4444',
      unpaid: '#ef4444'
    };
    return colors[status] || '#6b7280';
  }
}

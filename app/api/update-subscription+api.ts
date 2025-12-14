import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, newPlanName, newBillingInterval } = body;

    if (!userId || !newPlanName) {
      return new Response(
        JSON.stringify({ error: 'User ID and plan name required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's current subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!subscription || !subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine new price ID
    let newPriceId: string;

    if (newPlanName === 'gold') {
      newPriceId = process.env.EXPO_PUBLIC_STRIPE_GOLD_MONTHLY_PRICE_ID!;
    } else if (newPlanName === 'diamond') {
      if (newBillingInterval === 'year') {
        // For upgrades to yearly, always use first-time pricing
        newPriceId = process.env.EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_FIRST_PRICE_ID!;
      } else {
        newPriceId = process.env.EXPO_PUBLIC_STRIPE_DIAMOND_MONTHLY_PRICE_ID!;
      }
    } else if (newPlanName === 'family') {
      newPriceId = process.env.EXPO_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID!;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid plan name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Update subscription in Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'always_invoice',
        metadata: {
          userId,
          planName: newPlanName,
          billingInterval: newBillingInterval
        }
      }
    );

    // Update in database
    await supabase
      .from('subscriptions')
      .update({
        plan_name: newPlanName,
        billing_interval: newBillingInterval,
        stripe_price_id: newPriceId
      })
      .eq('id', subscription.id);

    // Log event
    await supabase
      .from('subscription_events')
      .insert({
        subscription_id: subscription.id,
        event_type: 'subscription.updated',
        event_data: {
          old_plan: subscription.plan_name,
          new_plan: newPlanName,
          old_interval: subscription.billing_interval,
          new_interval: newBillingInterval,
          updated_at: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        subscription: updatedSubscription,
        message: 'Subscription updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Update subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

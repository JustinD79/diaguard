import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, immediate = false } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's subscription
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

    // Cancel in Stripe
    const canceledSubscription = immediate
      ? await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
      : await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true
        });

    // Update in database
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: !immediate,
        status: immediate ? 'canceled' : 'active'
      })
      .eq('id', subscription.id);

    // Log event
    await supabase
      .from('subscription_events')
      .insert({
        subscription_id: subscription.id,
        event_type: immediate ? 'subscription.canceled.immediate' : 'subscription.canceled.at_period_end',
        event_data: {
          canceled_at: new Date().toISOString(),
          immediate
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        subscription: canceledSubscription,
        message: immediate
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at the end of the billing period'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

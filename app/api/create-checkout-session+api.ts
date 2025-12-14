import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planName, billingInterval, userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);

      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId }
      });

      stripeCustomerId = customer.id;
    }

    // Determine price ID based on plan and interval
    let priceId: string;

    if (planName === 'gold') {
      priceId = process.env.EXPO_PUBLIC_STRIPE_GOLD_MONTHLY_PRICE_ID!;
    } else if (planName === 'diamond') {
      if (billingInterval === 'year') {
        // Check if this is a renewal
        const { data: existingDiamond } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('plan_name', 'diamond')
          .eq('billing_interval', 'year')
          .maybeSingle();

        priceId = existingDiamond
          ? process.env.EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_RENEWAL_PRICE_ID!
          : process.env.EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_FIRST_PRICE_ID!;
      } else {
        priceId = process.env.EXPO_PUBLIC_STRIPE_DIAMOND_MONTHLY_PRICE_ID!;
      }
    } else if (planName === 'family') {
      priceId = process.env.EXPO_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID!;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid plan name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.EXPO_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.EXPO_PUBLIC_APP_URL}/subscription`,
      metadata: {
        userId,
        planName,
        billingInterval
      },
      subscription_data: {
        metadata: {
          userId,
          planName,
          billingInterval
        }
      }
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

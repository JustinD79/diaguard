import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Diabetes Care App',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    console.log(`Processing webhook event: ${event.type}`);

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});

async function handleEvent(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await supabase.from('subscription_events').insert({
      event_type: event.type,
      stripe_event_id: event.id,
      event_data: event.data.object
    });

  } catch (error) {
    console.error(`Error handling event ${event.type}:`, error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { customer, subscription, metadata, mode } = session;

  if (mode !== 'subscription' || !customer || !subscription) {
    return;
  }

  const userId = metadata?.userId;
  const planName = metadata?.planName;
  const billingInterval = metadata?.billingInterval;

  if (!userId || !planName) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription as string);

  await upsertSubscription({
    userId,
    customerId: customer as string,
    subscriptionId: subscription as string,
    priceId: stripeSubscription.items.data[0].price.id,
    planName,
    billingInterval,
    status: stripeSubscription.status,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
  });

  if (planName === 'family') {
    await supabase.from('family_members').insert({
      subscription_id: (await getSubscriptionId(userId))!,
      user_id: userId,
      is_primary: true
    });
  }

  console.log(`Checkout completed for user ${userId}, plan: ${planName}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id, plan_name, billing_interval')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!existingSub) {
    console.log('No existing subscription found for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0].price.id;
  const planName = existingSub.plan_name;
  const billingInterval = existingSub.billing_interval;

  await upsertSubscription({
    userId: existingSub.user_id,
    customerId,
    subscriptionId: subscription.id,
    priceId,
    planName,
    billingInterval,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  console.log(`Subscription updated for customer ${customerId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (!existingSub) {
    return;
  }

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false
    })
    .eq('id', existingSub.id);

  if (existingSub.user_id) {
    await supabase
      .from('family_members')
      .delete()
      .eq('subscription_id', existingSub.id);
  }

  console.log(`Subscription canceled: ${subscription.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id, plan_name, billing_interval, stripe_price_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (!existingSub) {
    return;
  }

  if (existingSub.plan_name === 'diamond' && existingSub.billing_interval === 'year') {
    const currentPriceId = existingSub.stripe_price_id;
    const firstYearPriceId = Deno.env.get('EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_FIRST_PRICE_ID');
    const renewalPriceId = Deno.env.get('EXPO_PUBLIC_STRIPE_DIAMOND_YEARLY_RENEWAL_PRICE_ID');

    if (currentPriceId === firstYearPriceId && invoice.billing_reason === 'subscription_cycle') {
      console.log('Upgrading Diamond yearly to renewal pricing');

      await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: renewalPriceId,
          },
        ],
        proration_behavior: 'none'
      });

      await supabase
        .from('subscriptions')
        .update({ stripe_price_id: renewalPriceId })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`Updated Diamond yearly subscription to renewal pricing`);
    }
  }

  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_subscription_id', subscriptionId);

  console.log(`Payment succeeded for subscription: ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}

async function upsertSubscription(data: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  planName: string;
  billingInterval?: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: data.userId,
      stripe_customer_id: data.customerId,
      stripe_subscription_id: data.subscriptionId,
      stripe_price_id: data.priceId,
      plan_name: data.planName,
      billing_interval: data.billingInterval || null,
      status: data.status,
      current_period_start: data.currentPeriodStart,
      current_period_end: data.currentPeriodEnd,
      cancel_at_period_end: data.cancelAtPeriodEnd
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }
}

async function getSubscriptionId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.id || null;
}

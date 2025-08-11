import Stripe from 'stripe';

// Check if we're in development mode
const isDevelopment = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key');

// Only initialize Stripe if we have a valid key
const stripe = isDevelopment ? null : new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(request: Request, { customerId }: { customerId: string }) {
  try {
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Customer ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return mock data in development mode to prevent Stripe connection errors
    if (isDevelopment || !stripe) {
      return Response.json({
        hasActiveSubscription: false,
        subscription: null,
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return Response.json({
        hasActiveSubscription: false,
        subscription: null,
      });
    }

    const subscription = subscriptions.data[0];
    
    return Response.json({
      hasActiveSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        priceId: subscription.items.data[0]?.price.id,
      },
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get subscription status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
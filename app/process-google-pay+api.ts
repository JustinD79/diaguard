const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, paymentMethodId, mode = 'subscription' } = body;

    if (!priceId || !paymentMethodId) {
      return new Response(
        JSON.stringify({ error: 'Price ID and payment method ID are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret || stripeSecret.includes('your_stripe_secret_key')) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const apiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const userResponse = await fetch(`${apiUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': serviceKey || '',
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = await userResponse.json();

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    });

    const customerResponse = await fetch(`${apiUrl}/rest/v1/stripe_customers?user_id=eq.${user.id}&select=customer_id`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey || '',
        'Content-Type': 'application/json',
      },
    });

    let customerId: string;
    const customers = await customerResponse.json();

    if (!customers || customers.length === 0) {
      const customer = await stripe.customers.create({
        email: user.email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: {
          userId: user.id,
        },
      });

      await fetch(`${apiUrl}/rest/v1/stripe_customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey || '',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: user.id,
          customer_id: customer.id,
        }),
      });

      customerId = customer.id;
    } else {
      customerId = customers[0].customer_id;
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    let result;
    if (mode === 'subscription') {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      result = {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      };
    } else {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        return_url: `${process.env.EXPO_PUBLIC_APP_URL}/subscription/success`,
      });

      result = {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing Google Pay payment:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process Google Pay payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
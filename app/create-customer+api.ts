import Stripe from 'stripe';

// Check if we're in development mode
const isDevelopment = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key');

// Only initialize Stripe if we have a valid key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
}) : null;

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return mock customer in development mode
    if (isDevelopment || !stripe) {
      return Response.json({
        customerId: `cus_dev_${Date.now()}`,
        email,
        name,
      });
    }

    const customer = await stripe.customers.create({
      email,
      name,
    });

    return Response.json({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create customer' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
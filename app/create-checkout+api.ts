import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const { priceId, promoCode, paymentMethod = 'card' } = await request.json();

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate promo code if provided
    let discount = 0;
    let promoCodeData = null;
    
    if (promoCode) {
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .single();

      if (!promoError && promo) {
        // Check if expired
        if (!promo.expires_at || new Date(promo.expires_at) > new Date()) {
          // Check usage limits
          if (!promo.max_uses || promo.current_uses < promo.max_uses) {
            promoCodeData = promo;
            discount = promo.benefits?.discount || 0;
          }
        }
      }
    }

    // Create checkout session data
    const sessionData = {
      sessionId: `cs_test_${Date.now()}`,
      url: `https://checkout.stripe.com/pay/cs_test_${Date.now()}`,
      priceId,
      paymentMethod,
      discount,
      promoCode: promoCodeData?.code || null,
      expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
    };

    return new Response(
      JSON.stringify({
        success: true,
        ...sessionData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
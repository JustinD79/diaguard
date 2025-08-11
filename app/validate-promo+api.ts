const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Demo promo codes for testing
const DEMO_PROMO_CODES = {
  'SAVE20': {
    code: 'SAVE20',
    description: '20% off your first month',
    discount: 20,
    discountType: 'percentage',
    active: true,
    maxUses: 100,
    currentUses: 15,
  },
  'WELCOME': {
    code: 'WELCOME',
    description: '$5 off your subscription',
    discount: 5,
    discountType: 'fixed',
    active: true,
    maxUses: 50,
    currentUses: 8,
  },
  'HEALTH50': {
    code: 'HEALTH50',
    description: '50% off first month',
    discount: 50,
    discountType: 'percentage',
    active: true,
    maxUses: 25,
    currentUses: 3,
  },
  'EXPIRED': {
    code: 'EXPIRED',
    description: 'Expired promo code',
    discount: 10,
    discountType: 'percentage',
    active: false,
    maxUses: 10,
    currentUses: 10,
  },
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Promo code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const upperCode = code.toUpperCase().trim();
    const promoData = DEMO_PROMO_CODES[upperCode as keyof typeof DEMO_PROMO_CODES];

    if (!promoData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid promo code. Please check your code and try again.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!promoData.active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This promo code has expired or is no longer active.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (promoData.currentUses >= promoData.maxUses) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This promo code has reached its usage limit.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        promoCode: {
          code: promoData.code,
          description: promoData.description,
          discount: promoData.discount,
          discountType: promoData.discountType,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Promo code validation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
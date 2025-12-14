import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's direct subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Check if user is part of a family plan
    const { data: familyMember, error: familyError } = await supabase
      .from('family_members')
      .select(`
        *,
        subscription:subscriptions(*)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    let effectiveSubscription = subscription;
    let isFamilyMember = false;

    // If user doesn't have direct subscription but is family member
    if (!subscription && familyMember && familyMember.subscription) {
      effectiveSubscription = familyMember.subscription as any;
      isFamilyMember = true;
    }

    // If no subscription found, return free plan
    if (!effectiveSubscription) {
      return new Response(
        JSON.stringify({
          subscription: {
            plan_name: 'free',
            status: 'active',
            isFamilyMember: false
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get family members if this is a family plan
    let familyMembers = [];
    if (effectiveSubscription.plan_name === 'family') {
      const { data: members } = await supabase
        .from('family_members')
        .select(`
          *,
          user:auth.users(email)
        `)
        .eq('subscription_id', effectiveSubscription.id);

      familyMembers = members || [];
    }

    return new Response(
      JSON.stringify({
        subscription: {
          ...effectiveSubscription,
          isFamilyMember,
          familyMembers: familyMembers.length > 0 ? familyMembers : undefined
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Get subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

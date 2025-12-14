import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, memberEmail } = body;

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'User ID and action required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's family subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_name', 'family')
      .eq('status', 'active')
      .maybeSingle();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'No active family plan found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'add') {
      if (!memberEmail) {
        return new Response(
          JSON.stringify({ error: 'Member email required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check current member count
      const { data: currentMembers, error: countError } = await supabase
        .from('family_members')
        .select('id')
        .eq('subscription_id', subscription.id);

      if (currentMembers && currentMembers.length >= 2) {
        return new Response(
          JSON.stringify({ error: 'Family plan limit reached (2 members)' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Find user by email
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      const memberUser = users.find(u => u.email === memberEmail);

      if (!memberUser) {
        return new Response(
          JSON.stringify({ error: 'User not found with that email' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already has a subscription
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', memberUser.id)
        .maybeSingle();

      if (existingSub) {
        return new Response(
          JSON.stringify({ error: 'User already has an active subscription' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Add family member
      const { data: newMember, error: addError } = await supabase
        .from('family_members')
        .insert({
          subscription_id: subscription.id,
          user_id: memberUser.id,
          is_primary: currentMembers?.length === 0
        })
        .select()
        .single();

      if (addError) {
        return new Response(
          JSON.stringify({ error: addError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          member: newMember,
          message: 'Family member added successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } else if (action === 'remove') {
      if (!memberEmail) {
        return new Response(
          JSON.stringify({ error: 'Member email required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Find user by email
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      const memberUser = users.find(u => u.email === memberEmail);

      if (!memberUser) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Remove family member
      const { error: removeError } = await supabase
        .from('family_members')
        .delete()
        .eq('subscription_id', subscription.id)
        .eq('user_id', memberUser.id);

      if (removeError) {
        return new Response(
          JSON.stringify({ error: removeError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Family member removed successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } else if (action === 'list') {
      // Get all family members
      const { data: members, error: listError } = await supabase
        .from('family_members')
        .select('*')
        .eq('subscription_id', subscription.id);

      if (listError) {
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get user details for each member
      const membersWithDetails = await Promise.all(
        (members || []).map(async (member) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(member.user_id);
          return {
            ...member,
            email: user?.email,
            joined_at: member.joined_at
          };
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          members: membersWithDetails,
          maxMembers: 2,
          availableSlots: 2 - (members?.length || 0)
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Manage family error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

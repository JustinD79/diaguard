/*
  # Streamlined Stripe Subscription System

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `stripe_customer_id` (text)
      - `stripe_subscription_id` (text)
      - `stripe_price_id` (text)
      - `plan_name` (text: free, gold, diamond, family)
      - `billing_interval` (text: month, year)
      - `status` (text: active, canceled, past_due, trialing)
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `family_members`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `user_id` (uuid, references auth.users)
      - `is_primary` (boolean)
      - `joined_at` (timestamptz)
    
    - `subscription_events`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `event_type` (text)
      - `stripe_event_id` (text)
      - `event_data` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their subscriptions
    - Add policies for family members to access family plan features
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  plan_name text NOT NULL DEFAULT 'free',
  billing_interval text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_plan_name CHECK (plan_name IN ('free', 'gold', 'diamond', 'family')),
  CONSTRAINT valid_billing_interval CHECK (billing_interval IS NULL OR billing_interval IN ('month', 'year')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'))
);

-- Create family members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(subscription_id, user_id)
);

-- Create subscription events table for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  event_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_family_members_subscription_id ON family_members(subscription_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions table
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for family members table
CREATE POLICY "Family members can view their family"
  ON family_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    subscription_id IN (
      SELECT subscription_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Primary family member can manage family"
  ON family_members FOR ALL
  TO authenticated
  USING (
    subscription_id IN (
      SELECT subscription_id FROM family_members 
      WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Policies for subscription events table
CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_name text,
  status text,
  is_family_member boolean,
  family_subscription_id uuid
) AS $$
BEGIN
  RETURN QUERY
  -- Check for direct subscription
  SELECT 
    s.id,
    s.plan_name,
    s.status,
    false as is_family_member,
    NULL::uuid as family_subscription_id
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  
  UNION ALL
  
  -- Check for family membership
  SELECT 
    s.id,
    s.plan_name,
    s.status,
    true as is_family_member,
    fm.subscription_id as family_subscription_id
  FROM family_members fm
  JOIN subscriptions s ON s.id = fm.subscription_id
  WHERE fm.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
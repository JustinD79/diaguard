/*
  # User Scan Limits and Subscription Tracking

  1. New Tables
    - `user_scan_limits`
      - `user_id` (uuid, foreign key to auth.users)
      - `scans_used` (integer, default 0)
      - `month_year` (text, format: YYYY-MM)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `scan_usage_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `scan_type` (text: 'ai_food', 'barcode', 'manual')
      - `success` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own scan data
    - Add policies for admins to view usage statistics

  3. Functions
    - Function to check if user can scan
    - Function to increment scan count
    - Function to get monthly usage statistics
*/

-- Create user_scan_limits table
CREATE TABLE IF NOT EXISTS user_scan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scans_used integer DEFAULT 0 NOT NULL,
  month_year text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, month_year)
);

-- Create scan_usage_log table
CREATE TABLE IF NOT EXISTS scan_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('ai_food', 'barcode', 'manual')),
  success boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_scan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_scan_limits
CREATE POLICY "Users can view own scan limits"
  ON user_scan_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own scan limits"
  ON user_scan_limits
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for scan_usage_log
CREATE POLICY "Users can view own scan logs"
  ON scan_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan logs"
  ON scan_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user can scan
CREATE OR REPLACE FUNCTION can_user_scan(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text;
  scans_used_count integer;
  has_subscription boolean;
  free_limit integer := 30;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Check if user has active subscription
  SELECT EXISTS(
    SELECT 1 FROM stripe_user_subscriptions 
    WHERE user_id = user_uuid 
    AND subscription_status IN ('active', 'trialing')
  ) INTO has_subscription;
  
  -- If user has subscription, they can scan unlimited
  IF has_subscription THEN
    RETURN true;
  END IF;
  
  -- Get current month's scan count
  SELECT COALESCE(scans_used, 0)
  FROM user_scan_limits
  WHERE user_id = user_uuid AND month_year = current_month
  INTO scans_used_count;
  
  -- If no record exists, user hasn't scanned this month
  IF scans_used_count IS NULL THEN
    scans_used_count := 0;
  END IF;
  
  -- Check if under limit
  RETURN scans_used_count < free_limit;
END;
$$;

-- Function to increment scan count
CREATE OR REPLACE FUNCTION increment_scan_count(
  user_uuid uuid,
  scan_type_param text DEFAULT 'ai_food',
  success_param boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text;
  can_scan_result boolean;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Check if user can scan
  SELECT can_user_scan(user_uuid) INTO can_scan_result;
  
  IF NOT can_scan_result THEN
    RETURN false;
  END IF;
  
  -- Insert or update scan limit record
  INSERT INTO user_scan_limits (user_id, month_year, scans_used, updated_at)
  VALUES (user_uuid, current_month, 1, now())
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    scans_used = user_scan_limits.scans_used + 1,
    updated_at = now();
  
  -- Log the scan usage
  INSERT INTO scan_usage_log (user_id, scan_type, success, created_at)
  VALUES (user_uuid, scan_type_param, success_param, now());
  
  RETURN true;
END;
$$;

-- Function to get user's monthly scan statistics
CREATE OR REPLACE FUNCTION get_user_scan_stats(user_uuid uuid)
RETURNS TABLE(
  month_year text,
  scans_used integer,
  scans_remaining integer,
  has_subscription boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text;
  free_limit integer := 30;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  RETURN QUERY
  SELECT 
    current_month,
    COALESCE(usl.scans_used, 0) as scans_used,
    CASE 
      WHEN EXISTS(
        SELECT 1 FROM stripe_user_subscriptions 
        WHERE user_id = user_uuid 
        AND subscription_status IN ('active', 'trialing')
      ) THEN 999999 -- Unlimited for subscribers
      ELSE free_limit - COALESCE(usl.scans_used, 0)
    END as scans_remaining,
    EXISTS(
      SELECT 1 FROM stripe_user_subscriptions 
      WHERE user_id = user_uuid 
      AND subscription_status IN ('active', 'trialing')
    ) as has_subscription
  FROM (
    SELECT user_uuid as user_id
  ) u
  LEFT JOIN user_scan_limits usl ON usl.user_id = u.user_id AND usl.month_year = current_month;
END;
$$;
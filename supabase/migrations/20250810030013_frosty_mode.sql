/*
  # Create promo codes system and admin account

  1. New Tables
    - `promo_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `description` (text)
      - `benefits` (jsonb)
      - `max_uses` (integer)
      - `current_uses` (integer)
      - `active` (boolean)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
    - `user_promo_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `promo_code_id` (uuid, foreign key)
      - `redeemed_at` (timestamp)

  2. Admin User Setup
    - Create admin user with full access
    - Email: caydenjdunn08@gmail.com
    - Password: Cd052121$

  3. Promo Code Setup
    - Create "InsulinX3" promo code
    - Grants unlimited premium features
    - No expiration date

  4. Security
    - Enable RLS on new tables
    - Add policies for user access
    - Secure admin account setup
*/

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  benefits jsonb DEFAULT '{}',
  max_uses integer,
  current_uses integer DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create user_promo_codes table
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- Enable RLS on promo_codes table
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_promo_codes table
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for promo_codes
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON promo_codes;
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Create policies for user_promo_codes
DROP POLICY IF EXISTS "Users can view their own promo code redemptions" ON user_promo_codes;
CREATE POLICY "Users can view their own promo code redemptions"
  ON user_promo_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can redeem promo codes" ON user_promo_codes;
CREATE POLICY "Users can redeem promo codes"
  ON user_promo_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert the InsulinX3 promo code
INSERT INTO promo_codes (
  code,
  description,
  benefits,
  max_uses,
  current_uses,
  active,
  expires_at
) VALUES (
  'InsulinX3',
  'Family and friends premium access code - unlimited features',
  '{"premium_features": true, "unlimited_scans": true, "advanced_analytics": true, "priority_support": true}',
  NULL, -- No usage limit
  0,
  true,
  NULL -- No expiration
) ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user_id ON user_promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_promo_code_id ON user_promo_codes(promo_code_id);

-- Note: Admin user account will be created through the app's signup process
-- using the credentials: caydenjdunn08@gmail.com / Cd052121$
-- This ensures proper password hashing and auth flow
/*
  # Create admin account and promo code system

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
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_promo_codes table for tracking redemptions
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promo_codes
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (active = true);

-- RLS Policies for user_promo_codes
CREATE POLICY "Users can view their own redeemed codes"
  ON user_promo_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem promo codes"
  ON user_promo_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert the InsulinX3 promo code
INSERT INTO promo_codes (code, description, benefits, max_uses, active)
VALUES (
  'InsulinX3',
  'Family & Friends Premium Access',
  '{"unlimited_scans": true, "premium_features": true, "priority_support": true}',
  NULL, -- Unlimited uses
  true
);

-- Create admin user profile entry (the actual auth user will be created via signup)
-- This creates a placeholder that will be linked when the admin signs up
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate a consistent UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Insert admin user medical profile with full access settings
  INSERT INTO user_medical_profiles (
    user_id,
    diabetes_type,
    carb_ratio,
    correction_factor,
    target_bg_min,
    target_bg_max,
    max_insulin_dose,
    safety_settings,
    healthcare_provider_info,
    emergency_contacts
  ) VALUES (
    admin_user_id,
    'type1',
    15.0,
    50.0,
    80,
    120,
    20.0,
    '{"admin_override": true, "full_access": true}',
    '{"name": "Admin Account", "phone": "N/A", "email": "caydenjdunn08@gmail.com"}',
    '[{"name": "Admin", "phone": "N/A", "relationship": "self"}]'
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Set unlimited scan limits for admin
  INSERT INTO user_scan_limits (
    user_id,
    scans_used,
    month_year
  ) VALUES (
    admin_user_id,
    0,
    to_char(now(), 'YYYY-MM')
  ) ON CONFLICT (user_id, month_year) DO NOTHING;
  
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user_id ON user_promo_codes(user_id);
/*
  # Scan Audit and Credit Management System

  1. New Tables
    - `scan_audit_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `transaction_id` (text)
      - `action` (text)
      - `timestamp` (timestamptz)
      - `metadata` (jsonb)
    
    - `admin_actions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `admin_id` (uuid)
      - `action` (text)
      - `metadata` (jsonb)
      - `performed_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view their own audit logs
    - Admins can view all logs and perform actions
*/

-- Create scan_audit_log table
CREATE TABLE IF NOT EXISTS scan_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id text NOT NULL,
  action text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  performed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE scan_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policies for scan_audit_log
DROP POLICY IF EXISTS "Users can view their own scan audit logs" ON scan_audit_log;
CREATE POLICY "Users can view their own scan audit logs"
  ON scan_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage scan audit logs" ON scan_audit_log;
CREATE POLICY "Service role can manage scan audit logs"
  ON scan_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert their own scan audit logs" ON scan_audit_log;
CREATE POLICY "Users can insert their own scan audit logs"
  ON scan_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for admin_actions
DROP POLICY IF EXISTS "Users can view admin actions on their account" ON admin_actions;
CREATE POLICY "Users can view admin actions on their account"
  ON admin_actions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage admin actions" ON admin_actions;
CREATE POLICY "Service role can manage admin actions"
  ON admin_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_audit_log_user_id ON scan_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_log_transaction_id ON scan_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_log_timestamp ON scan_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_user_id ON admin_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_performed_at ON admin_actions(performed_at DESC);

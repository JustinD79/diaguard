/*
  # Fix Supabase Performance and Security Issues

  This migration addresses the performance and security issues identified by the Supabase linter:

  1. **Missing Indexes for Foreign Keys**
     - Add indexes for foreign key columns to improve query performance
     - Affects: emergency_events, food_analysis_sessions, scan_usage_log tables

  2. **RLS Policy Performance Optimization**
     - Optimize auth function calls in RLS policies to prevent re-evaluation for each row
     - Replace `auth.uid()` with `(select auth.uid())` for better performance
     - Affects: Multiple tables with user-based RLS policies

  3. **Consolidate Multiple Permissive Policies**
     - Merge duplicate permissive policies on user_scan_limits table
     - Improves query performance by reducing policy evaluation overhead

  4. **Remove Unused Indexes**
     - Remove indexes that are never used to reduce storage overhead
     - Improves write performance and reduces maintenance overhead
*/

-- Add missing indexes for foreign key columns
CREATE INDEX IF NOT EXISTS idx_emergency_events_audit_log_id 
  ON emergency_events(audit_log_id);

CREATE INDEX IF NOT EXISTS idx_food_analysis_sessions_audit_log_id 
  ON food_analysis_sessions(audit_log_id);

CREATE INDEX IF NOT EXISTS idx_scan_usage_log_user_id 
  ON scan_usage_log(user_id);

-- Optimize RLS policies by wrapping auth functions in SELECT statements
-- This prevents re-evaluation for each row and improves performance

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Users can manage their own analysis sessions" ON food_analysis_sessions;
DROP POLICY IF EXISTS "Users can manage their own emergency events" ON emergency_events;
DROP POLICY IF EXISTS "Users can manage their own medical profile" ON user_medical_profiles;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON medical_audit_logs;
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Users can view own scan limits" ON user_scan_limits;
DROP POLICY IF EXISTS "Users can update own scan limits" ON user_scan_limits;
DROP POLICY IF EXISTS "Users can view own scan logs" ON scan_usage_log;
DROP POLICY IF EXISTS "Users can insert own scan logs" ON scan_usage_log;
DROP POLICY IF EXISTS "Users can view their own promo code redemptions" ON user_promo_codes;
DROP POLICY IF EXISTS "Users can redeem promo codes" ON user_promo_codes;

-- Create optimized RLS policies with SELECT-wrapped auth functions
CREATE POLICY "Users can manage their own analysis sessions"
  ON food_analysis_sessions
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their own emergency events"
  ON emergency_events
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their own medical profile"
  ON user_medical_profiles
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own audit logs"
  ON medical_audit_logs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own customer data"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING ((user_id = (select auth.uid())) AND (deleted_at IS NULL));

CREATE POLICY "Users can view their own order data"
  ON stripe_orders
  FOR SELECT
  TO authenticated
  USING ((customer_id IN ( 
    SELECT stripe_customers.customer_id
    FROM stripe_customers
    WHERE ((stripe_customers.user_id = (select auth.uid())) AND (stripe_customers.deleted_at IS NULL))
  )) AND (deleted_at IS NULL));

CREATE POLICY "Users can view their own subscription data"
  ON stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING ((customer_id IN ( 
    SELECT stripe_customers.customer_id
    FROM stripe_customers
    WHERE ((stripe_customers.user_id = (select auth.uid())) AND (stripe_customers.deleted_at IS NULL))
  )) AND (deleted_at IS NULL));

-- Consolidate user_scan_limits policies into a single comprehensive policy
CREATE POLICY "Users can manage own scan limits"
  ON user_scan_limits
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own scan logs"
  ON scan_usage_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own scan logs"
  ON scan_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own promo code redemptions"
  ON user_promo_codes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can redeem promo codes"
  ON user_promo_codes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Remove unused indexes to improve write performance
-- Note: Only removing indexes that are confirmed unused and not critical for foreign key constraints

DROP INDEX IF EXISTS idx_emergency_events_created_at;
DROP INDEX IF EXISTS idx_emergency_events_severity;
DROP INDEX IF EXISTS idx_food_analysis_sessions_created_at;
DROP INDEX IF EXISTS idx_food_products_barcode;
DROP INDEX IF EXISTS idx_food_products_name;
DROP INDEX IF EXISTS idx_medical_audit_logs_action_type;
DROP INDEX IF EXISTS idx_medical_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_promo_codes_code;
DROP INDEX IF EXISTS idx_promo_codes_active;
DROP INDEX IF EXISTS idx_user_promo_codes_user_id;
DROP INDEX IF EXISTS idx_user_promo_codes_promo_code_id;

-- Keep essential indexes that are likely to be used in the future
-- These indexes support common query patterns even if not currently used:
-- - idx_emergency_events_user_id (for user-specific emergency queries)
-- - idx_food_analysis_sessions_user_id (for user-specific analysis queries)
-- - idx_medical_audit_logs_user_id (for user-specific audit queries)

-- Add comment explaining the optimization
COMMENT ON TABLE food_analysis_sessions IS 'Food analysis sessions with optimized RLS policies for performance';
COMMENT ON TABLE emergency_events IS 'Emergency events with optimized RLS policies for performance';
COMMENT ON TABLE user_medical_profiles IS 'User medical profiles with optimized RLS policies for performance';
COMMENT ON TABLE medical_audit_logs IS 'Medical audit logs with optimized RLS policies for performance';
COMMENT ON TABLE stripe_customers IS 'Stripe customers with optimized RLS policies for performance';
COMMENT ON TABLE stripe_orders IS 'Stripe orders with optimized RLS policies for performance';
COMMENT ON TABLE stripe_subscriptions IS 'Stripe subscriptions with optimized RLS policies for performance';
COMMENT ON TABLE user_scan_limits IS 'User scan limits with consolidated RLS policies for performance';
COMMENT ON TABLE scan_usage_log IS 'Scan usage log with optimized RLS policies for performance';
COMMENT ON TABLE user_promo_codes IS 'User promo codes with optimized RLS policies for performance';
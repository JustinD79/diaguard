/*
  # Fix Function Search Path Security Issues

  This migration addresses the Supabase security linter warnings by explicitly setting
  search_path for all functions to prevent mutable search path vulnerabilities.

  ## Security Changes
  1. Sets explicit `SET search_path = public` for all functions
  2. Adds security comments for future maintainers
  3. Verifies all functions have fixed search paths
  4. Updates trigger references where needed

  ## Functions Updated
  - update_updated_at_column (trigger function)
  - log_api_key_changes (audit function)
  - generate_api_key (security function)
  - increment_scan_count (user function)
  - get_user_scan_stats (user function)
  - can_user_scan (user function)
  - check_emergency_thresholds (medical function)
  - log_medical_action (medical audit function)
*/

-- 1. Update trigger function with locked search_path
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Update API key audit function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO api_key_audit_log (api_key_id, user_id, action, metadata)
    VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO api_key_audit_log (api_key_id, user_id, action, metadata)
    VALUES (NEW.id, NEW.user_id, 'updated', jsonb_build_object('changes', jsonb_build_object('is_active', NEW.is_active)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO api_key_audit_log (api_key_id, user_id, action, metadata)
    VALUES (OLD.id, OLD.user_id, 'deleted', jsonb_build_object('name', OLD.name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Update API key generation function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
DECLARE
  api_key text;
BEGIN
  -- Generate a secure random API key (64 characters)
  api_key := encode(gen_random_bytes(32), 'hex');
  RETURN 'sk_' || api_key;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_api_key() TO authenticated;

-- 4. Update scan count increment function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.increment_scan_count(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
DECLARE
  current_month text;
  current_scans integer;
  scan_limit integer := 30; -- Default free tier limit
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get or create scan limit record
  INSERT INTO user_scan_limits (user_id, month_year, scans_used)
  VALUES (user_uuid, current_month, 0)
  ON CONFLICT (user_id, month_year) DO NOTHING;
  
  -- Get current scan count
  SELECT scans_used INTO current_scans
  FROM user_scan_limits
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- Check if user has scans remaining
  IF current_scans >= scan_limit THEN
    RETURN false;
  END IF;
  
  -- Increment scan count
  UPDATE user_scan_limits
  SET scans_used = scans_used + 1, updated_at = now()
  WHERE user_id = user_uuid AND month_year = current_month;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_scan_count(uuid) TO authenticated;

-- 5. Update scan stats function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
DECLARE
  current_month text;
  stats_result jsonb;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  SELECT jsonb_build_object(
    'scans_used', COALESCE(scans_used, 0),
    'scans_remaining', GREATEST(0, 30 - COALESCE(scans_used, 0)),
    'month_year', current_month,
    'last_updated', updated_at
  ) INTO stats_result
  FROM user_scan_limits
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- Return default if no record exists
  IF stats_result IS NULL THEN
    stats_result := jsonb_build_object(
      'scans_used', 0,
      'scans_remaining', 30,
      'month_year', current_month,
      'last_updated', null
    );
  END IF;
  
  RETURN stats_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_scan_stats(uuid) TO authenticated;

-- 6. Update user scan check function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.can_user_scan(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
DECLARE
  current_month text;
  current_scans integer;
  scan_limit integer := 30;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  SELECT COALESCE(scans_used, 0) INTO current_scans
  FROM user_scan_limits
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- If no record exists, user can scan
  IF current_scans IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN current_scans < scan_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_scan(uuid) TO authenticated;

-- 7. Update emergency thresholds function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
  blood_glucose integer,
  user_uuid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
DECLARE
  result jsonb;
  severity text := 'normal';
  action_required boolean := false;
  emergency_contacts jsonb;
BEGIN
  -- Check blood glucose thresholds
  IF blood_glucose <= 54 THEN
    severity := 'critical_low';
    action_required := true;
  ELSIF blood_glucose <= 70 THEN
    severity := 'low';
    action_required := true;
  ELSIF blood_glucose >= 400 THEN
    severity := 'critical_high';
    action_required := true;
  ELSIF blood_glucose >= 250 THEN
    severity := 'high';
    action_required := true;
  END IF;
  
  -- Get emergency contacts if action required
  IF action_required THEN
    SELECT jsonb_agg(jsonb_build_object(
      'name', name,
      'phone', phone,
      'relationship', relationship,
      'is_primary', is_primary
    )) INTO emergency_contacts
    FROM emergency_contacts
    WHERE user_id = user_uuid
    ORDER BY is_primary DESC, created_at ASC;
  END IF;
  
  result := jsonb_build_object(
    'severity', severity,
    'action_required', action_required,
    'blood_glucose', blood_glucose,
    'emergency_contacts', COALESCE(emergency_contacts, '[]'::jsonb),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds(integer, uuid) TO authenticated;

-- 8. Update medical action logging function
-- NOTE: search_path is locked to `public` to prevent mutable-search_path vulnerabilities
CREATE OR REPLACE FUNCTION public.log_medical_action(
  user_uuid uuid,
  action_type_param text,
  action_data_param jsonb,
  medical_significance_param text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public   -- Lock the path to prevent injection
AS $$
DECLARE
  log_id uuid;
BEGIN
  -- Validate medical significance parameter
  IF medical_significance_param NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid medical significance: %', medical_significance_param;
  END IF;
  
  -- Insert medical audit log
  INSERT INTO medical_audit_logs (
    user_id,
    action_type,
    action_data,
    medical_significance,
    timestamp
  ) VALUES (
    user_uuid,
    action_type_param,
    action_data_param,
    medical_significance_param,
    now()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_medical_action(uuid, text, jsonb, text) TO authenticated;

-- Verification: Check that all functions now have fixed search_path
DO $$
DECLARE
  mutable_functions text[];
BEGIN
  -- Check for any remaining functions with mutable search_path
  SELECT array_agg(routine_name) INTO mutable_functions
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN (
      'update_updated_at_column',
      'log_api_key_changes', 
      'generate_api_key',
      'increment_scan_count',
      'get_user_scan_stats',
      'can_user_scan',
      'check_emergency_thresholds',
      'log_medical_action'
    )
    AND (
      proconfig IS NULL OR 
      NOT EXISTS (
        SELECT 1 FROM unnest(proconfig) AS config 
        WHERE config LIKE 'search_path=%'
      )
    )
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = routine_name;
  
  IF array_length(mutable_functions, 1) > 0 THEN
    RAISE WARNING 'Functions still have mutable search_path: %', array_to_string(mutable_functions, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All functions now have fixed search_path configuration';
  END IF;
END;
$$;
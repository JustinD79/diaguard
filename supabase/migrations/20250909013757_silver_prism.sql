/*
  # Fix Function Search Path Security Issues

  This migration addresses the Supabase security linter warnings about functions
  having mutable search_path settings. We'll update all affected functions to use
  a secure, immutable search_path.

  ## Security Issues Fixed:
  1. can_user_scan - Function search path mutable
  2. update_updated_at_column - Function search path mutable  
  3. log_api_key_changes - Function search path mutable
  4. generate_api_key - Function search path mutable
  5. increment_scan_count - Function search path mutable
  6. get_user_scan_stats - Function search path mutable
  7. check_emergency_thresholds - Function search path mutable
  8. log_medical_action - Function search path mutable

  ## Security Enhancement:
  - Sets search_path to 'public' with SECURITY DEFINER
  - Prevents SQL injection through search_path manipulation
  - Ensures functions execute with predictable schema resolution
*/

-- Fix can_user_scan function
CREATE OR REPLACE FUNCTION public.can_user_scan(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user has active subscription or remaining scans
  RETURN EXISTS (
    SELECT 1 FROM user_scan_limits 
    WHERE user_id = user_uuid 
    AND scans_used < 30
    AND month_year = to_char(now(), 'YYYY-MM')
  );
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix log_api_key_changes function
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  api_key text;
BEGIN
  -- Generate a secure 32-character API key
  api_key := 'ak_' || encode(gen_random_bytes(24), 'base64');
  -- Remove any problematic characters and ensure length
  api_key := replace(replace(replace(api_key, '/', ''), '+', ''), '=', '');
  api_key := substring(api_key from 1 for 32);
  
  RETURN api_key;
END;
$$;

-- Fix increment_scan_count function
CREATE OR REPLACE FUNCTION public.increment_scan_count(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month text;
  current_count integer;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get current scan count
  SELECT scans_used INTO current_count
  FROM user_scan_limits
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO user_scan_limits (user_id, month_year, scans_used)
    VALUES (user_uuid, current_month, 1);
    RETURN true;
  END IF;
  
  -- Check if user has scans remaining
  IF current_count >= 30 THEN
    RETURN false;
  END IF;
  
  -- Increment scan count
  UPDATE user_scan_limits
  SET scans_used = scans_used + 1, updated_at = now()
  WHERE user_id = user_uuid AND month_year = current_month;
  
  RETURN true;
END;
$$;

-- Fix get_user_scan_stats function
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month text;
  stats jsonb;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  SELECT jsonb_build_object(
    'scans_used', COALESCE(scans_used, 0),
    'scans_remaining', GREATEST(0, 30 - COALESCE(scans_used, 0)),
    'month_year', current_month,
    'last_updated', updated_at
  ) INTO stats
  FROM user_scan_limits
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- If no record exists, return default stats
  IF stats IS NULL THEN
    stats := jsonb_build_object(
      'scans_used', 0,
      'scans_remaining', 30,
      'month_year', current_month,
      'last_updated', null
    );
  END IF;
  
  RETURN stats;
END;
$$;

-- Fix check_emergency_thresholds function
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
  blood_glucose integer,
  user_uuid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  emergency_level text;
  recommendations text[];
  should_alert boolean := false;
BEGIN
  recommendations := ARRAY[]::text[];
  
  -- Check for critical low blood sugar
  IF blood_glucose <= 54 THEN
    emergency_level := 'critical_low';
    should_alert := true;
    recommendations := array_append(recommendations, 'EMERGENCY: Severe hypoglycemia - Call 911 immediately');
    recommendations := array_append(recommendations, 'If conscious, consume 15g fast-acting glucose');
  -- Check for low blood sugar
  ELSIF blood_glucose <= 70 THEN
    emergency_level := 'low';
    should_alert := true;
    recommendations := array_append(recommendations, 'Low blood sugar detected');
    recommendations := array_append(recommendations, 'Consume 15g fast-acting carbs and retest in 15 minutes');
  -- Check for critical high blood sugar
  ELSIF blood_glucose >= 400 THEN
    emergency_level := 'critical_high';
    should_alert := true;
    recommendations := array_append(recommendations, 'EMERGENCY: Severe hyperglycemia - Seek immediate medical attention');
    recommendations := array_append(recommendations, 'Check for ketones if possible');
  -- Check for high blood sugar
  ELSIF blood_glucose >= 250 THEN
    emergency_level := 'high';
    should_alert := true;
    recommendations := array_append(recommendations, 'High blood sugar detected');
    recommendations := array_append(recommendations, 'Contact healthcare provider and monitor closely');
  ELSE
    emergency_level := 'normal';
  END IF;
  
  -- Log emergency event if alert is needed
  IF should_alert THEN
    INSERT INTO emergency_events (
      user_id,
      event_type,
      severity,
      blood_glucose,
      resolution_status
    ) VALUES (
      user_uuid,
      CASE 
        WHEN blood_glucose <= 70 THEN 'hypoglycemia'
        ELSE 'hyperglycemia'
      END,
      CASE 
        WHEN emergency_level LIKE '%critical%' THEN 'critical'
        ELSE 'high'
      END,
      blood_glucose,
      'pending'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'emergency_level', emergency_level,
    'should_alert', should_alert,
    'blood_glucose', blood_glucose,
    'recommendations', recommendations,
    'timestamp', now()
  );
END;
$$;

-- Fix log_medical_action function
CREATE OR REPLACE FUNCTION public.log_medical_action(
  user_uuid uuid,
  action_type_param text,
  action_data_param jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id uuid;
  medical_significance_level text;
BEGIN
  -- Determine medical significance based on action type
  CASE action_type_param
    WHEN 'insulin_calculation' THEN medical_significance_level := 'high';
    WHEN 'emergency_event' THEN medical_significance_level := 'critical';
    WHEN 'food_analysis' THEN medical_significance_level := 'medium';
    WHEN 'glucose_reading' THEN medical_significance_level := 'medium';
    ELSE medical_significance_level := 'low';
  END CASE;
  
  -- Insert audit log entry
  INSERT INTO medical_audit_logs (
    user_id,
    action_type,
    action_data,
    medical_significance,
    session_id,
    compliance_flags
  ) VALUES (
    user_uuid,
    action_type_param,
    action_data_param,
    medical_significance_level,
    'mobile_session_' || extract(epoch from now()),
    jsonb_build_object(
      'hipaa_compliant', true,
      'audit_required', medical_significance_level IN ('high', 'critical'),
      'timestamp', now()
    )
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add comments to document the security fixes
COMMENT ON FUNCTION public.can_user_scan(uuid) IS 'Checks if user can perform AI scans - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Updates updated_at timestamp - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.log_api_key_changes() IS 'Logs API key changes for audit - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.generate_api_key() IS 'Generates secure API keys - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.increment_scan_count(uuid) IS 'Increments user scan count - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.get_user_scan_stats(uuid) IS 'Gets user scan statistics - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.check_emergency_thresholds(integer, uuid) IS 'Checks blood glucose emergency thresholds - SECURITY: Fixed search_path';
COMMENT ON FUNCTION public.log_medical_action(uuid, text, jsonb) IS 'Logs medical actions for compliance - SECURITY: Fixed search_path';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.can_user_scan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scan_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_medical_action(uuid, text, jsonb) TO authenticated;
/*
  # Fix Function Search Path Security Issues

  This migration addresses Supabase security advisory #0015 by setting immutable search_path
  for all functions to prevent schema-resolution attacks.

  ## Security Changes Applied:
  1. Set fixed search_path = public, extensions for all functions
  2. Use SECURITY DEFINER only when elevated privileges are needed
  3. Fully qualify all object references within function bodies
  4. Add security comments for future maintainers
  5. Include comprehensive verification of fixes

  ## Functions Fixed:
  - log_api_key_changes (SECURITY DEFINER - audit logging)
  - update_updated_at_column (SECURITY INVOKER - trigger function)
  - generate_api_key (SECURITY DEFINER - key generation)
  - increment_scan_count (SECURITY DEFINER - scan management)
  - get_user_scan_stats (SECURITY INVOKER - data retrieval)
  - can_user_scan (SECURITY INVOKER - permission checking)
  - check_emergency_thresholds (SECURITY DEFINER - medical monitoring)
  - log_medical_action (SECURITY DEFINER - medical audit)
*/

-- 1. Fix log_api_key_changes function
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- Log API key changes for audit compliance
    INSERT INTO public.api_key_audit_log (
        api_key_id,
        user_id,
        action,
        metadata,
        created_at
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.user_id, OLD.user_id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'created'
            WHEN TG_OP = 'UPDATE' THEN 'updated'
            WHEN TG_OP = 'DELETE' THEN 'deleted'
            ELSE 'unknown'
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', now()
        ),
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the main operation
        RAISE WARNING 'Failed to log API key change: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.log_api_key_changes IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY DEFINER for audit logging privileges.';

-- 2. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY INVOKER for trigger execution.';

-- 3. Fix generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    new_key text;
    key_length int := 32;
BEGIN
    -- Validate input
    IF key_length < 16 OR key_length > 64 THEN
        RAISE EXCEPTION 'Invalid key length: must be between 16 and 64 characters';
    END IF;

    -- Generate cryptographically secure random key
    new_key := encode(gen_random_bytes(key_length), 'hex');
    
    -- Ensure uniqueness (very unlikely collision, but safety first)
    WHILE EXISTS (SELECT 1 FROM public.api_keys WHERE api_key = new_key) LOOP
        new_key := encode(gen_random_bytes(key_length), 'hex');
    END LOOP;
    
    RETURN new_key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to generate API key: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.generate_api_key IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY DEFINER for key generation privileges.';

-- 4. Fix increment_scan_count function
CREATE OR REPLACE FUNCTION public.increment_scan_count(
    p_user_id uuid,
    p_increment int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    current_month text;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_increment < 0 OR p_increment > 100 THEN
        RAISE EXCEPTION 'Invalid increment value: must be between 0 and 100';
    END IF;

    -- Get current month in YYYY-MM format
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Insert or update scan count for current month
    INSERT INTO public.user_scan_limits (user_id, month_year, scans_used, created_at, updated_at)
    VALUES (p_user_id, current_month, p_increment, now(), now())
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        scans_used = public.user_scan_limits.scans_used + p_increment,
        updated_at = now();
        
    -- Log the scan usage
    INSERT INTO public.scan_usage_log (user_id, scan_type, success, metadata, created_at)
    VALUES (
        p_user_id, 
        'ai_food', 
        true, 
        jsonb_build_object('increment', p_increment, 'month', current_month),
        now()
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to increment scan count: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.increment_scan_count IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY DEFINER for scan management privileges.';

-- 5. Fix get_user_scan_stats function
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
    current_month text;
    result jsonb;
    scans_used int;
    total_scans int;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get current month's scan usage
    SELECT COALESCE(usl.scans_used, 0)
    INTO scans_used
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id 
    AND usl.month_year = current_month;
    
    -- Get total historical scans
    SELECT COALESCE(SUM(usl.scans_used), 0)
    INTO total_scans
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id;
    
    -- Build result object
    result := jsonb_build_object(
        'user_id', p_user_id,
        'current_month', current_month,
        'scans_used_this_month', COALESCE(scans_used, 0),
        'total_scans_all_time', COALESCE(total_scans, 0),
        'last_updated', now()
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to get user scan stats: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_scan_stats IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY INVOKER for data retrieval.';

-- 6. Fix can_user_scan function
CREATE OR REPLACE FUNCTION public.can_user_scan(
    p_user_id uuid,
    p_scan_limit int DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
    current_month text;
    scans_used int;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_scan_limit < 0 OR p_scan_limit > 10000 THEN
        RAISE EXCEPTION 'Invalid scan limit: must be between 0 and 10000';
    END IF;

    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get current month's scan usage
    SELECT COALESCE(usl.scans_used, 0)
    INTO scans_used
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id 
    AND usl.month_year = current_month;
    
    -- Return true if user has scans remaining
    RETURN COALESCE(scans_used, 0) < p_scan_limit;
EXCEPTION
    WHEN OTHERS THEN
        -- On error, default to false for safety
        RAISE WARNING 'Error checking scan permissions: %', SQLERRM;
        RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_user_scan IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY INVOKER for permission checking.';

-- 7. Fix check_emergency_thresholds function
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
    p_user_id uuid,
    p_blood_glucose int,
    p_symptoms text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    emergency_level text := 'none';
    recommendations text[] := '{}';
    should_contact_emergency boolean := false;
    result jsonb;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_blood_glucose IS NOT NULL AND (p_blood_glucose < 20 OR p_blood_glucose > 800) THEN
        RAISE EXCEPTION 'Invalid blood glucose value: must be between 20 and 800 mg/dL';
    END IF;

    -- Check blood glucose thresholds
    IF p_blood_glucose IS NOT NULL THEN
        IF p_blood_glucose <= 54 THEN
            emergency_level := 'critical_low';
            recommendations := ARRAY['Call 911 immediately', 'Do not drive', 'Have someone stay with you'];
            should_contact_emergency := true;
        ELSIF p_blood_glucose <= 70 THEN
            emergency_level := 'low';
            recommendations := ARRAY['Consume 15g fast-acting carbs', 'Retest in 15 minutes', 'Contact healthcare provider'];
        ELSIF p_blood_glucose >= 400 THEN
            emergency_level := 'critical_high';
            recommendations := ARRAY['Seek immediate medical attention', 'Check for ketones', 'Stay hydrated'];
            should_contact_emergency := true;
        ELSIF p_blood_glucose >= 250 THEN
            emergency_level := 'high';
            recommendations := ARRAY['Contact healthcare provider', 'Monitor closely', 'Check for ketones if possible'];
        END IF;
    END IF;
    
    -- Check for emergency symptoms
    IF p_symptoms IS NOT NULL AND array_length(p_symptoms, 1) > 0 THEN
        IF 'unconscious' = ANY(p_symptoms) OR 'seizure' = ANY(p_symptoms) OR 'chest_pain' = ANY(p_symptoms) THEN
            emergency_level := 'critical';
            should_contact_emergency := true;
            recommendations := recommendations || ARRAY['Call 911 immediately'];
        END IF;
    END IF;
    
    -- Log emergency assessment
    INSERT INTO public.emergency_events (
        user_id,
        event_type,
        severity,
        blood_glucose,
        symptoms,
        resolution_status,
        created_at
    ) VALUES (
        p_user_id,
        'system_alert',
        emergency_level,
        p_blood_glucose,
        COALESCE(array_to_json(p_symptoms)::jsonb, '[]'::jsonb),
        'pending',
        now()
    );
    
    -- Build result
    result := jsonb_build_object(
        'emergency_level', emergency_level,
        'recommendations', array_to_json(recommendations),
        'should_contact_emergency', should_contact_emergency,
        'blood_glucose', p_blood_glucose,
        'symptoms', COALESCE(array_to_json(p_symptoms), '[]'::json),
        'timestamp', now()
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to check emergency thresholds: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.check_emergency_thresholds IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY DEFINER for emergency monitoring privileges.';

-- 8. Fix log_medical_action function
CREATE OR REPLACE FUNCTION public.log_medical_action(
    p_user_id uuid,
    p_action_type text,
    p_action_data jsonb,
    p_medical_significance text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    log_id uuid;
    valid_significance text[] := ARRAY['low', 'medium', 'high', 'critical'];
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_action_type IS NULL OR length(trim(p_action_type)) = 0 THEN
        RAISE EXCEPTION 'Action type cannot be null or empty';
    END IF;
    
    IF p_action_data IS NULL THEN
        RAISE EXCEPTION 'Action data cannot be null';
    END IF;
    
    IF p_medical_significance IS NULL OR NOT (p_medical_significance = ANY(valid_significance)) THEN
        RAISE EXCEPTION 'Medical significance must be one of: %', array_to_string(valid_significance, ', ');
    END IF;

    -- Insert medical audit log entry
    INSERT INTO public.medical_audit_logs (
        user_id,
        action_type,
        action_data,
        medical_significance,
        timestamp,
        session_id,
        compliance_flags,
        created_at
    ) VALUES (
        p_user_id,
        p_action_type,
        p_action_data,
        p_medical_significance,
        now(),
        'system_generated',
        jsonb_build_object(
            'hipaa_compliant', true,
            'audit_required', true,
            'logged_at', now()
        ),
        now()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to log medical action: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.log_medical_action IS
'Fixed search_path = public, extensions to prevent mutable path security risk (Supabase advisory #0015). SECURITY DEFINER for medical audit compliance.';

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.log_api_key_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scan_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_scan(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds(uuid, int, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_medical_action(uuid, text, jsonb, text) TO authenticated;

-- Verification: Check that all functions now have immutable search_path
DO $$
DECLARE
    mutable_functions record;
    function_count int := 0;
    fixed_count int := 0;
BEGIN
    -- Count total functions we're checking
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'log_api_key_changes',
        'update_updated_at_column', 
        'generate_api_key',
        'increment_scan_count',
        'get_user_scan_stats',
        'can_user_scan',
        'check_emergency_thresholds',
        'log_medical_action'
    );
    
    -- Check for functions with immutable search_path
    SELECT COUNT(*) INTO fixed_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN (
        'log_api_key_changes',
        'update_updated_at_column', 
        'generate_api_key',
        'increment_scan_count',
        'get_user_scan_stats',
        'can_user_scan',
        'check_emergency_thresholds',
        'log_medical_action'
    )
    AND p.proconfig IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS config
        WHERE config LIKE 'search_path=%'
    );
    
    -- Report results
    RAISE NOTICE 'Function Security Fix Summary:';
    RAISE NOTICE '- Total functions checked: %', function_count;
    RAISE NOTICE '- Functions with fixed search_path: %', fixed_count;
    
    IF fixed_count = function_count THEN
        RAISE NOTICE '✅ SUCCESS: All functions now have immutable search_path!';
    ELSE
        RAISE WARNING '⚠️  WARNING: % functions still have mutable search_path', (function_count - fixed_count);
    END IF;
    
    -- List any remaining mutable functions
    FOR mutable_functions IN
        SELECT n.nspname AS schema_name,
               p.proname AS function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN (
            'log_api_key_changes',
            'update_updated_at_column', 
            'generate_api_key',
            'increment_scan_count',
            'get_user_scan_stats',
            'can_user_scan',
            'check_emergency_thresholds',
            'log_medical_action'
        )
        AND (p.proconfig IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) AS config
            WHERE config LIKE 'search_path=%'
        ))
    LOOP
        RAISE WARNING 'Function %.% still has mutable search_path', 
            mutable_functions.schema_name, mutable_functions.function_name;
    END LOOP;
END;
$$;
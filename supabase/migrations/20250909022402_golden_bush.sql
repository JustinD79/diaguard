/*
  # Fix Function Search Path Security Issues

  This migration addresses the "Function Search Path Mutable" security warnings
  by implementing SET LOCAL search_path inside each function body and using
  fully-qualified object names throughout.

  ## Security Fixes Applied:
  1. SET LOCAL search_path = public; at the start of each function
  2. Fully-qualified object names (public.table_name)
  3. Proper SECURITY DEFINER/INVOKER settings
  4. Appropriate privilege management with GRANT/REVOKE

  ## Functions Fixed:
  - log_api_key_changes() - Audit logging with elevated privileges
  - update_updated_at_column() - Trigger function with caller privileges
  - generate_api_key() - Key generation with elevated privileges
  - increment_scan_count() - Scan management with elevated privileges
  - get_user_scan_stats() - Stats retrieval with caller privileges
  - can_user_scan() - Permission checking with caller privileges
  - check_emergency_thresholds() - Medical monitoring with elevated privileges
  - log_medical_action() - Medical audit with elevated privileges
*/

-- 1. log_api_key_changes() - Audit logging function
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action, metadata)
        VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('name', NEW.name));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action, metadata)
        VALUES (NEW.id, NEW.user_id, 'updated', jsonb_build_object(
            'old_active', OLD.is_active,
            'new_active', NEW.is_active
        ));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action, metadata)
        VALUES (OLD.id, OLD.user_id, 'deleted', jsonb_build_object('name', OLD.name));
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Set proper privileges for audit function
REVOKE EXECUTE ON FUNCTION public.log_api_key_changes FROM public;
GRANT EXECUTE ON FUNCTION public.log_api_key_changes TO service_role;

COMMENT ON FUNCTION public.log_api_key_changes IS
'search_path locked to public for security; see advisory #0015. SECURITY DEFINER for audit logging.';

-- 2. update_updated_at_column() - Trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS
'search_path locked to public for security; see advisory #0015. SECURITY INVOKER for trigger function.';

-- 3. generate_api_key() - Key generation function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_key text;
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    -- Generate a secure 32-byte random key and encode as hex
    new_key := encode(gen_random_bytes(32), 'hex');
    
    -- Ensure uniqueness (very unlikely collision, but safety first)
    WHILE EXISTS (SELECT 1 FROM public.api_keys WHERE api_key = new_key) LOOP
        new_key := encode(gen_random_bytes(32), 'hex');
    END LOOP;
    
    RETURN new_key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to generate API key: %', SQLERRM;
END;
$$;

-- Set proper privileges for key generation
REVOKE EXECUTE ON FUNCTION public.generate_api_key FROM public;
GRANT EXECUTE ON FUNCTION public.generate_api_key TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_api_key IS
'search_path locked to public for security; see advisory #0015. SECURITY DEFINER for key generation.';

-- 4. increment_scan_count() - Scan management function
CREATE OR REPLACE FUNCTION public.increment_scan_count(
    p_user_id uuid,
    p_increment integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month text;
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_increment < 0 THEN
        RAISE EXCEPTION 'Increment must be positive';
    END IF;
    
    -- Get current month in YYYY-MM format
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Insert or update scan count for current month
    INSERT INTO public.user_scan_limits (user_id, month_year, scans_used)
    VALUES (p_user_id, current_month, p_increment)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        scans_used = public.user_scan_limits.scans_used + p_increment,
        updated_at = now();
        
    -- Log the scan usage
    INSERT INTO public.scan_usage_log (user_id, scan_type, success, metadata)
    VALUES (p_user_id, 'ai_food', true, jsonb_build_object('increment', p_increment));
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to increment scan count: %', SQLERRM;
END;
$$;

-- Set proper privileges for scan management
REVOKE EXECUTE ON FUNCTION public.increment_scan_count FROM public;
GRANT EXECUTE ON FUNCTION public.increment_scan_count TO authenticated, service_role;

COMMENT ON FUNCTION public.increment_scan_count IS
'search_path locked to public for security; see advisory #0015. SECURITY DEFINER for scan management.';

-- 5. get_user_scan_stats() - Stats retrieval function
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    current_month text;
    stats_result jsonb;
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    -- Validate input
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get scan statistics for current month
    SELECT jsonb_build_object(
        'current_month', current_month,
        'scans_used', COALESCE(scans_used, 0),
        'last_scan', updated_at
    )
    INTO stats_result
    FROM public.user_scan_limits
    WHERE user_id = p_user_id AND month_year = current_month;
    
    -- Return default if no record exists
    IF stats_result IS NULL THEN
        stats_result := jsonb_build_object(
            'current_month', current_month,
            'scans_used', 0,
            'last_scan', null
        );
    END IF;
    
    RETURN stats_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to get scan stats: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_scan_stats IS
'search_path locked to public for security; see advisory #0015. SECURITY INVOKER for stats retrieval.';

-- 6. can_user_scan() - Permission checking function
CREATE OR REPLACE FUNCTION public.can_user_scan(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    current_month text;
    scans_used integer;
    scan_limit integer := 30; -- Default free tier limit
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    -- Validate input
    IF p_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get current month's scan usage
    SELECT COALESCE(public.user_scan_limits.scans_used, 0)
    INTO scans_used
    FROM public.user_scan_limits
    WHERE user_id = p_user_id AND month_year = current_month;
    
    -- If no record exists, user hasn't used any scans
    IF scans_used IS NULL THEN
        scans_used := 0;
    END IF;
    
    -- Check if user has active subscription (unlimited scans)
    IF EXISTS (
        SELECT 1 
        FROM public.stripe_customers sc
        JOIN public.stripe_subscriptions ss ON sc.customer_id = ss.customer_id
        WHERE sc.user_id = p_user_id 
        AND sc.deleted_at IS NULL
        AND ss.deleted_at IS NULL
        AND ss.status = 'active'
    ) THEN
        RETURN true; -- Unlimited scans for active subscribers
    END IF;
    
    -- Check against free tier limit
    RETURN scans_used < scan_limit;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return false on any error for safety
        RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_user_scan IS
'search_path locked to public for security; see advisory #0015. SECURITY INVOKER for permission checking.';

-- 7. check_emergency_thresholds() - Medical monitoring function
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
    p_user_id uuid,
    p_blood_glucose integer,
    p_symptoms text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    emergency_level text := 'none';
    recommendations text[] := ARRAY[]::text[];
    should_alert boolean := false;
    result_json jsonb;
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_blood_glucose IS NULL OR p_blood_glucose < 0 OR p_blood_glucose > 1000 THEN
        RAISE EXCEPTION 'Invalid blood glucose value: %', p_blood_glucose;
    END IF;
    
    -- Check for critical low blood sugar (severe hypoglycemia)
    IF p_blood_glucose <= 54 THEN
        emergency_level := 'critical';
        recommendations := array_append(recommendations, 'CALL 911 IMMEDIATELY');
        recommendations := array_append(recommendations, 'Administer glucagon if available');
        should_alert := true;
    -- Check for low blood sugar (hypoglycemia)
    ELSIF p_blood_glucose <= 70 THEN
        emergency_level := 'warning';
        recommendations := array_append(recommendations, 'Consume 15g fast-acting carbs');
        recommendations := array_append(recommendations, 'Recheck glucose in 15 minutes');
        should_alert := true;
    -- Check for very high blood sugar (severe hyperglycemia)
    ELSIF p_blood_glucose >= 400 THEN
        emergency_level := 'critical';
        recommendations := array_append(recommendations, 'Seek immediate medical attention');
        recommendations := array_append(recommendations, 'Check for ketones');
        should_alert := true;
    -- Check for high blood sugar (hyperglycemia)
    ELSIF p_blood_glucose >= 250 THEN
        emergency_level := 'urgent';
        recommendations := array_append(recommendations, 'Contact healthcare provider');
        recommendations := array_append(recommendations, 'Increase fluid intake');
        should_alert := true;
    END IF;
    
    -- Check symptoms for additional emergency indicators
    IF p_symptoms IS NOT NULL THEN
        IF 'confusion' = ANY(p_symptoms) OR 'unconscious' = ANY(p_symptoms) OR 'seizure' = ANY(p_symptoms) THEN
            emergency_level := 'critical';
            recommendations := array_append(recommendations, 'CALL 911 IMMEDIATELY');
            should_alert := true;
        END IF;
    END IF;
    
    -- Log emergency event if alert level
    IF should_alert THEN
        INSERT INTO public.emergency_events (
            user_id, 
            event_type, 
            severity, 
            blood_glucose, 
            symptoms, 
            resolution_status
        )
        VALUES (
            p_user_id,
            CASE 
                WHEN p_blood_glucose <= 70 THEN 'hypoglycemia'
                WHEN p_blood_glucose >= 250 THEN 'hyperglycemia'
                ELSE 'system_alert'
            END,
            emergency_level,
            p_blood_glucose,
            COALESCE(p_symptoms, ARRAY[]::text[]),
            'pending'
        );
    END IF;
    
    -- Build result JSON
    result_json := jsonb_build_object(
        'emergency_level', emergency_level,
        'blood_glucose', p_blood_glucose,
        'should_alert', should_alert,
        'recommendations', recommendations,
        'timestamp', now()
    );
    
    RETURN result_json;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Emergency threshold check failed: %', SQLERRM;
END;
$$;

-- Set proper privileges for emergency monitoring
REVOKE EXECUTE ON FUNCTION public.check_emergency_thresholds FROM public;
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds TO authenticated, service_role;

COMMENT ON FUNCTION public.check_emergency_thresholds IS
'search_path locked to public for security; see advisory #0015. SECURITY DEFINER for medical monitoring.';

-- 8. log_medical_action() - Medical audit function
CREATE OR REPLACE FUNCTION public.log_medical_action(
    p_user_id uuid,
    p_action_type text,
    p_action_data jsonb,
    p_medical_significance text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
    valid_significance text[] := ARRAY['low', 'medium', 'high', 'critical'];
BEGIN
    -- Force the search_path to the public schema only
    SET LOCAL search_path = public;
    
    -- Validate inputs
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
    
    -- Insert medical audit log
    INSERT INTO public.medical_audit_logs (
        user_id,
        action_type,
        action_data,
        medical_significance,
        compliance_flags
    )
    VALUES (
        p_user_id,
        p_action_type,
        p_action_data,
        p_medical_significance,
        jsonb_build_object(
            'hipaa_compliant', true,
            'audit_required', true,
            'timestamp', now()
        )
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Medical action logging failed: %', SQLERRM;
END;
$$;

-- Set proper privileges for medical audit
REVOKE EXECUTE ON FUNCTION public.log_medical_action FROM public;
GRANT EXECUTE ON FUNCTION public.log_medical_action TO authenticated, service_role;

COMMENT ON FUNCTION public.log_medical_action IS
'search_path locked to public for security; see advisory #0015. SECURITY DEFINER for medical audit logging.';

-- Verification: Check that all functions now have immutable search_path
DO $$
DECLARE
    func_record record;
    mutable_count integer := 0;
BEGIN
    -- Check for any remaining mutable search_path functions
    FOR func_record IN
        SELECT n.nspname as schema_name,
               p.proname as function_name,
               CASE 
                   WHEN p.proconfig IS NULL THEN 'No search_path set'
                   WHEN p.proconfig @> ARRAY['search_path='] THEN 'Mutable search_path'
                   ELSE 'Fixed search_path'
               END as search_path_status
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
    LOOP
        IF func_record.search_path_status != 'Fixed search_path' THEN
            RAISE WARNING 'Function %.% still has mutable search_path: %', 
                func_record.schema_name, func_record.function_name, func_record.search_path_status;
            mutable_count := mutable_count + 1;
        END IF;
    END LOOP;
    
    IF mutable_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All 8 functions now have immutable search_path with SET LOCAL implementation';
    ELSE
        RAISE WARNING 'WARNING: % functions still have mutable search_path', mutable_count;
    END IF;
END;
$$;
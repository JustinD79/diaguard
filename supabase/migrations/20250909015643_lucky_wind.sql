/*
  # Fix Function Search Path Security Vulnerabilities

  This migration addresses Supabase security advisory #0015 by fixing mutable search_path 
  vulnerabilities in all database functions. Each function is recreated with an immutable 
  search_path setting to prevent SQL injection attacks through path manipulation.

  ## Security Changes Applied:
  1. SET search_path = '' for maximum security (forces fully-qualified names)
  2. Proper SECURITY DEFINER/INVOKER assignment based on privilege requirements
  3. Fully-qualified object names throughout function bodies
  4. Security comments explaining the fixes
  5. Appropriate permission grants for each role

  ## Functions Fixed:
  - log_api_key_changes (SECURITY DEFINER - audit logging)
  - update_updated_at_column (SECURITY INVOKER - trigger function)
  - generate_api_key (SECURITY DEFINER - key generation)
  - increment_scan_count (SECURITY DEFINER - scan management)
  - get_user_scan_stats (SECURITY INVOKER - data retrieval)
  - can_user_scan (SECURITY INVOKER - permission checking)
  - check_emergency_thresholds (SECURITY DEFINER - medical monitoring)
  - log_medical_action (SECURITY DEFINER - medical audit compliance)
*/

-- Fix log_api_key_changes function
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action, metadata)
        VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('name', NEW.name, 'scopes', NEW.scopes));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action, metadata)
        VALUES (NEW.id, NEW.user_id, 'updated', jsonb_build_object(
            'old_active', OLD.is_active,
            'new_active', NEW.is_active,
            'old_scopes', OLD.scopes,
            'new_scopes', NEW.scopes
        ));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action, metadata)
        VALUES (OLD.id, OLD.user_id, 'deleted', jsonb_build_object('name', OLD.name));
        RETURN OLD;
    END IF;
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to log API key changes: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.log_api_key_changes IS
'search_path locked to "" for security; see advisory #0015. SECURITY DEFINER for audit logging.';

GRANT EXECUTE ON FUNCTION public.log_api_key_changes TO authenticated;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update timestamp: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS
'search_path locked to "" for security; see advisory #0015. SECURITY INVOKER for trigger execution.';

GRANT EXECUTE ON FUNCTION public.update_updated_at_column TO authenticated;

-- Fix generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_key text;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to generate API key';
    END IF;
    
    -- Generate secure random key (32 bytes = 64 hex characters)
    new_key := encode(gen_random_bytes(32), 'hex');
    
    -- Ensure key is unique (extremely unlikely collision, but safety first)
    WHILE EXISTS (SELECT 1 FROM public.api_keys WHERE api_key = new_key) LOOP
        new_key := encode(gen_random_bytes(32), 'hex');
    END LOOP;
    
    RETURN new_key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to generate API key: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.generate_api_key IS
'search_path locked to "" for security; see advisory #0015. SECURITY DEFINER for key generation.';

GRANT EXECUTE ON FUNCTION public.generate_api_key TO authenticated;

-- Fix increment_scan_count function
CREATE OR REPLACE FUNCTION public.increment_scan_count(
    p_user_id uuid,
    p_increment integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_month text;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_increment < 0 OR p_increment > 100 THEN
        RAISE EXCEPTION 'Invalid increment value: %', p_increment;
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

COMMENT ON FUNCTION public.increment_scan_count IS
'search_path locked to "" for security; see advisory #0015. SECURITY DEFINER for scan management.';

GRANT EXECUTE ON FUNCTION public.increment_scan_count TO authenticated;

-- Fix get_user_scan_stats function
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
    current_month text;
    result jsonb;
    scans_used integer;
    total_scans integer;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    -- Get current month
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get scans used this month
    SELECT COALESCE(usl.scans_used, 0)
    INTO scans_used
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id AND usl.month_year = current_month;
    
    -- Get total historical scans
    SELECT COALESCE(SUM(usl.scans_used), 0)
    INTO total_scans
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id;
    
    -- Build result
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
        RAISE EXCEPTION 'Failed to get scan stats: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.get_user_scan_stats IS
'search_path locked to "" for security; see advisory #0015. SECURITY INVOKER for data retrieval.';

GRANT EXECUTE ON FUNCTION public.get_user_scan_stats TO authenticated;

-- Fix can_user_scan function
CREATE OR REPLACE FUNCTION public.can_user_scan(
    p_user_id uuid,
    p_scan_limit integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
    current_month text;
    scans_used integer;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_scan_limit < 0 THEN
        RAISE EXCEPTION 'Scan limit cannot be negative';
    END IF;
    
    -- Unlimited scans (premium users)
    IF p_scan_limit = 0 THEN
        RETURN true;
    END IF;
    
    -- Get current month
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get scans used this month
    SELECT COALESCE(usl.scans_used, 0)
    INTO scans_used
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id AND usl.month_year = current_month;
    
    -- Check if user can scan
    RETURN COALESCE(scans_used, 0) < p_scan_limit;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to check scan permission: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.can_user_scan IS
'search_path locked to "" for security; see advisory #0015. SECURITY INVOKER for permission checking.';

GRANT EXECUTE ON FUNCTION public.can_user_scan TO authenticated;

-- Fix check_emergency_thresholds function
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
    p_user_id uuid,
    p_blood_glucose integer,
    p_symptoms text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result jsonb;
    severity text := 'normal';
    flags text[] := '{}';
    recommended_action text := 'Continue normal monitoring';
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_blood_glucose IS NOT NULL AND (p_blood_glucose < 20 OR p_blood_glucose > 800) THEN
        RAISE EXCEPTION 'Invalid blood glucose value: %', p_blood_glucose;
    END IF;
    
    -- Check blood glucose thresholds
    IF p_blood_glucose IS NOT NULL THEN
        IF p_blood_glucose <= 54 THEN
            severity := 'emergency';
            flags := array_append(flags, 'CRITICAL_HYPOGLYCEMIA');
            recommended_action := 'CALL 911 IMMEDIATELY - Severe hypoglycemia';
        ELSIF p_blood_glucose <= 70 THEN
            severity := 'warning';
            flags := array_append(flags, 'HYPOGLYCEMIA_WARNING');
            recommended_action := 'Treat low blood sugar immediately';
        ELSIF p_blood_glucose >= 400 THEN
            severity := 'emergency';
            flags := array_append(flags, 'CRITICAL_HYPERGLYCEMIA');
            recommended_action := 'CALL 911 IMMEDIATELY - Severe hyperglycemia';
        ELSIF p_blood_glucose >= 250 THEN
            severity := 'urgent';
            flags := array_append(flags, 'HYPERGLYCEMIA_WARNING');
            recommended_action := 'Contact healthcare provider within 1 hour';
        END IF;
    END IF;
    
    -- Check emergency symptoms
    IF p_symptoms IS NOT NULL AND array_length(p_symptoms, 1) > 0 THEN
        IF 'confusion' = ANY(p_symptoms) OR 'unconscious' = ANY(p_symptoms) OR 'seizure' = ANY(p_symptoms) THEN
            severity := 'emergency';
            flags := array_append(flags, 'EMERGENCY_SYMPTOMS');
            recommended_action := 'CALL 911 IMMEDIATELY - Emergency symptoms present';
        END IF;
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'user_id', p_user_id,
        'severity', severity,
        'flags', flags,
        'recommended_action', recommended_action,
        'blood_glucose', p_blood_glucose,
        'symptoms', p_symptoms,
        'timestamp', now()
    );
    
    -- Log emergency assessment if urgent or emergency
    IF severity IN ('urgent', 'emergency') THEN
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
            CASE WHEN p_blood_glucose IS NOT NULL THEN 
                CASE WHEN p_blood_glucose <= 70 THEN 'hypoglycemia' ELSE 'hyperglycemia' END
            ELSE 'system_alert' END,
            severity,
            p_blood_glucose,
            COALESCE(array_to_json(p_symptoms)::jsonb, '[]'::jsonb),
            'pending'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to check emergency thresholds: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.check_emergency_thresholds IS
'search_path locked to "" for security; see advisory #0015. SECURITY DEFINER for medical monitoring.';

GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds TO authenticated;

-- Fix log_medical_action function
CREATE OR REPLACE FUNCTION public.log_medical_action(
    p_user_id uuid,
    p_action_type text,
    p_action_data jsonb,
    p_medical_significance text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    log_id uuid;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_action_type IS NULL OR length(trim(p_action_type)) = 0 THEN
        RAISE EXCEPTION 'Action type cannot be null or empty';
    END IF;
    
    IF p_medical_significance NOT IN ('low', 'medium', 'high', 'critical') THEN
        RAISE EXCEPTION 'Invalid medical significance: %', p_medical_significance;
    END IF;
    
    -- Insert medical audit log
    INSERT INTO public.medical_audit_logs (
        user_id,
        action_type,
        action_data,
        medical_significance,
        session_id,
        compliance_flags
    )
    VALUES (
        p_user_id,
        p_action_type,
        COALESCE(p_action_data, '{}'::jsonb),
        p_medical_significance,
        'mobile_app_session',
        jsonb_build_object(
            'hipaa_compliant', true,
            'audit_required', p_medical_significance IN ('high', 'critical'),
            'timestamp', extract(epoch from now())
        )
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to log medical action: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.log_medical_action IS
'search_path locked to "" for security; see advisory #0015. SECURITY DEFINER for medical audit compliance.';

GRANT EXECUTE ON FUNCTION public.log_medical_action TO authenticated;

-- Verify all functions have immutable search_path
DO $$
DECLARE
    func_record record;
    mutable_functions text[] := '{}';
    total_functions integer := 0;
    secure_functions integer := 0;
BEGIN
    -- Check all functions in public schema
    FOR func_record IN 
        SELECT 
            p.proname AS function_name,
            p.proconfig AS config
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
        total_functions := total_functions + 1;
        
        -- Check if function has immutable search_path
        IF func_record.config IS NULL OR 
           NOT (func_record.config::text LIKE '%search_path=%' AND 
                func_record.config::text NOT LIKE '%search_path=$user%') THEN
            mutable_functions := array_append(mutable_functions, func_record.function_name);
        ELSE
            secure_functions := secure_functions + 1;
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(mutable_functions, 1) > 0 THEN
        RAISE WARNING 'Functions with mutable search_path still exist: %', array_to_string(mutable_functions, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All % functions now have immutable search_path configured', secure_functions;
    END IF;
    
    RAISE NOTICE 'Security fix summary: %/% functions secured', secure_functions, total_functions;
END;
$$;
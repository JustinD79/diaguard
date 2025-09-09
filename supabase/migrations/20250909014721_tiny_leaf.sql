/*
  # Fix Function Search Path Security Issues

  This migration addresses all function search path security vulnerabilities identified 
  by the Supabase database linter. Each function is recreated with an immutable 
  search_path to prevent SQL injection attacks through path manipulation.

  ## Security Changes
  1. All functions now use `SET search_path = public` (immutable)
  2. Proper SECURITY DEFINER/INVOKER settings based on privilege requirements
  3. Fully qualified table names to prevent ambiguous references
  4. Added security comments for future maintainers

  ## Functions Fixed
  - generate_api_key: SECURITY DEFINER for elevated privileges
  - log_api_key_changes: SECURITY DEFINER for audit logging
  - update_updated_at_column: SECURITY INVOKER for trigger functions
  - increment_scan_count: SECURITY DEFINER for scan management
  - get_user_scan_stats: SECURITY INVOKER for data retrieval
  - can_user_scan: SECURITY INVOKER for permission checking
  - check_emergency_thresholds: SECURITY DEFINER for medical monitoring
  - log_medical_action: SECURITY DEFINER for medical audit compliance
*/

-- 1. Fix generate_api_key function
DROP FUNCTION IF EXISTS public.generate_api_key();

CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
DECLARE
    new_key text;
    key_length integer := 32;
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    i integer;
BEGIN
    new_key := '';
    
    -- Generate random API key
    FOR i IN 1..key_length LOOP
        new_key := new_key || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Prefix with 'sk_' for identification
    new_key := 'sk_' || new_key;
    
    RETURN new_key;
END;
$$;

COMMENT ON FUNCTION public.generate_api_key IS 
'Generates secure API keys. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 2. Fix log_api_key_changes function
DROP FUNCTION IF EXISTS public.log_api_key_changes();

CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
BEGIN
    -- Log API key changes for audit compliance
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

COMMENT ON FUNCTION public.log_api_key_changes IS 
'Audit logging for API key changes. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 3. Fix update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 
'Updates updated_at timestamp on row changes. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 4. Fix increment_scan_count function
DROP FUNCTION IF EXISTS public.increment_scan_count(uuid);

CREATE OR REPLACE FUNCTION public.increment_scan_count(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
DECLARE
    current_month text;
    current_scans integer;
    scan_limit integer := 30; -- Default free tier limit
BEGIN
    -- Get current month in YYYY-MM format
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get or create scan limit record
    INSERT INTO public.user_scan_limits (user_id, month_year, scans_used)
    VALUES (user_uuid, current_month, 0)
    ON CONFLICT (user_id, month_year) 
    DO NOTHING;
    
    -- Get current scan count
    SELECT scans_used INTO current_scans
    FROM public.user_scan_limits
    WHERE user_id = user_uuid AND month_year = current_month;
    
    -- Check if user can scan
    IF current_scans >= scan_limit THEN
        RETURN false;
    END IF;
    
    -- Increment scan count
    UPDATE public.user_scan_limits
    SET scans_used = scans_used + 1, updated_at = now()
    WHERE user_id = user_uuid AND month_year = current_month;
    
    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.increment_scan_count IS 
'Increments user scan count for monthly limits. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 5. Fix get_user_scan_stats function
DROP FUNCTION IF EXISTS public.get_user_scan_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_user_scan_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
DECLARE
    current_month text;
    stats_result jsonb;
BEGIN
    current_month := to_char(now(), 'YYYY-MM');
    
    SELECT jsonb_build_object(
        'scans_used', COALESCE(scans_used, 0),
        'month_year', current_month,
        'last_updated', updated_at
    ) INTO stats_result
    FROM public.user_scan_limits
    WHERE user_id = user_uuid AND month_year = current_month;
    
    -- Return default if no record exists
    IF stats_result IS NULL THEN
        stats_result := jsonb_build_object(
            'scans_used', 0,
            'month_year', current_month,
            'last_updated', null
        );
    END IF;
    
    RETURN stats_result;
END;
$$;

COMMENT ON FUNCTION public.get_user_scan_stats IS 
'Retrieves user scan statistics for current month. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 6. Fix can_user_scan function
DROP FUNCTION IF EXISTS public.can_user_scan(uuid);

CREATE OR REPLACE FUNCTION public.can_user_scan(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
DECLARE
    current_month text;
    current_scans integer;
    scan_limit integer := 30; -- Default free tier limit
BEGIN
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get current scan count
    SELECT COALESCE(scans_used, 0) INTO current_scans
    FROM public.user_scan_limits
    WHERE user_id = user_uuid AND month_year = current_month;
    
    -- If no record exists, user can scan
    IF current_scans IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check if under limit
    RETURN current_scans < scan_limit;
END;
$$;

COMMENT ON FUNCTION public.can_user_scan IS 
'Checks if user can perform AI scan based on monthly limits. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 7. Fix check_emergency_thresholds function
DROP FUNCTION IF EXISTS public.check_emergency_thresholds(integer, text[]);

CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
    blood_glucose integer,
    symptoms text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
DECLARE
    emergency_level text := 'none';
    recommendations text[] := '{}';
    emergency_contacts jsonb := '[]';
BEGIN
    -- Validate input
    IF blood_glucose IS NULL OR blood_glucose < 0 OR blood_glucose > 1000 THEN
        RAISE EXCEPTION 'Invalid blood glucose value: %', blood_glucose;
    END IF;
    
    -- Check critical thresholds
    IF blood_glucose <= 54 THEN
        emergency_level := 'critical_low';
        recommendations := ARRAY['Call 911 immediately', 'Administer glucagon if available', 'Do not leave person alone'];
    ELSIF blood_glucose <= 70 THEN
        emergency_level := 'low';
        recommendations := ARRAY['Consume 15g fast-acting carbs', 'Recheck in 15 minutes', 'Contact healthcare provider'];
    ELSIF blood_glucose >= 400 THEN
        emergency_level := 'critical_high';
        recommendations := ARRAY['Seek immediate medical attention', 'Check for ketones', 'Stay hydrated'];
    ELSIF blood_glucose >= 250 THEN
        emergency_level := 'high';
        recommendations := ARRAY['Monitor closely', 'Check ketones if possible', 'Contact healthcare provider'];
    END IF;
    
    -- Check for emergency symptoms
    IF symptoms && ARRAY['confusion', 'unconscious', 'seizure', 'severe_nausea', 'chest_pain'] THEN
        emergency_level := 'critical_symptoms';
        recommendations := ARRAY['Call 911 immediately', 'Do not delay medical care'];
    END IF;
    
    RETURN jsonb_build_object(
        'emergency_level', emergency_level,
        'blood_glucose', blood_glucose,
        'recommendations', recommendations,
        'timestamp', now()
    );
END;
$$;

COMMENT ON FUNCTION public.check_emergency_thresholds IS 
'Checks blood glucose and symptoms for emergency conditions. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- 8. Fix log_medical_action function
DROP FUNCTION IF EXISTS public.log_medical_action(text, jsonb, text);

CREATE OR REPLACE FUNCTION public.log_medical_action(
    action_type text,
    action_data jsonb,
    medical_significance text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- Fixed search_path to prevent security vulnerability
AS $$
DECLARE
    log_id uuid;
    current_user_id uuid;
BEGIN
    -- Validate medical significance
    IF medical_significance NOT IN ('low', 'medium', 'high', 'critical') THEN
        RAISE EXCEPTION 'Invalid medical significance: %. Must be low, medium, high, or critical', medical_significance;
    END IF;
    
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to log medical actions';
    END IF;
    
    -- Insert medical audit log
    INSERT INTO public.medical_audit_logs (
        user_id,
        action_type,
        action_data,
        medical_significance,
        session_id,
        ip_address,
        user_agent
    )
    VALUES (
        current_user_id,
        action_type,
        action_data,
        medical_significance,
        current_setting('request.jwt.claims', true)::jsonb->>'session_id',
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        current_setting('request.headers', true)::jsonb->>'user-agent'
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

COMMENT ON FUNCTION public.log_medical_action IS 
'Logs medical actions for audit compliance. Fixed search_path = public to prevent mutable path security risk (Supabase linter #0011).';

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.generate_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scan_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_scan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds(integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_medical_action(text, jsonb, text) TO authenticated;

-- Verification block - check that all functions have immutable search_path
DO $$
DECLARE
    func_record record;
    mutable_functions text[] := '{}';
BEGIN
    -- Check all functions for mutable search_path
    FOR func_record IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            p.proconfig AS config
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN (
            'generate_api_key',
            'log_api_key_changes', 
            'update_updated_at_column',
            'increment_scan_count',
            'get_user_scan_stats',
            'can_user_scan',
            'check_emergency_thresholds',
            'log_medical_action'
        )
    LOOP
        -- Check if function has fixed search_path
        IF func_record.config IS NULL OR 
           NOT (func_record.config::text LIKE '%search_path%') THEN
            mutable_functions := array_append(mutable_functions, func_record.function_name);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(mutable_functions, 1) > 0 THEN
        RAISE WARNING 'Functions still have mutable search_path: %', array_to_string(mutable_functions, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All functions now have immutable search_path configured';
    END IF;
END;
$$;
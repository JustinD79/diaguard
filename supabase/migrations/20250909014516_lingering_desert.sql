/*
  # Fix Function Search Path Security Vulnerabilities

  This migration addresses all function search path security issues identified by Supabase linter.
  
  ## Security Fixes Applied
  1. **Immutable Search Path**: All functions use `SET search_path = public, pg_temp`
  2. **SECURITY DEFINER**: Applied where elevated privileges are needed
  3. **Fully Qualified Names**: All object references use schema.table format
  4. **Minimal Privileges**: Appropriate GRANT statements for each function
  
  ## Functions Fixed
  - log_api_key_changes (audit logging)
  - update_updated_at_column (timestamp trigger)
  - generate_api_key (secure key generation)
  - increment_scan_count (scan limit management)
  - get_user_scan_stats (statistics retrieval)
  - can_user_scan (permission checking)
  - check_emergency_thresholds (medical monitoring)
  - log_medical_action (medical audit logging)
*/

-- NOTE: search_path is locked to prevent mutable-search_path vulnerabilities

-- 1. Fix log_api_key_changes function
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Log API key changes for audit compliance
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
END;
$$;

-- 2. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. Fix generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    api_key text;
    key_exists boolean;
BEGIN
    -- Generate a secure random API key
    LOOP
        -- Generate 32-byte random key and encode as hex
        api_key := encode(gen_random_bytes(32), 'hex');
        
        -- Check if key already exists
        SELECT EXISTS(
            SELECT 1 FROM public.api_keys WHERE api_key = generate_api_key.api_key
        ) INTO key_exists;
        
        -- Exit loop if key is unique
        EXIT WHEN NOT key_exists;
    END LOOP;
    
    RETURN api_key;
END;
$$;

-- 4. Fix increment_scan_count function
CREATE OR REPLACE FUNCTION public.increment_scan_count(
    p_user_id uuid,
    p_scan_type text DEFAULT 'ai_food'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_month text;
    current_scans integer;
    scan_limit integer;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_scan_type NOT IN ('ai_food', 'barcode', 'manual') THEN
        RAISE EXCEPTION 'Invalid scan type: %', p_scan_type;
    END IF;
    
    -- Get current month in YYYY-MM format
    current_month := to_char(NOW(), 'YYYY-MM');
    
    -- Get or create scan limit record
    INSERT INTO public.user_scan_limits (user_id, month_year, scans_used)
    VALUES (p_user_id, current_month, 0)
    ON CONFLICT (user_id, month_year) DO NOTHING;
    
    -- Get current scan count
    SELECT scans_used INTO current_scans
    FROM public.user_scan_limits
    WHERE user_id = p_user_id AND month_year = current_month;
    
    -- Check if user has premium subscription (unlimited scans)
    SELECT CASE 
        WHEN EXISTS(
            SELECT 1 FROM public.stripe_user_subscriptions 
            WHERE customer_id IN (
                SELECT customer_id FROM public.stripe_customers 
                WHERE user_id = p_user_id AND deleted_at IS NULL
            ) AND subscription_status = 'active'
        ) THEN 999999
        ELSE 30
    END INTO scan_limit;
    
    -- Check if user can scan
    IF current_scans >= scan_limit THEN
        RETURN false;
    END IF;
    
    -- Increment scan count
    UPDATE public.user_scan_limits
    SET scans_used = scans_used + 1, updated_at = NOW()
    WHERE user_id = p_user_id AND month_year = current_month;
    
    -- Log the scan usage
    INSERT INTO public.scan_usage_log (user_id, scan_type, success, metadata)
    VALUES (p_user_id, p_scan_type, true, jsonb_build_object('month', current_month));
    
    RETURN true;
END;
$$;

-- 5. Fix get_user_scan_stats function
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_month text;
    stats_result jsonb;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    current_month := to_char(NOW(), 'YYYY-MM');
    
    -- Get comprehensive scan statistics
    SELECT jsonb_build_object(
        'current_month', current_month,
        'scans_used', COALESCE(usl.scans_used, 0),
        'scans_remaining', CASE 
            WHEN EXISTS(
                SELECT 1 FROM public.stripe_user_subscriptions 
                WHERE customer_id IN (
                    SELECT customer_id FROM public.stripe_customers 
                    WHERE user_id = p_user_id AND deleted_at IS NULL
                ) AND subscription_status = 'active'
            ) THEN 999999
            ELSE GREATEST(0, 30 - COALESCE(usl.scans_used, 0))
        END,
        'has_premium', EXISTS(
            SELECT 1 FROM public.stripe_user_subscriptions 
            WHERE customer_id IN (
                SELECT customer_id FROM public.stripe_customers 
                WHERE user_id = p_user_id AND deleted_at IS NULL
            ) AND subscription_status = 'active'
        ),
        'last_scan', (
            SELECT created_at FROM public.scan_usage_log 
            WHERE user_id = p_user_id 
            ORDER BY created_at DESC 
            LIMIT 1
        )
    ) INTO stats_result
    FROM public.user_scan_limits usl
    WHERE usl.user_id = p_user_id AND usl.month_year = current_month;
    
    -- Return default stats if no record exists
    IF stats_result IS NULL THEN
        stats_result := jsonb_build_object(
            'current_month', current_month,
            'scans_used', 0,
            'scans_remaining', 30,
            'has_premium', false,
            'last_scan', null
        );
    END IF;
    
    RETURN stats_result;
END;
$$;

-- 6. Fix can_user_scan function
CREATE OR REPLACE FUNCTION public.can_user_scan(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_month text;
    current_scans integer;
    has_premium boolean;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    current_month := to_char(NOW(), 'YYYY-MM');
    
    -- Check if user has premium subscription
    SELECT EXISTS(
        SELECT 1 FROM public.stripe_user_subscriptions 
        WHERE customer_id IN (
            SELECT customer_id FROM public.stripe_customers 
            WHERE user_id = p_user_id AND deleted_at IS NULL
        ) AND subscription_status = 'active'
    ) INTO has_premium;
    
    -- Premium users have unlimited scans
    IF has_premium THEN
        RETURN true;
    END IF;
    
    -- Get current scan count for free users
    SELECT COALESCE(scans_used, 0) INTO current_scans
    FROM public.user_scan_limits
    WHERE user_id = p_user_id AND month_year = current_month;
    
    -- Free users get 30 scans per month
    RETURN COALESCE(current_scans, 0) < 30;
END;
$$;

-- 7. Fix check_emergency_thresholds function
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
    p_user_id uuid,
    p_blood_glucose integer,
    p_symptoms text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    emergency_flags text[] := '{}';
    severity text := 'none';
    recommended_action text := 'Continue normal monitoring';
    result jsonb;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    -- Check blood glucose thresholds
    IF p_blood_glucose IS NOT NULL THEN
        IF p_blood_glucose <= 54 THEN
            emergency_flags := array_append(emergency_flags, 'CRITICAL_HYPOGLYCEMIA');
            severity := 'emergency';
            recommended_action := 'CALL 911 IMMEDIATELY - Severe hypoglycemia';
        ELSIF p_blood_glucose <= 70 THEN
            emergency_flags := array_append(emergency_flags, 'HYPOGLYCEMIA_WARNING');
            severity := CASE WHEN severity = 'none' THEN 'warning' ELSE severity END;
            recommended_action := 'Treat low blood sugar immediately with 15g fast-acting carbs';
        ELSIF p_blood_glucose >= 400 THEN
            emergency_flags := array_append(emergency_flags, 'CRITICAL_HYPERGLYCEMIA');
            severity := 'emergency';
            recommended_action := 'CALL 911 IMMEDIATELY - Severe hyperglycemia';
        ELSIF p_blood_glucose >= 250 THEN
            emergency_flags := array_append(emergency_flags, 'HYPERGLYCEMIA_WARNING');
            severity := CASE WHEN severity IN ('none', 'warning') THEN 'urgent' ELSE severity END;
            recommended_action := 'Contact healthcare provider within 1 hour';
        END IF;
    END IF;
    
    -- Check symptoms for emergency indicators
    IF p_symptoms IS NOT NULL THEN
        IF 'confusion' = ANY(p_symptoms) OR 'unconscious' = ANY(p_symptoms) OR 
           'seizure' = ANY(p_symptoms) OR 'chest_pain' = ANY(p_symptoms) THEN
            emergency_flags := array_append(emergency_flags, 'EMERGENCY_SYMPTOMS');
            severity := 'emergency';
            recommended_action := 'CALL 911 IMMEDIATELY - Emergency symptoms present';
        END IF;
    END IF;
    
    -- Log emergency assessment
    INSERT INTO public.medical_audit_logs (
        user_id, action_type, action_data, medical_significance
    ) VALUES (
        p_user_id,
        'emergency_threshold_check',
        jsonb_build_object(
            'blood_glucose', p_blood_glucose,
            'symptoms', p_symptoms,
            'flags', emergency_flags,
            'severity', severity
        ),
        CASE 
            WHEN severity = 'emergency' THEN 'critical'
            WHEN severity = 'urgent' THEN 'high'
            WHEN severity = 'warning' THEN 'medium'
            ELSE 'low'
        END
    );
    
    -- Build result
    result := jsonb_build_object(
        'severity', severity,
        'flags', emergency_flags,
        'recommended_action', recommended_action,
        'emergency_contacts', CASE 
            WHEN severity = 'emergency' THEN jsonb_build_array('911', 'healthcare_provider')
            ELSE jsonb_build_array()
        END,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$;

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
SET search_path = public, pg_temp
AS $$
DECLARE
    log_id uuid;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_action_type IS NULL OR p_action_type = '' THEN
        RAISE EXCEPTION 'Action type cannot be null or empty';
    END IF;
    
    IF p_medical_significance NOT IN ('low', 'medium', 'high', 'critical') THEN
        RAISE EXCEPTION 'Invalid medical significance: %. Must be low, medium, high, or critical', p_medical_significance;
    END IF;
    
    -- Insert medical audit log
    INSERT INTO public.medical_audit_logs (
        user_id,
        action_type,
        action_data,
        medical_significance,
        session_id,
        compliance_flags
    ) VALUES (
        p_user_id,
        p_action_type,
        COALESCE(p_action_data, '{}'::jsonb),
        p_medical_significance,
        current_setting('application_name'),
        jsonb_build_object(
            'hipaa_compliant', true,
            'fda_traceable', true,
            'audit_required', p_medical_significance IN ('high', 'critical')
        )
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.log_api_key_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scan_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_scan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds(uuid, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_medical_action(uuid, text, jsonb, text) TO authenticated, service_role;

-- Verification block to ensure all functions have fixed search_path
DO $$
DECLARE
    func_record record;
    mutable_functions text[] := '{}';
BEGIN
    -- Check all functions for mutable search_path
    FOR func_record IN
        SELECT n.nspname AS schema_name,
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
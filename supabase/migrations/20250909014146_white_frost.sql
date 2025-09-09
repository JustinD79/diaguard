/*
  # Fix Function Search Path Security Issues

  This migration addresses the Supabase security linter warnings about mutable search_path
  in database functions by properly setting stable search_path values.

  ## Security Issues Fixed
  1. All functions now have explicit `SET search_path = pg_temp, public`
  2. Functions use minimal required privileges (SECURITY INVOKER by default)
  3. Only essential schemas are included in search_path
  4. Temporary objects are allowed via pg_temp prefix

  ## Functions Updated
  - can_user_scan: User scan limit checking
  - update_updated_at_column: Timestamp update trigger
  - log_api_key_changes: API key audit logging
  - generate_api_key: Secure API key generation
  - increment_scan_count: Scan count management
  - get_user_scan_stats: User statistics retrieval
  - check_emergency_thresholds: Medical threshold monitoring
  - log_medical_action: Medical action audit logging

  ## Security Improvements
  - Prevents SQL injection via search_path manipulation
  - Uses minimal privilege principle
  - Maintains audit trail for medical compliance
*/

-- Drop existing functions safely and recreate with proper search_path

-- 1. User scan limit checking function
DROP FUNCTION IF EXISTS public.can_user_scan(uuid);
CREATE OR REPLACE FUNCTION public.can_user_scan(user_id uuid)
SET search_path = pg_temp, public
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    current_month text;
    scans_used integer;
    scan_limit integer := 30; -- Default free tier limit
BEGIN
    -- Get current month in YYYY-MM format
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get scans used this month
    SELECT COALESCE(scans_used, 0) INTO scans_used
    FROM user_scan_limits
    WHERE user_id = can_user_scan.user_id 
    AND month_year = current_month;
    
    -- Check if user has premium subscription (unlimited scans)
    IF EXISTS (
        SELECT 1 FROM stripe_user_subscriptions 
        WHERE customer_id IN (
            SELECT customer_id FROM stripe_customers 
            WHERE user_id = can_user_scan.user_id
        )
        AND subscription_status = 'active'
    ) THEN
        RETURN true;
    END IF;
    
    -- Check against free tier limit
    RETURN COALESCE(scans_used, 0) < scan_limit;
END;
$$;

-- 2. Updated timestamp trigger function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
SET search_path = pg_temp, public
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 3. API key audit logging function
DROP FUNCTION IF EXISTS public.log_api_key_changes();
CREATE OR REPLACE FUNCTION public.log_api_key_changes()
SET search_path = pg_temp, public
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    action_type text;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'updated';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'deleted';
    END IF;
    
    -- Log the change
    INSERT INTO api_key_audit_log (
        api_key_id,
        user_id,
        action,
        metadata
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.user_id, OLD.user_id),
        action_type,
        jsonb_build_object(
            'timestamp', now(),
            'operation', TG_OP,
            'table', TG_TABLE_NAME
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Secure API key generation function
DROP FUNCTION IF EXISTS public.generate_api_key();
CREATE OR REPLACE FUNCTION public.generate_api_key()
SET search_path = pg_temp, public
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    api_key text;
    key_exists boolean;
BEGIN
    LOOP
        -- Generate a secure random API key (32 bytes = 64 hex characters)
        api_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
        
        -- Check if key already exists
        SELECT EXISTS(
            SELECT 1 FROM api_keys WHERE api_key = generate_api_key.api_key
        ) INTO key_exists;
        
        -- Exit loop if key is unique
        EXIT WHEN NOT key_exists;
    END LOOP;
    
    RETURN api_key;
END;
$$;

-- 5. Scan count increment function
DROP FUNCTION IF EXISTS public.increment_scan_count(uuid);
CREATE OR REPLACE FUNCTION public.increment_scan_count(user_id uuid)
SET search_path = pg_temp, public
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    current_month text;
    can_scan boolean;
BEGIN
    -- Check if user can scan first
    SELECT public.can_user_scan(increment_scan_count.user_id) INTO can_scan;
    
    IF NOT can_scan THEN
        RETURN false;
    END IF;
    
    -- Get current month
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Increment or create scan count record
    INSERT INTO user_scan_limits (user_id, month_year, scans_used)
    VALUES (increment_scan_count.user_id, current_month, 1)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        scans_used = user_scan_limits.scans_used + 1,
        updated_at = now();
    
    RETURN true;
END;
$$;

-- 6. User scan statistics function
DROP FUNCTION IF EXISTS public.get_user_scan_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_user_scan_stats(user_id uuid)
SET search_path = pg_temp, public
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    current_month text;
    stats jsonb;
    scans_used integer;
    scan_limit integer := 30;
BEGIN
    current_month := to_char(now(), 'YYYY-MM');
    
    -- Get scans used this month
    SELECT COALESCE(scans_used, 0) INTO scans_used
    FROM user_scan_limits
    WHERE user_id = get_user_scan_stats.user_id 
    AND month_year = current_month;
    
    -- Check if user has premium (unlimited scans)
    IF EXISTS (
        SELECT 1 FROM stripe_user_subscriptions 
        WHERE customer_id IN (
            SELECT customer_id FROM stripe_customers 
            WHERE user_id = get_user_scan_stats.user_id
        )
        AND subscription_status = 'active'
    ) THEN
        scan_limit := -1; -- Unlimited
    END IF;
    
    -- Build stats object
    stats := jsonb_build_object(
        'scans_used', COALESCE(scans_used, 0),
        'scan_limit', scan_limit,
        'scans_remaining', CASE 
            WHEN scan_limit = -1 THEN -1 
            ELSE GREATEST(0, scan_limit - COALESCE(scans_used, 0))
        END,
        'month', current_month,
        'has_unlimited', scan_limit = -1
    );
    
    RETURN stats;
END;
$$;

-- 7. Emergency threshold checking function
DROP FUNCTION IF EXISTS public.check_emergency_thresholds(uuid, integer, text[]);
CREATE OR REPLACE FUNCTION public.check_emergency_thresholds(
    user_id uuid,
    blood_glucose integer DEFAULT NULL,
    symptoms text[] DEFAULT NULL
)
SET search_path = pg_temp, public
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    emergency_level text := 'none';
    flags text[] := '{}';
    recommendations text[] := '{}';
    should_contact_emergency boolean := false;
BEGIN
    -- Check blood glucose thresholds
    IF blood_glucose IS NOT NULL THEN
        IF blood_glucose <= 54 THEN
            emergency_level := 'critical';
            flags := array_append(flags, 'SEVERE_HYPOGLYCEMIA');
            recommendations := array_append(recommendations, 'CALL_911_IMMEDIATELY');
            should_contact_emergency := true;
        ELSIF blood_glucose <= 70 THEN
            emergency_level := 'high';
            flags := array_append(flags, 'HYPOGLYCEMIA');
            recommendations := array_append(recommendations, 'TREAT_WITH_GLUCOSE');
        ELSIF blood_glucose >= 400 THEN
            emergency_level := 'critical';
            flags := array_append(flags, 'SEVERE_HYPERGLYCEMIA');
            recommendations := array_append(recommendations, 'SEEK_IMMEDIATE_CARE');
            should_contact_emergency := true;
        ELSIF blood_glucose >= 250 THEN
            emergency_level := 'high';
            flags := array_append(flags, 'HYPERGLYCEMIA');
            recommendations := array_append(recommendations, 'CONTACT_HEALTHCARE_PROVIDER');
        END IF;
    END IF;
    
    -- Check symptoms
    IF symptoms IS NOT NULL AND array_length(symptoms, 1) > 0 THEN
        IF 'unconscious' = ANY(symptoms) OR 'seizure' = ANY(symptoms) THEN
            emergency_level := 'critical';
            flags := array_append(flags, 'EMERGENCY_SYMPTOMS');
            should_contact_emergency := true;
        END IF;
    END IF;
    
    -- Return assessment
    RETURN jsonb_build_object(
        'emergency_level', emergency_level,
        'flags', flags,
        'recommendations', recommendations,
        'contact_emergency', should_contact_emergency,
        'timestamp', now()
    );
END;
$$;

-- 8. Medical action logging function
DROP FUNCTION IF EXISTS public.log_medical_action(uuid, text, jsonb);
CREATE OR REPLACE FUNCTION public.log_medical_action(
    user_id uuid,
    action_type text,
    action_data jsonb
)
SET search_path = pg_temp, public
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    log_id uuid;
    medical_significance text := 'medium';
BEGIN
    -- Determine medical significance
    IF action_type IN ('insulin_calculation', 'emergency_event', 'critical_threshold') THEN
        medical_significance := 'critical';
    ELSIF action_type IN ('food_analysis', 'medication_reminder') THEN
        medical_significance := 'high';
    END IF;
    
    -- Insert audit log
    INSERT INTO medical_audit_logs (
        user_id,
        action_type,
        action_data,
        medical_significance,
        session_id,
        compliance_flags
    ) VALUES (
        log_medical_action.user_id,
        log_medical_action.action_type,
        log_medical_action.action_data,
        medical_significance,
        'mobile_session_' || extract(epoch from now()),
        jsonb_build_object(
            'hipaa_compliant', true,
            'audit_required', true,
            'timestamp', now()
        )
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_scan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scan_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_emergency_thresholds(uuid, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_medical_action(uuid, text, jsonb) TO authenticated;

-- Verify all functions now have proper search_path
DO $$
DECLARE
    func_record record;
    mutable_count integer := 0;
BEGIN
    -- Check for any remaining mutable search_path functions
    FOR func_record IN 
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        AND routine_definition NOT ILIKE '%SET search_path%'
        AND routine_name IN (
            'can_user_scan', 'update_updated_at_column', 'log_api_key_changes',
            'generate_api_key', 'increment_scan_count', 'get_user_scan_stats',
            'check_emergency_thresholds', 'log_medical_action'
        )
    LOOP
        RAISE WARNING 'Function %.% still has mutable search_path', func_record.routine_schema, func_record.routine_name;
        mutable_count := mutable_count + 1;
    END LOOP;
    
    IF mutable_count = 0 THEN
        RAISE NOTICE 'All target functions now have secure search_path settings';
    ELSE
        RAISE WARNING '% functions still need search_path fixes', mutable_count;
    END IF;
END;
$$;
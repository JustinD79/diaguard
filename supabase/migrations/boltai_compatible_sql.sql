-- Drop existing table if it exists (safe operation)
DROP TABLE IF EXISTS public.api_key_audit_log;
DROP TABLE IF EXISTS public.api_keys;

-- Create the main API keys table
CREATE TABLE public.api_keys (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    api_key text NOT NULL UNIQUE,
    scopes text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT NOW(),
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    ip_whitelist text[],
    rate_limit integer DEFAULT 1000,
    CONSTRAINT validate_api_key CHECK (length(api_key) >= 32)
);

-- Create an index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Comprehensive RLS Policies
CREATE POLICY "Users can view own API keys" ON public.api_keys
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create API keys" ON public.api_keys
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    AND is_active = true
);

CREATE POLICY "Users can update own API keys" ON public.api_keys
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND is_active = true
);

CREATE POLICY "Users can delete own API keys" ON public.api_keys
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access" ON public.api_keys
FOR ALL TO service_role
USING (true);

-- Function to generate secure API keys
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_api_key text;
BEGIN
    new_api_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
    
    WHILE EXISTS (SELECT 1 FROM public.api_keys WHERE api_key = new_api_key) LOOP
        new_api_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
    END LOOP;
    
    RETURN new_api_key;
END;
$$;

-- Create audit log table for API key activities
CREATE TABLE public.api_key_audit_log (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    api_key_id bigint REFERENCES public.api_keys(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.api_key_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Users can view own audit logs" ON public.api_key_audit_log
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full audit access" ON public.api_key_audit_log
FOR ALL TO service_role
USING (true);

-- Trigger function to log key changes
CREATE OR REPLACE FUNCTION log_api_key_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action)
        VALUES (NEW.id, NEW.user_id, 'create');
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action)
        VALUES (NEW.id, NEW.user_id, 'update');
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.api_key_audit_log (api_key_id, user_id, action)
        VALUES (OLD.id, OLD.user_id, 'delete');
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger for audit logging
CREATE TRIGGER api_keys_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION log_api_key_changes();

COMMIT;
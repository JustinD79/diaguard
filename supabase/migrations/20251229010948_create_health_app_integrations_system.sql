/*
  # Health App Integrations System
  
  ## Overview
  Comprehensive health app integration system for bi-directional data sync with:
  - Apple Health/HealthKit (meal export, glucose import)
  - Google Fit (activity sync, calorie burn)
  - MyFitnessPal/Cronometer (bi-directional nutrition sync)
  - Generic health data exchange
  
  ## New Tables
  
  ### health_app_connections
  Tracks user connections to external health apps
  
  ### health_sync_history
  Logs all sync operations with external apps
  
  ### health_data_mappings
  Maps our data types to external app data types
  
  ### exported_health_data
  Tracks data exported to external apps
  
  ### imported_health_data
  Tracks data imported from external apps
  
  ### sync_configurations
  User-specific sync preferences and settings
  
  ## Security
  Row Level Security (RLS) enabled on all tables
*/

-- Health App Provider Enum
DO $$ BEGIN
  CREATE TYPE health_app_provider AS ENUM (
    'apple_health',
    'google_fit',
    'myfitnesspal',
    'cronometer',
    'samsung_health',
    'fitbit',
    'garmin',
    'strava',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Sync Status Enum
DO $$ BEGIN
  CREATE TYPE health_sync_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'partial',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Data Type Enum
DO $$ BEGIN
  CREATE TYPE health_data_type AS ENUM (
    'meal',
    'nutrition',
    'glucose',
    'exercise',
    'weight',
    'sleep',
    'heart_rate',
    'blood_pressure',
    'steps',
    'calories_burned',
    'water_intake',
    'medication',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Sync Direction Enum
DO $$ BEGIN
  CREATE TYPE sync_direction AS ENUM (
    'export_only',
    'import_only',
    'bidirectional'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Health App Connections Table
CREATE TABLE IF NOT EXISTS health_app_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider health_app_provider NOT NULL,
  provider_user_id text,
  is_active boolean DEFAULT true,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  connection_metadata jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  sync_frequency_minutes integer DEFAULT 60,
  auto_sync_enabled boolean DEFAULT true,
  error_count integer DEFAULT 0,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Sync Configurations Table
CREATE TABLE IF NOT EXISTS sync_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES health_app_connections(id) ON DELETE CASCADE NOT NULL,
  data_type health_data_type NOT NULL,
  sync_direction sync_direction DEFAULT 'bidirectional',
  is_enabled boolean DEFAULT true,
  sync_frequency_minutes integer DEFAULT 60,
  last_sync_at timestamptz,
  filters jsonb DEFAULT '{}'::jsonb,
  field_mappings jsonb DEFAULT '{}'::jsonb,
  conflict_resolution text CHECK (conflict_resolution IN ('newest_wins', 'external_wins', 'local_wins', 'manual')) DEFAULT 'newest_wins',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, data_type)
);

-- Health Sync History Table
CREATE TABLE IF NOT EXISTS health_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES health_app_connections(id) ON DELETE CASCADE NOT NULL,
  sync_config_id uuid REFERENCES sync_configurations(id) ON DELETE SET NULL,
  sync_type text NOT NULL CHECK (sync_type IN ('manual', 'automatic', 'scheduled', 'real_time')),
  sync_direction sync_direction NOT NULL,
  data_type health_data_type NOT NULL,
  status health_sync_status DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  records_processed integer DEFAULT 0,
  records_succeeded integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  records_skipped integer DEFAULT 0,
  data_transferred_bytes bigint DEFAULT 0,
  error_message text,
  error_details jsonb DEFAULT '{}'::jsonb,
  sync_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Exported Health Data Table
CREATE TABLE IF NOT EXISTS exported_health_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES health_app_connections(id) ON DELETE CASCADE NOT NULL,
  sync_history_id uuid REFERENCES health_sync_history(id) ON DELETE SET NULL,
  data_type health_data_type NOT NULL,
  local_record_id text NOT NULL,
  local_table_name text NOT NULL,
  external_record_id text,
  exported_data jsonb NOT NULL,
  export_status text CHECK (export_status IN ('pending', 'sent', 'confirmed', 'failed', 'rejected')) DEFAULT 'pending',
  exported_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, local_record_id, data_type)
);

-- Imported Health Data Table
CREATE TABLE IF NOT EXISTS imported_health_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES health_app_connections(id) ON DELETE CASCADE NOT NULL,
  sync_history_id uuid REFERENCES health_sync_history(id) ON DELETE SET NULL,
  data_type health_data_type NOT NULL,
  external_record_id text NOT NULL,
  local_record_id text,
  local_table_name text,
  imported_data jsonb NOT NULL,
  import_status text CHECK (import_status IN ('pending', 'processed', 'stored', 'failed', 'skipped', 'duplicate')) DEFAULT 'pending',
  imported_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, external_record_id, data_type)
);

-- Health Data Mappings Table
CREATE TABLE IF NOT EXISTS health_data_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider health_app_provider NOT NULL,
  data_type health_data_type NOT NULL,
  external_data_type text NOT NULL,
  field_mappings jsonb NOT NULL,
  unit_conversions jsonb DEFAULT '{}'::jsonb,
  data_transformations jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, data_type, external_data_type)
);

-- Sync Queue Table
CREATE TABLE IF NOT EXISTS health_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES health_app_connections(id) ON DELETE CASCADE NOT NULL,
  sync_config_id uuid REFERENCES sync_configurations(id) ON DELETE CASCADE NOT NULL,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  scheduled_for timestamptz DEFAULT now(),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  status text CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sync Conflicts Table
CREATE TABLE IF NOT EXISTS health_sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id uuid REFERENCES health_app_connections(id) ON DELETE CASCADE NOT NULL,
  sync_history_id uuid REFERENCES health_sync_history(id) ON DELETE SET NULL,
  data_type health_data_type NOT NULL,
  local_data jsonb NOT NULL,
  external_data jsonb NOT NULL,
  conflict_type text NOT NULL,
  resolution_strategy text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by text,
  resolution_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Health App Permissions Table
CREATE TABLE IF NOT EXISTS health_app_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider health_app_provider NOT NULL,
  permission_type text NOT NULL,
  is_granted boolean DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  expiry_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, permission_type)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_health_connections_user ON health_app_connections(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_health_connections_provider ON health_app_connections(provider, is_active);
CREATE INDEX IF NOT EXISTS idx_health_connections_sync ON health_app_connections(last_sync_at) WHERE auto_sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sync_configs_connection ON sync_configurations(connection_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_sync_configs_data_type ON sync_configurations(data_type, is_enabled);
CREATE INDEX IF NOT EXISTS idx_sync_history_user ON health_sync_history(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON health_sync_history(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_connection ON health_sync_history(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exported_data_connection ON exported_health_data(connection_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_exported_data_status ON exported_health_data(export_status, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_imported_data_connection ON imported_health_data(connection_id, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_imported_data_status ON imported_health_data(import_status, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled ON health_sync_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON health_sync_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON health_sync_conflicts(user_id, is_resolved) WHERE is_resolved = false;

-- Enable Row Level Security
ALTER TABLE health_app_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exported_health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_app_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Health App Connections
CREATE POLICY "Users view own connections" ON health_app_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own connections" ON health_app_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own connections" ON health_app_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own connections" ON health_app_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for Sync Configurations
CREATE POLICY "Users view own sync configs" ON sync_configurations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sync configs" ON sync_configurations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sync configs" ON sync_configurations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sync configs" ON sync_configurations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for Sync History
CREATE POLICY "Users view own sync history" ON health_sync_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sync history" ON health_sync_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Exported Data
CREATE POLICY "Users view own exported data" ON exported_health_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own exported data" ON exported_health_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own exported data" ON exported_health_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Imported Data
CREATE POLICY "Users view own imported data" ON imported_health_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own imported data" ON imported_health_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own imported data" ON imported_health_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Data Mappings (public read)
CREATE POLICY "Anyone can view data mappings" ON health_data_mappings FOR SELECT TO authenticated USING (true);

-- RLS Policies for Sync Queue
CREATE POLICY "Users view own sync queue" ON health_sync_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sync queue" ON health_sync_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sync queue" ON health_sync_queue FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Sync Conflicts
CREATE POLICY "Users view own conflicts" ON health_sync_conflicts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conflicts" ON health_sync_conflicts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conflicts" ON health_sync_conflicts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Permissions
CREATE POLICY "Users view own permissions" ON health_app_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own permissions" ON health_app_permissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own permissions" ON health_app_permissions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to get pending syncs
CREATE OR REPLACE FUNCTION get_pending_health_syncs(
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  connection_id uuid,
  provider health_app_provider,
  data_type health_data_type,
  last_sync_at timestamptz,
  sync_frequency_minutes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hac.id,
    hac.provider,
    sc.data_type,
    sc.last_sync_at,
    sc.sync_frequency_minutes
  FROM health_app_connections hac
  INNER JOIN sync_configurations sc ON hac.id = sc.connection_id
  WHERE 
    hac.is_active = true
    AND hac.auto_sync_enabled = true
    AND sc.is_enabled = true
    AND (
      sc.last_sync_at IS NULL
      OR sc.last_sync_at < now() - (sc.sync_frequency_minutes || ' minutes')::interval
    )
    AND (p_user_id IS NULL OR hac.user_id = p_user_id)
  ORDER BY sc.last_sync_at ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update connection last sync
CREATE OR REPLACE FUNCTION update_connection_last_sync(
  p_connection_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE health_app_connections
  SET 
    last_sync_at = now(),
    updated_at = now(),
    error_count = 0,
    last_error = NULL
  WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record sync error
CREATE OR REPLACE FUNCTION record_sync_error(
  p_connection_id uuid,
  p_error_message text
)
RETURNS void AS $$
BEGIN
  UPDATE health_app_connections
  SET 
    error_count = error_count + 1,
    last_error = p_error_message,
    last_error_at = now(),
    updated_at = now()
  WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

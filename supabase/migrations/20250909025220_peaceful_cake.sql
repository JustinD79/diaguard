/*
  # Analytics and Real-time Monitoring Tables

  1. New Tables
    - `glucose_readings` - Blood glucose measurements with context
    - `insulin_doses` - Insulin administration tracking
    - `caregiver_relationships` - Family/caregiver access management
    - `health_alerts` - Real-time alert system
    - `analytics_insights` - AI-generated insights storage
    - `provider_reports` - Generated healthcare provider reports

  2. Security
    - Enable RLS on all tables
    - Add policies for user data isolation
    - Add caregiver access policies for family features

  3. Indexes
    - Optimize for real-time queries
    - Add composite indexes for analytics
*/

-- Glucose readings table
CREATE TABLE IF NOT EXISTS public.glucose_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value integer NOT NULL CHECK (value >= 20 AND value <= 600),
  timestamp timestamptz NOT NULL DEFAULT now(),
  meal_context text CHECK (meal_context IN ('before_meal', 'after_meal', 'bedtime', 'fasting')),
  notes text,
  device_id text,
  created_at timestamptz DEFAULT now()
);

-- Insulin doses table
CREATE TABLE IF NOT EXISTS public.insulin_doses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  insulin_type text NOT NULL CHECK (insulin_type IN ('rapid', 'long_acting', 'intermediate')),
  units numeric(5,2) NOT NULL CHECK (units > 0 AND units <= 100),
  timestamp timestamptz NOT NULL DEFAULT now(),
  meal_id uuid REFERENCES public.user_meals(id),
  injection_site text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Caregiver relationships table
CREATE TABLE IF NOT EXISTS public.caregiver_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'spouse', 'guardian', 'caregiver', 'healthcare_provider')),
  access_level text NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'manage', 'emergency')),
  is_active boolean DEFAULT true,
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, caregiver_id)
);

-- Health alerts table
CREATE TABLE IF NOT EXISTS public.health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  action_required boolean DEFAULT false,
  emergency_protocol boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Analytics insights table
CREATE TABLE IF NOT EXISTS public.analytics_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('pattern', 'correlation', 'recommendation', 'alert')),
  title text NOT NULL,
  description text NOT NULL,
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  actionable boolean DEFAULT false,
  data jsonb DEFAULT '{}',
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Provider reports table
CREATE TABLE IF NOT EXISTS public.provider_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('visit', 'monthly', 'quarterly')),
  timeframe text NOT NULL,
  report_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  shared_with text[], -- Array of email addresses
  access_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insulin_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for glucose_readings
CREATE POLICY "Users can manage their own glucose readings"
  ON public.glucose_readings
  FOR ALL
  TO authenticated
  USING (public.auth.uid() = user_id)
  WITH CHECK (public.auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient glucose readings"
  ON public.glucose_readings
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT patient_id 
      FROM public.caregiver_relationships 
      WHERE caregiver_id = public.auth.uid() 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- RLS Policies for insulin_doses
CREATE POLICY "Users can manage their own insulin doses"
  ON public.insulin_doses
  FOR ALL
  TO authenticated
  USING (public.auth.uid() = user_id)
  WITH CHECK (public.auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient insulin doses"
  ON public.insulin_doses
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT patient_id 
      FROM public.caregiver_relationships 
      WHERE caregiver_id = public.auth.uid() 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- RLS Policies for caregiver_relationships
CREATE POLICY "Users can manage their caregiver relationships"
  ON public.caregiver_relationships
  FOR ALL
  TO authenticated
  USING (public.auth.uid() = patient_id OR public.auth.uid() = caregiver_id)
  WITH CHECK (public.auth.uid() = patient_id OR public.auth.uid() = caregiver_id);

-- RLS Policies for health_alerts
CREATE POLICY "Users can manage their own health alerts"
  ON public.health_alerts
  FOR ALL
  TO authenticated
  USING (public.auth.uid() = user_id)
  WITH CHECK (public.auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient health alerts"
  ON public.health_alerts
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT patient_id 
      FROM public.caregiver_relationships 
      WHERE caregiver_id = public.auth.uid() 
        AND is_active = true 
        AND access_level IN ('manage', 'emergency')
    )
  );

-- RLS Policies for analytics_insights
CREATE POLICY "Users can view their own analytics insights"
  ON public.analytics_insights
  FOR SELECT
  TO authenticated
  USING (public.auth.uid() = user_id);

CREATE POLICY "Service role can manage analytics insights"
  ON public.analytics_insights
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for provider_reports
CREATE POLICY "Users can manage their own provider reports"
  ON public.provider_reports
  FOR ALL
  TO authenticated
  USING (public.auth.uid() = user_id)
  WITH CHECK (public.auth.uid() = user_id);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_timestamp 
  ON public.glucose_readings(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_glucose_readings_value_timestamp 
  ON public.glucose_readings(value, timestamp) 
  WHERE value <= 70 OR value >= 250;

CREATE INDEX IF NOT EXISTS idx_insulin_doses_user_timestamp 
  ON public.insulin_doses(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_caregiver_relationships_active 
  ON public.caregiver_relationships(patient_id, caregiver_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_health_alerts_user_unacknowledged 
  ON public.health_alerts(user_id, created_at DESC) 
  WHERE acknowledged = false;

CREATE INDEX IF NOT EXISTS idx_analytics_insights_user_priority 
  ON public.analytics_insights(user_id, priority, created_at DESC) 
  WHERE valid_until IS NULL OR valid_until > now();

-- Functions for real-time analytics
CREATE OR REPLACE FUNCTION public.calculate_time_in_range(
  p_user_id uuid,
  p_start_date timestamptz DEFAULT now() - interval '7 days',
  p_end_date timestamptz DEFAULT now()
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  total_readings integer;
  in_range_readings integer;
BEGIN
  SELECT COUNT(*) INTO total_readings
  FROM public.glucose_readings
  WHERE user_id = p_user_id
    AND timestamp BETWEEN p_start_date AND p_end_date;

  IF total_readings = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO in_range_readings
  FROM public.glucose_readings
  WHERE user_id = p_user_id
    AND timestamp BETWEEN p_start_date AND p_end_date
    AND value BETWEEN 70 AND 180;

  RETURN ROUND((in_range_readings::numeric / total_readings::numeric) * 100, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_glucose_trend(
  p_user_id uuid,
  p_readings_count integer DEFAULT 5
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  readings numeric[];
  trend_slope numeric;
BEGIN
  SELECT array_agg(value ORDER BY timestamp)
  INTO readings
  FROM (
    SELECT value, timestamp
    FROM public.glucose_readings
    WHERE user_id = p_user_id
    ORDER BY timestamp DESC
    LIMIT p_readings_count
  ) recent_readings;

  IF array_length(readings, 1) < 2 THEN
    RETURN 'stable';
  END IF;

  -- Simple trend calculation
  trend_slope := readings[array_length(readings, 1)] - readings[1];

  IF trend_slope > 20 THEN
    RETURN 'rising';
  ELSIF trend_slope < -20 THEN
    RETURN 'falling';
  ELSE
    RETURN 'stable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_critical_glucose_levels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for critical glucose levels and create alerts
  IF NEW.value <= 54 THEN
    INSERT INTO public.health_alerts (
      user_id,
      alert_type,
      severity,
      title,
      message,
      action_required,
      emergency_protocol
    ) VALUES (
      NEW.user_id,
      'critical_low_glucose',
      'critical',
      'Critical Low Glucose',
      'Glucose level is ' || NEW.value || ' mg/dL. Take immediate action.',
      true,
      true
    );
  ELSIF NEW.value >= 400 THEN
    INSERT INTO public.health_alerts (
      user_id,
      alert_type,
      severity,
      title,
      message,
      action_required,
      emergency_protocol
    ) VALUES (
      NEW.user_id,
      'critical_high_glucose',
      'critical',
      'Critical High Glucose',
      'Glucose level is ' || NEW.value || ' mg/dL. Contact healthcare provider immediately.',
      true,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for automatic alert generation
CREATE TRIGGER glucose_alert_trigger
  AFTER INSERT ON public.glucose_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_critical_glucose_levels();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.glucose_readings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.insulin_doses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_relationships TO authenticated;
GRANT SELECT, UPDATE ON public.health_alerts TO authenticated;
GRANT SELECT ON public.analytics_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.provider_reports TO authenticated;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.calculate_time_in_range TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_glucose_trend TO authenticated;
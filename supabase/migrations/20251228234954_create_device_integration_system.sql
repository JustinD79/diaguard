/*
  # Device Integration System for CGM, Insulin Pumps, and Wearables
  
  ## Overview
  This migration creates comprehensive tables and functions for integrating with:
  - Continuous Glucose Monitors (CGM): Dexcom, Freestyle Libre, Medtronic
  - Insulin Pumps: Medtronic, Omnipod, Tandem
  - Smart Watches: Apple Watch, Wear OS
  
  ## FDA Compliance
  All features are FDA Class I (wellness) - display data only, no automated dosing.
  No diagnostic, treatment, or therapeutic claims are made.
  
  ## New Tables
  
  ### glucose_readings
  Stores real-time and historical glucose readings from CGM devices
  - Supports multiple CGM providers
  - Includes trend arrows and rate of change
  - Timestamps for accurate time-in-range calculations
  
  ### cgm_devices
  Tracks user's connected CGM devices and their settings
  
  ### insulin_pump_data
  Stores insulin delivery data from connected pumps
  - Bolus history
  - Basal rates
  - Pump settings
  
  ### pump_devices
  Tracks user's connected insulin pumps
  
  ### glucose_alerts
  Stores high/low glucose alert preferences and history
  
  ### time_in_range_daily
  Daily aggregated time-in-range statistics
  
  ### watch_sync_log
  Tracks data synced with smartwatch devices
  
  ## Security
  All tables have Row Level Security (RLS) enabled
  Users can only access their own device data
*/

-- CGM Device Types Enum
DO $$ BEGIN
  CREATE TYPE cgm_provider AS ENUM ('dexcom_g6', 'dexcom_g7', 'freestyle_libre_2', 'freestyle_libre_3', 'medtronic_guardian', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Insulin Pump Types Enum
DO $$ BEGIN
  CREATE TYPE pump_provider AS ENUM ('medtronic_670g', 'medtronic_770g', 'omnipod_5', 'omnipod_dash', 'tandem_t_slim_x2', 'tandem_control_iq', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Glucose Trend Direction Enum
DO $$ BEGIN
  CREATE TYPE glucose_trend AS ENUM (
    'rapid_rise',         -- ↑↑ Rising rapidly (>3 mg/dL/min)
    'rise',               -- ↑ Rising (2-3 mg/dL/min)
    'slow_rise',          -- ↗ Rising slowly (1-2 mg/dL/min)
    'stable',             -- → Stable (±1 mg/dL/min)
    'slow_fall',          -- ↘ Falling slowly (1-2 mg/dL/min)
    'fall',               -- ↓ Falling (2-3 mg/dL/min)
    'rapid_fall'          -- ↓↓ Falling rapidly (>3 mg/dL/min)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CGM Devices Table
CREATE TABLE IF NOT EXISTS cgm_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_name text NOT NULL,
  provider cgm_provider NOT NULL,
  device_serial text,
  is_active boolean DEFAULT true,
  last_sync_time timestamptz,
  api_access_token text,
  api_refresh_token text,
  token_expires_at timestamptz,
  connection_status text DEFAULT 'connected',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Glucose Readings Table
CREATE TABLE IF NOT EXISTS glucose_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cgm_device_id uuid REFERENCES cgm_devices(id) ON DELETE SET NULL,
  glucose_value integer NOT NULL CHECK (glucose_value >= 20 AND glucose_value <= 600),
  glucose_unit text DEFAULT 'mg/dL' CHECK (glucose_unit IN ('mg/dL', 'mmol/L')),
  trend_direction glucose_trend,
  trend_rate numeric(5,2),
  reading_time timestamptz NOT NULL,
  is_calibration boolean DEFAULT false,
  is_estimated boolean DEFAULT false,
  transmitter_id text,
  sensor_session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for fast time-based queries
CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_time ON glucose_readings(user_id, reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_glucose_readings_device_time ON glucose_readings(cgm_device_id, reading_time DESC);

-- Insulin Pump Devices Table
CREATE TABLE IF NOT EXISTS pump_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_name text NOT NULL,
  provider pump_provider NOT NULL,
  device_serial text,
  is_active boolean DEFAULT true,
  last_sync_time timestamptz,
  api_access_token text,
  api_refresh_token text,
  token_expires_at timestamptz,
  connection_status text DEFAULT 'connected',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insulin Pump Data Table
CREATE TABLE IF NOT EXISTS insulin_pump_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pump_device_id uuid REFERENCES pump_devices(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('bolus', 'basal', 'temp_basal', 'suspend', 'resume', 'setting_change')),
  insulin_delivered numeric(6,2),
  insulin_unit text DEFAULT 'units' CHECK (insulin_unit IN ('units', 'U')),
  carbs_entered integer,
  glucose_entered integer,
  bolus_type text CHECK (bolus_type IN ('normal', 'extended', 'combo', 'correction', null)),
  basal_rate numeric(5,3),
  duration_minutes integer,
  event_time timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pump_data_user_time ON insulin_pump_data(user_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_pump_data_device_time ON insulin_pump_data(pump_device_id, event_time DESC);

-- Glucose Alerts Table
CREATE TABLE IF NOT EXISTS glucose_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('high', 'low', 'urgent_low', 'rising_fast', 'falling_fast')),
  threshold_value integer NOT NULL,
  threshold_unit text DEFAULT 'mg/dL',
  is_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  snooze_duration_minutes integer DEFAULT 30,
  repeat_interval_minutes integer DEFAULT 5,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_type)
);

-- Alert History Table
CREATE TABLE IF NOT EXISTS glucose_alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  glucose_alert_id uuid REFERENCES glucose_alerts(id) ON DELETE CASCADE,
  glucose_reading_id uuid REFERENCES glucose_readings(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  glucose_value integer NOT NULL,
  trend_direction glucose_trend,
  triggered_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  snoozed_until timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_user_time ON glucose_alert_history(user_id, triggered_at DESC);

-- Time in Range Daily Aggregates
CREATE TABLE IF NOT EXISTS time_in_range_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_readings integer DEFAULT 0,
  time_in_range_percent numeric(5,2),
  time_below_range_percent numeric(5,2),
  time_above_range_percent numeric(5,2),
  time_very_low_percent numeric(5,2),
  time_very_high_percent numeric(5,2),
  average_glucose numeric(6,2),
  glucose_management_indicator numeric(4,2),
  coefficient_of_variation numeric(5,2),
  standard_deviation numeric(6,2),
  target_range_low integer DEFAULT 70,
  target_range_high integer DEFAULT 180,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tir_daily_user_date ON time_in_range_daily(user_id, date DESC);

-- Watch Sync Log
CREATE TABLE IF NOT EXISTS watch_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  watch_type text NOT NULL CHECK (watch_type IN ('apple_watch', 'wear_os', 'fitbit', 'garmin')),
  watch_identifier text,
  sync_type text NOT NULL CHECK (sync_type IN ('glucose', 'meal', 'exercise', 'hydration', 'full_sync')),
  records_synced integer DEFAULT 0,
  sync_status text DEFAULT 'success' CHECK (sync_status IN ('success', 'partial', 'failed')),
  error_message text,
  sync_time timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_watch_sync_user_time ON watch_sync_log(user_id, sync_time DESC);

-- Enable Row Level Security
ALTER TABLE cgm_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE insulin_pump_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_in_range_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CGM Devices
CREATE POLICY "Users can view own CGM devices"
  ON cgm_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CGM devices"
  ON cgm_devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CGM devices"
  ON cgm_devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own CGM devices"
  ON cgm_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Glucose Readings
CREATE POLICY "Users can view own glucose readings"
  ON glucose_readings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own glucose readings"
  ON glucose_readings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own glucose readings"
  ON glucose_readings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own glucose readings"
  ON glucose_readings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Pump Devices
CREATE POLICY "Users can view own pump devices"
  ON pump_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pump devices"
  ON pump_devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pump devices"
  ON pump_devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pump devices"
  ON pump_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Insulin Pump Data
CREATE POLICY "Users can view own pump data"
  ON insulin_pump_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pump data"
  ON insulin_pump_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pump data"
  ON insulin_pump_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pump data"
  ON insulin_pump_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Glucose Alerts
CREATE POLICY "Users can view own glucose alerts"
  ON glucose_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own glucose alerts"
  ON glucose_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own glucose alerts"
  ON glucose_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own glucose alerts"
  ON glucose_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Glucose Alert History
CREATE POLICY "Users can view own alert history"
  ON glucose_alert_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert history"
  ON glucose_alert_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert history"
  ON glucose_alert_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Time in Range Daily
CREATE POLICY "Users can view own TIR data"
  ON time_in_range_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TIR data"
  ON time_in_range_daily FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TIR data"
  ON time_in_range_daily FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Watch Sync Log
CREATE POLICY "Users can view own watch sync logs"
  ON watch_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch sync logs"
  ON watch_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate time in range statistics
CREATE OR REPLACE FUNCTION calculate_time_in_range(
  p_user_id uuid,
  p_date date,
  p_target_low integer DEFAULT 70,
  p_target_high integer DEFAULT 180
)
RETURNS TABLE (
  time_in_range_percent numeric,
  time_below_range_percent numeric,
  time_above_range_percent numeric,
  time_very_low_percent numeric,
  time_very_high_percent numeric,
  average_glucose numeric,
  glucose_management_indicator numeric,
  coefficient_of_variation numeric,
  standard_deviation numeric,
  total_readings integer
) AS $$
DECLARE
  v_readings record;
  v_in_range integer := 0;
  v_below_range integer := 0;
  v_above_range integer := 0;
  v_very_low integer := 0;
  v_very_high integer := 0;
  v_total integer := 0;
  v_sum numeric := 0;
  v_avg numeric;
  v_variance numeric;
  v_stddev numeric;
  v_cv numeric;
  v_gmi numeric;
BEGIN
  FOR v_readings IN
    SELECT glucose_value
    FROM glucose_readings
    WHERE user_id = p_user_id
      AND reading_time >= p_date::timestamptz
      AND reading_time < (p_date + interval '1 day')::timestamptz
      AND is_estimated = false
    ORDER BY reading_time
  LOOP
    v_total := v_total + 1;
    v_sum := v_sum + v_readings.glucose_value;
    
    IF v_readings.glucose_value < 54 THEN
      v_very_low := v_very_low + 1;
      v_below_range := v_below_range + 1;
    ELSIF v_readings.glucose_value < p_target_low THEN
      v_below_range := v_below_range + 1;
    ELSIF v_readings.glucose_value <= p_target_high THEN
      v_in_range := v_in_range + 1;
    ELSIF v_readings.glucose_value > 250 THEN
      v_very_high := v_very_high + 1;
      v_above_range := v_above_range + 1;
    ELSE
      v_above_range := v_above_range + 1;
    END IF;
  END LOOP;
  
  IF v_total = 0 THEN
    RETURN;
  END IF;
  
  v_avg := v_sum / v_total;
  
  SELECT 
    COALESCE(AVG(POWER(glucose_value - v_avg, 2)), 0)
  INTO v_variance
  FROM glucose_readings
  WHERE user_id = p_user_id
    AND reading_time >= p_date::timestamptz
    AND reading_time < (p_date + interval '1 day')::timestamptz
    AND is_estimated = false;
  
  v_stddev := SQRT(v_variance);
  v_cv := CASE WHEN v_avg > 0 THEN (v_stddev / v_avg) * 100 ELSE 0 END;
  v_gmi := (3.31 + (0.02392 * v_avg));
  
  RETURN QUERY SELECT
    ROUND((v_in_range::numeric / v_total * 100), 2),
    ROUND((v_below_range::numeric / v_total * 100), 2),
    ROUND((v_above_range::numeric / v_total * 100), 2),
    ROUND((v_very_low::numeric / v_total * 100), 2),
    ROUND((v_very_high::numeric / v_total * 100), 2),
    ROUND(v_avg, 2),
    ROUND(v_gmi, 2),
    ROUND(v_cv, 2),
    ROUND(v_stddev, 2),
    v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

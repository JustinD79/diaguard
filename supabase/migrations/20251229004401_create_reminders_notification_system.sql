/*
  # Comprehensive Reminders & Notifications System
  
  ## Overview
  This migration creates a complete notification and reminder system for:
  - Meal reminders (scheduled times, missing meal detection)
  - Medication reminders (insulin, oral medications, refills)
  - Testing reminders (glucose checks, A1C tests)
  - Smart context-aware reminders (high-carb meals, inactivity)
  
  ## New Tables
  
  ### reminders
  Core reminder configuration with schedules and settings
  
  ### reminder_schedules
  Individual scheduled occurrences for reminders
  
  ### reminder_history
  Log of reminder delivery and user responses
  
  ### notification_preferences
  User-specific notification settings
  
  ### smart_reminder_rules
  Context-aware reminder rules and triggers
  
  ## Security
  All tables have Row Level Security (RLS) enabled
*/

-- Reminder Type Enum
DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM (
    'meal',
    'medication',
    'glucose_test',
    'a1c_test',
    'exercise',
    'hydration',
    'appointment',
    'refill',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Reminder Frequency Enum
DO $$ BEGIN
  CREATE TYPE reminder_frequency AS ENUM (
    'one_time',
    'daily',
    'weekly',
    'monthly',
    'custom_days',
    'as_needed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Reminder Status Enum
DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM (
    'active',
    'paused',
    'completed',
    'cancelled',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification Delivery Status Enum
DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM (
    'scheduled',
    'sent',
    'delivered',
    'failed',
    'dismissed',
    'snoozed',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_type reminder_type NOT NULL,
  title text NOT NULL,
  message text,
  frequency reminder_frequency NOT NULL DEFAULT 'daily',
  status reminder_status NOT NULL DEFAULT 'active',
  
  -- Scheduling
  scheduled_time time NOT NULL,
  scheduled_days integer[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  
  -- Notification settings
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  priority text DEFAULT 'default' CHECK (priority IN ('low', 'default', 'high', 'urgent')),
  
  -- Snooze settings
  allow_snooze boolean DEFAULT true,
  snooze_duration_minutes integer DEFAULT 10,
  max_snooze_count integer DEFAULT 3,
  
  -- Smart reminder settings
  is_smart_reminder boolean DEFAULT false,
  smart_trigger_conditions jsonb DEFAULT '{}'::jsonb,
  
  -- Medication specific
  medication_name text,
  medication_dosage text,
  medication_type text CHECK (medication_type IN ('insulin', 'oral', 'injection', 'other', null)),
  refill_threshold_days integer,
  
  -- Testing specific
  test_type text CHECK (test_type IN ('fasting', 'pre_meal', 'post_meal', '2hr_post_meal', 'bedtime', 'a1c', null)),
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  last_triggered_at timestamptz,
  next_trigger_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reminder History Table
CREATE TABLE IF NOT EXISTS reminder_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES reminders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_time timestamptz NOT NULL,
  delivered_at timestamptz,
  delivery_status notification_delivery_status NOT NULL DEFAULT 'scheduled',
  user_response text CHECK (user_response IN ('completed', 'dismissed', 'snoozed', 'expired', null)),
  response_time timestamptz,
  snooze_count integer DEFAULT 0,
  snoozed_until timestamptz,
  completion_data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Global notification settings
  notifications_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  badge_enabled boolean DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '07:00:00',
  
  -- Type-specific settings
  meal_reminders_enabled boolean DEFAULT true,
  medication_reminders_enabled boolean DEFAULT true,
  testing_reminders_enabled boolean DEFAULT true,
  smart_reminders_enabled boolean DEFAULT true,
  
  -- Priority filtering
  min_priority_to_show text DEFAULT 'default' CHECK (min_priority_to_show IN ('low', 'default', 'high', 'urgent')),
  
  -- Delivery channels
  push_notifications_enabled boolean DEFAULT true,
  email_notifications_enabled boolean DEFAULT false,
  sms_notifications_enabled boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Smart Reminder Rules Table
CREATE TABLE IF NOT EXISTS smart_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN (
    'missing_meal',
    'high_carb_followup',
    'inactivity',
    'high_glucose_followup',
    'low_glucose_followup',
    'pre_meal_test',
    'post_meal_test',
    'medication_adherence',
    'custom'
  )),
  is_enabled boolean DEFAULT true,
  
  -- Trigger conditions
  trigger_conditions jsonb NOT NULL,
  
  -- Action to take
  reminder_template jsonb NOT NULL,
  
  -- Constraints
  min_time_between_triggers_minutes integer DEFAULT 60,
  max_triggers_per_day integer DEFAULT 5,
  last_triggered_at timestamptz,
  trigger_count_today integer DEFAULT 0,
  
  -- Priority
  priority integer DEFAULT 1,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Medication Refill Tracking Table
CREATE TABLE IF NOT EXISTS medication_refills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_id uuid REFERENCES reminders(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  total_quantity integer NOT NULL,
  remaining_quantity integer NOT NULL,
  daily_dosage integer DEFAULT 1,
  refill_date date NOT NULL,
  next_refill_date date,
  pharmacy_name text,
  prescription_number text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- A1C Test Tracking Table
CREATE TABLE IF NOT EXISTS a1c_test_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_test_date date,
  last_test_result numeric(3,1),
  next_test_date date NOT NULL,
  test_frequency_months integer DEFAULT 3,
  reminder_days_before integer DEFAULT 7,
  physician_name text,
  lab_location text,
  notes text,
  reminder_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Reminder Completion Log Table
CREATE TABLE IF NOT EXISTS reminder_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES reminders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_history_id uuid REFERENCES reminder_history(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_type text NOT NULL CHECK (completion_type IN ('on_time', 'late', 'early', 'manual')),
  time_difference_minutes integer,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_next_trigger ON reminders(next_trigger_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reminder_history_user_time ON reminder_history(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_history_reminder_time ON reminder_history(reminder_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_smart_rules_user_enabled ON smart_reminder_rules(user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_medication_refills_user_date ON medication_refills(user_id, next_refill_date);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE a1c_test_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Reminder History
CREATE POLICY "Users can view own reminder history"
  ON reminder_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminder history"
  ON reminder_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminder history"
  ON reminder_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Notification Preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Smart Reminder Rules
CREATE POLICY "Users can view own smart rules"
  ON smart_reminder_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own smart rules"
  ON smart_reminder_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own smart rules"
  ON smart_reminder_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own smart rules"
  ON smart_reminder_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Medication Refills
CREATE POLICY "Users can view own medication refills"
  ON medication_refills FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medication refills"
  ON medication_refills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication refills"
  ON medication_refills FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medication refills"
  ON medication_refills FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for A1C Test Schedule
CREATE POLICY "Users can view own A1C schedule"
  ON a1c_test_schedule FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own A1C schedule"
  ON a1c_test_schedule FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own A1C schedule"
  ON a1c_test_schedule FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Reminder Completions
CREATE POLICY "Users can view own reminder completions"
  ON reminder_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminder completions"
  ON reminder_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate next trigger time for a reminder
CREATE OR REPLACE FUNCTION calculate_next_trigger_time(
  p_reminder_id uuid
)
RETURNS timestamptz AS $$
DECLARE
  v_reminder record;
  v_next_time timestamptz;
  v_current_time timestamptz := now();
  v_scheduled_time time;
  v_today_trigger timestamptz;
BEGIN
  SELECT * INTO v_reminder
  FROM reminders
  WHERE id = p_reminder_id;
  
  IF NOT FOUND OR v_reminder.status != 'active' THEN
    RETURN NULL;
  END IF;
  
  v_scheduled_time := v_reminder.scheduled_time;
  v_today_trigger := CURRENT_DATE + v_scheduled_time;
  
  IF v_reminder.frequency = 'one_time' THEN
    IF v_reminder.start_date IS NOT NULL THEN
      v_next_time := v_reminder.start_date + v_scheduled_time;
      IF v_next_time > v_current_time THEN
        RETURN v_next_time;
      END IF;
    END IF;
    RETURN NULL;
  ELSIF v_reminder.frequency = 'daily' THEN
    IF v_today_trigger > v_current_time THEN
      RETURN v_today_trigger;
    ELSE
      RETURN v_today_trigger + interval '1 day';
    END IF;
  ELSIF v_reminder.frequency = 'weekly' THEN
    FOR i IN 0..6 LOOP
      v_next_time := v_today_trigger + (i || ' days')::interval;
      IF v_next_time > v_current_time AND 
         EXTRACT(ISODOW FROM v_next_time)::integer = ANY(v_reminder.scheduled_days) THEN
        RETURN v_next_time;
      END IF;
    END LOOP;
    RETURN v_today_trigger + interval '7 days';
  END IF;
  
  RETURN v_today_trigger + interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if within quiet hours
CREATE OR REPLACE FUNCTION is_within_quiet_hours(
  p_user_id uuid,
  p_check_time timestamptz DEFAULT now()
)
RETURNS boolean AS $$
DECLARE
  v_prefs record;
  v_check_time time;
BEGIN
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND OR NOT v_prefs.quiet_hours_enabled THEN
    RETURN false;
  END IF;
  
  v_check_time := p_check_time::time;
  
  IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
    RETURN v_check_time >= v_prefs.quiet_hours_start AND v_check_time < v_prefs.quiet_hours_end;
  ELSE
    RETURN v_check_time >= v_prefs.quiet_hours_start OR v_check_time < v_prefs.quiet_hours_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update next trigger time after reminder fires
CREATE OR REPLACE FUNCTION update_reminder_next_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.last_triggered_at := now();
  NEW.next_trigger_at := calculate_next_trigger_time(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update next trigger time
CREATE TRIGGER trigger_update_next_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  WHEN (OLD.last_triggered_at IS DISTINCT FROM NEW.last_triggered_at)
  EXECUTE FUNCTION update_reminder_next_trigger();

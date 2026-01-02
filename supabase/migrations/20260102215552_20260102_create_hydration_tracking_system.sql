/*
  # Hydration Tracking System
  
  1. New Tables
    - `hydration_goals`: User hydration targets and preferences
    - `hydration_logs`: Individual water intake entries
    - `hydration_analytics`: Daily aggregated hydration data
    
  2. Security
    - Enable RLS on all tables
    - Add policies for user data access control
*/

CREATE TABLE IF NOT EXISTS hydration_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_goal_ml integer DEFAULT 2000,
  reminder_frequency_hours integer DEFAULT 2,
  reminder_enabled boolean DEFAULT true,
  preferred_unit text DEFAULT 'ml',
  custom_containers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_ml integer NOT NULL,
  logged_at timestamptz DEFAULT now(),
  container_type text DEFAULT 'glass',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hydration_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_intake_ml integer DEFAULT 0,
  goal_progress_percent numeric(5, 2) DEFAULT 0,
  log_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date ON hydration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_hydration_analytics_user_date ON hydration_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_hydration_goals_user ON hydration_goals(user_id);

ALTER TABLE hydration_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own hydration goals" ON hydration_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own hydration goals" ON hydration_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own hydration goals" ON hydration_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own hydration logs" ON hydration_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own hydration logs" ON hydration_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own hydration logs" ON hydration_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own hydration analytics" ON hydration_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own hydration analytics" ON hydration_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own hydration analytics" ON hydration_analytics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
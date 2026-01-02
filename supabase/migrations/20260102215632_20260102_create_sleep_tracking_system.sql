/*
  # Sleep Tracking System
  
  1. New Tables
    - `sleep_goals`: User sleep targets and preferences
    - `sleep_logs`: Individual sleep entries with start/end times
    - `sleep_analytics`: Daily sleep quality and duration analysis
    - `sleep_patterns`: Weekly/monthly sleep pattern insights
    
  2. Security
    - Enable RLS on all tables
    - Add policies for user data access control
*/

CREATE TABLE IF NOT EXISTS sleep_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_hours numeric(3, 1) DEFAULT 8.0,
  bedtime_hour integer DEFAULT 22,
  bedtime_minute integer DEFAULT 0,
  wake_time_hour integer DEFAULT 6,
  wake_time_minute integer DEFAULT 30,
  reminder_enabled boolean DEFAULT true,
  sleep_reminder_minutes_before integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sleep_start timestamptz NOT NULL,
  sleep_end timestamptz NOT NULL,
  duration_minutes integer,
  quality_score integer CHECK (quality_score >= 1 AND quality_score <= 10),
  sleep_stages jsonb DEFAULT '{}'::jsonb,
  interruptions integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sleep_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_duration_minutes integer DEFAULT 0,
  average_quality_score numeric(3, 1) DEFAULT 0,
  log_count integer DEFAULT 0,
  goal_achievement_percent numeric(5, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS sleep_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  average_duration_minutes integer,
  average_quality_score numeric(3, 1),
  most_common_bedtime time,
  most_common_wake_time time,
  consistency_score numeric(3, 1),
  trend text,
  insights jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start_date, period_end_date)
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, sleep_start DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_analytics_user_date ON sleep_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_goals_user ON sleep_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_patterns_user_period ON sleep_patterns(user_id, period_start_date DESC);

ALTER TABLE sleep_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sleep goals" ON sleep_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sleep goals" ON sleep_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sleep goals" ON sleep_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own sleep logs" ON sleep_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sleep logs" ON sleep_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sleep logs" ON sleep_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own sleep analytics" ON sleep_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sleep analytics" ON sleep_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sleep analytics" ON sleep_analytics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own sleep patterns" ON sleep_patterns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sleep patterns" ON sleep_patterns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sleep patterns" ON sleep_patterns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
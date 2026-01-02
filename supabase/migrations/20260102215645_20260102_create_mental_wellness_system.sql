/*
  # Mental Wellness & Mood Tracking System
  
  1. New Tables
    - `mood_logs`: Individual mood entries with emoji/score
    - `stress_levels`: Stress tracking with intensity levels
    - `mental_wellness_goals`: User mental health targets
    - `wellness_reflections`: Weekly reflection entries
    - `coping_strategies`: User's preferred coping mechanisms
    - `wellness_analytics`: Daily/weekly mental wellness insights
    
  2. Security
    - Enable RLS on all tables
    - Add policies for user data access control
*/

CREATE TABLE IF NOT EXISTS mental_wellness_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood_check_in_frequency text DEFAULT 'daily',
  stress_awareness_enabled boolean DEFAULT true,
  breathing_reminders_enabled boolean DEFAULT true,
  reflection_frequency text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood_score integer CHECK (mood_score >= 1 AND mood_score <= 10),
  mood_emoji text,
  primary_emotion text,
  secondary_emotions text[],
  triggers jsonb DEFAULT '{}'::jsonb,
  notes text,
  location text,
  activity text,
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stress_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stress_score integer CHECK (stress_score >= 1 AND stress_score <= 10),
  stress_category text,
  sources text[],
  physical_symptoms text[],
  coping_strategy text,
  effectiveness_rating integer CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wellness_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_starting_date date NOT NULL,
  mood_summary text,
  stress_patterns text,
  highlights text,
  challenges text,
  accomplishments text,
  insights text,
  goals_for_next_week text,
  average_mood_score numeric(3, 1),
  average_stress_score numeric(3, 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_starting_date)
);

CREATE TABLE IF NOT EXISTS coping_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_name text NOT NULL,
  category text,
  description text,
  effectiveness_history jsonb DEFAULT '{}'::jsonb,
  frequency_used integer DEFAULT 0,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wellness_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  average_mood_score numeric(3, 1) DEFAULT 0,
  mood_log_count integer DEFAULT 0,
  average_stress_score numeric(3, 1) DEFAULT 0,
  stress_log_count integer DEFAULT 0,
  top_mood text,
  top_stress_source text,
  most_used_coping_strategy text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_stress_levels_user_date ON stress_levels(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_reflections_user_week ON wellness_reflections(user_id, week_starting_date DESC);
CREATE INDEX IF NOT EXISTS idx_coping_strategies_user ON coping_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_wellness_analytics_user_date ON wellness_analytics(user_id, date DESC);

ALTER TABLE mental_wellness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE coping_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wellness goals" ON mental_wellness_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wellness goals" ON mental_wellness_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wellness goals" ON mental_wellness_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own mood logs" ON mood_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mood logs" ON mood_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own mood logs" ON mood_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own stress levels" ON stress_levels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own stress levels" ON stress_levels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own stress levels" ON stress_levels FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own wellness reflections" ON wellness_reflections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wellness reflections" ON wellness_reflections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wellness reflections" ON wellness_reflections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own coping strategies" ON coping_strategies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own coping strategies" ON coping_strategies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own coping strategies" ON coping_strategies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own coping strategies" ON coping_strategies FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own wellness analytics" ON wellness_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wellness analytics" ON wellness_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wellness analytics" ON wellness_analytics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
/*
  # Enhanced Features System - Notifications, Favorites, Analytics, Exercise, Hydration, Achievements
  
  ## New Tables
  
  ### 1. user_reminders
    - Meal, medication, testing, exercise, and hydration reminders
  
  ### 2. food_favorites
    - Quick-log frequently eaten foods
  
  ### 3. meal_templates
    - Saved meal combinations
  
  ### 4. glucose_readings
    - Manual and CGM glucose data
  
  ### 5. exercise_logs
    - Activity and exercise tracking
  
  ### 6. hydration_logs
    - Water and beverage intake
  
  ### 7. daily_hydration_goals
    - Daily hydration targets
  
  ### 8. user_achievements
    - Gamification achievements
  
  ### 9. user_stats
    - User progress statistics
  
  ### 10. time_in_range_analytics
    - Glucose analytics and TIR
  
  ## Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create user_reminders table
CREATE TABLE IF NOT EXISTS user_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('meal', 'medication', 'testing', 'exercise', 'hydration')),
  title text NOT NULL,
  message text NOT NULL,
  time time NOT NULL,
  days_of_week jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders"
  ON user_reminders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_reminders_user_id ON user_reminders(user_id);

-- Create food_favorites table
CREATE TABLE IF NOT EXISTS food_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  nutrition_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'any')),
  favorite_count integer DEFAULT 1,
  last_eaten timestamptz DEFAULT now(),
  image_url text,
  source text DEFAULT 'manual' CHECK (source IN ('ai_scan', 'barcode', 'manual', 'template')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON food_favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_food_favorites_user_id ON food_favorites(user_id);

-- Create meal_templates table
CREATE TABLE IF NOT EXISTS meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  foods jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_nutrition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meal templates"
  ON meal_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);

-- Create glucose_readings table
CREATE TABLE IF NOT EXISTS glucose_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glucose_value integer NOT NULL CHECK (glucose_value >= 20 AND glucose_value <= 600),
  reading_type text NOT NULL CHECK (reading_type IN ('fasting', 'pre_meal', 'post_meal', 'bedtime', 'random')),
  meal_log_id uuid REFERENCES meal_logs(id) ON DELETE SET NULL,
  notes text,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'cgm', 'meter')),
  created_at timestamptz DEFAULT now(),
  reading_time timestamptz DEFAULT now()
);

ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own glucose readings"
  ON glucose_readings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_glucose_readings_user_id ON glucose_readings(user_id);

-- Create exercise_logs table
CREATE TABLE IF NOT EXISTS exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_type text NOT NULL CHECK (exercise_type IN ('walking', 'running', 'cycling', 'swimming', 'gym', 'sports', 'yoga', 'other')),
  intensity text NOT NULL CHECK (intensity IN ('light', 'moderate', 'vigorous')),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  calories_burned integer CHECK (calories_burned >= 0),
  distance numeric CHECK (distance >= 0),
  glucose_before integer CHECK (glucose_before >= 20 AND glucose_before <= 600),
  glucose_after integer CHECK (glucose_after >= 20 AND glucose_after <= 600),
  notes text,
  created_at timestamptz DEFAULT now(),
  exercise_time timestamptz DEFAULT now()
);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exercise logs"
  ON exercise_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);

-- Create hydration_logs table
CREATE TABLE IF NOT EXISTS hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml integer NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  beverage_type text DEFAULT 'water' CHECK (beverage_type IN ('water', 'tea', 'coffee', 'juice', 'sports_drink', 'other')),
  created_at timestamptz DEFAULT now(),
  logged_time timestamptz DEFAULT now()
);

ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hydration logs"
  ON hydration_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_id ON hydration_logs(user_id);

-- Create daily_hydration_goals table
CREATE TABLE IF NOT EXISTS daily_hydration_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal_ml integer DEFAULT 2000 CHECK (daily_goal_ml >= 500 AND daily_goal_ml <= 10000),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE daily_hydration_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hydration goals"
  ON daily_hydration_goals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  achievement_name text NOT NULL,
  achievement_description text NOT NULL,
  achievement_type text NOT NULL CHECK (achievement_type IN ('logging_streak', 'meal_milestone', 'glucose_control', 'exercise', 'hydration', 'special')),
  icon text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak_days integer DEFAULT 0,
  longest_streak_days integer DEFAULT 0,
  total_meals_logged integer DEFAULT 0,
  total_scans integer DEFAULT 0,
  total_exercise_minutes integer DEFAULT 0,
  last_login timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create time_in_range_analytics table
CREATE TABLE IF NOT EXISTS time_in_range_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  readings_count integer DEFAULT 0,
  time_in_range_percentage numeric DEFAULT 0,
  time_above_range_percentage numeric DEFAULT 0,
  time_below_range_percentage numeric DEFAULT 0,
  average_glucose numeric DEFAULT 0,
  glucose_variability numeric DEFAULT 0,
  estimated_a1c numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE time_in_range_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own TIR analytics"
  ON time_in_range_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own TIR analytics"
  ON time_in_range_analytics FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tir_analytics_user_id ON time_in_range_analytics(user_id, date DESC);

-- Create function to update user stats on meal log
CREATE OR REPLACE FUNCTION update_user_stats_on_meal()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_meals_logged, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_meals_logged = user_stats.total_meals_logged + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for meal logging stats
DROP TRIGGER IF EXISTS trigger_update_stats_on_meal ON meal_logs;
CREATE TRIGGER trigger_update_stats_on_meal
  AFTER INSERT ON meal_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_meal();

-- Create function to update user stats on exercise log
CREATE OR REPLACE FUNCTION update_user_stats_on_exercise()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_exercise_minutes, updated_at)
  VALUES (NEW.user_id, NEW.duration_minutes, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_exercise_minutes = user_stats.total_exercise_minutes + NEW.duration_minutes,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for exercise logging stats
DROP TRIGGER IF EXISTS trigger_update_stats_on_exercise ON exercise_logs;
CREATE TRIGGER trigger_update_stats_on_exercise
  AFTER INSERT ON exercise_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_exercise();
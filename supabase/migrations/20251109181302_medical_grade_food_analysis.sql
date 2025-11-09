/*
  # Medical-Grade Food Analysis System

  1. New Tables
    - `food_analysis_reports` - Stores comprehensive food analysis reports
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `report_id` (text, unique identifier)
      - `image_url` (text, reference to food image)
      - `analysis_data` (jsonb, complete analysis result)
      - `total_carbs` (decimal, for quick queries)
      - `total_protein` (decimal)
      - `total_fat` (decimal)
      - `calories` (integer)
      - `glycemic_index` (integer)
      - `glycemic_load` (integer)
      - `recommended_insulin` (decimal)
      - `confidence_score` (decimal)
      - `api_provider` (text, claude/openai/mock)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_food_preferences` - Stores user insulin ratios and preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key, unique)
      - `preferred_carb_ratio` (integer, default 15)
      - `max_single_dose` (decimal, default 15)
      - `insulin_sensitivity_factor` (integer, default 50)
      - `target_glucose` (integer, default 100)
      - `correction_factor` (integer, default 50)
      - `pre_bolus_minutes` (integer, default 15)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `meal_outcomes` - Track actual outcomes vs predictions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `report_id` (text, references food_analysis_reports)
      - `pre_meal_glucose` (integer)
      - `insulin_taken` (decimal)
      - `glucose_1hr` (integer)
      - `glucose_2hr` (integer)
      - `glucose_4hr` (integer)
      - `peak_glucose` (integer)
      - `time_to_peak_minutes` (integer)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Policies for authenticated users to read/write their own records

  3. Indexes
    - Index on user_id for fast queries
    - Index on created_at for timeline queries
    - Index on report_id for lookups
*/

-- Create food_analysis_reports table
CREATE TABLE IF NOT EXISTS food_analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_id text UNIQUE NOT NULL,
  image_url text,
  analysis_data jsonb NOT NULL,
  total_carbs decimal(10,2),
  total_protein decimal(10,2),
  total_fat decimal(10,2),
  calories integer,
  glycemic_index integer,
  glycemic_load integer,
  recommended_insulin decimal(10,2),
  confidence_score decimal(5,4),
  api_provider text CHECK (api_provider IN ('claude', 'openai', 'mock')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_food_preferences table
CREATE TABLE IF NOT EXISTS user_food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  preferred_carb_ratio integer DEFAULT 15 CHECK (preferred_carb_ratio > 0),
  max_single_dose decimal(10,2) DEFAULT 15.0 CHECK (max_single_dose > 0),
  insulin_sensitivity_factor integer DEFAULT 50 CHECK (insulin_sensitivity_factor > 0),
  target_glucose integer DEFAULT 100 CHECK (target_glucose > 0),
  correction_factor integer DEFAULT 50 CHECK (correction_factor > 0),
  pre_bolus_minutes integer DEFAULT 15 CHECK (pre_bolus_minutes >= 0 AND pre_bolus_minutes <= 30),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meal_outcomes table
CREATE TABLE IF NOT EXISTS meal_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_id text REFERENCES food_analysis_reports(report_id) ON DELETE CASCADE NOT NULL,
  pre_meal_glucose integer CHECK (pre_meal_glucose > 0),
  insulin_taken decimal(10,2) CHECK (insulin_taken >= 0),
  glucose_1hr integer CHECK (glucose_1hr > 0),
  glucose_2hr integer CHECK (glucose_2hr > 0),
  glucose_4hr integer CHECK (glucose_4hr > 0),
  peak_glucose integer CHECK (peak_glucose > 0),
  time_to_peak_minutes integer CHECK (time_to_peak_minutes >= 0),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE food_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_food_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for food_analysis_reports
CREATE POLICY "Users can view own food analysis reports"
  ON food_analysis_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own food analysis reports"
  ON food_analysis_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food analysis reports"
  ON food_analysis_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food analysis reports"
  ON food_analysis_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_food_preferences
CREATE POLICY "Users can view own preferences"
  ON user_food_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences"
  ON user_food_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_food_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for meal_outcomes
CREATE POLICY "Users can view own meal outcomes"
  ON meal_outcomes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal outcomes"
  ON meal_outcomes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal outcomes"
  ON meal_outcomes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal outcomes"
  ON meal_outcomes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_reports_user_id ON food_analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_food_reports_created_at ON food_analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_reports_report_id ON food_analysis_reports(report_id);

CREATE INDEX IF NOT EXISTS idx_meal_outcomes_user_id ON meal_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_outcomes_report_id ON meal_outcomes(report_id);
CREATE INDEX IF NOT EXISTS idx_meal_outcomes_created_at ON meal_outcomes(created_at DESC);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_food_analysis_reports_updated_at ON food_analysis_reports;
CREATE TRIGGER update_food_analysis_reports_updated_at
  BEFORE UPDATE ON food_analysis_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_food_preferences_updated_at ON user_food_preferences;
CREATE TRIGGER update_user_food_preferences_updated_at
  BEFORE UPDATE ON user_food_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default preferences for existing users (optional)
INSERT INTO user_food_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_food_preferences)
ON CONFLICT (user_id) DO NOTHING;
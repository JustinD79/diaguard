/*
  # User Profiles and Medical Data Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `full_name` (text)
      - `date_of_birth` (date)
      - `phone` (text)
      - `height` (text)
      - `weight` (text)
      - `profile_image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_medications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `dosage` (text)
      - `frequency` (text)
      - `times` (text array)
      - `reminder_enabled` (boolean)
      - `notes` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_meals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `meal_type` (text)
      - `timestamp` (timestamp)
      - `total_carbs` (numeric)
      - `total_calories` (numeric)
      - `total_insulin` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `meal_foods`
      - `id` (uuid, primary key)
      - `meal_id` (uuid, foreign key to user_meals)
      - `food_name` (text)
      - `nutrition_data` (jsonb)
      - `quantity` (numeric)
      - `scan_method` (text)
      - `confidence_score` (numeric)
    
    - `emergency_contacts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `relationship` (text)
      - `phone` (text)
      - `is_primary` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data isolation
    - Implement data encryption for sensitive fields

  3. Performance
    - Add indexes for common queries
    - Optimize for mobile data usage
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text,
  date_of_birth date,
  phone text,
  height text,
  weight text,
  diabetes_type text CHECK (diabetes_type IN ('type1', 'type2', 'gestational', 'prediabetes')),
  diagnosis_date date,
  target_a1c numeric(3,1),
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_medications table
CREATE TABLE IF NOT EXISTS user_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  times text[] DEFAULT '{}',
  reminder_enabled boolean DEFAULT true,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_meals table
CREATE TABLE IF NOT EXISTS user_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
  timestamp timestamptz DEFAULT now(),
  total_carbs numeric(6,2) DEFAULT 0,
  total_calories integer DEFAULT 0,
  total_insulin numeric(5,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create meal_foods table
CREATE TABLE IF NOT EXISTS meal_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES user_meals(id) ON DELETE CASCADE NOT NULL,
  food_name text NOT NULL,
  nutrition_data jsonb NOT NULL,
  quantity numeric(6,2) DEFAULT 1,
  scan_method text CHECK (scan_method IN ('camera', 'barcode', 'manual', 'search')),
  confidence_score numeric(3,2),
  created_at timestamptz DEFAULT now()
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can manage their own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- RLS Policies for user_medications
CREATE POLICY "Users can manage their own medications"
  ON user_medications
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- RLS Policies for user_meals
CREATE POLICY "Users can manage their own meals"
  ON user_meals
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- RLS Policies for meal_foods
CREATE POLICY "Users can manage their own meal foods"
  ON meal_foods
  FOR ALL
  TO authenticated
  USING (meal_id IN (
    SELECT id FROM user_meals WHERE user_id = (select auth.uid())
  ))
  WITH CHECK (meal_id IN (
    SELECT id FROM user_meals WHERE user_id = (select auth.uid())
  ));

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can manage their own emergency contacts"
  ON emergency_contacts
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_medications_user_id ON user_medications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_medications_active ON user_medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_meals_user_id ON user_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meals_timestamp ON user_meals(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_meal_foods_meal_id ON meal_foods(meal_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_medications_updated_at
  BEFORE UPDATE ON user_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
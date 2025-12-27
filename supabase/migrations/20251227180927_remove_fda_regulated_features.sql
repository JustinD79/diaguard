/*
  # Remove FDA-Regulated Medical Features

  This migration removes all FDA-regulated medical device functionality from the database
  to ensure compliance with wellness app guidelines.

  ## Removed Features

  ### 1. CGM/Dexcom Integration
    - Drops `glucose_readings` table
    - Drops `dexcom_connections` table
    - Removes all blood glucose data storage

  ### 2. Emergency Medical Decision Support
    - Drops `emergency_events` table
    - Drops `medical_audit_logs` table
    - Drops `check_emergency_thresholds()` function
    - Drops `log_medical_action()` function

  ### 3. Insulin Calculation Data
    - Drops `user_food_preferences` table (stored insulin ratios)
    - Drops `meal_outcomes` table (tracked insulin vs glucose responses)
    - Removes `recommended_insulin` column from `food_analysis_reports` table

  ## Security
    - All related RLS policies are automatically dropped with tables

  ## Data Impact
    - ⚠️ This migration permanently deletes medical data
    - Users will need to consult healthcare providers for medical records
*/

-- Drop functions first (they may depend on tables)
DROP FUNCTION IF EXISTS check_emergency_thresholds(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS log_medical_action(uuid, text, text, text, jsonb) CASCADE;

-- Drop medical decision support tables
DROP TABLE IF EXISTS emergency_events CASCADE;
DROP TABLE IF EXISTS medical_audit_logs CASCADE;

-- Drop CGM/Dexcom integration tables
DROP TABLE IF EXISTS glucose_readings CASCADE;
DROP TABLE IF EXISTS dexcom_connections CASCADE;

-- Drop insulin calculation tables
DROP TABLE IF EXISTS meal_outcomes CASCADE;
DROP TABLE IF EXISTS user_food_preferences CASCADE;

-- Remove insulin calculation column from food_analysis_reports (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_analysis_reports'
    AND column_name = 'recommended_insulin'
  ) THEN
    ALTER TABLE food_analysis_reports DROP COLUMN recommended_insulin;
  END IF;
END $$;

-- Remove insulin-related columns from user profiles (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'insulin_to_carb_ratio'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN insulin_to_carb_ratio;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'insulin_sensitivity_factor'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN insulin_sensitivity_factor;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'target_blood_glucose'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN target_blood_glucose;
  END IF;
END $$;

-- Add comment documenting the change
COMMENT ON DATABASE postgres IS 'DiaGuard - FDA-compliant wellness app (non-medical device)';
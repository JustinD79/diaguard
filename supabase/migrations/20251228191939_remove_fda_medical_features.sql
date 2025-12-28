/*
  # Remove FDA-Regulated Medical Device Features

  This migration removes all medical device functionality to ensure FDA compliance.

  ## Tables Renamed (preserved for backup):
    - glucose_readings -> glucose_readings_deprecated
    - time_in_range_analytics -> time_in_range_analytics_deprecated
    - user_medical_profiles -> user_medical_profiles_deprecated
    - insulin_calculations -> insulin_calculations_deprecated

  ## Columns Removed from meal_logs:
    - insulin_dose
    - blood_glucose_before
    - blood_glucose_after

  ## Columns Removed from exercise_logs:
    - glucose_before
    - glucose_after
*/

-- Rename glucose_readings table
ALTER TABLE IF EXISTS glucose_readings RENAME TO glucose_readings_deprecated;

-- Rename time_in_range_analytics table
ALTER TABLE IF EXISTS time_in_range_analytics RENAME TO time_in_range_analytics_deprecated;

-- Rename user_medical_profiles table (contains insulin dosing parameters)
ALTER TABLE IF EXISTS user_medical_profiles RENAME TO user_medical_profiles_deprecated;

-- Rename insulin_calculations table
ALTER TABLE IF EXISTS insulin_calculations RENAME TO insulin_calculations_deprecated;

-- Remove insulin and glucose tracking from meal_logs
ALTER TABLE meal_logs DROP COLUMN IF EXISTS insulin_dose;
ALTER TABLE meal_logs DROP COLUMN IF EXISTS blood_glucose_before;
ALTER TABLE meal_logs DROP COLUMN IF EXISTS blood_glucose_after;

-- Remove glucose tracking from exercise_logs
ALTER TABLE exercise_logs DROP COLUMN IF EXISTS glucose_before;
ALTER TABLE exercise_logs DROP COLUMN IF EXISTS glucose_after;

-- Disable RLS on deprecated tables
ALTER TABLE IF EXISTS glucose_readings_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_in_range_analytics_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_medical_profiles_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insulin_calculations_deprecated DISABLE ROW LEVEL SECURITY;

-- Add comments documenting FDA compliance
COMMENT ON TABLE meal_logs IS 'Meal nutrition logs for educational awareness. This app provides estimated nutritional information for educational purposes only and does not provide medical advice.';
COMMENT ON TABLE exercise_logs IS 'Exercise tracking for lifestyle awareness. Not intended for medical decisions.';
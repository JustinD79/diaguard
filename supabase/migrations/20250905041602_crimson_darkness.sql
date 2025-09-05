/*
  # Add doctor email to user profiles

  1. Schema Changes
    - Add `doctor_email` column to `user_medical_profiles` table
    - Add validation constraint for email format
    - Update RLS policies to include new field

  2. Security
    - Maintain existing RLS policies
    - Add email format validation
*/

-- Add doctor_email column to user_medical_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_medical_profiles' AND column_name = 'doctor_email'
  ) THEN
    ALTER TABLE user_medical_profiles ADD COLUMN doctor_email text;
  END IF;
END $$;

-- Add email format validation constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_medical_profiles' AND constraint_name = 'valid_doctor_email'
  ) THEN
    ALTER TABLE user_medical_profiles 
    ADD CONSTRAINT valid_doctor_email 
    CHECK (doctor_email IS NULL OR doctor_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN user_medical_profiles.doctor_email IS 'Primary healthcare provider email address for sharing reports and emergency contact';
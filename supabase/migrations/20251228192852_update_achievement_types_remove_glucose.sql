/*
  # Update Achievement Types - Remove Glucose Control

  Remove 'glucose_control' achievement type to ensure FDA compliance.
  Only keep nutrition and fitness-related achievements.

  ## Changes:
    - Update user_achievements.achievement_type constraint
    - Remove 'glucose_control' from allowed values
    - Keep: 'logging_streak', 'meal_milestone', 'exercise', 'hydration', 'special'

  ## Rationale:
  MyFitnessPal has achievements for logging, meals, exercise, and habits - but not
  for medical outcomes like glucose control.
*/

-- Drop the existing check constraint
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_achievement_type_check;

-- Add new constraint without 'glucose_control'
ALTER TABLE user_achievements 
ADD CONSTRAINT user_achievements_achievement_type_check 
CHECK (achievement_type = ANY (ARRAY['logging_streak'::text, 'meal_milestone'::text, 'exercise'::text, 'hydration'::text, 'special'::text]));

-- Delete any existing glucose_control achievements
DELETE FROM user_achievements 
WHERE achievement_type = 'glucose_control';

-- Add comment
COMMENT ON COLUMN user_achievements.achievement_type IS 'Type of achievement: logging_streak (consistency), meal_milestone (logging milestones), exercise (fitness goals), hydration (water intake), special (unique achievements). Glucose control removed for FDA compliance.';
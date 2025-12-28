/*
  # Update Reminder Types - Remove Medical Testing

  This migration removes the 'testing' reminder type (blood glucose testing)
  to ensure FDA compliance. Only nutrition and fitness reminders remain.

  ## Changes:
    - Update user_reminders.reminder_type constraint
    - Remove 'testing' from allowed values
    - Keep: 'meal', 'exercise', 'hydration' (all MFP-compliant)

  ## Rationale:
  MyFitnessPal only has meal, exercise, and hydration reminders.
  'Testing' reminders imply medical device functionality (glucose monitoring).
*/

-- Drop the existing check constraint
ALTER TABLE user_reminders DROP CONSTRAINT IF EXISTS user_reminders_reminder_type_check;

-- Add new constraint without 'testing'
ALTER TABLE user_reminders 
ADD CONSTRAINT user_reminders_reminder_type_check 
CHECK (reminder_type = ANY (ARRAY['meal'::text, 'exercise'::text, 'hydration'::text]));

-- Update any existing 'testing' reminders to be disabled
UPDATE user_reminders 
SET enabled = false 
WHERE reminder_type = 'testing';

-- Add comment
COMMENT ON COLUMN user_reminders.reminder_type IS 'Type of reminder: meal (log food), exercise (workout reminder), hydration (water intake). Medical testing reminders removed for FDA compliance.';
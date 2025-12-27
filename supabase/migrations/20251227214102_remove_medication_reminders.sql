/*
  # Remove Medication Reminders

  ## Changes
  - Update user_reminders table to remove 'medication' from reminder_type constraint
  - Delete any existing medication reminders from the database

  ## Notes
  - This removes medication tracking features due to liability concerns
  - Users should track medications with their healthcare provider
*/

-- First, delete any existing medication reminders
DELETE FROM user_reminders WHERE reminder_type = 'medication';

-- Drop the existing constraint
ALTER TABLE user_reminders DROP CONSTRAINT IF EXISTS user_reminders_reminder_type_check;

-- Add the new constraint without 'medication'
ALTER TABLE user_reminders ADD CONSTRAINT user_reminders_reminder_type_check 
  CHECK (reminder_type IN ('meal', 'testing', 'exercise', 'hydration'));
/*
  # Fix RLS Policy Conflict for Promo Codes Table

  This migration resolves the duplicate policy error by safely managing
  the "Anyone can read active promo codes" policy on the promo_codes table.

  ## Changes Made:
  1. Check if policy exists before creating
  2. Drop existing policy if it needs to be updated
  3. Recreate policy with proper permissions
  4. Ensure idempotent execution

  ## Safety Features:
  - Uses conditional logic to prevent errors
  - Can be run multiple times safely
  - Preserves existing data and table structure
*/

-- Step 1: Check if the policy exists and drop it if necessary
DO $$
BEGIN
  -- Check if the policy exists
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'promo_codes' 
    AND policyname = 'Anyone can read active promo codes'
  ) THEN
    -- Drop the existing policy
    DROP POLICY "Anyone can read active promo codes" ON promo_codes;
    RAISE NOTICE 'Existing policy "Anyone can read active promo codes" has been dropped';
  ELSE
    RAISE NOTICE 'Policy "Anyone can read active promo codes" does not exist, proceeding with creation';
  END IF;
END $$;

-- Step 2: Ensure RLS is enabled on the table
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Step 3: Create the policy with proper conditions
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (
    active = true 
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  );

-- Step 4: Verify the policy was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'promo_codes' 
    AND policyname = 'Anyone can read active promo codes'
  ) THEN
    RAISE NOTICE 'Policy "Anyone can read active promo codes" created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create policy "Anyone can read active promo codes"';
  END IF;
END $$;

-- Step 5: Grant necessary permissions to authenticated users
GRANT SELECT ON promo_codes TO authenticated;

-- Step 6: Add helpful comment to the policy for documentation
COMMENT ON POLICY "Anyone can read active promo codes" ON promo_codes IS 
'Allows authenticated users to read active, non-expired promo codes that have not reached their usage limit';
/*
  # Safe RLS Policy Management for Promo Codes

  This migration safely creates or updates the Row Level Security policy for the promo_codes table.
  It handles existing policy conflicts and ensures idempotent execution.

  ## Changes Made:
  1. Safely drop existing policy if present
  2. Create new policy with proper conditions
  3. Verify policy creation
  4. Enable RLS if not already enabled

  ## Policy Details:
  - **Name:** "Anyone can read active promo codes"
  - **Table:** promo_codes
  - **Operation:** SELECT
  - **Condition:** active = true
  - **Target Role:** authenticated users
*/

-- Step 1: Enable Row Level Security on the table (if not already enabled)
-- This is safe to run multiple times
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Step 2: Safely remove existing policy if it exists
-- Using IF EXISTS prevents errors if the policy doesn't exist
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON promo_codes;

-- Step 3: Create the new policy with clear conditions
-- This policy allows authenticated users to read only active promo codes
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
-- This query will show the policy details for confirmation
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies with our specific name
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'promo_codes'
    AND policyname = 'Anyone can read active promo codes';
  
  -- Log the result
  IF policy_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Policy "Anyone can read active promo codes" created successfully';
  ELSE
    RAISE WARNING 'ISSUE: Policy creation may have failed. Found % policies with this name', policy_count;
  END IF;
END $$;

-- Step 5: Ensure proper permissions are granted
-- Grant SELECT permission to authenticated role (if not already granted)
GRANT SELECT ON promo_codes TO authenticated;

-- Step 6: Add helpful comment to the policy for documentation
COMMENT ON POLICY "Anyone can read active promo codes" ON promo_codes IS 
  'Allows authenticated users to read active, non-expired promo codes that have not exceeded usage limits';

-- Step 7: Optional verification query (commented out for production)
-- Uncomment this section if you want to see the policy details after creation
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'promo_codes' 
  AND policyname = 'Anyone can read active promo codes';
*/
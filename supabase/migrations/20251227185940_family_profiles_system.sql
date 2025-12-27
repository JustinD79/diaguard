/*
  # Family Profiles System

  ## Summary
  Creates a comprehensive family profile management system allowing users to create household groups and manage family member profiles with appropriate privacy controls. Uses different naming to avoid conflict with existing subscription-based family_members table.

  ## New Tables

  ### `family_groups`
  Family/household groups that users can create and manage (separate from subscription families).
  - `id` (uuid, primary key) - Unique family identifier
  - `name` (text) - Family/household name
  - `created_by` (uuid) - User who created the family (references auth.users)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `family_profiles`
  Individual family member profiles within a family group.
  - `id` (uuid, primary key) - Unique profile identifier
  - `family_group_id` (uuid) - Parent family (references family_groups)
  - `user_id` (uuid, nullable) - Connected auth user (references auth.users)
  - `name` (text) - Member's display name
  - `date_of_birth` (date, nullable) - Birth date for age calculations
  - `relationship` (text) - Relationship to family creator (parent, child, spouse, etc.)
  - `avatar_url` (text, nullable) - Profile picture URL
  - `is_primary` (boolean) - Whether this is the primary/default profile
  - `preferences` (jsonb) - Member-specific preferences
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `family_profile_permissions`
  Controls what family members can see and do with each other's data.
  - `id` (uuid, primary key) - Permission record ID
  - `family_group_id` (uuid) - Family group (references family_groups)
  - `profile_id` (uuid) - Family profile (references family_profiles)
  - `granted_by` (uuid) - User who granted permission (references auth.users)
  - `can_view_meals` (boolean) - Can view meal logs
  - `can_view_reports` (boolean) - Can view generated reports
  - `can_edit_profile` (boolean) - Can edit the member profile
  - `created_at` (timestamptz) - When permission was granted
  - `updated_at` (timestamptz) - Last permission update

  ### `family_meal_shares`
  Tracks which meals are shared with family members.
  - `id` (uuid, primary key) - Share record ID
  - `meal_id` (uuid) - Meal being shared (references meal_logs)
  - `family_group_id` (uuid) - Family group (references family_groups)
  - `shared_by` (uuid) - User who shared (references auth.users)
  - `shared_with_profile_id` (uuid, nullable) - Specific profile (null = all family)
  - `created_at` (timestamptz) - When meal was shared

  ## Security (RLS)
  - All tables have RLS enabled
  - Users can only access families they belong to
  - Only family creators and authorized members can manage permissions
  - Meal sharing respects both family membership and explicit permissions

  ## Indexes
  - family_group_id indexes for efficient family lookups
  - user_id indexes for user-based queries
  - composite indexes for permission checks
*/

-- Create family_groups table
CREATE TABLE IF NOT EXISTS family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create family_profiles table
CREATE TABLE IF NOT EXISTS family_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  date_of_birth date,
  relationship text,
  avatar_url text,
  is_primary boolean DEFAULT false,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create family_profile_permissions table
CREATE TABLE IF NOT EXISTS family_profile_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES family_profiles(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_meals boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_edit_profile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_group_id, profile_id)
);

-- Create family_meal_shares table
CREATE TABLE IF NOT EXISTS family_meal_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
  family_group_id uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_profile_id uuid REFERENCES family_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_groups_created_by ON family_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_family_profiles_family_group_id ON family_profiles(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_profiles_user_id ON family_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_family_profile_permissions_family_group_id ON family_profile_permissions(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_profile_permissions_profile_id ON family_profile_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_family_meal_shares_meal_id ON family_meal_shares(meal_id);
CREATE INDEX IF NOT EXISTS idx_family_meal_shares_family_group_id ON family_meal_shares(family_group_id);

-- Enable RLS
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_profile_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meal_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_groups table
CREATE POLICY "Users can view families they created or belong to"
  ON family_groups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_profiles
      WHERE family_profiles.family_group_id = family_groups.id
      AND family_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create families"
  ON family_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Family creators can update their families"
  ON family_groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Family creators can delete their families"
  ON family_groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for family_profiles table
CREATE POLICY "Users can view profiles of their families"
  ON family_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profiles.family_group_id
      AND (
        family_groups.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM family_profiles fp
          WHERE fp.family_group_id = family_groups.id
          AND fp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Family creators can add profiles"
  ON family_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profiles.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update profiles if authorized"
  ON family_profiles FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profiles.family_group_id
      AND family_groups.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM family_profile_permissions
      WHERE family_profile_permissions.profile_id = family_profiles.id
      AND family_profile_permissions.can_edit_profile = true
      AND EXISTS (
        SELECT 1 FROM family_profiles fp
        WHERE fp.id = family_profile_permissions.profile_id
        AND fp.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profiles.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Family creators can delete profiles"
  ON family_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profiles.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  );

-- RLS Policies for family_profile_permissions table
CREATE POLICY "Users can view permissions for their families"
  ON family_profile_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profile_permissions.family_group_id
      AND (
        family_groups.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM family_profiles fp
          WHERE fp.family_group_id = family_groups.id
          AND fp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Family creators can manage permissions"
  ON family_profile_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profile_permissions.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Family creators can update permissions"
  ON family_profile_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profile_permissions.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profile_permissions.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Family creators can delete permissions"
  ON family_profile_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_profile_permissions.family_group_id
      AND family_groups.created_by = auth.uid()
    )
  );

-- RLS Policies for family_meal_shares table
CREATE POLICY "Users can view meal shares for their families"
  ON family_meal_shares FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_profiles
      WHERE family_profiles.family_group_id = family_meal_shares.family_group_id
      AND family_profiles.user_id = auth.uid()
      AND (
        family_meal_shares.shared_with_profile_id IS NULL OR
        family_meal_shares.shared_with_profile_id = family_profiles.id
      )
    )
  );

CREATE POLICY "Users can share their own meals"
  ON family_meal_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = family_meal_shares.meal_id
      AND meal_logs.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM family_groups
      WHERE family_groups.id = family_meal_shares.family_group_id
      AND (
        family_groups.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM family_profiles
          WHERE family_profiles.family_group_id = family_groups.id
          AND family_profiles.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete their own meal shares"
  ON family_meal_shares FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_family_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_family_groups_updated_at ON family_groups;
CREATE TRIGGER update_family_groups_updated_at
  BEFORE UPDATE ON family_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_family_updated_at();

DROP TRIGGER IF EXISTS update_family_profiles_updated_at ON family_profiles;
CREATE TRIGGER update_family_profiles_updated_at
  BEFORE UPDATE ON family_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_family_updated_at();

DROP TRIGGER IF EXISTS update_family_profile_permissions_updated_at ON family_profile_permissions;
CREATE TRIGGER update_family_profile_permissions_updated_at
  BEFORE UPDATE ON family_profile_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_family_updated_at();

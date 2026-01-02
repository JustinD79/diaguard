/*
  # Lifestyle Correlation & Analytics System
  
  1. New Tables
    - `lifestyle_correlations`: Tracked correlations between different health factors
    - `lifestyle_insights`: Generated insights from correlation analysis
    - `lifestyle_recommendations`: Personalized lifestyle recommendations
    - `lifestyle_achievement_badges`: User achievements and milestones
    - `lifestyle_notifications`: Smart notifications for all modules
    
  2. Security
    - Enable RLS on all tables
    - Add policies for user data access control
*/

CREATE TABLE IF NOT EXISTS lifestyle_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  factor_1 text NOT NULL,
  factor_2 text NOT NULL,
  correlation_coefficient numeric(3, 2),
  correlation_strength text,
  sample_size integer,
  time_period text,
  is_significant boolean DEFAULT false,
  notes text,
  analysis_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, factor_1, factor_2, analysis_date)
);

CREATE TABLE IF NOT EXISTS lifestyle_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_type text NOT NULL,
  insight_title text,
  insight_description text,
  related_data jsonb DEFAULT '{}'::jsonb,
  confidence_level numeric(3, 2),
  actionable_recommendations text[],
  generated_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  importance_level text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifestyle_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL,
  title text,
  description text,
  action_steps text[],
  expected_benefits text[],
  priority_score integer CHECK (priority_score >= 1 AND priority_score <= 10),
  time_frame text,
  related_factors text[],
  is_active boolean DEFAULT true,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifestyle_achievement_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type text NOT NULL,
  badge_name text,
  badge_description text,
  badge_icon text,
  progress_percent numeric(5, 2) DEFAULT 0,
  is_earned boolean DEFAULT false,
  earned_at timestamptz,
  category text,
  points_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS lifestyle_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  title text,
  message text,
  priority text DEFAULT 'medium',
  action_url text,
  related_module text,
  is_read boolean DEFAULT false,
  is_sent boolean DEFAULT false,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifestyle_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  data_sharing_preferences jsonb DEFAULT '{}'::jsonb,
  module_settings jsonb DEFAULT '{}'::jsonb,
  privacy_level text DEFAULT 'private',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_lifestyle_correlations_user_date ON lifestyle_correlations(user_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_lifestyle_insights_user_date ON lifestyle_insights(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifestyle_insights_read ON lifestyle_insights(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_lifestyle_recommendations_user_active ON lifestyle_recommendations(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lifestyle_badges_user_earned ON lifestyle_achievement_badges(user_id, is_earned) WHERE is_earned = true;
CREATE INDEX IF NOT EXISTS idx_lifestyle_notifications_user_sent ON lifestyle_notifications(user_id, is_sent) WHERE is_sent = false;

ALTER TABLE lifestyle_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_achievement_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own correlations" ON lifestyle_correlations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own correlations" ON lifestyle_correlations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own correlations" ON lifestyle_correlations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own insights" ON lifestyle_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own insights" ON lifestyle_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own insights" ON lifestyle_insights FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own recommendations" ON lifestyle_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recommendations" ON lifestyle_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recommendations" ON lifestyle_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own badges" ON lifestyle_achievement_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own badges" ON lifestyle_achievement_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own badges" ON lifestyle_achievement_badges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own notifications" ON lifestyle_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON lifestyle_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON lifestyle_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own preferences" ON lifestyle_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own preferences" ON lifestyle_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON lifestyle_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
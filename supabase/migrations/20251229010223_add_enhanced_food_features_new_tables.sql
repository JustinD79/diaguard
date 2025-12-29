/*
  # Enhanced Food Features - New Tables Only
  
  ## New Tables
  - recent_meals: Recently logged meals for "eat again"
  - restaurant_chains: Chain restaurant master data
  - restaurant_menu_items: Menu items with nutritional data
  - user_restaurant_contributions: User-contributed restaurant meals
  - custom_foods: Custom food library (recipes, homemade)
  - shared_recipes: Community-shared recipes
  - recipe_reviews: Recipe ratings and reviews
  - recipe_saves: Saved recipes
  - portion_size_references: Visual portion guides
  - food_usage_stats: Analytics for suggestions
  - meal_combination_patterns: Meal pairing analytics
*/

-- Enums
DO $$ BEGIN
  CREATE TYPE recipe_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE contribution_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Recent Meals
CREATE TABLE IF NOT EXISTS recent_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_name text NOT NULL,
  meal_type text,
  food_items jsonb NOT NULL,
  total_nutrition jsonb NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  location text,
  notes text,
  times_repeated integer DEFAULT 1,
  last_repeated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Restaurant Chains
CREATE TABLE IF NOT EXISTS restaurant_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_name text UNIQUE NOT NULL,
  logo_url text,
  website_url text,
  cuisine_type text[],
  country_availability text[],
  has_nutritional_data boolean DEFAULT true,
  data_source text,
  data_last_updated timestamptz,
  is_verified boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Restaurant Menu Items
CREATE TABLE IF NOT EXISTS restaurant_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_chain_id uuid REFERENCES restaurant_chains(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  description text,
  category text,
  serving_size text,
  calories numeric(7,2),
  total_carbs numeric(6,2),
  dietary_fiber numeric(5,2),
  sugars numeric(5,2),
  protein numeric(6,2),
  total_fat numeric(6,2),
  saturated_fat numeric(5,2),
  trans_fat numeric(5,2),
  cholesterol numeric(6,2),
  sodium numeric(6,2),
  net_carbs numeric(6,2) GENERATED ALWAYS AS (total_carbs - COALESCE(dietary_fiber, 0)) STORED,
  glycemic_index integer,
  glycemic_load numeric(5,2),
  allergens text[],
  dietary_tags text[],
  price_usd numeric(6,2),
  availability_regions text[],
  is_available boolean DEFAULT true,
  image_url text,
  nutritional_source text,
  verified_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_chain_id, item_name)
);

-- User Restaurant Contributions
CREATE TABLE IF NOT EXISTS user_restaurant_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_name text NOT NULL,
  is_chain boolean DEFAULT false,
  restaurant_chain_id uuid REFERENCES restaurant_chains(id) ON DELETE SET NULL,
  location text,
  item_name text NOT NULL,
  description text,
  serving_size text,
  nutritional_data jsonb NOT NULL,
  photo_url text,
  submission_status contribution_status DEFAULT 'pending',
  verification_notes text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  times_logged integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Custom Foods
CREATE TABLE IF NOT EXISTS custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name text NOT NULL,
  description text,
  food_type text CHECK (food_type IN ('recipe', 'homemade', 'packaged', 'meal', 'ingredient')),
  serving_size text,
  servings_per_recipe integer DEFAULT 1,
  nutritional_data jsonb NOT NULL,
  ingredients jsonb DEFAULT '[]'::jsonb,
  preparation_steps text[],
  prep_time_minutes integer,
  cook_time_minutes integer,
  difficulty recipe_difficulty,
  category text,
  cuisine_type text,
  dietary_tags text[],
  allergens text[],
  equipment_needed text[],
  photo_urls text[],
  video_url text,
  source_url text,
  notes text,
  is_favorite boolean DEFAULT false,
  times_made integer DEFAULT 0,
  last_made_at timestamptz,
  rating numeric(2,1) CHECK (rating >= 0 AND rating <= 5),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shared Recipes
CREATE TABLE IF NOT EXISTS shared_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_food_id uuid REFERENCES custom_foods(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_scope text CHECK (share_scope IN ('family', 'public', 'link')) DEFAULT 'public',
  share_link_token text UNIQUE,
  recipe_data jsonb NOT NULL,
  views_count integer DEFAULT 0,
  saves_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  avg_rating numeric(2,1) DEFAULT 0,
  is_featured boolean DEFAULT false,
  featured_at timestamptz,
  tags text[],
  searchable_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recipe Reviews
CREATE TABLE IF NOT EXISTS recipe_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_recipe_id uuid REFERENCES shared_recipes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating numeric(2,1) CHECK (rating >= 0 AND rating <= 5) NOT NULL,
  review_text text,
  would_make_again boolean,
  modifications text,
  photo_urls text[],
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shared_recipe_id, user_id)
);

-- Recipe Saves
CREATE TABLE IF NOT EXISTS recipe_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_recipe_id uuid REFERENCES shared_recipes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  collection_name text DEFAULT 'Saved Recipes',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shared_recipe_id, user_id)
);

-- Portion Size References
CREATE TABLE IF NOT EXISTS portion_size_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_category text NOT NULL,
  food_item text NOT NULL,
  visual_reference text NOT NULL,
  household_measurement text NOT NULL,
  weight_grams numeric(7,2) NOT NULL,
  volume_ml numeric(7,2),
  equivalent_descriptions text[],
  comparison_images text[],
  typical_serving_size text,
  notes text,
  source text,
  is_verified boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Food Usage Stats
CREATE TABLE IF NOT EXISTS food_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_identifier text NOT NULL,
  food_name text NOT NULL,
  food_type text NOT NULL CHECK (food_type IN ('favorite', 'recent', 'template', 'restaurant', 'custom')),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  usage_count integer DEFAULT 1,
  avg_rating numeric(2,1),
  typical_meal_type text,
  typical_time_of_day text,
  day_of_week_usage integer[],
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, food_identifier, food_type)
);

-- Meal Combination Patterns
CREATE TABLE IF NOT EXISTS meal_combination_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  primary_food text NOT NULL,
  frequently_combined_with text[] NOT NULL,
  combination_count integer DEFAULT 1,
  last_combined_at timestamptz DEFAULT now(),
  meal_types text[],
  avg_total_carbs numeric(6,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recent_meals_user_time ON recent_meals(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_meals_repeated ON recent_meals(user_id, times_repeated DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_chains_name ON restaurant_chains(chain_name);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_chain ON restaurant_menu_items(restaurant_chain_id, category);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_name ON restaurant_menu_items(item_name);
CREATE INDEX IF NOT EXISTS idx_user_contributions_status ON user_restaurant_contributions(submission_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_foods_user_type ON custom_foods(user_id, food_type, is_favorite);
CREATE INDEX IF NOT EXISTS idx_shared_recipes_scope ON shared_recipes(share_scope, is_featured);
CREATE INDEX IF NOT EXISTS idx_shared_recipes_search ON shared_recipes USING gin(to_tsvector('english', COALESCE(searchable_text, '')));
CREATE INDEX IF NOT EXISTS idx_portion_refs_category ON portion_size_references(food_category, food_item);
CREATE INDEX IF NOT EXISTS idx_food_usage_user ON food_usage_stats(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_usage_type ON food_usage_stats(user_id, food_type, usage_count DESC);

-- Enable RLS
ALTER TABLE recent_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurant_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE portion_size_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_combination_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own recent" ON recent_meals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recent" ON recent_meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recent" ON recent_meals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own recent" ON recent_meals FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View restaurant chains" ON restaurant_chains FOR SELECT TO authenticated USING (true);
CREATE POLICY "View menu items" ON restaurant_menu_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "View contributions" ON user_restaurant_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id OR submission_status = 'approved');
CREATE POLICY "Insert contributions" ON user_restaurant_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update contributions" ON user_restaurant_contributions FOR UPDATE TO authenticated USING (auth.uid() = user_id AND submission_status = 'pending') WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete contributions" ON user_restaurant_contributions FOR DELETE TO authenticated USING (auth.uid() = user_id AND submission_status = 'pending');

CREATE POLICY "View custom foods" ON custom_foods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert custom foods" ON custom_foods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update custom foods" ON custom_foods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete custom foods" ON custom_foods FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View shared recipes" ON shared_recipes FOR SELECT TO authenticated USING (share_scope = 'public' OR shared_by = auth.uid());
CREATE POLICY "Insert shared recipes" ON shared_recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = shared_by);
CREATE POLICY "Update shared recipes" ON shared_recipes FOR UPDATE TO authenticated USING (auth.uid() = shared_by) WITH CHECK (auth.uid() = shared_by);
CREATE POLICY "Delete shared recipes" ON shared_recipes FOR DELETE TO authenticated USING (auth.uid() = shared_by);

CREATE POLICY "View reviews" ON recipe_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert reviews" ON recipe_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update reviews" ON recipe_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete reviews" ON recipe_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View saves" ON recipe_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert saves" ON recipe_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete saves" ON recipe_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View portions" ON portion_size_references FOR SELECT TO authenticated USING (true);

CREATE POLICY "View usage stats" ON food_usage_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert usage stats" ON food_usage_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update usage stats" ON food_usage_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View patterns" ON meal_combination_patterns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert patterns" ON meal_combination_patterns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update patterns" ON meal_combination_patterns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_food_usage_stats(
  p_user_id uuid,
  p_food_identifier text,
  p_food_name text,
  p_food_type text,
  p_meal_type text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO food_usage_stats (user_id, food_identifier, food_name, food_type, last_used_at, usage_count, typical_meal_type)
  VALUES (p_user_id, p_food_identifier, p_food_name, p_food_type, now(), 1, p_meal_type)
  ON CONFLICT (user_id, food_identifier, food_type)
  DO UPDATE SET
    last_used_at = now(),
    usage_count = food_usage_stats.usage_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_smart_food_suggestions(
  p_user_id uuid,
  p_meal_type text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  food_identifier text,
  food_name text,
  food_type text,
  usage_count integer,
  last_used_at timestamptz,
  relevance_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fus.food_identifier,
    fus.food_name,
    fus.food_type,
    fus.usage_count,
    fus.last_used_at,
    (
      (fus.usage_count::numeric / 100) * 0.4 +
      (EXTRACT(EPOCH FROM (now() - fus.last_used_at)) / 86400)::numeric * (-0.1) +
      CASE WHEN fus.typical_meal_type = p_meal_type THEN 0.5 ELSE 0 END
    ) AS relevance_score
  FROM food_usage_stats fus
  WHERE fus.user_id = p_user_id
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

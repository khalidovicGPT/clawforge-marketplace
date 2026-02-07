-- ClawForge Database Schema
-- Version: 1.0
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('user', 'creator', 'admin');
CREATE TYPE skill_status AS ENUM ('draft', 'pending', 'certified', 'published', 'rejected');
CREATE TYPE certification AS ENUM ('none', 'bronze', 'silver', 'gold');
CREATE TYPE license_type AS ENUM ('MIT', 'Apache-2.0', 'Proprietary');
CREATE TYPE price_type AS ENUM ('free', 'one_time');
CREATE TYPE purchase_type AS ENUM ('purchase', 'free_download');
CREATE TYPE scan_result AS ENUM ('clean', 'suspicious', 'malicious', 'pending');

-- ============================================
-- TABLES
-- ============================================

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description_short TEXT NOT NULL CHECK (char_length(description_short) <= 200),
  description_long TEXT,
  category TEXT NOT NULL,
  price INTEGER, -- in cents
  price_type price_type NOT NULL DEFAULT 'free',
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status skill_status NOT NULL DEFAULT 'draft',
  certification certification NOT NULL DEFAULT 'none',
  license license_type NOT NULL DEFAULT 'MIT',
  support_url TEXT NOT NULL,
  repository_url TEXT,
  file_url TEXT,
  file_size INTEGER, -- in bytes
  file_hash TEXT, -- SHA-256
  icon_url TEXT,
  downloads_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(2,1),
  rating_count INTEGER DEFAULT 0,
  version TEXT NOT NULL DEFAULT '1.0.0',
  openclaw_min_version TEXT,
  submitted_at TIMESTAMPTZ,
  certified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_price CHECK (
    (price_type = 'free' AND (price IS NULL OR price = 0)) OR
    (price_type = 'one_time' AND price >= 500) -- min 5€
  )
);

-- Purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  type purchase_type NOT NULL,
  price_paid INTEGER NOT NULL DEFAULT 0, -- in cents
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only purchase a skill once
  UNIQUE(user_id, skill_id)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only review a skill once
  UNIQUE(user_id, skill_id)
);

-- Skill Tests (certification results)
CREATE TABLE skill_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  virustotal_scan_id TEXT,
  virustotal_result scan_result,
  lint_passed BOOLEAN DEFAULT FALSE,
  structure_valid BOOLEAN DEFAULT FALSE,
  metadata_valid BOOLEAN DEFAULT FALSE,
  test_results_json JSONB,
  recommended_certification certification,
  tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_creator_id ON skills(creator_id);
CREATE INDEX idx_skills_certification ON skills(certification);
CREATE INDEX idx_skills_slug ON skills(slug);
CREATE INDEX idx_skills_published ON skills(published_at) WHERE status = 'published';

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_skill_id ON purchases(skill_id);

CREATE INDEX idx_reviews_skill_id ON reviews(skill_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

CREATE INDEX idx_skill_tests_skill_id ON skill_tests(skill_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update skill rating when review is added/updated
CREATE OR REPLACE FUNCTION update_skill_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE skills SET
    rating_avg = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE skill_id = COALESCE(NEW.skill_id, OLD.skill_id)),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE skill_id = COALESCE(NEW.skill_id, OLD.skill_id))
  WHERE id = COALESCE(NEW.skill_id, OLD.skill_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment download count
CREATE OR REPLACE FUNCTION increment_downloads(skill_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE skills SET downloads_count = downloads_count + 1 WHERE id = skill_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_skill_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_rating();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_tests ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Anyone can view creator profiles"
  ON users FOR SELECT
  USING (role = 'creator');

-- Skills policies
CREATE POLICY "Anyone can view published skills"
  ON skills FOR SELECT
  USING (status = 'published');

CREATE POLICY "Creators can view their own skills"
  ON skills FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own skills"
  ON skills FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their own skills"
  ON skills FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can do anything on skills"
  ON skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Purchases policies
CREATE POLICY "Users can view their own purchases"
  ON purchases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create purchases for themselves"
  ON purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Creators can view purchases of their skills"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid()
    )
  );

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (user_id = auth.uid());

-- Skill tests policies (admin/service only)
CREATE POLICY "Admins can view skill tests"
  ON skill_tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- HANDLE NEW USER
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Skills storage bucket (run in Supabase dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('skills', 'skills', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('icons', 'icons', true);

-- Storage policies will be configured via Supabase dashboard

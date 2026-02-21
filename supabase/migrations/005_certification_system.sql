-- ============================================
-- CERTIFICATION SYSTEM (Sprint 2)
-- ============================================
-- Automatisation Bronze/Silver/Gold + queue de validation

-- 1. Table des certifications attribuees
CREATE TABLE IF NOT EXISTS skill_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('bronze', 'silver', 'gold')),
  score INTEGER,
  certified_at TIMESTAMPTZ DEFAULT NOW(),
  certified_by UUID REFERENCES users(id),
  criteria JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_certifications_skill ON skill_certifications(skill_id);
CREATE INDEX idx_skill_certifications_level ON skill_certifications(level);

ALTER TABLE skill_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view certifications"
  ON skill_certifications FOR SELECT USING (true);

-- 2. File de validation
CREATE TABLE IF NOT EXISTS skill_validation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'bronze_auto', 'pending_silver_review', 'silver_approved', 'gold_eligible', 'rejected')),
  bronze_score INTEGER,
  silver_score INTEGER,
  bronze_criteria JSONB,
  silver_criteria JSONB,
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validation_queue_status ON skill_validation_queue(status);
CREATE INDEX idx_validation_queue_skill ON skill_validation_queue(skill_id);

ALTER TABLE skill_validation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own validation status"
  ON skill_validation_queue FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid())
  );

CREATE POLICY "Anyone can view validation queue"
  ON skill_validation_queue FOR SELECT USING (true);

-- 3. Revues de securite (QualityClaw)
CREATE TABLE IF NOT EXISTS skill_security_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  reviewer_name TEXT DEFAULT 'QualityClaw',
  findings JSONB,
  network_calls TEXT[],
  file_access TEXT[],
  recommendations TEXT[],
  score INTEGER,
  verdict TEXT CHECK (verdict IN ('approve', 'reject', 'request_changes')),
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_reviews_skill ON skill_security_reviews(skill_id);

ALTER TABLE skill_security_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view security reviews"
  ON skill_security_reviews FOR SELECT USING (true);

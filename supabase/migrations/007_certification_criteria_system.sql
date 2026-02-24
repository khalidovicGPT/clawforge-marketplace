-- ============================================
-- CERTIFICATION CRITERIA SYSTEM (Sprint 3)
-- ============================================
-- Systeme complet de certification Silver/Gold avec criteres,
-- checks individuels et workflow de demande.

-- 1. Nouvelles colonnes sur skills
ALTER TABLE skills ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS certification_requested_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS certification_reviewed_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS certification_reviewer_id UUID REFERENCES auth.users(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS certification_feedback TEXT;

-- 2. Table des criteres de certification
CREATE TABLE IF NOT EXISTS certification_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(10) NOT NULL CHECK (level IN ('bronze', 'silver', 'gold')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  auto_checkable BOOLEAN DEFAULT false,
  weight INTEGER DEFAULT 0,
  check_query TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certification_criteria_level ON certification_criteria(level);

ALTER TABLE certification_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view certification criteria"
  ON certification_criteria FOR SELECT USING (true);

-- 3. Table des checks individuels par skill
CREATE TABLE IF NOT EXISTS skill_certification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  criteria_id UUID REFERENCES certification_criteria(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'passed', 'failed')),
  value TEXT,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(skill_id, criteria_id)
);

CREATE INDEX idx_skill_cert_checks_skill ON skill_certification_checks(skill_id);
CREATE INDEX idx_skill_cert_checks_criteria ON skill_certification_checks(criteria_id);

ALTER TABLE skill_certification_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own skill checks"
  ON skill_certification_checks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid())
  );

CREATE POLICY "Admins can manage skill checks"
  ON skill_certification_checks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Table des demandes de certification
CREATE TABLE IF NOT EXISTS certification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  requested_level VARCHAR(10) NOT NULL CHECK (requested_level IN ('silver', 'gold')),
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  quality_score_at_request INTEGER
);

CREATE INDEX idx_cert_requests_skill ON certification_requests(skill_id);
CREATE INDEX idx_cert_requests_status ON certification_requests(status);
CREATE INDEX idx_cert_requests_requested_by ON certification_requests(requested_by);

ALTER TABLE certification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own certification requests"
  ON certification_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid())
  );

CREATE POLICY "Creators can create certification requests for their skills"
  ON certification_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid())
  );

CREATE POLICY "Admins can manage all certification requests"
  ON certification_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Seed data — Criteres de certification

-- BRONZE (attribution automatique a l'upload)
INSERT INTO certification_criteria (level, name, description, auto_checkable, weight) VALUES
  ('bronze', 'code_review', 'Code review basique effectue', true, 25),
  ('bronze', 'documentation', 'Documentation minimale presente', true, 25),
  ('bronze', 'basic_tests', 'Tests automatiques basiques', true, 25),
  ('bronze', 'security_scan', 'Scan de securite VirusTotal passe', true, 25);

-- SILVER
INSERT INTO certification_criteria (level, name, description, auto_checkable, weight) VALUES
  ('silver', 'quality_score', 'Score qualite global >= 80%', true, 20),
  ('silver', 'documentation_complete', 'README complet + API docs', true, 15),
  ('silver', 'test_coverage', 'Couverture de tests >= 70%', true, 15),
  ('silver', 'i18n_support', 'Support multi-langues (i18n)', false, 10),
  ('silver', 'sales_minimum', '5 ventes reussies minimum', true, 15),
  ('silver', 'no_critical_bugs', 'Aucun bug critique (30 derniers jours)', true, 15),
  ('silver', 'code_quality', 'Linting sans erreurs critiques', true, 10);

-- GOLD
INSERT INTO certification_criteria (level, name, description, auto_checkable, weight) VALUES
  ('gold', 'silver_validated', 'Certification Silver obtenue', true, 15),
  ('gold', 'sales_volume', '50+ ventes reussies', true, 20),
  ('gold', 'high_rating', 'Note moyenne >= 4.5/5', true, 20),
  ('gold', 'responsive_support', 'Support reactif (< 24h)', false, 15),
  ('gold', 'manual_audit', 'Audit manuel du code valide', false, 15),
  ('gold', 'use_cases_doc', 'Cas d''usage documentes', false, 10),
  ('gold', 'user_testimonials', 'Temoignages utilisateurs', false, 5);

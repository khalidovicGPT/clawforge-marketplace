-- ============================================
-- SKILL REPORTS SYSTEM (Sprint 4)
-- ============================================
-- Signalement de problemes par les createurs (faux positifs, bugs, etc.)

CREATE TABLE IF NOT EXISTS skill_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES auth.users(id),
  report_type VARCHAR(50) NOT NULL
    CHECK (report_type IN ('false_positive', 'system_bug', 'unclear_error', 'other')),
  description TEXT NOT NULL,
  attachment_url TEXT,
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'escalated')),
  priority VARCHAR(10) DEFAULT 'normal'
    CHECK (priority IN ('high', 'normal', 'low')),

  -- Reponse admin
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_action VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_reports_skill ON skill_reports(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_reports_status ON skill_reports(status);
CREATE INDEX IF NOT EXISTS idx_skill_reports_type ON skill_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_skill_reports_created ON skill_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_skill_reports_priority ON skill_reports(priority);

ALTER TABLE skill_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own reports"
  ON skill_reports FOR SELECT
  USING (reported_by = auth.uid());

CREATE POLICY "Creators can create reports for their skills"
  ON skill_reports FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid())
  );

CREATE POLICY "Admins can manage all reports"
  ON skill_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

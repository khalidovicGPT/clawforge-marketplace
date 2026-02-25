-- ============================================
-- SKILLS MANAGEMENT SYSTEM (Sprint 4)
-- ============================================
-- Gestion admin des skills : retrait, rejet, blocage, reactivation
-- + soft delete createur + historique des actions

-- NOTE: La colonne status est en text (pas d'enum skill_status)
-- Les valeurs 'withdrawn' et 'blocked' sont acceptees nativement

-- 1. Colonnes de retrait (createur ou admin)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS withdrawn_by VARCHAR(20);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT;

-- 3. Colonnes de rejet (validation admin)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- 4. Colonnes de blocage (severe)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS blocked_permanently BOOLEAN DEFAULT false;

-- 5. Colonnes de reactivation
ALTER TABLE skills ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES auth.users(id);

-- 6. Visibilite (filtrage rapide)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_skills_visibility ON skills(is_visible);

-- 7. Table d'historique des actions admin
CREATE TABLE IF NOT EXISTS skill_admin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  action_by UUID REFERENCES auth.users(id),
  action_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_skill_history_skill ON skill_admin_history(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_history_action ON skill_admin_history(action);

ALTER TABLE skill_admin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage skill history"
  ON skill_admin_history FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Creators can view their own skill history"
  ON skill_admin_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = skill_id AND skills.creator_id = auth.uid()
    )
  );

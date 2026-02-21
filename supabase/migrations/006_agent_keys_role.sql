-- ============================================
-- AGENT API KEYS — Ajout role et agent_name (Sprint 2)
-- ============================================
-- Permet de distinguer les cles systeme (QualityClaw, DevClaw)
-- des cles createur classiques.

ALTER TABLE agent_api_keys
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent'
    CHECK (role IN ('agent', 'moderator', 'readonly')),
  ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- Index pour filtrer par agent
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_agent_name ON agent_api_keys(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_role ON agent_api_keys(role);

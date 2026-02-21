-- ============================================
-- AGENT API KEYS (Sprint 2)
-- ============================================
-- Permet aux agents OpenClaw de publier des skills via API

CREATE TABLE agent_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,        -- bcrypt hash de la cle
  name TEXT NOT NULL DEFAULT 'Agent OpenClaw',
  permissions TEXT[] NOT NULL DEFAULT ARRAY['publish'],
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ             -- NULL = active, date = revoquee
);

-- Index pour recherche rapide par creator
CREATE INDEX idx_agent_api_keys_creator ON agent_api_keys(creator_id);

-- RLS
ALTER TABLE agent_api_keys ENABLE ROW LEVEL SECURITY;

-- Les createurs voient leurs propres cles
CREATE POLICY "Creators can view their own API keys"
  ON agent_api_keys FOR SELECT
  USING (creator_id = auth.uid());

-- Les createurs peuvent creer des cles
CREATE POLICY "Creators can create their own API keys"
  ON agent_api_keys FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- Les createurs peuvent revoquer leurs cles
CREATE POLICY "Creators can update their own API keys"
  ON agent_api_keys FOR UPDATE
  USING (creator_id = auth.uid());

-- Admins ont acces total
CREATE POLICY "Admins can do anything on agent_api_keys"
  ON agent_api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

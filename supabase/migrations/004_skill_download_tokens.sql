-- ============================================
-- SKILL DOWNLOAD TOKENS (Sprint 2)
-- ============================================
-- Permet aux utilisateurs d'installer un skill via un lien
-- copiable dans un agent OpenClaw.

CREATE TABLE skill_download_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,           -- format: dl_{random_24_chars}
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_download_tokens_token ON skill_download_tokens(token);
CREATE INDEX idx_skill_download_tokens_user ON skill_download_tokens(user_id);
CREATE INDEX idx_skill_download_tokens_skill ON skill_download_tokens(skill_id);

-- RLS
ALTER TABLE skill_download_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own download tokens"
  ON skill_download_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own download tokens"
  ON skill_download_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

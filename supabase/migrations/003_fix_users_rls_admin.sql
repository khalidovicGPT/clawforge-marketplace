-- ============================================
-- FIX: Policy users manquante pour les admins
-- ============================================
-- Bug: /api/skills/agent/publish retourne NOT_A_CREATOR pour les admins
-- Cause: la policy "Anyone can view creator profiles" ne couvre que role = 'creator'
-- Fix: remplacer par une policy qui couvre creator ET admin

DROP POLICY IF EXISTS "Anyone can view creator profiles" ON users;

CREATE POLICY "Anyone can view creator and admin profiles"
  ON users FOR SELECT
  USING (role IN ('creator', 'admin'));

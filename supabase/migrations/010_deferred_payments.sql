-- Migration: Paiement différé des créateurs
-- Ajoute le système de paiement mensuel groupé avec délai de 15 jours
-- et le système de remboursement acheteur

-- ============================================
-- 1. ENUM pour le statut de paiement
-- ============================================

CREATE TYPE payment_status AS ENUM ('pending', 'eligible', 'paid', 'refunded');
CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================
-- 2. MODIFICATIONS TABLE PURCHASES
-- ============================================

-- Statut du paiement créateur (pending = en attente 15j, eligible = prêt pour payout, paid = versé)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending';

-- Date à laquelle l'achat devient éligible au paiement (purchased_at + 15 jours)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ;

-- Référence au payout mensuel
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payout_id UUID;

-- Date de remboursement
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Index pour le cron quotidien (marquer éligible)
CREATE INDEX IF NOT EXISTS idx_purchases_payment_pending
  ON purchases(eligible_at) WHERE payment_status = 'pending';

-- Index pour le cron mensuel (payout batch)
CREATE INDEX IF NOT EXISTS idx_purchases_payment_eligible
  ON purchases(payment_status) WHERE payment_status = 'eligible';

-- Index pour lookup par payout
CREATE INDEX IF NOT EXISTS idx_purchases_payout_id ON purchases(payout_id);

-- Migrer les achats existants : ils ont déjà été payés instantanément
UPDATE purchases SET payment_status = 'paid' WHERE payment_status IS NULL OR payment_status = 'pending';

-- ============================================
-- 3. TABLE CREATOR_PAYOUTS (versements mensuels)
-- ============================================

CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,           -- montant versé au créateur en cents (80%)
  platform_fee INTEGER NOT NULL DEFAULT 0,     -- commission plateforme en cents (20%)
  gross_amount INTEGER NOT NULL DEFAULT 0,     -- montant brut total en cents
  purchases_count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,

  -- Un seul payout par créateur par période
  UNIQUE(creator_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_period ON creator_payouts(period_start, period_end);

-- Ajouter FK sur purchases.payout_id
ALTER TABLE purchases ADD CONSTRAINT fk_purchases_payout
  FOREIGN KEY (payout_id) REFERENCES creator_payouts(id) ON DELETE SET NULL;

-- ============================================
-- 4. TABLE REFUND_REQUESTS (demandes de remboursement)
-- ============================================

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  status refund_status NOT NULL DEFAULT 'pending',
  admin_id UUID REFERENCES users(id),
  admin_notes TEXT,
  stripe_refund_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,  -- montant remboursé en cents
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Une seule demande par achat
  UNIQUE(purchase_id)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_skill ON refund_requests(skill_id);

-- ============================================
-- 5. CHAMP CGV CRÉATEUR
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS creator_terms_accepted_at TIMESTAMPTZ;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Payouts : créateur voit les siens, admin voit tout
CREATE POLICY "Creators can view their own payouts"
  ON creator_payouts FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can manage all payouts"
  ON creator_payouts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Refunds : acheteur voit les siens, admin gère tout
CREATE POLICY "Users can view their own refund requests"
  ON refund_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create refund requests"
  ON refund_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all refund requests"
  ON refund_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Créateurs voient les remboursements liés à leurs skills
CREATE POLICY "Creators can view refunds on their skills"
  ON refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills WHERE skills.id = skill_id AND skills.creator_id = auth.uid()
    )
  );

-- ============================================
-- 7. GRANTS
-- ============================================

GRANT SELECT ON creator_payouts TO authenticated;
GRANT SELECT, INSERT ON refund_requests TO authenticated;

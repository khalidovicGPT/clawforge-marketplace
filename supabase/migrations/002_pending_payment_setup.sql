-- Migration: Add pending_payment_setup status and reminder tracking
-- Run this in Supabase SQL Editor

-- 1. Add new enum value to skill_status
ALTER TYPE skill_status ADD VALUE IF NOT EXISTS 'pending_payment_setup';

-- 2. Update RLS policy to allow public visibility of pending_payment_setup skills
DROP POLICY IF EXISTS "Anyone can view published skills" ON skills;
CREATE POLICY "Anyone can view published skills"
  ON skills FOR SELECT
  USING (status IN ('published', 'pending_payment_setup'));

-- 3. Create table to track payment setup reminder emails
CREATE TABLE IF NOT EXISTS payment_setup_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('day_1', 'day_7', 'day_30')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_setup_reminders_skill ON payment_setup_reminders(skill_id);
CREATE INDEX IF NOT EXISTS idx_payment_setup_reminders_creator ON payment_setup_reminders(creator_id);

-- 4. Add index for pending_payment_setup skills lookup
CREATE INDEX IF NOT EXISTS idx_skills_pending_payment ON skills(creator_id) WHERE status = 'pending_payment_setup';

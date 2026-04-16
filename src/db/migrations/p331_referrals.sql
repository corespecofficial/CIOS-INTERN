-- p331: Referral system
-- Interns earn XP when someone they referred completes their first active week

-- 1. Referral code on users (unique short code)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_email  TEXT NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'  -- pending | joined | active | rewarded
                  CHECK (status IN ('pending','joined','active','rewarded')),
  xp_awarded_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx  ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_idx  ON referrals(referred_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_email_referrer_uniq ON referrals(referrer_id, referred_email);

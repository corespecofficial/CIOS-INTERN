-- p372: Alumni Verified Badge
-- Distinct from certificates — this is a permanent lifetime credential
-- issued when an intern graduates the programme. Lives on their public profile.

CREATE TABLE IF NOT EXISTS alumni_badges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  cohort            TEXT,
  tier              TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard','honours','distinction')),
  final_score       INT,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  verification_code TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  revoked           BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_reason    TEXT,
  revoked_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alumni_badges_user ON alumni_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_badges_code ON alumni_badges(verification_code);
CREATE INDEX IF NOT EXISTS idx_alumni_badges_tier ON alumni_badges(tier);

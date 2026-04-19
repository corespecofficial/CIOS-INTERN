-- p379: daily_logins table (fixes daily XP being awarded on every login)
-- The claimDailyLogin action queries/inserts this table to enforce
-- once-per-day idempotency. Without it, the select silently returns
-- null and every call awards XP again.

CREATE TABLE IF NOT EXISTS daily_logins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  xp_granted  INT NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logins_user ON daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logins_date ON daily_logins(date DESC);

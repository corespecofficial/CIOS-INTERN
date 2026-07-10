-- p396: Repair gamification sync + spin wheel reward ledger
-- Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_xp_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET best_streak = GREATEST(COALESCE(best_streak, 0), COALESCE(streak, 0));

CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_type ON xp_events(event_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_dedupe ON xp_events(user_id, event_type, ref_type, ref_id)
  WHERE ref_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  current INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  last_day DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, kind)
);

CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, mission_id, cycle_start)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id, cycle_start DESC);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  prize_xp INTEGER NOT NULL DEFAULT 0,
  prize_coins INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_wheel_logs ENABLE ROW LEVEL SECURITY;

INSERT INTO streaks (user_id, kind, current, best, last_day)
SELECT user_id, 'login', COUNT(*)::INTEGER, COUNT(*)::INTEGER, MAX(date)
FROM (
  SELECT
    dl.*,
    date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date))::INTEGER AS island
  FROM daily_logins dl
) grouped
WHERE island = (
  SELECT MAX(date - rn::INTEGER)
  FROM (
    SELECT date, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date) AS rn
    FROM daily_logins newer
    WHERE newer.user_id = grouped.user_id
  ) latest
)
GROUP BY user_id, island
ON CONFLICT (user_id, kind) DO UPDATE SET
  current = GREATEST(streaks.current, EXCLUDED.current),
  best = GREATEST(streaks.best, EXCLUDED.best),
  last_day = GREATEST(streaks.last_day, EXCLUDED.last_day),
  updated_at = NOW();

INSERT INTO xp_events (user_id, event_type, amount, ref_type, ref_id, metadata, created_at)
SELECT
  user_id,
  'login_streak',
  xp_granted,
  'daily_login',
  date::TEXT,
  jsonb_build_object('source', 'p396_backfill'),
  created_at
FROM daily_logins
ON CONFLICT DO NOTHING;

WITH inserted_spin_events AS (
  INSERT INTO xp_events (user_id, event_type, amount, ref_type, ref_id, metadata, created_at)
  SELECT
    user_id,
    'spin_wheel_win',
    prize_amount,
    'spin_wheel',
    id::TEXT,
    jsonb_build_object('prize', prize_label, 'source', 'p396_backfill'),
    spun_at
  FROM spin_wheel_logs
  WHERE prize_type = 'xp' AND prize_amount > 0
  ON CONFLICT DO NOTHING
  RETURNING user_id, amount
),
spin_totals AS (
  SELECT user_id, SUM(amount)::INTEGER AS total
  FROM inserted_spin_events
  GROUP BY user_id
)
UPDATE users u
SET
  xp = GREATEST(0, COALESCE(u.xp, 0) + spin_totals.total),
  level = GREATEST(1, FLOOR((1 + SQRT(1 + ((GREATEST(0, COALESCE(u.xp, 0) + spin_totals.total))::NUMERIC / 125))) / 2)::INTEGER),
  last_xp_at = NOW()
FROM spin_totals
WHERE u.id = spin_totals.user_id;

UPDATE users
SET level = GREATEST(1, FLOOR((1 + SQRT(1 + (GREATEST(0, COALESCE(xp, 0))::NUMERIC / 125))) / 2)::INTEGER);

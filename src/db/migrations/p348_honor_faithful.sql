-- p348_honor_faithful.sql
-- Honor the Faithful: Eagle of the Week, tier badges, faithfulness scoring

-- Eagle of the Week award table
CREATE TABLE IF NOT EXISTS eagle_of_week (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,          -- ISO date of the Monday of that week
  xp_awarded INT NOT NULL DEFAULT 300,
  nominated_by UUID REFERENCES users(id),
  reason TEXT,
  announced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_of)                 -- one Eagle per week
);

CREATE INDEX IF NOT EXISTS idx_eagle_of_week_user ON eagle_of_week(user_id);
CREATE INDEX IF NOT EXISTS idx_eagle_of_week_week ON eagle_of_week(week_of DESC);

-- Faithfulness tier on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS faithfulness_tier TEXT DEFAULT 'none'
  CHECK (faithfulness_tier IN ('none', 'bronze', 'silver', 'gold', 'diamond'));

-- Cached faithfulness score (0–100) updated by cron
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS faithfulness_score NUMERIC(5,2) DEFAULT 0;

-- Faithfulness tier thresholds:
-- bronze:  >= 60 (consistent, shows up)
-- silver:  >= 75 (reliable)
-- gold:    >= 88 (excellent)
-- diamond: >= 96 (near-perfect)

CREATE INDEX IF NOT EXISTS idx_users_faithfulness ON users(faithfulness_score DESC);

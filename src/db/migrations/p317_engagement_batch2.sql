-- Batch-2 engagement features: peer review, team challenges, and
-- shareable-certificate slug (OG images don't need a DB column, but we add a
-- nullable `slug` to the certificates table for pretty share URLs).
--
-- Safe to re-run. No destructive operations.

---------------------------------------------------------------
-- Extend engagement.features with new flags.
-- We merge rather than overwrite so existing toggles stay put.
---------------------------------------------------------------
UPDATE system_settings
SET value = (
  COALESCE(value::jsonb, '{}'::jsonb)
  || '{"peerReview": true, "teams": true, "shareCert": true, "teamSize": 4, "reviewXpReward": 40}'::jsonb
)::text
WHERE key = 'engagement.features';

-- If the row somehow doesn't exist yet (fresh DB), seed with full defaults.
INSERT INTO system_settings (key, value)
SELECT 'engagement.features', '{
  "dailyQuests": true, "streakFreeze": true, "reactions": true,
  "leaderboards": true, "badges": true, "xpBurst": true,
  "questXpBonus": 50, "freezeCostXp": 200, "leaderboardResetDay": 1,
  "peerReview": true, "teams": true, "shareCert": true,
  "teamSize": 4, "reviewXpReward": 40
}'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'engagement.features');

---------------------------------------------------------------
-- 1. PEER REVIEW
---------------------------------------------------------------
-- When an intern submits an assignment, 2 random peers enrolled in the same
-- course are auto-assigned to review it. Reviewer fills 3 rubric scores +
-- feedback; earns XP on submit.
CREATE TABLE IF NOT EXISTS assignment_peer_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES module_submissions(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitter_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','skipped')),
  score_clarity   integer CHECK (score_clarity BETWEEN 1 AND 5),
  score_effort    integer CHECK (score_effort BETWEEN 1 AND 5),
  score_insight   integer CHECK (score_insight BETWEEN 1 AND 5),
  feedback        text,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,
  UNIQUE (submission_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON assignment_peer_reviews (reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submission ON assignment_peer_reviews (submission_id);

---------------------------------------------------------------
-- 2. TEAMS & TEAM CHALLENGES
---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#1E88E5',
  emoji       text NOT NULL DEFAULT '🏳',
  captain_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id   uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
-- A user can only be in one team at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_user_unique ON team_members (user_id);

-- Closed weekly challenge snapshots. We materialise winners at week-end from
-- a cron (or can be called manually from admin). Stores final XP totals so
-- past weeks don't shift if XP events are backfilled.
CREATE TABLE IF NOT EXISTS team_challenge_weeks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start      date NOT NULL UNIQUE,
  week_end        date NOT NULL,
  winner_team_id  uuid REFERENCES teams(id) ON DELETE SET NULL,
  totals          jsonb NOT NULL DEFAULT '[]'::jsonb,
  finalised_at    timestamptz
);

---------------------------------------------------------------
-- 3. CERTIFICATE SHARE SLUG
---------------------------------------------------------------
-- Short slug for public OG image URL (e.g. /c/ab12cd34). Certificates table
-- may not have it yet — add column IF NOT EXISTS.
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS share_slug text UNIQUE;

-- Backfill: give every existing certificate a slug if missing.
UPDATE certificates SET share_slug = substr(md5(id::text || random()::text), 1, 10)
WHERE share_slug IS NULL;

NOTIFY pgrst, 'reload schema';

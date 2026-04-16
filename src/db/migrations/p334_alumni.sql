-- p334: Alumni system — graduation tracking, success stories, alumni directory

-- 1. Graduation fields on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS graduated_at   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort_number  INT;

-- 2. Alumni success stories
CREATE TABLE IF NOT EXISTS alumni_stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  company     TEXT,                    -- where they ended up
  role        TEXT,                    -- their job title
  cover_image TEXT,                    -- optional hero image URL
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected')),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alumni_stories_user_idx     ON alumni_stories(user_id);
CREATE INDEX IF NOT EXISTS alumni_stories_approved_idx ON alumni_stories(status) WHERE status = 'approved';

-- 3. Alumni job postings (graduates post jobs back to the community)
-- These link to existing opportunities table via poster being an alumni user.
-- No extra table needed — opportunities posted by graduated users are surfaced as alumni postings.
-- We add a flag for discoverability:
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS posted_by_alumni BOOLEAN NOT NULL DEFAULT false;

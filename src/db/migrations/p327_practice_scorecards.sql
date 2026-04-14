-- p327_practice_scorecards.sql — AI-generated rubric score per session.
CREATE TABLE IF NOT EXISTS practice_scorecards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill       text NOT NULL,            -- e.g. "prompt_engineering", "copywriting"
  score       int  NOT NULL CHECK (score BETWEEN 0 AND 100),
  rubric      jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths   text,
  improvements text,
  session_ref text,                     -- optional external id/context
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_practice_scorecards_user ON practice_scorecards(user_id, created_at DESC);

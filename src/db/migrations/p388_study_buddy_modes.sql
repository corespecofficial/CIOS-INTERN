-- p388_study_buddy_modes.sql
-- Study Buddy v2 — Phase 2 (learning modes + mastery loop).
-- Additive to p387. Powers the mode picker, flashcard SRS, and quiz scoring.

-- Per-concept mastery tracker. One row per (user, session, concept) — lets a
-- user drop a course mid-week and pick up where they left off with the right
-- cards due for review. SM-2-lite spaced repetition (ease × interval_days).
CREATE TABLE IF NOT EXISTS study_mastery (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id        uuid REFERENCES study_sessions(id) ON DELETE CASCADE,
  concept_id        text NOT NULL,
  concept_title     text,
  ease              double precision NOT NULL DEFAULT 2.5,
  interval_days     int NOT NULL DEFAULT 0,
  repetitions       int NOT NULL DEFAULT 0,
  last_score        int NOT NULL DEFAULT 0,    -- 0..100
  due_at            timestamptz,
  last_reviewed_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_study_mastery_due
  ON study_mastery(user_id, due_at);

-- Output cache / audit log for every mode run. Lets the UI show "resume"
-- cards, gives us analytics on which modes interns use most, and prevents
-- re-billing tokens when a user revisits the same lecture/story.
CREATE TABLE IF NOT EXISTS study_mode_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  concept_id    text NOT NULL,
  mode          text NOT NULL,                  -- 'explain' | 'story' | 'podcast' | ...
  output        jsonb NOT NULL,
  tokens_used   int,
  rating        int,                            -- 1..5 user rating, null = unrated
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mode_runs_session ON study_mode_runs(session_id, mode);
CREATE INDEX IF NOT EXISTS idx_mode_runs_user    ON study_mode_runs(user_id, created_at DESC);

-- RLS — users see only their own rows
ALTER TABLE study_mastery   ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_mode_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_mastery_owner" ON study_mastery
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "study_mode_runs_owner" ON study_mode_runs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE study_mastery   IS 'Study Buddy v2 — SM-2-lite spaced repetition per concept per user.';
COMMENT ON TABLE study_mode_runs IS 'Study Buddy v2 — cached output + rating per (concept, mode) run.';

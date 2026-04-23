-- p389_study_buddy_cohort.sql
-- Study Buddy v2 — Phase 4 (cohort sharing).
-- Additive to p387 / p388. Lets an intern publish their session to everyone
-- in the same cohort_number so they can use it as a source in their own
-- wizard (without re-ingesting YouTube transcripts, PDFs, etc.).

CREATE TABLE IF NOT EXISTS study_cohort_shares (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  cohort_number      int  NOT NULL,
  shared_by_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              text,
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, cohort_number)
);

CREATE INDEX IF NOT EXISTS idx_cohort_shares_cohort
  ON study_cohort_shares(cohort_number, created_at DESC);

ALTER TABLE study_cohort_shares ENABLE ROW LEVEL SECURITY;

-- Read: anyone in the same cohort_number as the shared row can see it.
-- Write: only the original sharer can INSERT/UPDATE/DELETE their own share.
CREATE POLICY "cohort_shares_read" ON study_cohort_shares
  FOR SELECT USING (
    cohort_number = (SELECT cohort_number FROM users WHERE id = auth.uid())
  );

CREATE POLICY "cohort_shares_owner_write" ON study_cohort_shares
  FOR ALL USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

COMMENT ON TABLE study_cohort_shares IS 'Study Buddy v2 — cohort-wide shelves of study sessions.';

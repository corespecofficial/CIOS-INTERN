-- p349_student_voice.sql
-- Wave 3.1 — Student Voice as Curriculum
-- Principle of the Week submissions + Anonymous Feedback Channel

-- ─────────────────────────────────────────────────────────────────────────────
-- Principle of the Week
-- Interns submit a principle they learned or want to teach the class.
-- Coach reviews, picks one, names the intern, archives it publicly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS principle_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,                    -- Monday of the submission week
  principle TEXT NOT NULL,                  -- One sentence
  story TEXT,                               -- Optional: where did this come from?
  source TEXT,                              -- Optional: book, person, experience
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'selected', 'archived', 'declined')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  featured_at TIMESTAMPTZ,                  -- When it was featured as Principle of the Week
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_of)                  -- One submission per intern per week
);

CREATE INDEX IF NOT EXISTS idx_principle_sub_week ON principle_submissions(week_of DESC);
CREATE INDEX IF NOT EXISTS idx_principle_sub_status ON principle_submissions(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Principle of the Week Archive
-- Selected principles go into a public archive (no login needed to read).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS principle_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES principle_submissions(id) ON DELETE SET NULL,
  week_of DATE NOT NULL UNIQUE,
  principle TEXT NOT NULL,
  story TEXT,
  source TEXT,
  author_name TEXT NOT NULL,               -- Named: honors the intern publicly
  author_track TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_principle_archive_week ON principle_archive(week_of DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Anonymous Feedback Channel
-- Interns submit feedback anonymously. Coach sees it, can post a public summary.
-- No names are ever attached to individual responses.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anonymous_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No user_id — truly anonymous. Optionally store week for grouping.
  week_of DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('curriculum', 'coaching', 'culture', 'logistics', 'general', 'idea')),
  feedback TEXT NOT NULL,
  is_actioned BOOLEAN NOT NULL DEFAULT FALSE,
  coach_response TEXT,                      -- Public response the coach writes
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_feedback_week ON anonymous_feedback(week_of DESC);
CREATE INDEX IF NOT EXISTS idx_anon_feedback_category ON anonymous_feedback(category);

-- p345: Eagle Project — assignment submission + coach grading system
CREATE TABLE IF NOT EXISTS eagle_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','late','graded')),
  section_a JSONB NOT NULL DEFAULT '{}',
  section_b JSONB NOT NULL DEFAULT '{}',
  section_c JSONB NOT NULL DEFAULT '{}',
  section_d JSONB NOT NULL DEFAULT '{}',
  section_e JSONB NOT NULL DEFAULT '{}',
  section_f JSONB NOT NULL DEFAULT '{}',
  section_g JSONB NOT NULL DEFAULT '{}',
  section_h JSONB NOT NULL DEFAULT '{}',
  total_score INT,
  overall_feedback TEXT,
  late_fine_applied BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS eagle_section_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES eagle_submissions(id) ON DELETE CASCADE,
  section CHAR(1) NOT NULL CHECK (section IN ('A','B','C','D','E','F','G','H')),
  score INT NOT NULL,
  max_score INT NOT NULL,
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  graded_by UUID REFERENCES users(id),
  UNIQUE(submission_id, section)
);

CREATE INDEX IF NOT EXISTS idx_eagle_submissions_user   ON eagle_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_eagle_submissions_status ON eagle_submissions(status);
CREATE INDEX IF NOT EXISTS idx_eagle_section_scores_sub ON eagle_section_scores(submission_id);

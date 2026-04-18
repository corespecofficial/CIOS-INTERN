-- p346: Custom Projects — admin-configurable project assignments

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '📋',
  instructions TEXT NOT NULL DEFAULT '',
  deadline TIMESTAMPTZ,
  late_fine_amount INT NOT NULL DEFAULT 500,
  xp_on_submit INT NOT NULL DEFAULT 200,
  xp_bonus_threshold INT NOT NULL DEFAULT 90,
  xp_bonus_amount INT NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sections JSONB NOT NULL DEFAULT '[]',
  cover_image_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','late','graded')),
  answers JSONB NOT NULL DEFAULT '{}',
  total_score INT,
  overall_feedback TEXT,
  late_fine_applied BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_section_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL,
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(submission_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);
CREATE INDEX IF NOT EXISTS idx_proj_subs_project    ON project_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_subs_user       ON project_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_proj_subs_status     ON project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_proj_sec_scores_sub  ON project_section_scores(submission_id);

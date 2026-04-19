-- p367: Career Roadmap
-- Each user selects a career track; milestones are defined in code.
-- We only store the user's selected track and which milestones they've completed.

CREATE TABLE IF NOT EXISTS user_career_paths (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  track_slug           TEXT NOT NULL,
  target_role          TEXT,
  target_by            DATE,
  completed_milestones TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

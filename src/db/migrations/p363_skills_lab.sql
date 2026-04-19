-- p363: Skills Assessment Lab
-- Auto-scored, timed skill assessments (MCQ / short answer)
-- Each assessment has questions; users submit attempts; admins can request custom tests.

CREATE TABLE IF NOT EXISTS assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  skill_domain    TEXT NOT NULL,
  difficulty      TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  duration_min    INT NOT NULL DEFAULT 15,
  passing_score   INT NOT NULL DEFAULT 70,
  max_attempts    INT NOT NULL DEFAULT 3,
  cooldown_hours  INT NOT NULL DEFAULT 24,
  status          TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  featured        BOOLEAN NOT NULL DEFAULT FALSE,
  cover_emoji     TEXT NOT NULL DEFAULT '🧪',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  attempt_count   INT NOT NULL DEFAULT 0,
  pass_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_domain ON assessments(skill_domain);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  prompt         TEXT NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'mcq' CHECK (kind IN ('mcq','true_false','short_text')),
  options        JSONB DEFAULT '[]',     -- [{id, label}] for MCQ
  correct_answer TEXT NOT NULL,          -- option id for MCQ, "true"/"false", or keyword string
  explanation    TEXT,
  points         INT NOT NULL DEFAULT 10,
  order_index    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assess ON assessment_questions(assessment_id);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  answers        JSONB NOT NULL DEFAULT '{}',  -- {question_id: answer}
  score          INT,
  total_points   INT,
  percentage     INT,
  passed         BOOLEAN,
  time_taken_sec INT
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assess ON assessment_attempts(assessment_id);

CREATE TABLE IF NOT EXISTS assessment_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  skill_domain     TEXT NOT NULL,
  role_context     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','completed','cancelled')),
  fee_ngn          INT NOT NULL DEFAULT 20000,  -- ~$49
  payment_ref      TEXT,
  assessment_id    UUID REFERENCES assessments(id) ON DELETE SET NULL,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessment_requests_recruiter ON assessment_requests(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_assessment_requests_target ON assessment_requests(target_user_id);

-- p375: University / Institution Portal
-- Universities manage batches of SIWES students; generate ITF-compliant reports.

CREATE TABLE IF NOT EXISTS institutions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  kind            TEXT NOT NULL DEFAULT 'university' CHECK (kind IN ('university','polytechnic','college','high_school','ngo','agency')),
  country         TEXT NOT NULL DEFAULT 'NG',
  state           TEXT,
  city            TEXT,
  accreditation   TEXT,
  coordinator_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_limit      INT NOT NULL DEFAULT 100,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_coord ON institutions(coordinator_id);

CREATE TABLE IF NOT EXISTS institution_students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  matric_number TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT,
  department    TEXT,
  level         TEXT,
  year          INT,
  placement_company TEXT,
  siwes_status  TEXT NOT NULL DEFAULT 'not_started' CHECK (siwes_status IN ('not_started','placed','in_progress','completed','failed')),
  compliance_score INT NOT NULL DEFAULT 0,
  reports_submitted INT NOT NULL DEFAULT 0,
  hours_logged  INT NOT NULL DEFAULT 0,
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at     TIMESTAMPTZ,
  UNIQUE(institution_id, matric_number)
);

CREATE INDEX IF NOT EXISTS idx_inst_students_inst ON institution_students(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_students_user ON institution_students(user_id);
CREATE INDEX IF NOT EXISTS idx_inst_students_status ON institution_students(siwes_status);

CREATE TABLE IF NOT EXISTS institution_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  report_kind    TEXT NOT NULL CHECK (report_kind IN ('itf_monthly','siwes_completion','quarterly','annual','custom')),
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  summary_json   JSONB NOT NULL DEFAULT '{}',
  pdf_url        TEXT,
  generated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_reports_inst ON institution_reports(institution_id);

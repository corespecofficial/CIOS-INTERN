-- p376: Company / Supervisor Portal
-- Companies host interns. Each company has supervisors. Supervisors
-- evaluate and can request to hire their interns.

CREATE TABLE IF NOT EXISTS company_orgs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  industry        TEXT,
  size_range      TEXT,
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hq_city         TEXT,
  hq_country      TEXT DEFAULT 'NG',
  website         TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  accredited      BOOLEAN NOT NULL DEFAULT FALSE,
  intern_capacity INT NOT NULL DEFAULT 10,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_orgs_owner ON company_orgs(owner_id);

CREATE TABLE IF NOT EXISTS company_placements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES company_orgs(id) ON DELETE CASCADE,
  intern_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  role_title     TEXT,
  start_date     DATE,
  end_date       DATE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','completed','terminated')),
  midterm_eval   JSONB,
  final_eval     JSONB,
  recommend_hire BOOLEAN,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, intern_id)
);

CREATE INDEX IF NOT EXISTS idx_company_placements_company ON company_placements(company_id);
CREATE INDEX IF NOT EXISTS idx_company_placements_intern ON company_placements(intern_id);
CREATE INDEX IF NOT EXISTS idx_company_placements_sup ON company_placements(supervisor_id);

CREATE TABLE IF NOT EXISTS supervisor_evaluations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id   UUID NOT NULL REFERENCES company_placements(id) ON DELETE CASCADE,
  evaluator_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage          TEXT NOT NULL CHECK (stage IN ('midterm','final')),
  technical      INT NOT NULL CHECK (technical BETWEEN 1 AND 5),
  punctuality    INT NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
  communication  INT NOT NULL CHECK (communication BETWEEN 1 AND 5),
  initiative     INT NOT NULL CHECK (initiative BETWEEN 1 AND 5),
  teamwork       INT NOT NULL CHECK (teamwork BETWEEN 1 AND 5),
  professionalism INT NOT NULL CHECK (professionalism BETWEEN 1 AND 5),
  comments       TEXT,
  recommend_hire TEXT CHECK (recommend_hire IN ('yes','no','maybe')),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(placement_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_evals_placement ON supervisor_evaluations(placement_id);

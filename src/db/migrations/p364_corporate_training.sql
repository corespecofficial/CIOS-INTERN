-- p364: Corporate Training Module
-- Separate SKU that reuses the existing courses/enrollments tables.
-- Companies subscribe, invite their employees, assign training programs.

CREATE TABLE IF NOT EXISTS corporate_orgs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  logo_url       TEXT,
  industry       TEXT,
  size_range     TEXT,
  owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('trial','starter','pro','enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('trialing','active','past_due','cancelled')),
  seat_limit     INT NOT NULL DEFAULT 10,
  monthly_fee_ngn INT NOT NULL DEFAULT 80000,
  trial_ends_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_orgs_owner ON corporate_orgs(owner_id);

CREATE TABLE IF NOT EXISTS corporate_employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES corporate_orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','manager','admin')),
  department  TEXT,
  status      TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended','removed')),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at   TIMESTAMPTZ,
  UNIQUE(org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_corp_employees_org ON corporate_employees(org_id);
CREATE INDEX IF NOT EXISTS idx_corp_employees_user ON corporate_employees(user_id);

CREATE TABLE IF NOT EXISTS corporate_programs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES corporate_orgs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  course_ids    UUID[] NOT NULL DEFAULT '{}',   -- references courses(id)
  is_mandatory  BOOLEAN NOT NULL DEFAULT FALSE,
  deadline_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_corp_programs_org ON corporate_programs(org_id);

CREATE TABLE IF NOT EXISTS corporate_program_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES corporate_programs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES corporate_employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(program_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_corp_assign_program ON corporate_program_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_corp_assign_employee ON corporate_program_assignments(employee_id);

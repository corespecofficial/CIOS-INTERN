-- p392: Visitor Portal + onboarding intent router
--
-- Every new signup now flows through /onboarding/intent which decides
-- their portal: visitor (public_user), org-invite enrolment, role
-- application (recruiter/mentor/company/etc.), super-admin code grant,
-- or the existing intern flow. We track this routing decision so the
-- gate is one-shot (existing users skip it forever after first run).

-- ───────────────────────────────────────────────────────────────────
-- users: onboarding state + spam/abuse signals
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intent TEXT
    CHECK (intent IS NULL OR intent IN ('visitor','intern','recruiter','mentor','company','partner_org','startup_founder','investor','staff_code')),
  ADD COLUMN IF NOT EXISTS signup_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signup_risk_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS signup_ua_hash TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

CREATE INDEX IF NOT EXISTS users_onboarding_idx ON users(onboarding_completed_at) WHERE onboarding_completed_at IS NULL;
CREATE INDEX IF NOT EXISTS users_intent_idx ON users(intent) WHERE intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_signup_ip_idx ON users(signup_ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS users_risk_idx ON users(signup_risk_score DESC) WHERE signup_risk_score >= 50;

-- ───────────────────────────────────────────────────────────────────
-- super_admin_codes: one-time signup codes for direct staff hires.
-- Code goes through onboarding flow, grants role + sets the relevant
-- profile if the role needs one (e.g. recruiter_profiles for recruiter).
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admin_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL,                                  -- target role on redemption
  org_id      UUID REFERENCES creative_orgs(id) ON DELETE CASCADE, -- optional: bind to a creative org
  notes       TEXT,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  max_uses    INT NOT NULL DEFAULT 1,                         -- usually 1
  use_count   INT NOT NULL DEFAULT 0,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,   -- last redeemer; for audit
  redeemed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS super_admin_codes_expires_idx ON super_admin_codes(expires_at) WHERE redeemed_at IS NULL;

-- ───────────────────────────────────────────────────────────────────
-- role_applications: unified queue for "I want to be X" requests that
-- need super-admin / org-admin approval. Wraps existing flows like
-- recruiter_profiles (which keeps its own approval_status); the row
-- here is the *queue entry* the super-admin reviews. Approval flips
-- this row + creates / promotes the appropriate downstream profile.
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applied_role TEXT NOT NULL,                                  -- recruiter, mentor, company, etc.
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,             -- form answers (name, company, why, etc.)
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','withdrawn')),
  decided_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at   TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS role_applications_user_idx ON role_applications(user_id, status);
CREATE INDEX IF NOT EXISTS role_applications_pending_idx ON role_applications(applied_role, created_at DESC) WHERE status = 'pending';
-- Only one open application per role per user.
CREATE UNIQUE INDEX IF NOT EXISTS role_applications_open_unique
  ON role_applications(user_id, applied_role)
  WHERE status = 'pending';

-- ───────────────────────────────────────────────────────────────────
-- visitor_engagement: tracks which visitor looked at / applied to /
-- saved which org, so org admins can see only the visitors who
-- explicitly engaged with them (the "targeted visibility" decision).
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_engagement (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES creative_orgs(id) ON DELETE CASCADE,
  space_id    UUID REFERENCES creative_spaces(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('view','save','apply','enrol_attempt')),
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Most queries are "who engaged with my org?" — partial index keeps it tight.
CREATE INDEX IF NOT EXISTS visitor_engagement_org_idx
  ON visitor_engagement(org_id, kind, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS visitor_engagement_visitor_idx
  ON visitor_engagement(visitor_id, created_at DESC);

-- ───────────────────────────────────────────────────────────────────
-- Backfill: anyone in the DB before this migration is grandfathered
-- with onboarding_completed_at = created_at + intent inferred from
-- their existing role. Otherwise the new gate would force every
-- existing user back through onboarding.
-- ───────────────────────────────────────────────────────────────────
-- NOTE: users.role is an ENUM (user_role). Comparing `role = 'mentor'`
-- forces Postgres to coerce the literal 'mentor' to the enum, which
-- fails if any value in the CASE list isn't currently in the enum
-- (different deploys may have shipped without 'creative_host', etc.).
-- Cast to TEXT on both sides so unknown role names just don't match
-- instead of erroring out.
UPDATE users
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at, NOW()),
    intent = CASE role::text
      WHEN 'intern'           THEN 'intern'
      WHEN 'recruiter'        THEN 'recruiter'
      WHEN 'mentor'           THEN 'mentor'
      WHEN 'partner_org'      THEN 'partner_org'
      WHEN 'startup_founder'  THEN 'startup_founder'
      WHEN 'investor'         THEN 'investor'
      WHEN 'public_user'      THEN 'visitor'
      WHEN 'creative_host'    THEN 'mentor'        -- best fit
      ELSE NULL
    END
WHERE onboarding_completed_at IS NULL;

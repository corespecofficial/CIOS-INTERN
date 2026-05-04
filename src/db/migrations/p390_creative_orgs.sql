-- p390: Creative-Space Host Org Portal — Phase 1 (schema only, RLS dormant)
--
-- Each approved creative_space spawns a creative_orgs row (1:1) — its own
-- isolated tenant with its own portal at /o/<slug>. Other host orgs cannot
-- see each other; super_admin sees all (existing bypass).
--
-- This migration is ADDITIVE. RLS is intentionally NOT enabled here —
-- Phase 3 enables it once the route group + middleware tenant guard ship.
-- Until then, all access is gated at the application layer behind the
-- ENABLE_HOST_PORTAL feature flag.

-- ───────────────────────────────────────────────────────────────────
-- Tenant root
-- ───────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS creative_orgs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        UUID NOT NULL UNIQUE REFERENCES creative_spaces(id) ON DELETE CASCADE,
  slug            CITEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  plan            TEXT NOT NULL DEFAULT 'free',
  storage_prefix  TEXT NOT NULL,
  member_count    INT NOT NULL DEFAULT 0,
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS creative_orgs_owner_idx ON creative_orgs(owner_user_id);
CREATE INDEX IF NOT EXISTS creative_orgs_status_idx ON creative_orgs(status);

-- Backlink so the public storefront page can deep-link into the tenant.
ALTER TABLE creative_spaces
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS creative_spaces_org_idx ON creative_spaces(org_id);

-- ───────────────────────────────────────────────────────────────────
-- Per-org membership (per-org role lives here, NOT in users.role)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner','org_admin','instructor','student')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended','removed')),
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON org_members(user_id, status);
CREATE INDEX IF NOT EXISTS org_members_org_role_idx ON org_members(org_id, role, status);

CREATE TABLE IF NOT EXISTS org_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  email       CITEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('org_admin','instructor','student')),
  token       TEXT NOT NULL UNIQUE,
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_invites_org_idx ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS org_invites_email_idx ON org_invites(email) WHERE accepted_at IS NULL;

-- ───────────────────────────────────────────────────────────────────
-- Org-scoped content tables (Phase 4 will populate these via UI;
-- shipped here so future migrations don't need to back-fill org_id)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_announcements_org_idx ON org_announcements(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS org_lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  video_url   TEXT,
  position    INT NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_lessons_org_idx ON org_lessons(org_id, position);

CREATE TABLE IF NOT EXISTS org_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES org_lessons(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  brief       TEXT,
  due_at      TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_assignments_org_idx ON org_assignments(org_id, due_at);

CREATE TABLE IF NOT EXISTS org_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES org_assignments(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT,
  attachment_key TEXT,
  grade         INT,
  feedback      TEXT,
  graded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at     TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS org_submissions_org_idx ON org_submissions(org_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS org_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'general' CHECK (kind IN ('general','announcements','q_and_a','dm')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS org_channels_org_idx ON org_channels(org_id);

CREATE TABLE IF NOT EXISTS org_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  channel_id  UUID NOT NULL REFERENCES org_channels(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_messages_channel_idx ON org_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS org_messages_org_idx ON org_messages(org_id);

CREATE TABLE IF NOT EXISTS org_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,                -- storage key, must start with the org's storage_prefix
  mime         TEXT,
  size_bytes   BIGINT,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, key)
);
CREATE INDEX IF NOT EXISTS org_files_org_idx ON org_files(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS org_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES creative_orgs(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target      TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_audit_log_org_idx ON org_audit_log(org_id, created_at DESC);

-- ───────────────────────────────────────────────────────────────────
-- Existing-table touch: per-org notification scoping
-- (the only existing mono-tenant table we mutate)
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES creative_orgs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notifications_org_idx ON notifications(org_id) WHERE org_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- RLS helpers (functions only — RLS is enabled in Phase 3)
-- ───────────────────────────────────────────────────────────────────

-- Read the active org from a request-scoped GUC. Server actions set this
-- via withOrg(orgId, fn) before each Supabase call. Returns NULL outside
-- a tenant request, so policies fail closed.
CREATE OR REPLACE FUNCTION active_org_id()
RETURNS UUID
LANGUAGE sql
STABLE AS $$
  SELECT NULLIF(current_setting('request.org_id', TRUE), '')::UUID
$$;

-- Cheap membership check used by RLS predicates and server-side guards.
-- Pass _roles=NULL to allow any active member; pass an array to restrict.
CREATE OR REPLACE FUNCTION is_org_member(_org UUID, _roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members
    WHERE org_id = _org
      AND user_id = auth_user_id()
      AND status  = 'active'
      AND (_roles IS NULL OR role = ANY(_roles))
  )
$$;

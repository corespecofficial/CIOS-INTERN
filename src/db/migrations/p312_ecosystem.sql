-- P3.12 Ecosystem: AI access + Documents + Opportunities + Recruiter portal.
-- Run once in Supabase SQL editor.

-- ── Role: add recruiter
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'recruiter';

-- ── AI tool catalog (names Super Admin can toggle per user)
CREATE TABLE IF NOT EXISTS ai_tools_catalog (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ai_tools_catalog (id, label, description) VALUES
  ('chat',              'AI Chat',              'General-purpose chat with Claude, GPT, Gemini, Llama'),
  ('content_generator', 'Content generator',    'Write posts, emails, captions'),
  ('resume_builder',    'Resume builder',       'AI-generated CV from profile'),
  ('marketing',         'Marketing assistant',  'Campaign planning + copy'),
  ('image_gen',         'Image generator',      'Create images from prompts'),
  ('coding',            'Coding assistant',     'Code review, debug, explain'),
  ('analytics',         'Analytics assistant',  'Explain your performance data'),
  ('prompt_builder',    'Prompt builder',       'Craft better prompts')
ON CONFLICT (id) DO NOTHING;

-- ── Per-user AI permissions
CREATE TABLE IF NOT EXISTS ai_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL REFERENCES ai_tools_catalog(id) ON DELETE CASCADE,
  daily_token_cap INT NOT NULL DEFAULT 50000,
  expires_at TIMESTAMPTZ,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, tool_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_perm_user ON ai_permissions(user_id);

-- ── AI usage log (one row per prompt)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  model TEXT,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_day ON ai_usage_logs(user_id, tool_id, created_at);

-- ── Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',  -- cv | certificate | report | contract | note | invoice | material | policy | id_card | other
  mime TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  folder TEXT,
  description TEXT,
  is_generated BOOLEAN NOT NULL DEFAULT false,
  generated_by TEXT,                    -- e.g. 'ai_resume_builder' | 'certificate_engine'
  shared_with UUID[] NOT NULL DEFAULT '{}',
  public BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(document_id, version)
);

-- ── Recruiter profiles
CREATE TABLE IF NOT EXISTS recruiter_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  about TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  hires_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'job',       -- job | gig | internship | scholarship | grant | collaboration | project | competition | event | volunteer
  category TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'NGN',
  salary_period TEXT,                     -- hourly | monthly | project | yearly
  location TEXT,
  remote BOOLEAN NOT NULL DEFAULT false,
  requirements TEXT,
  apply_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  deadline TIMESTAMPTZ,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',    -- open | closed | draft
  views INT NOT NULL DEFAULT 0,
  applications_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opps_status_deadline ON opportunities(status, deadline);
CREATE INDEX IF NOT EXISTS idx_opps_recruiter ON opportunities(recruiter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opps_kind ON opportunities(kind);

-- ── Applications
CREATE TABLE IF NOT EXISTS opportunity_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted',  -- submitted | viewed | shortlisted | interview | accepted | rejected | hired
  cover_letter TEXT,
  cv_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  portfolio_url TEXT,
  availability TEXT,
  expected_salary NUMERIC(12,2),
  recruiter_note TEXT,
  timeline JSONB NOT NULL DEFAULT '[]',      -- [{status, at, by}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(opportunity_id, applicant_id)
);
CREATE INDEX IF NOT EXISTS idx_apps_opp ON opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_apps_applicant ON opportunity_applications(applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_status ON opportunity_applications(status);

-- ── Saved opportunities
CREATE TABLE IF NOT EXISTS opportunity_saves (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, opportunity_id)
);

-- ── Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES opportunity_applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  mode TEXT NOT NULL DEFAULT 'video',     -- video | phone | onsite
  meeting_link TEXT,
  location TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled | no_show
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interviews_app ON interviews(application_id);

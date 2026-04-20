-- p386: Study Buddy + AI Hub + Documents → public portal (Phase 6).
-- Adds: server-side AI Hub conversation persistence (was browser-only),
-- document plan tier on users, paid document records.

-- AI Hub: persist conversations server-side so users see history across
-- devices. The existing browser localStorage flow still works as a fast
-- path; this table is the source of truth on sync.
CREATE TABLE IF NOT EXISTS ai_hub_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id     TEXT NOT NULL DEFAULT 'chat',
  title       TEXT NOT NULL DEFAULT 'New chat',
  /* Messages stored as JSONB array of { role: 'user'|'assistant'|'system', content: string, at: iso } */
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_hub_conversations_user_idx
  ON ai_hub_conversations (user_id, updated_at DESC);

-- Document plan tier — per-user. Default 'free' (CV only). Paid tiers
-- unlock cover letter / pitch deck / business plan / SOP generators.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS doc_plan_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (doc_plan_tier IN ('free', 'pro', 'pro_plus'));

-- Track paid document generations for billing reconciliation + analytics.
CREATE TABLE IF NOT EXISTS document_generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_kind    TEXT NOT NULL CHECK (doc_kind IN (
    'cv', 'cover_letter', 'pitch_deck', 'business_plan',
    'sop', 'portfolio', 'linkedin_optimizer'
  )),
  /** Plan in effect at generation time. */
  plan_tier   TEXT NOT NULL,
  /** Optional: /documents id of the saved file. Some flows just stream the PDF. */
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  /** Cents / kobo paid (0 for free CV). For per-generation pricing later. */
  charged_ngn NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_generations_user_idx
  ON document_generations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS document_generations_kind_idx
  ON document_generations (doc_kind, created_at DESC);

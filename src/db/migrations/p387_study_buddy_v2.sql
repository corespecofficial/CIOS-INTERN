-- p387_study_buddy_v2.sql
-- Study Buddy v2 — Phase 1 (multi-ingest foundation). See Phase-A of the
-- approved roadmap. Tables below are ADDITIVE: existing study_buddy_threads
-- and study_buddy_messages (from p318) keep powering the course-chat widget.
--
-- study_sessions       — one row per /study-buddy/learn session; was ephemeral React state before
-- study_source_chunks  — per-source extracted text, chunked, with a "ref" for source-pin citations

CREATE TABLE IF NOT EXISTS study_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic        text NOT NULL,
  language     text NOT NULL DEFAULT 'English',
  level        text NOT NULL DEFAULT 'beginner',
  style        text NOT NULL DEFAULT 'mixed',
  -- raw source manifest: [{kind,ref,label,size,durationSec?,pages?}]
  sources      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- cached knowledge map (populated after ingest)
  map          jsonb,
  -- phase enum — matches the wizard state so we can resume mid-flow
  phase        text NOT NULL DEFAULT 'source',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user
  ON study_sessions(user_id, created_at DESC);

-- Per-source extracted chunks. Kind = 'text' | 'youtube' | 'url' | 'pdf' |
-- 'docx' | 'audio' | 'video' | 'image'. Ref is whatever lets us cite back:
-- a URL, a filename, or "paste:<session_id>". page_or_timestamp is a short
-- human-readable pin like "p.4" or "0:32" for the source-pin chips.
CREATE TABLE IF NOT EXISTS study_source_chunks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  kind                text NOT NULL,
  ref                 text NOT NULL,
  label               text,
  text                text NOT NULL,
  page_or_timestamp   text,
  chunk_index         int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_chunks_session
  ON study_source_chunks(session_id, chunk_index);

-- Row-level security — users see only their own sessions
ALTER TABLE study_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_source_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_sessions_owner" ON study_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "study_chunks_owner" ON study_source_chunks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions s WHERE s.id = study_source_chunks.session_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM study_sessions s WHERE s.id = study_source_chunks.session_id AND s.user_id = auth.uid())
  );

COMMENT ON TABLE study_sessions      IS 'Study Buddy v2 — one row per /study-buddy/learn wizard session.';
COMMENT ON TABLE study_source_chunks IS 'Study Buddy v2 — chunked extracted text per source, for knowledge-map ingest + source-pin citations.';

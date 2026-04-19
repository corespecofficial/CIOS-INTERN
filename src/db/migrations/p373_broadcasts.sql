-- p373: Live Broadcast Room (Loom-style async video)
-- Admin or mentor records a short video; published to a target audience.

CREATE TABLE IF NOT EXISTS broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  video_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration_sec    INT,
  audience        TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','cohort','roles','group')),
  audience_value  TEXT,
  view_count      INT NOT NULL DEFAULT 0,
  pinned          BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_author ON broadcasts(author_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_pinned ON broadcasts(pinned) WHERE pinned = TRUE;

CREATE TABLE IF NOT EXISTS broadcast_reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS broadcast_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

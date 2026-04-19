-- p368: Intern Stories / Reels
-- Short-form content: text, photo, or video. Ephemeral (48h) by default
-- but can be saved to profile highlights.

CREATE TABLE IF NOT EXISTS stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('text','photo','video')),
  caption     TEXT,
  media_url   TEXT,
  thumbnail_url TEXT,
  background_color TEXT DEFAULT '#1E88E5',
  view_count  INT NOT NULL DEFAULT 0,
  featured    BOOLEAN NOT NULL DEFAULT FALSE,
  saved_to_profile BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(featured) WHERE featured = TRUE;

CREATE TABLE IF NOT EXISTS story_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL CHECK (reaction IN ('fire','love','eyes','idea')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);

CREATE TABLE IF NOT EXISTS story_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

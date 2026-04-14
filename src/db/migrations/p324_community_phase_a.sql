-- p324_community_phase_a.sql
-- Reddit-style Phase A: flags on posts + emoji reactions.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_locked      boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_nsfw        boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_spoiler     boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS crosspost_of   uuid    REFERENCES posts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS post_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);

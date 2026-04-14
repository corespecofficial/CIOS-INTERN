-- p325_community_phase_b.sql
-- Reddit-style Phase B: polls, awards, trending helper index.

-- Polls
CREATE TABLE IF NOT EXISTS post_polls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  question      text NOT NULL,
  multi_choice  boolean NOT NULL DEFAULT false,
  closes_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_poll_options (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES post_polls(id) ON DELETE CASCADE,
  label      text NOT NULL,
  position   int  NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON post_poll_options(poll_id);

CREATE TABLE IF NOT EXISTS post_poll_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES post_polls(id) ON DELETE CASCADE,
  option_id  uuid NOT NULL REFERENCES post_poll_options(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, option_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON post_poll_votes(poll_id);

-- Awards (applied to a post OR a comment, never both)
CREATE TABLE IF NOT EXISTS community_awards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES comments(id) ON DELETE CASCADE,
  giver_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('bronze','silver','gold','diamond')),
  cost        int  NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_id IS NOT NULL) <> (comment_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_awards_post ON community_awards(post_id);
CREATE INDEX IF NOT EXISTS idx_awards_comment ON community_awards(comment_id);
CREATE INDEX IF NOT EXISTS idx_awards_receiver ON community_awards(receiver_id);

-- Helper index for trending tags (GIN on posts.tags)
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON posts USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

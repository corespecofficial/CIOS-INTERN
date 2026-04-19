-- p369: Intern News Feed (Medium-style articles)
-- Long-form content by interns/mentors. Reactions and featured flag.

CREATE TABLE IF NOT EXISTS articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  cover_url     TEXT,
  body          TEXT NOT NULL,
  reading_min   INT NOT NULL DEFAULT 3,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INT NOT NULL DEFAULT 0,
  reaction_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS article_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_reactions_article ON article_reactions(article_id);

CREATE TABLE IF NOT EXISTS article_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);

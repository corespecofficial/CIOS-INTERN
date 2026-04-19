-- p362: Company Documents Library (public-facing)
-- Hosts curated first-party company documents (pitch decks, blueprints, competitive analysis)
-- Served at /library (public marketing route) with Cloudinary-hosted files.

CREATE TABLE IF NOT EXISTS company_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'product' CHECK (category IN (
                   'investor','product','market','press','technical','growth'
                 )),
  doc_type       TEXT NOT NULL DEFAULT 'pdf' CHECK (doc_type IN (
                   'pdf','html','slides','video','external'
                 )),
  file_url       TEXT NOT NULL,            -- Cloudinary secure URL or external link
  thumbnail_url  TEXT,
  cover_emoji    TEXT NOT NULL DEFAULT '📄',
  cover_color    TEXT NOT NULL DEFAULT '#1E88E5',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  access_level   TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN (
                   'public','investor','internal'
                 )),
  featured       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INT NOT NULL DEFAULT 0,
  page_count     INT,
  file_size_bytes BIGINT,
  view_count     INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
                   'draft','published','archived'
                 )),
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_docs_status   ON company_documents(status);
CREATE INDEX IF NOT EXISTS idx_company_docs_category ON company_documents(category);
CREATE INDEX IF NOT EXISTS idx_company_docs_access   ON company_documents(access_level);
CREATE INDEX IF NOT EXISTS idx_company_docs_featured ON company_documents(featured) WHERE featured = TRUE;

CREATE TABLE IF NOT EXISTS company_document_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_hash     TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_doc_views_doc ON company_document_views(document_id);

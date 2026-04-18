-- p361: Library + Checklist System
-- Library: monetized learning vault with paywall, reviews, downloads
-- Checklist: smart progress tracker with signatures, reminders, gamification

-- ─── LIBRARY ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT '📚',
  description TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO library_categories (name, slug, icon, sort_order) VALUES
  ('AI & Machine Learning',  'ai',            '🤖', 1),
  ('Marketing',              'marketing',     '📣', 2),
  ('Design',                 'design',        '🎨', 3),
  ('Coding & Dev',           'coding',        '💻', 4),
  ('Productivity',           'productivity',  '⚡', 5),
  ('Cybersecurity',          'cybersecurity', '🔐', 6),
  ('Business',               'business',      '💼', 7),
  ('Writing',                'writing',       '✍️', 8),
  ('Career',                 'career',        '🚀', 9),
  ('Finance',                'finance',       '💰', 10)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS library_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  category_slug       TEXT NOT NULL REFERENCES library_categories(slug),
  tags                TEXT[]  NOT NULL DEFAULT '{}',
  resource_type       TEXT NOT NULL CHECK (resource_type IN (
                        'video','document','audio','link','image_gallery','course_notes'
                      )),
  -- Access control
  access_type         TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN (
                        'free','paid','subscription','role_restricted','reward_unlocked'
                      )),
  price               NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'NGN',
  allowed_roles       TEXT[]  NOT NULL DEFAULT '{}',  -- empty = all roles
  -- Content
  file_url            TEXT,   -- Cloudinary secure URL
  external_link       TEXT,
  thumbnail_url       TEXT,
  preview_url         TEXT,   -- short preview file
  duration_minutes    INT,    -- for video/audio
  file_size_bytes     BIGINT,
  file_mime_type      TEXT,
  download_allowed    BOOLEAN NOT NULL DEFAULT TRUE,
  -- Discovery
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  featured            BOOLEAN NOT NULL DEFAULT FALSE,
  drip_release_at     TIMESTAMPTZ,
  view_count          INT NOT NULL DEFAULT 0,
  download_count      INT NOT NULL DEFAULT 0,
  purchase_count      INT NOT NULL DEFAULT 0,
  avg_rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count        INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lib_items_category ON library_items(category_slug);
CREATE INDEX IF NOT EXISTS idx_lib_items_status   ON library_items(status);
CREATE INDEX IF NOT EXISTS idx_lib_items_uploader ON library_items(uploader_id);
CREATE INDEX IF NOT EXISTS idx_lib_items_featured ON library_items(featured) WHERE featured = TRUE;

CREATE TABLE IF NOT EXISTS library_purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id        UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  amount_paid    NUMERIC(10,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'NGN',
  payment_ref    TEXT,
  payment_method TEXT NOT NULL DEFAULT 'paystack' CHECK (payment_method IN ('paystack','stripe','manual','reward')),
  expires_at     TIMESTAMPTZ,  -- NULL = lifetime
  purchased_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_lib_purchases_user ON library_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_lib_purchases_item ON library_purchases(item_id);

CREATE TABLE IF NOT EXISTS library_access_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN ('view','download','preview')),
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lib_logs_item ON library_access_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_lib_logs_user ON library_access_logs(user_id);

CREATE TABLE IF NOT EXISTS library_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lib_reviews_item ON library_reviews(item_id);

-- ─── CHECKLIST ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checklists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  category            TEXT NOT NULL DEFAULT 'general',
  priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date            TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived','cancelled')),
  completion_pct      INT  NOT NULL DEFAULT 0,
  signature_required  BOOLEAN NOT NULL DEFAULT FALSE,
  reminders_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  is_template         BOOLEAN NOT NULL DEFAULT FALSE,
  template_id         UUID REFERENCES checklists(id) ON DELETE SET NULL,
  xp_reward           INT  NOT NULL DEFAULT 50,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklists_assigned ON checklists(assigned_to);
CREATE INDEX IF NOT EXISTS idx_checklists_creator  ON checklists(creator_id);
CREATE INDEX IF NOT EXISTS idx_checklists_status   ON checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_template ON checklists(is_template) WHERE is_template = TRUE;

CREATE TABLE IF NOT EXISTS checklist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES checklist_items(id) ON DELETE CASCADE,  -- subtasks
  title         TEXT NOT NULL,
  notes         TEXT,
  sort_order    INT  NOT NULL DEFAULT 0,
  is_critical   BOOLEAN NOT NULL DEFAULT FALSE,
  deadline      TIMESTAMPTZ,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  proof_url     TEXT,   -- uploaded proof of completion
  depends_on    UUID REFERENCES checklist_items(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cl_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_cl_items_parent    ON checklist_items(parent_id);

CREATE TABLE IF NOT EXISTS checklist_signatures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id   UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  typed_name     TEXT NOT NULL,
  signature_data TEXT,  -- base64 drawn signature (optional)
  ip_hash        TEXT,
  signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(checklist_id, user_id)
);

CREATE TABLE IF NOT EXISTS checklist_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item_id      UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL CHECK (action IN ('created','item_checked','item_unchecked','item_blocked','note_added','proof_uploaded','completed','signed','reminder_sent')),
  meta         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cl_logs_checklist ON checklist_logs(checklist_id);
CREATE INDEX IF NOT EXISTS idx_cl_logs_user      ON checklist_logs(user_id);

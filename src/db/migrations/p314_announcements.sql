CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'text',
  priority TEXT NOT NULL DEFAULT 'low',
  image_url TEXT,
  video_url TEXT,
  youtube_id TEXT,
  cta_label TEXT,
  cta_url TEXT,
  poll_options JSONB,
  audience_type TEXT NOT NULL DEFAULT 'all',
  audience_roles TEXT[] NOT NULL DEFAULT '{}',
  audience_user_ids UUID[] NOT NULL DEFAULT '{}',
  require_confirmation BOOLEAN NOT NULL DEFAULT false,
  delay_close_seconds INT NOT NULL DEFAULT 0,
  display_duration_seconds INT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'published',
  route_lock_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ann_starts ON announcements(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_ann_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_ann_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_ann_sender ON announcements(sender_id);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_ms INT,
  PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcement_confirmations (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'read',
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcement_poll_votes (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcement_permissions (
  role TEXT PRIMARY KEY,
  can_send BOOLEAN NOT NULL DEFAULT false,
  allowed_audiences TEXT[] NOT NULL DEFAULT '{}',
  max_priority TEXT NOT NULL DEFAULT 'low',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO announcement_permissions (role, can_send, allowed_audiences, max_priority) VALUES
  ('super_admin', true, ARRAY['all','role','user','team','class','portal'], 'critical'),
  ('admin',       true, ARRAY['all','role','user','team','portal'], 'high'),
  ('team_lead',   true, ARRAY['team','user'], 'medium'),
  ('instructor',  true, ARRAY['class','user'], 'medium'),
  ('moderator',   true, ARRAY['role','user'], 'medium'),
  ('finance',     true, ARRAY['role','user'], 'medium'),
  ('support',     true, ARRAY['all','role','user'], 'medium')
ON CONFLICT (role) DO NOTHING;

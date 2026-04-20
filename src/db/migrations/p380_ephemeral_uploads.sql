-- p380: ephemeral_uploads — track 24h-TTL assets uploaded by public users.
-- Phase 0 of the public-portals masterplan (§2.4). The sweep cron
-- (/api/cron/cloudinary-sweep) polls this table hourly and deletes any row
-- whose expires_at has passed, then removes the Cloudinary asset.
--
-- We keep uploader_id nullable so un-authed uploads (e.g. public CV preview)
-- still get a row and still get swept.

CREATE TABLE IF NOT EXISTS ephemeral_uploads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id        TEXT NOT NULL UNIQUE,
  resource_type    TEXT NOT NULL DEFAULT 'image',
  secure_url       TEXT NOT NULL,
  bytes            BIGINT NOT NULL DEFAULT 0,
  kind             TEXT,
  uploader_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  uploader_role    TEXT,
  portal           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  deleted_at       TIMESTAMPTZ,
  delete_attempts  INT NOT NULL DEFAULT 0
);

-- Sweep query hits expires_at + deleted_at IS NULL — index that together.
CREATE INDEX IF NOT EXISTS idx_ephemeral_uploads_sweep
  ON ephemeral_uploads (expires_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ephemeral_uploads_uploader
  ON ephemeral_uploads (uploader_id);

CREATE INDEX IF NOT EXISTS idx_ephemeral_uploads_portal
  ON ephemeral_uploads (portal);

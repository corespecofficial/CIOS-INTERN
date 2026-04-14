-- Ensure the `notes` table has all columns the app expects.
-- Some older deployments have a slimmer schema; this adds what's missing.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Untitled',
  html        text NOT NULL DEFAULT '',
  icon        text NOT NULL DEFAULT 'doc',
  cover_url   text,
  folder      text,
  tags        text[] NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','shared','private')),
  starred     boolean NOT NULL DEFAULT false,
  pinned      boolean NOT NULL DEFAULT false,
  trashed_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS html       text NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS icon       text NOT NULL DEFAULT 'doc';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS cover_url  text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder     text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags       text[] NOT NULL DEFAULT '{}';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'draft';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS starred    boolean NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned     boolean NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS trashed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes (user_id, updated_at DESC) WHERE trashed_at IS NULL;

NOTIFY pgrst, 'reload schema';

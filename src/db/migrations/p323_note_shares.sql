-- p323_note_shares.sql — collaboration / share-with-intern support
-- Adds a note_shares table so a note owner can grant other users access.

CREATE TABLE IF NOT EXISTS note_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id     uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','commenter','editor')),
  message     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_note_shares_note ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_user ON note_shares(user_id);

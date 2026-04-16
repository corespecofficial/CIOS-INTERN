-- p340: Parent/Guardian Portal
CREATE TABLE IF NOT EXISTS guardian_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  guardian_name TEXT,
  guardian_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guardian_invites_intern ON guardian_invites(intern_id);
CREATE INDEX IF NOT EXISTS guardian_invites_token ON guardian_invites(token);

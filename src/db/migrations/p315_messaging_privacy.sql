ALTER TABLE users ADD COLUMN IF NOT EXISTS intern_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_intern_id ON users(intern_id) WHERE intern_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  allow_files BOOLEAN NOT NULL DEFAULT true,
  allow_voice BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'admin',
  note TEXT,
  UNIQUE(user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_contact_perm_a ON contact_permissions(user_a) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contact_perm_b ON contact_permissions(user_b) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_intern_id TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_req_status ON contact_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS messaging_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  privacy_level TEXT NOT NULL DEFAULT 'partial',
  who_can_message TEXT NOT NULL DEFAULT 'assigned',
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  typing_indicator BOOLEAN NOT NULL DEFAULT true,
  display_mode TEXT NOT NULL DEFAULT 'name',
  nickname TEXT,
  muted_until TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messaging_global_policy (
  id INT PRIMARY KEY DEFAULT 1,
  intern_messaging_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_files BOOLEAN NOT NULL DEFAULT true,
  allow_voice BOOLEAN NOT NULL DEFAULT true,
  allow_group_chats BOOLEAN NOT NULL DEFAULT true,
  retention_days INT NOT NULL DEFAULT 365,
  rate_limit_per_min INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO messaging_global_policy (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION generate_intern_id() RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  n INT;
  candidate TEXT;
BEGIN
  IF NEW.intern_id IS NOT NULL THEN RETURN NEW; END IF;
  prefix := CASE NEW.role
    WHEN 'intern' THEN 'CPS-INT'
    WHEN 'team_lead' THEN 'CPS-TL'
    WHEN 'instructor' THEN 'CPS-INS'
    WHEN 'admin' THEN 'CPS-ADM'
    WHEN 'super_admin' THEN 'CPS-SA'
    WHEN 'moderator' THEN 'CPS-MOD'
    WHEN 'finance' THEN 'CPS-FIN'
    WHEN 'support' THEN 'CPS-SUP'
    WHEN 'recruiter' THEN 'CPS-REC'
    ELSE 'CPS-USR'
  END;
  SELECT COALESCE(MAX(SUBSTRING(intern_id FROM '[0-9]+$')::int), 1000) + 1 INTO n
  FROM users WHERE intern_id LIKE prefix || '-%';
  candidate := prefix || '-' || n;
  NEW.intern_id := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_intern_id ON users;
CREATE TRIGGER trg_generate_intern_id BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION generate_intern_id();

WITH numbered AS (
  SELECT id,
    CASE role
      WHEN 'intern' THEN 'CPS-INT'
      WHEN 'team_lead' THEN 'CPS-TL'
      WHEN 'instructor' THEN 'CPS-INS'
      WHEN 'admin' THEN 'CPS-ADM'
      WHEN 'super_admin' THEN 'CPS-SA'
      WHEN 'moderator' THEN 'CPS-MOD'
      WHEN 'finance' THEN 'CPS-FIN'
      WHEN 'support' THEN 'CPS-SUP'
      WHEN 'recruiter' THEN 'CPS-REC'
      ELSE 'CPS-USR'
    END || '-' || (1000 + ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at))::text AS new_id
  FROM users
  WHERE intern_id IS NULL
)
UPDATE users SET intern_id = numbered.new_id
FROM numbered
WHERE users.id = numbered.id;

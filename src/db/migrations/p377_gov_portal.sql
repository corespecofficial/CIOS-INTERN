-- p377: Government Portal
-- Access for NYSC, ITF, NABCO officials. National registry of interns +
-- aggregate dashboards. Role-restricted access via gov_officers table.

CREATE TABLE IF NOT EXISTS gov_agencies (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  country   TEXT NOT NULL DEFAULT 'NG',
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gov_agencies (code, name, country) VALUES
  ('NYSC', 'National Youth Service Corps', 'NG'),
  ('ITF', 'Industrial Training Fund', 'NG'),
  ('NABCO', 'Nations Builders Corps', 'GH'),
  ('YEA', 'Youth Employment Agency', 'GH')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS gov_officers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES gov_agencies(id) ON DELETE CASCADE,
  role_title  TEXT,
  officer_id  TEXT,
  region      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_gov_officers_user ON gov_officers(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_officers_agency ON gov_officers(agency_id);
CREATE INDEX IF NOT EXISTS idx_gov_officers_status ON gov_officers(status);

CREATE TABLE IF NOT EXISTS gov_exports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id  UUID NOT NULL REFERENCES gov_officers(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('registry','compliance','analytics','fraud')),
  filters     JSONB NOT NULL DEFAULT '{}',
  row_count   INT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_exports_officer ON gov_exports(officer_id);

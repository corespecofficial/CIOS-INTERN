CREATE TABLE IF NOT EXISTS system_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('info','minor','major','critical')),
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','monitoring','resolved')),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS system_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  expected_duration_min INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_system_incidents_created ON system_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_scheduled ON system_maintenance(scheduled_at DESC);

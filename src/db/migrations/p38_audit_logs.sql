-- P3.8 Audit Logs: extend existing audit_logs + add security_incidents + compliance_exports.
-- Run this in Supabase SQL editor once.

-- Make user_id nullable (anonymous events — failed logins, system events)
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- Fields required by the audit engine
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action_code   TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category      TEXT NOT NULL DEFAULT 'general';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS summary       TEXT NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity      TEXT NOT NULL DEFAULT 'info';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS success       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name    TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role    TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent    TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS browser       TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_type   TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS os            TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS location      TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id    TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_score    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id     TEXT;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_created      ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user         ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_code  ON audit_logs(action_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category     ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity     ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success      ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity       ON audit_logs(entity_type, entity_id);

-- Correlated security incidents (escalated patterns worth dedicated tracking)
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  ip_address TEXT,
  related_log_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_kind   ON security_incidents(kind);

-- Compliance export receipts
CREATE TABLE IF NOT EXISTS compliance_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutability helper: block updates/deletes on audit_logs at the RLS level.
-- (Service role bypasses RLS — used only for retention sweep jobs.)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_no_update ON audit_logs;
DROP POLICY IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (false);

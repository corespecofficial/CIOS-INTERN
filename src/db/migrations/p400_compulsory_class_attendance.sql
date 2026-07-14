-- CIOS compulsory-class attendance policy.
-- Tuesday, Wednesday and Friday, 20:00-22:00 Africa/Lagos (WAT).
-- Attendance is evidence, not an RSVP. Disciplinary outcomes remain human-approved.

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attendance_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS minimum_attendance_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS evidence_source TEXT NOT NULL DEFAULT 'class_join'
    CHECK (evidence_source IN ('class_join', 'instructor', 'system')),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_class_sessions_compulsory_due
  ON class_sessions (is_compulsory, scheduled_at, status);

CREATE TABLE IF NOT EXISTS class_session_rsvps (
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

ALTER TABLE class_session_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_session_rsvps_select ON class_session_rsvps FOR SELECT USING (true);
CREATE POLICY class_session_rsvps_self_insert ON class_session_rsvps FOR INSERT
  WITH CHECK (user_id = auth_user_id());
CREATE POLICY class_session_rsvps_self_delete ON class_session_rsvps FOR DELETE
  USING (user_id = auth_user_id());

COMMENT ON COLUMN class_sessions.is_compulsory IS
  'Requires attendance review under the disclosed CIOS class policy.';
COMMENT ON COLUMN attendance.evidence_source IS
  'Disclosed source of attendance evidence; an RSVP is not attendance.';

CREATE TABLE IF NOT EXISTS class_attendance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding TEXT NOT NULL CHECK (finding IN ('present', 'late', 'absent', 'excused', 'pending_explanation')),
  explanation TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_step TEXT CHECK (recommended_step IS NULL OR recommended_step IN (
    'coaching_notice', 'written_warning', 'attendance_improvement_plan',
    'final_warning_review', 'suspension_review', 'dismissal_review'
  )),
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE class_attendance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_attendance_reviews_self_select
  ON class_attendance_reviews FOR SELECT
  USING (user_id = auth_user_id() OR is_admin(auth_user_id()));

CREATE POLICY class_attendance_reviews_admin_manage
  ON class_attendance_reviews FOR ALL
  USING (is_admin(auth_user_id())) WITH CHECK (is_admin(auth_user_id()));

-- One-row operational heartbeat used by the scheduled database health check.
-- This is intentionally non-user data and is only accessed with the server key.
CREATE TABLE IF NOT EXISTS system_heartbeat (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  service TEXT NOT NULL DEFAULT 'cios-web',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_count BIGINT NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE system_heartbeat ENABLE ROW LEVEL SECURITY;

INSERT INTO system_heartbeat (id, service)
VALUES (1, 'cios-web')
ON CONFLICT (id) DO NOTHING;

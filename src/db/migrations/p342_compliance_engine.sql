-- Migration: p342_compliance_engine
-- Task Enforcement Compliance Engine
-- Created: 2026-04-16

-- ============================================================
-- TABLE: compliance_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'assignment',
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline TIMESTAMPTZ NOT NULL,
  grace_period_minutes INTEGER NOT NULL DEFAULT 0,
  fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  late_fine_amount NUMERIC(10,2),
  submission_format TEXT,
  attachment_instructions TEXT,
  auto_reminder BOOLEAN NOT NULL DEFAULT true,
  auto_escalate BOOLEAN NOT NULL DEFAULT true,
  allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  score_penalty_percent INTEGER NOT NULL DEFAULT 0,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: compliance_task_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES compliance_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (task_id, user_id)
);

-- ============================================================
-- TABLE: compliance_task_submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  link_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  minutes_late INTEGER NOT NULL DEFAULT 0,
  score_awarded NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  UNIQUE (task_id, user_id)
);

-- ============================================================
-- TABLE: compliance_task_reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'in_app',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  minutes_before INTEGER NOT NULL
);

-- ============================================================
-- TABLE: compliance_fines
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES compliance_tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  waived_by UUID,
  waived_reason TEXT,
  payment_ref TEXT
);

-- ============================================================
-- TABLE: compliance_violations
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  description TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: compliance_suspensions
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  unpaid_fine_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  suspended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_until TIMESTAMPTZ,
  suspended_by UUID,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID,
  status TEXT NOT NULL DEFAULT 'active'
);

-- ============================================================
-- TABLE: compliance_appeals
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suspension_id UUID,
  violation_id UUID,
  intern_name TEXT NOT NULL,
  intern_id_number TEXT,
  reason TEXT NOT NULL,
  explanation TEXT NOT NULL,
  evidence_url TEXT,
  emergency_details TEXT,
  promise_statement TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: compliance_disciplinary_actions
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_disciplinary_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'auto',
  admin_id UUID,
  violation_count INTEGER NOT NULL DEFAULT 0,
  overridden BOOLEAN NOT NULL DEFAULT false,
  override_by UUID,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: compliance_banned_users
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID,
  reason TEXT NOT NULL,
  violation_summary TEXT,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email TEXT,
  clerk_id TEXT,
  identity_markers JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- TABLE: compliance_incident_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID,
  report_text TEXT NOT NULL,
  violation_count INTEGER NOT NULL DEFAULT 0,
  unpaid_fines NUMERIC(10,2) NOT NULL DEFAULT 0,
  suggested_action TEXT,
  admin_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_incident_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES: compliance_tasks
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_created_by ON compliance_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_status ON compliance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_deadline ON compliance_tasks(deadline);

-- ============================================================
-- INDEXES: compliance_task_assignments
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_task_assignments_task_id ON compliance_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_task_assignments_user_id ON compliance_task_assignments(user_id);

-- ============================================================
-- INDEXES: compliance_task_submissions
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_task_submissions_task_id ON compliance_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_task_submissions_user_id ON compliance_task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_task_submissions_status ON compliance_task_submissions(status);

-- ============================================================
-- INDEXES: compliance_task_reminders
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_task_reminders_task_id ON compliance_task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_task_reminders_user_id ON compliance_task_reminders(user_id);

-- ============================================================
-- INDEXES: compliance_fines
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_fines_task_id ON compliance_fines(task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_fines_user_id ON compliance_fines(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_fines_status ON compliance_fines(status);

-- ============================================================
-- INDEXES: compliance_violations
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_violations_user_id ON compliance_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_task_id ON compliance_violations(task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_violation_type ON compliance_violations(violation_type);

-- ============================================================
-- INDEXES: compliance_suspensions
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_suspensions_user_id ON compliance_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_suspensions_status ON compliance_suspensions(status);

-- ============================================================
-- INDEXES: compliance_appeals
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_appeals_user_id ON compliance_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_appeals_suspension_id ON compliance_appeals(suspension_id);
CREATE INDEX IF NOT EXISTS idx_compliance_appeals_violation_id ON compliance_appeals(violation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_appeals_status ON compliance_appeals(status);

-- ============================================================
-- INDEXES: compliance_disciplinary_actions
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_disciplinary_actions_user_id ON compliance_disciplinary_actions(user_id);

-- ============================================================
-- INDEXES: compliance_banned_users
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_banned_users_user_id ON compliance_banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_banned_users_email ON compliance_banned_users(email);
CREATE INDEX IF NOT EXISTS idx_compliance_banned_users_clerk_id ON compliance_banned_users(clerk_id);

-- ============================================================
-- INDEXES: compliance_incident_reports
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_incident_reports_user_id ON compliance_incident_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_incident_reports_task_id ON compliance_incident_reports(task_id);

-- ============================================================
-- TRIGGER: auto-update compliance_tasks.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_compliance_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compliance_tasks_updated_at ON compliance_tasks;
CREATE TRIGGER trg_compliance_tasks_updated_at
  BEFORE UPDATE ON compliance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_compliance_tasks_updated_at();

// Compliance Engine — Type Definitions
// Pure types file. No server actions, no logic.

// ============================================================
// UNION TYPE ALIASES
// ============================================================

export type TaskType =
  | "assignment"
  | "quiz"
  | "project"
  | "attendance"
  | "survey"
  | "report"
  | "other";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "active" | "draft" | "archived" | "cancelled";

export type SubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "late_approved";

export type FineStatus = "unpaid" | "paid" | "waived" | "disputed";

export type ViolationType =
  | "missed_task"
  | "late_submission"
  | "plagiarism"
  | "misconduct"
  | "repeated_absence"
  | "unpaid_fine"
  | "insubordination"
  | "other";

export type ViolationSeverity = "minor" | "moderate" | "major" | "critical";

export type SuspensionStatus = "active" | "lifted" | "expired";

export type AppealStatus = "pending" | "approved" | "rejected" | "escalated";

export type DisciplinaryActionType =
  | "warning"
  | "fine"
  | "suspension"
  | "ban"
  | "probation"
  | "written_notice"
  | "other";

// ============================================================
// CORE ENTITY INTERFACES
// ============================================================

export interface ComplianceTask {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  deadline: string;
  grace_period_minutes: number;
  fine_amount: number;
  late_fine_amount: number | null;
  submission_format: string | null;
  attachment_instructions: string | null;
  auto_reminder: boolean;
  auto_escalate: boolean;
  allow_late_submission: boolean;
  score_penalty_percent: number;
  target_roles: string[];
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface ComplianceTaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  notified_at: string | null;
  // Optional joined fields
  task?: ComplianceTask;
  submitted?: boolean;
  submission?: ComplianceTaskSubmission | null;
}

export interface ComplianceTaskSubmission {
  id: string;
  task_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  link_url: string | null;
  submitted_at: string;
  is_late: boolean;
  minutes_late: number;
  score_awarded: number | null;
  status: SubmissionStatus;
  admin_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ComplianceTaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_type: string;
  sent_at: string;
  minutes_before: number;
}

export interface ComplianceFine {
  id: string;
  task_id: string | null;
  user_id: string;
  amount: number;
  reason: string;
  status: FineStatus;
  issued_at: string;
  paid_at: string | null;
  waived_by: string | null;
  waived_reason: string | null;
  payment_ref: string | null;
  // Fine reform additions
  offense_number: number;
  non_monetary_consequence: string | null;
  consequence_status: "pending" | "fulfilled" | "waived" | null;
  consequence_note: string | null;
  // Optional joined fields
  task_title?: string;
  user_name?: string;
}

export interface ComplianceViolation {
  id: string;
  user_id: string;
  task_id: string | null;
  violation_type: ViolationType;
  severity: ViolationSeverity;
  description: string | null;
  acknowledged: boolean;
  created_at: string;
}

export interface ComplianceSuspension {
  id: string;
  user_id: string;
  reason: string;
  unpaid_fine_total: number;
  suspended_at: string;
  suspended_until: string | null;
  suspended_by: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
  status: SuspensionStatus;
  // Optional joined fields
  user_name?: string;
  user_avatar?: string;
  violation_count?: number;
}

export interface ComplianceAppeal {
  id: string;
  user_id: string;
  suspension_id: string | null;
  violation_id: string | null;
  intern_name: string;
  intern_id_number: string | null;
  reason: string;
  explanation: string;
  evidence_url: string | null;
  emergency_details: string | null;
  promise_statement: string | null;
  status: AppealStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  // Optional joined fields
  reviewer_name?: string;
}

export interface DisciplinaryAction {
  id: string;
  user_id: string;
  action_type: DisciplinaryActionType;
  reason: string;
  triggered_by: string;
  admin_id: string | null;
  violation_count: number;
  overridden: boolean;
  override_by: string | null;
  override_reason: string | null;
  created_at: string;
}

export interface BannedUser {
  id: string;
  user_id: string;
  banned_by: string | null;
  reason: string;
  violation_summary: string | null;
  banned_at: string;
  email: string | null;
  clerk_id: string | null;
  identity_markers: Record<string, unknown>;
}

export interface IncidentReport {
  id: string;
  user_id: string;
  task_id: string | null;
  report_text: string;
  violation_count: number;
  unpaid_fines: number;
  suggested_action: string | null;
  admin_notified: boolean;
  created_at: string;
}

// ============================================================
// COMPOSITE / DERIVED TYPES
// ============================================================

export type TaskWithStatus = ComplianceTask & {
  has_submission: boolean;
  submission: ComplianceTaskSubmission | null;
  is_overdue: boolean;
  effective_deadline: string;
  minutes_until_deadline: number;
};

export interface MyComplianceStatus {
  pendingTasks: TaskWithStatus[];
  unpaidFines: ComplianceFine[];
  totalUnpaidAmount: number;
  activeSuspension: ComplianceSuspension | null;
  violationCount: number;
  isBlocked: boolean;
  blockReason: "suspended" | "unpaid_fine" | null;
}

export interface AdminComplianceStats {
  totalTasks: number;
  activeTasks: number;
  missedToday: number;
  totalUnpaidFines: number;
  unpaidFineAmount: number;
  activeSuspensions: number;
  pendingAppeals: number;
  atRiskUsers: number;
}

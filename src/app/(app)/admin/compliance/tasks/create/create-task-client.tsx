"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  createComplianceTask,
  type CreateComplianceTaskInput,
} from "@/app/actions/compliance-tasks";

const TASK_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Daily Task" },
  { value: "project", label: "Project" },
  { value: "attendance", label: "Team Deliverable" },
  { value: "survey", label: "Class Submission" },
  { value: "report", label: "Report" },
  { value: "other", label: "Custom" },
];

const PRIORITY_OPTS = [
  { value: "low", label: "Low", color: "#66BB6A" },
  { value: "medium", label: "Medium", color: "#FFC107" },
  { value: "high", label: "High", color: "#FF7043" },
  { value: "critical", label: "Critical", color: "#EF5350" },
];

const SUBMISSION_FORMATS = [
  { value: "text", label: "Text" },
  { value: "file_url", label: "File URL" },
  { value: "link", label: "Link" },
  { value: "any", label: "Any" },
];

const TARGET_ROLE_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "team_lead", label: "Team Lead" },
  { value: "alumni", label: "Alumni" },
];

interface FormState {
  title: string;
  task_type: string;
  priority: string;
  description: string;
  deadline_date: string;
  deadline_time: string;
  grace_period_minutes: string;
  fine_amount: string;
  late_fine_amount: string;
  submission_format: string;
  attachment_instructions: string;
  auto_reminder: boolean;
  auto_escalate: boolean;
  allow_late_submission: boolean;
  score_penalty_percent: string;
  assigned_user_ids_raw: string;
  target_roles: string[];
}

const DEFAULT_FORM: FormState = {
  title: "",
  task_type: "assignment",
  priority: "medium",
  description: "",
  deadline_date: "",
  deadline_time: "23:59",
  grace_period_minutes: "0",
  fine_amount: "0",
  late_fine_amount: "",
  submission_format: "any",
  attachment_instructions: "",
  auto_reminder: true,
  auto_escalate: false,
  allow_late_submission: false,
  score_penalty_percent: "0",
  assigned_user_ids_raw: "",
  target_roles: ["intern"],
};

export function CreateTaskClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleRole(role: string) {
    setForm((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.title.trim()) newErrors.title = "Task title is required";
    if (!form.deadline_date) newErrors.deadline_date = "Deadline date is required";
    const fine = parseFloat(form.fine_amount);
    if (isNaN(fine) || fine < 0) newErrors.fine_amount = "Fine amount must be 0 or greater";
    if (form.late_fine_amount) {
      const lateFine = parseFloat(form.late_fine_amount);
      if (isNaN(lateFine) || lateFine < 0) newErrors.late_fine_amount = "Late fine must be 0 or greater";
    }
    const penalty = parseFloat(form.score_penalty_percent);
    if (!isNaN(penalty) && (penalty < 0 || penalty > 100)) {
      newErrors.score_penalty_percent = "Must be between 0 and 100";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const deadlineIso = form.deadline_date
      ? new Date(`${form.deadline_date}T${form.deadline_time || "23:59"}:00`).toISOString()
      : "";

    const assignedIds = form.assigned_user_ids_raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const input: CreateComplianceTaskInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      task_type: form.task_type,
      priority: form.priority,
      deadline: deadlineIso,
      grace_period_minutes: parseInt(form.grace_period_minutes) || 0,
      fine_amount: parseFloat(form.fine_amount) || 0,
      late_fine_amount: form.late_fine_amount ? parseFloat(form.late_fine_amount) : undefined,
      submission_format: form.submission_format || undefined,
      attachment_instructions: form.attachment_instructions.trim() || undefined,
      auto_reminder: form.auto_reminder,
      auto_escalate: form.auto_escalate,
      allow_late_submission: form.allow_late_submission,
      score_penalty_percent: parseFloat(form.score_penalty_percent) || 0,
      target_roles: form.target_roles,
      assigned_user_ids: assignedIds,
    };

    startTransition(async () => {
      const res = await createComplianceTask(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Task created successfully!");
      router.push("/admin/compliance");
    });
  }

  return (
    <>
      <style>{`
        .ctc-root {
          max-width: 920px;
          margin: 0 auto;
          padding: 28px 20px 64px;
          font-family: 'Nunito', 'Inter', sans-serif;
          color: #E8EDF5;
        }
        .ctc-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #8892A4;
          margin-bottom: 20px;
        }
        .ctc-breadcrumb a {
          color: #7C4DFF;
          text-decoration: none;
          font-weight: 700;
        }
        .ctc-breadcrumb a:hover { text-decoration: underline; }
        .ctc-header {
          margin-bottom: 28px;
        }
        .ctc-title {
          font-size: 24px;
          font-weight: 800;
          color: #E8EDF5;
          margin: 0 0 4px;
        }
        .ctc-sub {
          font-size: 13px;
          color: #8892A4;
          margin: 0;
        }
        .ctc-form {
          background: #111827;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          padding: 32px;
        }
        .ctc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .ctc-full { grid-column: 1 / -1; }
        .ctc-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .ctc-label {
          font-size: 12px;
          font-weight: 700;
          color: #8892A4;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ctc-label span {
          color: #EF5350;
          margin-left: 2px;
        }
        .ctc-input, .ctc-select, .ctc-textarea {
          width: 100%;
          padding: 11px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #E8EDF5;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
          appearance: none;
        }
        .ctc-input:focus, .ctc-select:focus, .ctc-textarea:focus {
          border-color: #7C4DFF;
          background: rgba(124,77,255,0.05);
        }
        .ctc-input.error, .ctc-select.error, .ctc-textarea.error {
          border-color: #EF5350 !important;
        }
        .ctc-select option { background: #111827; color: #E8EDF5; }
        .ctc-textarea { resize: vertical; min-height: 100px; }
        .ctc-error-msg {
          font-size: 11px;
          color: #EF5350;
          font-weight: 600;
        }
        .ctc-hint {
          font-size: 11px;
          color: #8892A4;
        }
        .ctc-section-divider {
          grid-column: 1 / -1;
          border: none;
          border-top: 1px solid rgba(255,255,255,0.07);
          margin: 6px 0 2px;
        }
        .ctc-section-label {
          grid-column: 1 / -1;
          font-size: 13px;
          font-weight: 800;
          color: #7C4DFF;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: -8px;
        }
        .ctc-toggle-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 0;
        }
        .ctc-toggle-input {
          width: 20px;
          height: 20px;
          accent-color: #7C4DFF;
          cursor: pointer;
        }
        .ctc-toggle-label {
          font-size: 14px;
          font-weight: 600;
          color: #E8EDF5;
          cursor: pointer;
        }
        .ctc-toggle-desc {
          font-size: 12px;
          color: #8892A4;
          margin-left: 30px;
          margin-top: -6px;
        }
        .ctc-role-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ctc-role-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #8892A4;
          transition: all 0.15s;
        }
        .ctc-role-chip.active {
          border-color: #7C4DFF;
          background: rgba(124,77,255,0.15);
          color: #7C4DFF;
        }
        .ctc-priority-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ctc-priority-pill {
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #8892A4;
          transition: all 0.15s;
        }
        .ctc-priority-pill.active-low { border-color: #66BB6A; background: rgba(102,187,106,0.12); color: #66BB6A; }
        .ctc-priority-pill.active-medium { border-color: #FFC107; background: rgba(255,193,7,0.12); color: #FFC107; }
        .ctc-priority-pill.active-high { border-color: #FF7043; background: rgba(255,112,67,0.12); color: #FF7043; }
        .ctc-priority-pill.active-critical { border-color: #EF5350; background: rgba(239,83,80,0.12); color: #EF5350; }
        .ctc-submit-row {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          flex-wrap: wrap;
        }
        .ctc-btn {
          padding: 13px 28px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .ctc-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .ctc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ctc-btn-primary { background: #7C4DFF; color: #fff; }
        .ctc-btn-ghost {
          background: rgba(255,255,255,0.05);
          color: #8892A4;
          border: 1px solid rgba(255,255,255,0.1) !important;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .ctc-deadline-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 700px) {
          .ctc-grid {
            grid-template-columns: 1fr !important;
          }
          .ctc-full {
            grid-column: 1 !important;
          }
          .ctc-form {
            padding: 20px 16px !important;
          }
          .ctc-root {
            padding: 16px 12px 48px !important;
          }
          .ctc-title {
            font-size: 20px !important;
          }
          .ctc-deadline-row {
            grid-template-columns: 1fr !important;
          }
          .ctc-submit-row {
            flex-direction: column !important;
          }
          .ctc-submit-row .ctc-btn {
            width: 100% !important;
            text-align: center !important;
            justify-content: center !important;
          }
        }
      `}</style>

      <div className="ctc-root">
        {/* Breadcrumb */}
        <div className="ctc-breadcrumb">
          <Link href="/admin/compliance">Compliance Engine</Link>
          <span>/</span>
          <span>Create Task</span>
        </div>

        {/* Header */}
        <div className="ctc-header">
          <h1 className="ctc-title">📋 Create Compliance Task</h1>
          <p className="ctc-sub">
            Assign a new compliance task to interns, team leads, or alumni.
          </p>
        </div>

        <form className="ctc-form" onSubmit={handleSubmit} noValidate>
          <div className="ctc-grid">
            {/* Task Title */}
            <div className="ctc-field ctc-full">
              <label className="ctc-label">
                Task Title <span>*</span>
              </label>
              <input
                className={`ctc-input${errors.title ? " error" : ""}`}
                type="text"
                placeholder="e.g. Weekly Progress Report — Week 12"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
              {errors.title && <span className="ctc-error-msg">{errors.title}</span>}
            </div>

            {/* Task Type */}
            <div className="ctc-field">
              <label className="ctc-label">Task Type</label>
              <select
                className="ctc-select"
                value={form.task_type}
                onChange={(e) => set("task_type", e.target.value)}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="ctc-field">
              <label className="ctc-label">Priority</label>
              <div className="ctc-priority-pills">
                {PRIORITY_OPTS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`ctc-priority-pill${form.priority === p.value ? ` active-${p.value}` : ""}`}
                    onClick={() => set("priority", p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="ctc-field ctc-full">
              <label className="ctc-label">Description</label>
              <textarea
                className="ctc-textarea"
                rows={6}
                placeholder="Describe the task requirements, expectations, and any specific instructions…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Deadline */}
            <div className="ctc-field ctc-full">
              <label className="ctc-label">
                Deadline <span>*</span>
              </label>
              <div className="ctc-deadline-row">
                <div className="ctc-field" style={{ gap: 0 }}>
                  <input
                    className={`ctc-input${errors.deadline_date ? " error" : ""}`}
                    type="date"
                    value={form.deadline_date}
                    onChange={(e) => set("deadline_date", e.target.value)}
                  />
                  {errors.deadline_date && (
                    <span className="ctc-error-msg" style={{ marginTop: 4 }}>
                      {errors.deadline_date}
                    </span>
                  )}
                </div>
                <input
                  className="ctc-input"
                  type="time"
                  value={form.deadline_time}
                  onChange={(e) => set("deadline_time", e.target.value)}
                />
              </div>
            </div>

            {/* Grace Period */}
            <div className="ctc-field">
              <label className="ctc-label">Grace Period (minutes)</label>
              <input
                className="ctc-input"
                type="number"
                min={0}
                max={120}
                value={form.grace_period_minutes}
                onChange={(e) => set("grace_period_minutes", e.target.value)}
              />
              <span className="ctc-hint">0–120 minutes after deadline</span>
            </div>

            {/* Submission Format */}
            <div className="ctc-field">
              <label className="ctc-label">Submission Format</label>
              <select
                className="ctc-select"
                value={form.submission_format}
                onChange={(e) => set("submission_format", e.target.value)}
              >
                {SUBMISSION_FORMATS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <hr className="ctc-section-divider" />
            <div className="ctc-section-label">💰 Fines & Penalties</div>

            {/* Fine Amount */}
            <div className="ctc-field">
              <label className="ctc-label">
                Fine Amount <span>(₦)</span>
              </label>
              <input
                className={`ctc-input${errors.fine_amount ? " error" : ""}`}
                type="number"
                min={0}
                step={100}
                placeholder="e.g. 1000"
                value={form.fine_amount}
                onChange={(e) => set("fine_amount", e.target.value)}
              />
              {errors.fine_amount && <span className="ctc-error-msg">{errors.fine_amount}</span>}
            </div>

            {/* Late Fine Amount */}
            <div className="ctc-field">
              <label className="ctc-label">Late Fine Amount (₦) <span style={{ color: "#8892A4", fontWeight: 400 }}>optional</span></label>
              <input
                className={`ctc-input${errors.late_fine_amount ? " error" : ""}`}
                type="number"
                min={0}
                step={100}
                placeholder="e.g. 500"
                value={form.late_fine_amount}
                onChange={(e) => set("late_fine_amount", e.target.value)}
              />
              {errors.late_fine_amount && (
                <span className="ctc-error-msg">{errors.late_fine_amount}</span>
              )}
            </div>

            {/* Score Penalty */}
            <div className="ctc-field">
              <label className="ctc-label">Score Penalty % <span style={{ color: "#8892A4", fontWeight: 400 }}>optional</span></label>
              <input
                className={`ctc-input${errors.score_penalty_percent ? " error" : ""}`}
                type="number"
                min={0}
                max={100}
                placeholder="0–100"
                value={form.score_penalty_percent}
                onChange={(e) => set("score_penalty_percent", e.target.value)}
              />
              {errors.score_penalty_percent && (
                <span className="ctc-error-msg">{errors.score_penalty_percent}</span>
              )}
            </div>

            {/* Attachment Instructions */}
            <div className="ctc-field ctc-full">
              <label className="ctc-label">
                Attachment Instructions{" "}
                <span style={{ color: "#8892A4", fontWeight: 400 }}>optional</span>
              </label>
              <textarea
                className="ctc-textarea"
                rows={3}
                placeholder="e.g. Upload a PDF via Google Drive and paste the link below…"
                value={form.attachment_instructions}
                onChange={(e) => set("attachment_instructions", e.target.value)}
              />
            </div>

            <hr className="ctc-section-divider" />
            <div className="ctc-section-label">⚙️ Automation Settings</div>

            {/* Toggles */}
            <div className="ctc-field">
              <div className="ctc-toggle-row">
                <input
                  id="auto_reminder"
                  type="checkbox"
                  className="ctc-toggle-input"
                  checked={form.auto_reminder}
                  onChange={(e) => set("auto_reminder", e.target.checked)}
                />
                <label htmlFor="auto_reminder" className="ctc-toggle-label">
                  Auto Reminders
                </label>
              </div>
              <p className="ctc-toggle-desc">Send automatic reminders before deadline</p>
            </div>

            <div className="ctc-field">
              <div className="ctc-toggle-row">
                <input
                  id="auto_escalate"
                  type="checkbox"
                  className="ctc-toggle-input"
                  checked={form.auto_escalate}
                  onChange={(e) => set("auto_escalate", e.target.checked)}
                />
                <label htmlFor="auto_escalate" className="ctc-toggle-label">
                  Auto Escalate
                </label>
              </div>
              <p className="ctc-toggle-desc">Automatically escalate missed tasks</p>
            </div>

            <div className="ctc-field">
              <div className="ctc-toggle-row">
                <input
                  id="allow_late"
                  type="checkbox"
                  className="ctc-toggle-input"
                  checked={form.allow_late_submission}
                  onChange={(e) => set("allow_late_submission", e.target.checked)}
                />
                <label htmlFor="allow_late" className="ctc-toggle-label">
                  Allow Late Submissions
                </label>
              </div>
              <p className="ctc-toggle-desc">Permit submissions after deadline (late fine applies)</p>
            </div>

            <hr className="ctc-section-divider" />
            <div className="ctc-section-label">👥 Assignment</div>

            {/* Target Roles */}
            <div className="ctc-field ctc-full">
              <label className="ctc-label">Target Roles</label>
              <div className="ctc-role-chips">
                {TARGET_ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`ctc-role-chip${form.target_roles.includes(r.value) ? " active" : ""}`}
                    onClick={() => toggleRole(r.value)}
                  >
                    {form.target_roles.includes(r.value) ? "✓ " : ""}{r.label}
                  </button>
                ))}
              </div>
              <span className="ctc-hint">Select all roles that should receive this task</span>
            </div>

            {/* Assign to Users */}
            <div className="ctc-field ctc-full">
              <label className="ctc-label">Assign to Specific Users</label>
              <textarea
                className="ctc-textarea"
                rows={3}
                placeholder="Enter comma-separated user IDs e.g. uuid-1, uuid-2, uuid-3"
                value={form.assigned_user_ids_raw}
                onChange={(e) => set("assigned_user_ids_raw", e.target.value)}
              />
              <span className="ctc-hint">
                Leave blank to assign based on target roles only
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="ctc-submit-row">
            <Link href="/admin/compliance" className="ctc-btn ctc-btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              className="ctc-btn ctc-btn-primary"
              disabled={isPending}
            >
              {isPending ? "Creating Task…" : "✅ Create Task"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

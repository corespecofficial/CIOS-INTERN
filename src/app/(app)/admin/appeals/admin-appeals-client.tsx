"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { adminReviewAppeal } from "@/app/actions/compliance-appeals";
import type { ComplianceAppeal, AppealStatus } from "@/app/actions/compliance-types";

interface Props {
  appeals: ComplianceAppeal[];
  stats: {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    total: number;
  };
}

type FilterTab = "all" | AppealStatus;

const APPEAL_REASON_LABELS: Record<string, string> = {
  medical: "Medical Emergency",
  family: "Family Emergency",
  technical: "Technical Issues",
  bereavement: "Bereavement",
  personal: "Personal Crisis",
  misunderstanding: "Task Misunderstanding",
  other: "Other",
};

const STATUS_CONFIG: Record<AppealStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  approved: { label: "Approved", color: "#66BB6A", bg: "rgba(102,187,106,0.12)" },
  rejected: { label: "Rejected", color: "#EF5350", bg: "rgba(239,83,80,0.12)" },
  escalated: { label: "Escalated", color: "#FF7043", bg: "rgba(255,112,67,0.12)" },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "escalated", label: "Escalated" },
];

function StatusBadge({ status }: { status: AppealStatus }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#8892A4", bg: "rgba(136,146,164,0.1)" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

interface AppealCardProps {
  appeal: ComplianceAppeal;
  onReviewed: (id: string, decision: "approved" | "rejected" | "extended" | "escalated") => void;
}

function AppealCard({ appeal, onReviewed }: AppealCardProps) {
  const [isPending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState(appeal.admin_notes || "");
  const [expanded, setExpanded] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"rejected" | "escalated" | null>(null);

  function handleDecision(decision: "approved" | "rejected" | "extended" | "escalated") {
    if (!adminNotes.trim()) {
      toast.error("Admin notes are required before reviewing");
      return;
    }
    if ((decision === "rejected" || decision === "escalated") && !confirmAction) {
      setConfirmAction(decision);
      return;
    }
    startTransition(async () => {
      const res = await adminReviewAppeal(appeal.id, decision, adminNotes.trim());
      if (!res.ok) {
        toast.error(res.error);
        setConfirmAction(null);
        return;
      }
      toast.success(`Appeal ${decision} successfully`);
      setConfirmAction(null);
      onReviewed(appeal.id, decision);
    });
  }

  const isPending_ = appeal.status === "pending";
  const excerpt =
    appeal.explanation.length > 120 && !expanded
      ? appeal.explanation.slice(0, 120) + "…"
      : appeal.explanation;

  return (
    <div className="aac-appeal-card">
      <div className="aac-appeal-top">
        <div className="aac-appeal-meta">
          <div className="aac-appeal-name">{appeal.intern_name}</div>
          {appeal.intern_id_number && (
            <div className="aac-appeal-id">ID: {appeal.intern_id_number}</div>
          )}
          <div className="aac-appeal-date">
            Submitted{" "}
            {new Date(appeal.created_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <StatusBadge status={appeal.status} />
      </div>

      <div className="aac-appeal-reason-row">
        <span className="aac-appeal-reason-label">
          {APPEAL_REASON_LABELS[appeal.reason] || appeal.reason}
        </span>
      </div>

      <p className="aac-appeal-excerpt">
        {excerpt}
        {appeal.explanation.length > 120 && (
          <button
            className="aac-expand-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? " Show less" : " Read more"}
          </button>
        )}
      </p>

      {appeal.evidence_url && (
        <div style={{ marginTop: 8 }}>
          <a
            href={appeal.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="aac-link"
          >
            📎 View Evidence
          </a>
        </div>
      )}

      {appeal.emergency_details && (
        <div className="aac-detail-box" style={{ borderColor: "rgba(255,193,7,0.2)" }}>
          <span className="aac-detail-label">Emergency Details</span>
          <p className="aac-detail-text">{appeal.emergency_details}</p>
        </div>
      )}

      {appeal.admin_notes && !isPending_ && (
        <div className="aac-detail-box">
          <span className="aac-detail-label">Admin Notes ({appeal.reviewer_name || "Admin"})</span>
          <p className="aac-detail-text">{appeal.admin_notes}</p>
        </div>
      )}

      {isPending_ && (
        <div className="aac-action-panel">
          <div className="aac-field">
            <label className="aac-field-label">Admin Notes <span style={{ color: "#EF5350" }}>*</span></label>
            <textarea
              className="aac-textarea"
              rows={3}
              placeholder="Add notes about your decision (required)…"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          {confirmAction && (
            <div className="aac-confirm-box">
              <span style={{ color: "#FFC107", fontSize: 13, fontWeight: 700 }}>
                ⚠️ Confirm {confirmAction === "rejected" ? "Rejection" : "Escalation"}?
              </span>
              <p style={{ fontSize: 12, color: "#8892A4", margin: "4px 0 10px" }}>
                This action will be recorded and the intern will be notified.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="aac-btn"
                  style={{ background: "#EF5350", color: "#fff" }}
                  onClick={() => handleDecision(confirmAction)}
                  disabled={isPending}
                >
                  {isPending ? "Processing…" : "Yes, Confirm"}
                </button>
                <button
                  className="aac-btn aac-btn-ghost"
                  onClick={() => setConfirmAction(null)}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!confirmAction && (
            <div className="aac-decision-btns">
              <button
                className="aac-btn aac-btn-approve"
                onClick={() => handleDecision("approved")}
                disabled={isPending}
              >
                ✅ Approve
              </button>
              <button
                className="aac-btn aac-btn-reject"
                onClick={() => handleDecision("rejected")}
                disabled={isPending}
              >
                ❌ Reject
              </button>
              <button
                className="aac-btn aac-btn-extend"
                onClick={() => handleDecision("extended")}
                disabled={isPending}
              >
                ⏰ Extend
              </button>
              <button
                className="aac-btn aac-btn-escalate"
                onClick={() => handleDecision("escalated")}
                disabled={isPending}
              >
                ⚠️ Escalate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminAppealsClient({ appeals, stats }: Props) {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [localAppeals, setLocalAppeals] = useState<ComplianceAppeal[]>(appeals);

  function handleReviewed(
    id: string,
    decision: "approved" | "rejected" | "extended" | "escalated"
  ) {
    setLocalAppeals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision as AppealStatus } : a))
    );
  }

  const filtered = localAppeals.filter((a) => {
    const matchesTab = filterTab === "all" || a.status === filterTab;
    const matchesSearch =
      !search.trim() ||
      a.intern_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.intern_id_number || "").toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <>
      <style>{`
        .aac-root {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 20px 64px;
          font-family: 'Nunito', 'Inter', sans-serif;
          color: #E8EDF5;
        }
        .aac-badge {
          display: inline-block;
          padding: 3px 10px;
          background: rgba(255,193,7,0.12);
          color: #FFC107;
          font-size: 11px;
          font-weight: 700;
          border-radius: 20px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .aac-title {
          font-size: 26px;
          font-weight: 800;
          color: #E8EDF5;
          margin: 0 0 4px;
        }
        .aac-sub {
          font-size: 13px;
          color: #8892A4;
          margin: 0 0 24px;
        }
        .aac-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }
        .aac-stat-card {
          background: #111827;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .aac-stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 5px;
        }
        .aac-stat-label {
          font-size: 11px;
          color: #8892A4;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .aac-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
        .aac-search {
          flex: 1;
          min-width: 200px;
          padding: 10px 14px;
          background: #111827;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #E8EDF5;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .aac-search:focus { border-color: #7C4DFF; }
        .aac-filter-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .aac-filter-tab {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #8892A4;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .aac-filter-tab:hover { border-color: #7C4DFF; color: #E8EDF5; }
        .aac-filter-tab.active {
          background: rgba(124,77,255,0.15);
          border-color: #7C4DFF;
          color: #7C4DFF;
        }
        .aac-appeals-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .aac-appeal-card {
          background: #111827;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 22px 24px;
          transition: border-color 0.15s;
        }
        .aac-appeal-card:hover {
          border-color: rgba(124,77,255,0.2);
        }
        .aac-appeal-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .aac-appeal-name {
          font-size: 16px;
          font-weight: 800;
          color: #E8EDF5;
          margin-bottom: 2px;
        }
        .aac-appeal-id {
          font-size: 12px;
          color: #7C4DFF;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .aac-appeal-date {
          font-size: 12px;
          color: #8892A4;
        }
        .aac-appeal-reason-row {
          margin-bottom: 8px;
        }
        .aac-appeal-reason-label {
          display: inline-block;
          padding: 3px 10px;
          background: rgba(124,77,255,0.12);
          color: #A78BFA;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .aac-appeal-excerpt {
          font-size: 13px;
          color: #8892A4;
          line-height: 1.7;
          margin: 0 0 12px;
        }
        .aac-expand-btn {
          background: none;
          border: none;
          color: #7C4DFF;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          padding: 0;
          text-decoration: underline;
          font-family: inherit;
        }
        .aac-link {
          font-size: 12px;
          color: #7C4DFF;
          text-decoration: none;
          font-weight: 700;
        }
        .aac-link:hover { text-decoration: underline; }
        .aac-detail-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 10px;
        }
        .aac-detail-label {
          font-size: 11px;
          color: #8892A4;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }
        .aac-detail-text {
          font-size: 13px;
          color: #E8EDF5;
          line-height: 1.6;
          margin: 0;
        }
        .aac-action-panel {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .aac-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .aac-field-label {
          font-size: 12px;
          font-weight: 700;
          color: #8892A4;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .aac-textarea {
          width: 100%;
          padding: 10px 13px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #E8EDF5;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          outline: none;
          transition: border-color 0.15s;
        }
        .aac-textarea:focus { border-color: #7C4DFF; }
        .aac-decision-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .aac-btn {
          padding: 9px 18px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .aac-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .aac-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .aac-btn-approve { background: rgba(102,187,106,0.15); color: #66BB6A; }
        .aac-btn-reject { background: rgba(239,83,80,0.15); color: #EF5350; }
        .aac-btn-extend { background: rgba(255,193,7,0.12); color: #FFC107; }
        .aac-btn-escalate { background: rgba(255,112,67,0.12); color: #FF7043; }
        .aac-btn-ghost { background: rgba(136,146,164,0.1); color: #8892A4; border: 1px solid rgba(136,146,164,0.2) !important; }
        .aac-confirm-box {
          background: rgba(255,193,7,0.06);
          border: 1px solid rgba(255,193,7,0.2);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 12px;
        }
        .aac-empty {
          text-align: center;
          padding: 64px 24px;
          color: #8892A4;
        }
        .aac-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          display: block;
        }
        .aac-empty-title {
          font-size: 16px;
          font-weight: 700;
          color: #E8EDF5;
          margin-bottom: 6px;
        }
        @media (max-width: 900px) {
          .aac-stats-row {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .aac-root {
            padding: 16px 12px 48px !important;
          }
          .aac-stats-row {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .aac-stat-value {
            font-size: 22px !important;
          }
          .aac-title {
            font-size: 20px !important;
          }
          .aac-appeal-card {
            padding: 16px !important;
          }
          .aac-controls {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .aac-decision-btns {
            flex-direction: column !important;
          }
          .aac-btn {
            width: 100% !important;
            text-align: center !important;
          }
        }
      `}</style>

      <div className="aac-root">
        {/* Header */}
        <span className="aac-badge">Appeals Management</span>
        <h1 className="aac-title">📋 Appeals Management</h1>
        <p className="aac-sub">Review and action intern compliance appeals.</p>

        {/* Stats */}
        <div className="aac-stats-row">
          <div className="aac-stat-card">
            <div className="aac-stat-value" style={{ color: "#FFC107" }}>
              {stats.pending}
            </div>
            <div className="aac-stat-label">Pending</div>
          </div>
          <div className="aac-stat-card">
            <div className="aac-stat-value" style={{ color: "#66BB6A" }}>
              {stats.approvedToday}
            </div>
            <div className="aac-stat-label">Approved Today</div>
          </div>
          <div className="aac-stat-card">
            <div className="aac-stat-value" style={{ color: "#EF5350" }}>
              {stats.rejectedToday}
            </div>
            <div className="aac-stat-label">Rejected Today</div>
          </div>
          <div className="aac-stat-card">
            <div className="aac-stat-value" style={{ color: "#E8EDF5" }}>
              {stats.total}
            </div>
            <div className="aac-stat-label">Total Appeals</div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="aac-controls">
          <input
            className="aac-search"
            type="text"
            placeholder="Search by intern name or ID number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="aac-filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`aac-filter-tab${filterTab === tab.key ? " active" : ""}`}
                onClick={() => setFilterTab(tab.key)}
              >
                {tab.label}
                {tab.key !== "all" && (
                  <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>
                    ({localAppeals.filter((a) => a.status === tab.key).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Appeals List */}
        {filtered.length === 0 ? (
          <div className="aac-empty">
            <span className="aac-empty-icon">📭</span>
            <div className="aac-empty-title">No appeals found</div>
            <p style={{ fontSize: 13, margin: 0 }}>
              {search || filterTab !== "all"
                ? "Try adjusting your search or filter."
                : "No appeals have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="aac-appeals-list">
            {filtered.map((appeal) => (
              <AppealCard
                key={appeal.id}
                appeal={appeal}
                onReviewed={handleReviewed}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

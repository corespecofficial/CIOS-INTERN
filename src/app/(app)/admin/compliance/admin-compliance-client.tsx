"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminLiftSuspension } from "@/app/actions/compliance-suspensions";
import { adminWaiveFine } from "@/app/actions/compliance-fines";
import type {
  AdminComplianceStats,
  ComplianceFine,
  ComplianceSuspension,
  ComplianceTask,
} from "@/app/actions/compliance-types";

interface Props {
  stats: AdminComplianceStats;
  fines: ComplianceFine[];
  suspensions: ComplianceSuspension[];
  tasks: ComplianceTask[];
}

type FineFilter = "all" | "unpaid" | "paid" | "waived";

const PRIORITY_COLOR: Record<string, string> = {
  low: "#66BB6A",
  medium: "#FFC107",
  high: "#FF7043",
  critical: "#EF5350",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#66BB6A",
  draft: "#8892A4",
  archived: "#444C5E",
  cancelled: "#EF5350",
};

const FINE_STATUS_COLOR: Record<string, string> = {
  unpaid: "#EF5350",
  paid: "#66BB6A",
  waived: "#8892A4",
  disputed: "#FFC107",
};

function StatCard({
  label,
  value,
  color,
  prefix,
}: {
  label: string;
  value: number;
  color?: string;
  prefix?: string;
}) {
  return (
    <div className="acc-stat-card">
      <div className="acc-stat-value" style={{ color: color || "#E8EDF5" }}>
        {prefix || ""}
        {typeof value === "number" && label.includes("₦")
          ? value.toLocaleString("en-NG")
          : value.toLocaleString()}
      </div>
      <div className="acc-stat-label">{label}</div>
    </div>
  );
}

export function AdminComplianceClient({ stats, fines, suspensions, tasks }: Props) {
  const [isPending, startTransition] = useTransition();

  // Fines state
  const [fineFilter, setFineFilter] = useState<FineFilter>("all");
  const [waivedFineId, setWaivedFineId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [localFines, setLocalFines] = useState<ComplianceFine[]>(fines);

  // Tasks section collapse
  const [tasksOpen, setTasksOpen] = useState(true);
  const [finesOpen, setFinesOpen] = useState(true);
  const [suspOpen, setSuspOpen] = useState(true);

  const filteredFines = localFines.filter((f) => {
    if (fineFilter === "all") return true;
    return f.status === fineFilter;
  });

  function handleWaive(fineId: string) {
    if (!waiveReason.trim()) {
      toast.error("Waive reason is required");
      return;
    }
    startTransition(async () => {
      const res = await adminWaiveFine(fineId, waiveReason.trim());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Fine waived successfully");
      setLocalFines((prev) =>
        prev.map((f) => (f.id === fineId ? { ...f, status: "waived", waived_reason: waiveReason.trim() } : f))
      );
      setWaivedFineId(null);
      setWaiveReason("");
    });
  }

  function handleLiftSuspension(userId: string) {
    startTransition(async () => {
      const res = await adminLiftSuspension(userId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Suspension lifted");
    });
  }

  return (
    <>
      <style>{`
        .acc-root {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 20px 60px;
          font-family: 'Nunito', 'Inter', sans-serif;
          color: #E8EDF5;
        }
        .acc-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .acc-header-title {
          font-size: 26px;
          font-weight: 800;
          color: #E8EDF5;
          margin: 0 0 4px;
        }
        .acc-header-sub {
          font-size: 13px;
          color: #8892A4;
          margin: 0;
        }
        .acc-badge {
          display: inline-block;
          padding: 3px 10px;
          background: rgba(124,77,255,0.15);
          color: #7C4DFF;
          font-size: 11px;
          font-weight: 700;
          border-radius: 20px;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .acc-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }
        .acc-stat-card {
          background: #111827;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 18px 20px;
          min-width: 0;
        }
        .acc-stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 6px;
        }
        .acc-stat-label {
          font-size: 11px;
          color: #8892A4;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .acc-quick-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        .acc-quick-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
        }
        .acc-quick-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .acc-quick-btn-primary { background: #7C4DFF; color: #fff; }
        .acc-quick-btn-outline {
          background: rgba(255,255,255,0.05);
          color: #E8EDF5;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .acc-section {
          background: #111827;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .acc-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .acc-section-header:hover { background: rgba(255,255,255,0.02); }
        .acc-section-title {
          font-size: 15px;
          font-weight: 800;
          color: #E8EDF5;
          margin: 0;
        }
        .acc-section-count {
          font-size: 12px;
          color: #8892A4;
          margin-left: 8px;
          font-weight: 600;
        }
        .acc-section-body {
          padding: 0;
          overflow-x: auto;
        }
        .acc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .acc-table th {
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 700;
          color: #8892A4;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          white-space: nowrap;
          background: rgba(0,0,0,0.2);
        }
        .acc-table td {
          padding: 14px 16px;
          color: #E8EDF5;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
        }
        .acc-table tr:last-child td { border-bottom: none; }
        .acc-table tr:hover td { background: rgba(255,255,255,0.02); }
        .acc-badge-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: capitalize;
        }
        .acc-action-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .acc-action-btn:hover { opacity: 0.8; }
        .acc-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .acc-waive-panel {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .acc-waive-input {
          flex: 1;
          min-width: 140px;
          padding: 6px 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px;
          color: #E8EDF5;
          font-size: 12px;
          outline: none;
        }
        .acc-waive-input:focus { border-color: #7C4DFF; }
        .acc-filter-tabs {
          display: flex;
          gap: 4px;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
        .acc-filter-tab {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #8892A4;
          cursor: pointer;
          transition: all 0.15s;
        }
        .acc-filter-tab:hover { border-color: #7C4DFF; color: #E8EDF5; }
        .acc-filter-tab.active {
          background: rgba(124,77,255,0.15);
          border-color: #7C4DFF;
          color: #7C4DFF;
        }
        .acc-susp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
          padding: 20px;
        }
        .acc-susp-card {
          background: rgba(239,83,80,0.06);
          border: 1px solid rgba(239,83,80,0.18);
          border-radius: 12px;
          padding: 18px;
        }
        .acc-susp-name {
          font-size: 15px;
          font-weight: 800;
          color: #E8EDF5;
          margin-bottom: 4px;
        }
        .acc-susp-meta {
          font-size: 12px;
          color: #8892A4;
          margin-bottom: 12px;
          line-height: 1.6;
        }
        .acc-susp-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .acc-empty {
          padding: 48px 24px;
          text-align: center;
          color: #8892A4;
          font-size: 14px;
        }
        @media (max-width: 900px) {
          .acc-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .acc-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .acc-root {
            padding: 16px 12px 48px !important;
          }
          .acc-stat-value {
            font-size: 22px !important;
          }
          .acc-header-title {
            font-size: 20px !important;
          }
          .acc-susp-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="acc-root">
        {/* Header */}
        <div className="acc-header">
          <div>
            <span className="acc-badge">Compliance Engine</span>
            <h1 className="acc-header-title">🛡️ Compliance Engine</h1>
            <p className="acc-header-sub">
              Monitor tasks, fines, suspensions, and appeals across all interns.
            </p>
          </div>
          <Link href="/admin/compliance/tasks/create" className="acc-quick-btn acc-quick-btn-primary">
            + Create Task
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="acc-stats-grid">
          <StatCard label="Total Tasks" value={stats.totalTasks} />
          <StatCard label="Active Tasks" value={stats.activeTasks} color="#66BB6A" />
          <StatCard label="Missed Today" value={stats.missedToday} color="#EF5350" />
          <StatCard label="Unpaid Fines" value={stats.totalUnpaidFines} color="#FFC107" />
          <StatCard label="Unpaid Amount ₦" value={stats.unpaidFineAmount} color="#EF5350" prefix="₦" />
          <StatCard label="Active Suspensions" value={stats.activeSuspensions} color="#EF5350" />
          <StatCard label="Pending Appeals" value={stats.pendingAppeals} color="#FFC107" />
          <StatCard label="At-Risk Users" value={stats.atRiskUsers} color="#FF7043" />
        </div>

        {/* Quick Actions */}
        <div className="acc-quick-row">
          <Link href="/admin/compliance/tasks/create" className="acc-quick-btn acc-quick-btn-primary">
            + Create Task
          </Link>
          <Link href="/admin/appeals" className="acc-quick-btn acc-quick-btn-outline">
            View Appeals
          </Link>
          <button
            className="acc-quick-btn acc-quick-btn-outline"
            onClick={() => setSuspOpen(true)}
            style={{ background: "rgba(255,255,255,0.05)", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Manage Suspensions
          </button>
          <button
            className="acc-quick-btn acc-quick-btn-outline"
            onClick={() => toast("Export coming soon", { icon: "📊" })}
            style={{ background: "rgba(255,255,255,0.05)", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Export Report
          </button>
        </div>

        {/* Tasks Section */}
        <div className="acc-section">
          <div className="acc-section-header" onClick={() => setTasksOpen((v) => !v)}>
            <h2 className="acc-section-title">
              📋 Tasks
              <span className="acc-section-count">{tasks.length} total</span>
            </h2>
            <span style={{ color: "#8892A4", fontSize: 18 }}>{tasksOpen ? "▲" : "▼"}</span>
          </div>
          {tasksOpen && (
            <div className="acc-section-body">
              {tasks.length === 0 ? (
                <div className="acc-empty">No tasks found. Create your first task.</div>
              ) : (
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Deadline</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 700, maxWidth: 220 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {task.description.slice(0, 60)}
                              {task.description.length > 60 ? "…" : ""}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="acc-badge-pill"
                            style={{ background: "rgba(124,77,255,0.15)", color: "#A78BFA" }}
                          >
                            {task.task_type}
                          </span>
                        </td>
                        <td>
                          <span
                            className="acc-badge-pill"
                            style={{
                              background: `${PRIORITY_COLOR[task.priority] || "#8892A4"}22`,
                              color: PRIORITY_COLOR[task.priority] || "#8892A4",
                            }}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap" }}>
                          {new Date(task.deadline).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td>
                          <span
                            className="acc-badge-pill"
                            style={{
                              background: `${STATUS_COLOR[task.status] || "#8892A4"}22`,
                              color: STATUS_COLOR[task.status] || "#8892A4",
                            }}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            href={`/admin/compliance/tasks/${task.id}`}
                            style={{
                              fontSize: 12,
                              color: "#7C4DFF",
                              textDecoration: "none",
                              fontWeight: 700,
                              marginRight: 12,
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Fines Section */}
        <div className="acc-section">
          <div className="acc-section-header" onClick={() => setFinesOpen((v) => !v)}>
            <h2 className="acc-section-title">
              💳 Fines
              <span className="acc-section-count">{localFines.length} total</span>
            </h2>
            <span style={{ color: "#8892A4", fontSize: 18 }}>{finesOpen ? "▲" : "▼"}</span>
          </div>
          {finesOpen && (
            <>
              <div className="acc-filter-tabs">
                {(["all", "unpaid", "paid", "waived"] as FineFilter[]).map((tab) => (
                  <button
                    key={tab}
                    className={`acc-filter-tab${fineFilter === tab ? " active" : ""}`}
                    onClick={() => setFineFilter(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                      ({tab === "all" ? localFines.length : localFines.filter((f) => f.status === tab).length})
                    </span>
                  </button>
                ))}
              </div>
              <div className="acc-section-body">
                {filteredFines.length === 0 ? (
                  <div className="acc-empty">No fines in this category.</div>
                ) : (
                  <table className="acc-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Task</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Issued</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFines.map((fine) => (
                        <tr key={fine.id}>
                          <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                            {fine.user_name || fine.user_id.slice(0, 8) + "…"}
                          </td>
                          <td style={{ color: "#8892A4", fontSize: 12 }}>
                            {fine.task_title || "—"}
                          </td>
                          <td style={{ fontWeight: 800, color: "#FFC107", whiteSpace: "nowrap" }}>
                            ₦{fine.amount.toLocaleString("en-NG")}
                          </td>
                          <td style={{ fontSize: 12, color: "#8892A4", maxWidth: 160 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {fine.reason}
                            </div>
                          </td>
                          <td>
                            <span
                              className="acc-badge-pill"
                              style={{
                                background: `${FINE_STATUS_COLOR[fine.status] || "#8892A4"}22`,
                                color: FINE_STATUS_COLOR[fine.status] || "#8892A4",
                              }}
                            >
                              {fine.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap" }}>
                            {new Date(fine.issued_at).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {fine.status === "unpaid" && (
                              <>
                                {waivedFineId === fine.id ? (
                                  <div className="acc-waive-panel">
                                    <input
                                      className="acc-waive-input"
                                      placeholder="Waive reason…"
                                      value={waiveReason}
                                      onChange={(e) => setWaiveReason(e.target.value)}
                                    />
                                    <button
                                      className="acc-action-btn"
                                      style={{ background: "rgba(102,187,106,0.15)", color: "#66BB6A" }}
                                      onClick={() => handleWaive(fine.id)}
                                      disabled={isPending}
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      className="acc-action-btn"
                                      style={{ background: "rgba(136,146,164,0.1)", color: "#8892A4" }}
                                      onClick={() => { setWaivedFineId(null); setWaiveReason(""); }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="acc-action-btn"
                                    style={{ background: "rgba(255,193,7,0.12)", color: "#FFC107" }}
                                    onClick={() => setWaivedFineId(fine.id)}
                                  >
                                    Waive
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>

        {/* Active Suspensions Section */}
        <div className="acc-section">
          <div className="acc-section-header" onClick={() => setSuspOpen((v) => !v)}>
            <h2 className="acc-section-title">
              🔒 Active Suspensions
              <span className="acc-section-count">{suspensions.length} active</span>
            </h2>
            <span style={{ color: "#8892A4", fontSize: 18 }}>{suspOpen ? "▲" : "▼"}</span>
          </div>
          {suspOpen && (
            <div className="acc-section-body">
              {suspensions.length === 0 ? (
                <div className="acc-empty">No active suspensions. All clear.</div>
              ) : (
                <div className="acc-susp-grid">
                  {suspensions.map((susp) => (
                    <div key={susp.id} className="acc-susp-card">
                      <div className="acc-susp-name">
                        {susp.user_name || "Unknown User"}
                      </div>
                      <div className="acc-susp-meta">
                        <div>
                          <span style={{ color: "#8892A4" }}>Reason: </span>
                          <span style={{ color: "#E8EDF5" }}>{susp.reason}</span>
                        </div>
                        <div>
                          <span style={{ color: "#8892A4" }}>Since: </span>
                          <span style={{ color: "#E8EDF5" }}>
                            {new Date(susp.suspended_at).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {susp.unpaid_fine_total > 0 && (
                          <div>
                            <span style={{ color: "#8892A4" }}>Unpaid: </span>
                            <span style={{ color: "#EF5350", fontWeight: 700 }}>
                              ₦{susp.unpaid_fine_total.toLocaleString("en-NG")}
                            </span>
                          </div>
                        )}
                        {susp.violation_count !== undefined && susp.violation_count > 0 && (
                          <div>
                            <span style={{ color: "#8892A4" }}>Violations: </span>
                            <span style={{ color: "#FFC107", fontWeight: 700 }}>
                              {susp.violation_count}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="acc-susp-actions">
                        <button
                          className="acc-action-btn"
                          style={{ background: "rgba(102,187,106,0.15)", color: "#66BB6A", padding: "8px 16px" }}
                          onClick={() => handleLiftSuspension(susp.user_id)}
                          disabled={isPending}
                        >
                          ✅ Lift Suspension
                        </button>
                        <Link
                          href={`/admin/appeals?userId=${susp.user_id}`}
                          className="acc-action-btn"
                          style={{
                            background: "rgba(124,77,255,0.12)",
                            color: "#7C4DFF",
                            padding: "8px 16px",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          View Appeals
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

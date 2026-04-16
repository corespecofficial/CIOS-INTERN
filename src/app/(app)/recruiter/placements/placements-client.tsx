"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { Placement, PlacementStats } from "@/app/actions/placement-types";
import {
  confirmHireAndCreatePlacement,
  updatePlacementFeeStatus,
} from "@/app/actions/placements";

const GREEN = "#43A047";
const CARD_BG = "#111827";
const BG = "#0A0E1A";
const TEXT = "#E8EDF5";
const MUTED = "#8892A4";
const BORDER = "rgba(255,255,255,0.07)";

const FEE_STATUS_COLORS: Record<string, string> = {
  pending: "#F9A825",
  invoiced: "#1E88E5",
  paid: "#43A047",
  waived: "#8892A4",
};

function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent: string;
  icon: string;
}
function StatCard({ label, value, accent, icon }: StatCardProps) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>{value}</div>
      </div>
    </div>
  );
}

interface Props {
  placements: Placement[];
  stats: PlacementStats;
}

export function PlacementsClient({ placements: initial, stats: initialStats }: Props) {
  const [placements, setPlacements] = useState<Placement[]>(initial);
  const [stats, setStats] = useState<PlacementStats>(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [interviewId, setInterviewId] = useState("");
  const [salary, setSalary] = useState("");
  const [feeType, setFeeType] = useState<"percentage" | "flat">("percentage");
  const [notes, setNotes] = useState("");
  const [lastFee, setLastFee] = useState<number | null>(null);
  const [isPending, start] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleConfirmHire = () => {
    if (!interviewId.trim()) { toast.error("Interview ID is required"); return; }
    start(async () => {
      const res = await confirmHireAndCreatePlacement(interviewId.trim(), {
        startingSalary: salary ? parseFloat(salary) : undefined,
        feeType,
        notes: notes.trim() || undefined,
      });
      if (!res.ok) { toast.error(res.error); return; }
      const fee = res.data!.fee;
      setLastFee(fee);
      toast.success(`Hire confirmed! Platform fee: ${fmt(fee)}`);
      setInterviewId(""); setSalary(""); setNotes(""); setFeeType("percentage");
      // Optimistically update stats
      setStats((s) => ({
        ...s,
        total_placements: s.total_placements + 1,
        total_fees_pending: s.total_fees_pending + fee,
      }));
    });
  };

  const handleFeeStatusChange = (placementId: string, status: "pending" | "invoiced" | "paid" | "waived") => {
    setUpdatingId(placementId);
    start(async () => {
      const res = await updatePlacementFeeStatus(placementId, status);
      if (!res.ok) { toast.error(res.error); setUpdatingId(null); return; }
      setPlacements((prev) => prev.map((p) => p.id === placementId ? { ...p, fee_status: status } : p));
      toast.success("Fee status updated");
      setUpdatingId(null);
    });
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "28px 24px", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          .pl-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pl-form-2col { grid-template-columns: 1fr !important; }
          .pl-radio-row { flex-direction: column !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>💼</span>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, margin: 0 }}>
            Confirmed <span style={{ color: GREEN }}>Placements</span>
          </h1>
        </div>
        <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
          Track your successful hires and outstanding platform fees.
        </p>
      </div>

      {/* Stats */}
      <div className="pl-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Placements" value={stats.total_placements} accent={GREEN} icon="🤝" />
        <StatCard label="Pending Fees" value={fmt(stats.total_fees_pending)} accent="#F9A825" icon="⏳" />
        <StatCard label="Fees Paid" value={fmt(stats.total_fees_paid)} accent={GREEN} icon="✅" />
        <StatCard label="Avg Salary (₦/yr)" value={stats.avg_salary > 0 ? fmt(stats.avg_salary) : "—"} accent="#1E88E5" icon="📊" />
      </div>

      {/* Confirm Hire Form */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 28, overflow: "hidden" }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer",
            color: TEXT, fontSize: 15, fontWeight: 700,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            Confirm a New Hire
          </span>
          <span style={{ color: GREEN, fontSize: 20, transition: "transform 0.2s", transform: showForm ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
        </button>

        {showForm && (
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 0, marginBottom: 16 }}>
                Enter the Interview ID from the <a href="/recruiter/interviews" style={{ color: GREEN }}>Interviews page</a>. Open an interview card to copy its ID.
              </p>
              <div className="pl-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 6 }}>Interview ID *</label>
                  <input
                    value={interviewId}
                    onChange={(e) => setInterviewId(e.target.value)}
                    placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${BORDER}`, background: BG, color: TEXT,
                      fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 6 }}>Starting Salary (₦/year, optional)</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. 1200000"
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${BORDER}`, background: BG, color: TEXT,
                      fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 8 }}>Fee Type</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { v: "percentage" as const, label: "Percentage (5% of monthly)", desc: "5% of first month salary (min ₦50,000)" },
                    { v: "flat" as const, label: "Flat (₦50,000)", desc: "Fixed ₦50,000 regardless of salary" },
                  ].map((opt) => (
                    <label key={opt.v} style={{
                      display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
                      padding: "10px 14px", borderRadius: 8,
                      border: `1px solid ${feeType === opt.v ? GREEN : BORDER}`,
                      background: feeType === opt.v ? `${GREEN}12` : "transparent",
                      flex: 1,
                    }}>
                      <input
                        type="radio"
                        name="feeType"
                        value={opt.v}
                        checked={feeType === opt.v}
                        onChange={() => setFeeType(opt.v)}
                        style={{ marginTop: 2, accentColor: GREEN }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 6 }}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this placement..."
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: `1px solid ${BORDER}`, background: BG, color: TEXT,
                    fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box",
                  }}
                />
              </div>

              {lastFee !== null && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                  background: `${GREEN}12`, border: `1px solid ${GREEN}40`,
                  color: GREEN, fontSize: 13, fontWeight: 600,
                }}>
                  ✅ Last placement fee calculated: {fmt(lastFee)}
                </div>
              )}

              <button
                onClick={handleConfirmHire}
                disabled={isPending}
                style={{
                  padding: "11px 28px", borderRadius: 8, border: "none", cursor: isPending ? "not-allowed" : "pointer",
                  background: GREEN, color: "#fff", fontSize: 14, fontWeight: 700,
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? "Confirming…" : "Confirm Hire & Calculate Fee"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Placements List */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 14, marginTop: 0 }}>
          Your Placements ({placements.length})
        </h2>

        {placements.length === 0 ? (
          <div style={{
            background: CARD_BG, border: `1px dashed ${BORDER}`, borderRadius: 14,
            padding: "48px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>💼</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No placements yet</div>
            <div style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>
              Once you confirm a hire from an interview, it will appear here.
            </div>
            <a
              href="/recruiter/interviews"
              style={{
                display: "inline-block", padding: "10px 22px", borderRadius: 8,
                background: GREEN, color: "#fff", fontSize: 14, fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Go to Interviews →
            </a>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {placements.map((p) => (
              <div
                key={p.id}
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                {/* Avatar */}
                {p.candidate_avatar ? (
                  <img
                    src={p.candidate_avatar}
                    alt={p.candidate_name || "Candidate"}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${GREEN}40` }}
                  />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${GREEN}, #1B5E20)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 16, fontWeight: 800,
                  }}>
                    {(p.candidate_name || "?")[0].toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    {p.candidate_name || "Unknown Candidate"}
                  </div>
                  {(p.job_title || p.company_name) && (
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {[p.job_title, p.company_name].filter(Boolean).join(" @ ")}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                    Hired {fmtDate(p.hire_confirmed_at)}
                  </div>
                </div>

                {/* Salary */}
                <div style={{ textAlign: "right", minWidth: 110 }}>
                  <div style={{ fontSize: 11, color: MUTED }}>Salary</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    {p.starting_salary ? fmt(p.starting_salary) + "/yr" : "—"}
                  </div>
                </div>

                {/* Fee */}
                <div style={{ textAlign: "right", minWidth: 110 }}>
                  <div style={{ fontSize: 11, color: MUTED }}>Platform Fee</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>
                    {p.placement_fee ? fmt(p.placement_fee) : "—"}
                  </div>
                </div>

                {/* Fee Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 99,
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    background: `${FEE_STATUS_COLORS[p.fee_status] || MUTED}22`,
                    color: FEE_STATUS_COLORS[p.fee_status] || MUTED,
                    border: `1px solid ${FEE_STATUS_COLORS[p.fee_status] || MUTED}44`,
                  }}>
                    {p.fee_status}
                  </span>
                  <select
                    value={p.fee_status}
                    disabled={updatingId === p.id || isPending}
                    onChange={(e) => handleFeeStatusChange(p.id, e.target.value as "pending" | "invoiced" | "paid" | "waived")}
                    style={{
                      padding: "5px 8px", borderRadius: 6, border: `1px solid ${BORDER}`,
                      background: BG, color: MUTED, fontSize: 11, cursor: "pointer", outline: "none",
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="paid">Paid</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

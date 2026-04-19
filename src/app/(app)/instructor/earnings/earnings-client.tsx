"use client";

import { useState } from "react";
import Link from "next/link";
import type { InstructorEarningsSummary } from "@/app/actions/instructor-earnings";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  card2: "#161D2E",
  blue: "#1E88E5",
  green: "#66BB6A",
  gold: "#FFC107",
  red: "#EF5350",
  purple: "#AB47BC",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.07)",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${n.toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(s: string) {
  if (s === "published") return C.green;
  if (s === "draft") return C.gold;
  return C.dim;
}

function wdStatusColor(s: string) {
  if (s === "approved" || s === "paid") return C.green;
  if (s === "pending") return C.gold;
  if (s === "processing") return C.blue;
  if (s === "rejected") return C.red;
  return C.dim;
}

interface Props {
  data: InstructorEarningsSummary;
}

export default function EarningsClient({ data }: Props) {
  const [tab, setTab] = useState<"courses" | "withdrawals">("courses");

  const summaryCards = [
    { label: "Wallet Balance", value: fmt(data.wallet_balance), color: C.blue, icon: "💳" },
    { label: "30-Day Earnings", value: fmt(data.month_earnings), color: C.green, icon: "📈" },
    { label: "Course Revenue (net)", value: fmt(data.total_course_revenue), color: C.purple, icon: "🎓" },
    { label: "Pending Payouts", value: fmt(data.pending_withdrawals), color: C.gold, icon: "⏳" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        .earn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .earn-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px; padding: 18px 16px; }
        .earn-table { width: 100%; border-collapse: collapse; }
        .earn-table th { font-size: 11px; font-weight: 700; color: ${C.dim}; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 1px solid ${C.border}; }
        .earn-table td { padding: 14px 12px; font-size: 14px; border-bottom: 1px solid ${C.border}; vertical-align: middle; }
        .earn-table tr:last-child td { border-bottom: none; }
        .earn-table tr:hover td { background: ${C.card2}; }
        .earn-badge { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
        .earn-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: ${C.card}; padding: 4px; border-radius: 10px; border: 1px solid ${C.border}; }
        .earn-tab { flex: 1; padding: 9px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .earn-tab.active { background: ${C.blue}; color: #fff; }
        .earn-tab:not(.active) { background: transparent; color: ${C.dim}; }
        .earn-empty { padding: 32px 20px; text-align: center; color: ${C.dim}; font-size: 14px; }
        @media (max-width: 700px) {
          .earn-grid { grid-template-columns: repeat(2, 1fr); }
          .earn-col-hide { display: none; }
          .earn-table td, .earn-table th { padding: 10px 8px; font-size: 13px; }
        }
        @media (max-width: 400px) {
          .earn-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Earnings & Payouts</h1>
        <p style={{ margin: "6px 0 0", color: C.dim, fontSize: 14 }}>
          Revenue from your published courses, wallet balance, and payout history.
        </p>
      </div>

      {/* Summary cards */}
      <div className="earn-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="earn-card">
            <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4, fontWeight: 600 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Notice if no courses */}
      {data.courses.length === 0 && (
        <div style={{
          background: `${C.gold}11`,
          border: `1px solid ${C.gold}33`,
          borderRadius: 12,
          padding: "14px 18px",
          fontSize: 14,
          color: C.gold,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span>💡</span>
          <span>You have no courses yet. <Link href="/instructor/courses/new" style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>Create your first course</Link> to start earning.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="earn-tabs">
        <button className={`earn-tab${tab === "courses" ? " active" : ""}`} onClick={() => setTab("courses")}>
          Course Breakdown ({data.courses.length})
        </button>
        <button className={`earn-tab${tab === "withdrawals" ? " active" : ""}`} onClick={() => setTab("withdrawals")}>
          Payouts ({data.withdrawals.length})
        </button>
      </div>

      {/* Course breakdown table */}
      {tab === "courses" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {data.courses.length === 0 ? (
            <div className="earn-empty">No courses yet</div>
          ) : (
            <table className="earn-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th className="earn-col-hide">Price</th>
                  <th>Students</th>
                  <th className="earn-col-hide">Gross</th>
                  <th>Net (85%)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: `${C.blue}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎓</div>
                        )}
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{course.title}</span>
                      </div>
                    </td>
                    <td className="earn-col-hide" style={{ color: C.dim }}>
                      {course.price_naira > 0 ? fmt(course.price_naira) : <span style={{ color: C.green, fontWeight: 700 }}>Free</span>}
                    </td>
                    <td style={{ fontWeight: 700 }}>{course.enrollments.toLocaleString()}</td>
                    <td className="earn-col-hide" style={{ color: C.dim }}>{fmt(course.gross_revenue)}</td>
                    <td style={{ fontWeight: 700, color: C.green }}>{fmt(course.net_earnings)}</td>
                    <td>
                      <span
                        className="earn-badge"
                        style={{ background: `${statusColor(course.status)}22`, color: statusColor(course.status) }}
                      >
                        {course.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payouts tab */}
      {tab === "withdrawals" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {data.withdrawals.length === 0 ? (
            <div className="earn-empty">
              <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
              No payout requests yet.
              <br />
              <Link
                href="/wallet"
                style={{ color: C.blue, textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 8, fontSize: 14 }}
              >
                Request a payout from your wallet →
              </Link>
            </div>
          ) : (
            <table className="earn-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="earn-col-hide">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.withdrawals.map((wd) => (
                  <tr key={wd.id}>
                    <td style={{ color: C.dim, fontSize: 13 }}>{fmtDate(wd.requested_at)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(Number(wd.amount_ngn))}</td>
                    <td>
                      <span
                        className="earn-badge"
                        style={{ background: `${wdStatusColor(wd.status)}22`, color: wdStatusColor(wd.status) }}
                      >
                        {wd.status}
                      </span>
                    </td>
                    <td className="earn-col-hide" style={{ color: C.dim, fontSize: 13 }}>{wd.admin_note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer CTA */}
      <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/wallet"
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            background: C.blue,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Manage Wallet & Payouts
        </Link>
        <Link
          href="/instructor/analytics"
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            background: "transparent",
            color: C.dim,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            border: `1px solid ${C.border}`,
          }}
        >
          Course Analytics
        </Link>
      </div>
    </div>
  );
}

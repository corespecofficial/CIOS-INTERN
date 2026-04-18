"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import type { AdminUserRow, AuditRow } from "@/lib/db";
import { useIsMobile } from "@/hooks/use-is-mobile";

const MASCOT = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const adminActions: { label: string; icon: string; href?: string }[] = [
  { label: "Manage Users", icon: "\u{1F465}", href: "/super-admin/users" },
  { label: "Assign Task", icon: "\u{1F4CB}", href: "/tasks" },
  { label: "Broadcast", icon: "\u{1F4E2}" },
  { label: "Create Course", icon: "\u{1F4DA}", href: "/courses" },
  { label: "View Analytics", icon: "\u{1F4CA}", href: "/analytics" },
  { label: "System Status", icon: "\u{1F6E1}", href: "/status" },
  { label: "Documents", icon: "\u{1F4C1}", href: "/documents" },
  { label: "Recruitment", icon: "\u{1F4BC}", href: "/recruitment" },
  { label: "AI Hub", icon: "\u{1F916}", href: "/ai-hub" },
  { label: "Data Seeder", icon: "\u{1F331}", href: "/super-admin/seed" },
  { label: "Issue Fine", icon: "\u26A0" },
  { label: "Audit Logs", icon: "\u{1F4DC}" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: "rgba(102,187,106,0.15)", text: "#66BB6A", label: "Active" },
  suspended: { bg: "rgba(239,83,80,0.15)",   text: "#EF5350", label: "Suspended" },
  pending:   { bg: "rgba(255,193,7,0.15)",   text: "#FFC107", label: "Pending" },
  deactivated: { bg: "rgba(136,146,164,0.15)", text: "#8892A4", label: "Inactive" },
};

function colorFromString(s: string): string {
  const palette = ["#1E88E5", "#AB47BC", "#FF7043", "#66BB6A", "#26C6DA", "#FFC107", "#EF5350"];
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % palette.length;
  return palette[h];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  stats?: { interns: number; activeNow: number; revenue: number; pendingFines: number; total: number };
  users?: AdminUserRow[];
  audits?: AuditRow[];
}

export function AdminDashboard(props: Props) {
  const stats = props.stats ?? { interns: 0, activeNow: 0, revenue: 0, pendingFines: 0, total: 0 };
  const users = props.users ?? [];
  const audits = props.audits ?? [];
  const isPreview = !props.stats;
  const isMobile = useIsMobile();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>

      {/* Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(255,193,7,0.08))",
        border: "1px solid rgba(171,71,188,0.2)",
        borderRadius: 16, padding: isMobile ? "16px 16px" : 24,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <img src={MASCOT} alt="Mascot" style={{ width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: "inline-block", background: "#AB47BC", color: "#fff",
            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
            marginBottom: 4, letterSpacing: 0.5,
          }}>ADMIN ACCESS</span>
          <h1 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: "#E8EDF5", margin: 0, lineHeight: 1.2 }}>
            Admin Control Center
          </h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "3px 0 0 0" }}>
            {isPreview ? "Preview mode — visit /admin for live data." : `${stats.total} total users · ${stats.activeNow} active in last 24h`}
          </p>
        </div>
      </div>

      {/* Stat Cards — 2×2 on mobile, 4×1 on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16 }}>
        {[
          { value: stats.interns.toString(), label: "Interns + Leads", color: "#1E88E5" },
          { value: stats.activeNow.toString(), label: "Active (24h)", color: "#66BB6A" },
          { value: `\u20A6${stats.revenue.toLocaleString()}`, label: "Revenue", color: "#FFC107" },
          { value: stats.pendingFines.toString(), label: "Pending Fines", color: "#EF5350" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#111827", borderRadius: 12, padding: isMobile ? "14px 14px" : 20,
            border: "1px solid rgba(255,255,255,0.07)",
            borderLeftColor: stat.color, borderLeftWidth: 3, borderLeftStyle: "solid",
          }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: "#8892A4", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions — 3 cols on mobile, 6 on desktop */}
      <div style={{ background: "#111827", borderRadius: 16, padding: isMobile ? "16px 14px" : 24, border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#E8EDF5", margin: "0 0 14px 0" }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: isMobile ? 8 : 12 }}>
          {adminActions.map((a) => {
            const content = (
              <>
                <span style={{ fontSize: isMobile ? 24 : 28 }}>{a.icon}</span>
                <span style={{ fontSize: isMobile ? 10 : 12, color: "#8892A4", lineHeight: 1.3, textAlign: "center" }}>{a.label}</span>
              </>
            );
            const s: React.CSSProperties = {
              background: "#0A0E1A", borderRadius: 12, padding: isMobile ? "12px 8px" : 16,
              textAlign: "center", border: "1px solid rgba(255,255,255,0.07)",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 5, textDecoration: "none", color: "inherit",
            };
            return a.href
              ? <Link key={a.label} href={a.href} style={s}>{content}</Link>
              : <button key={a.label} style={s}>{content}</button>;
          })}
        </div>
      </div>

      {/* User Management — table on desktop, cards on mobile */}
      <div style={{ background: "#111827", borderRadius: 16, padding: isMobile ? "16px 14px" : 24, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#E8EDF5", margin: 0 }}>User Management</h3>
          <Link href="/super-admin/users" style={{ fontSize: 12, color: "#1E88E5", textDecoration: "none", fontWeight: 600 }}>View All →</Link>
        </div>

        {users.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8892A4" }}>No users yet.</p>
        ) : isMobile ? (
          /* Mobile: card list */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.slice(0, 8).map((u) => {
              const status = STATUS_STYLE[u.status] || STATUS_STYLE.active;
              const perfColor = u.performance >= 80 ? "#66BB6A" : u.performance >= 60 ? "#FFC107" : "#EF5350";
              const color = colorFromString(u.id);
              return (
                <div key={u.id} style={{ background: "#0A0E1A", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{initials(u.name)}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || "Unnamed"}</div>
                      <div style={{ fontSize: 11, color: "#5A6478", textTransform: "capitalize" }}>{u.role.replace("_", " ")}</div>
                    </div>
                    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: status.bg, color: status.text, flexShrink: 0 }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                      <div style={{ width: `${u.performance}%`, height: "100%", borderRadius: 999, background: perfColor }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#5A6478", width: 30 }}>{u.performance}%</span>
                    <span style={{ fontSize: 11, color: "#FFC107", fontFamily: "monospace", marginLeft: 4 }}>⚡{u.xp.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop: table */
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["User", "Role", "Status", "Performance", "XP"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#8892A4", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const status = STATUS_STYLE[u.status] || STATUS_STYLE.active;
                const perfColor = u.performance >= 80 ? "#66BB6A" : u.performance >= 60 ? "#FFC107" : "#EF5350";
                const color = colorFromString(u.id);
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{initials(u.name)}</div>
                      }
                      <div>
                        <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 500 }}>{u.name || "Unnamed"}</div>
                        <div style={{ fontSize: 12, color: "#8892A4" }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 12px", fontSize: 12, color: "#8892A4", textTransform: "capitalize" }}>{u.role.replace("_", " ")}</td>
                    <td style={{ padding: "12px 12px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: status.bg, color: status.text }}>{status.label}</span>
                    </td>
                    <td style={{ padding: "12px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                          <div style={{ width: `${u.performance}%`, height: "100%", borderRadius: 999, background: perfColor }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#8892A4", width: 32 }}>{u.performance}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 12px", fontSize: 14, color: "#E8EDF5", fontFamily: "monospace" }}>{u.xp.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Activity */}
      <div style={{ background: "#111827", borderRadius: 16, padding: isMobile ? "16px 14px" : 24, border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#E8EDF5", margin: "0 0 14px 0" }}>Recent Activity</h3>
        {audits.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8892A4" }}>No audit log entries yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {audits.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1E88E5", flexShrink: 0, marginTop: 5 }} />
                <span style={{ flex: 1, fontSize: isMobile ? 12 : 14, color: "#E8EDF5", lineHeight: 1.45 }}>
                  {item.actor_name ? `${item.actor_name} ` : ""}<b>{item.action}</b>{" "}
                  <span style={{ color: "#8892A4" }}>{item.entity_type}</span>
                </span>
                <span style={{ fontSize: 11, color: "#5A6478", flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminDashboard;

"use client";
/* eslint-disable @next/next/no-img-element */

import type { InternSummary } from "@/app/actions/guardian-types";

const AMBER = "#FB8C00";
const BG = "#0A0E1A";
const CARD_BG = "#111827";
const TEXT = "#E8EDF5";
const MUTED = "#8892A4";
const BORDER = "rgba(255,255,255,0.07)";

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
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
      padding: "20px",
      textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, margin: "0 auto 10px",
      }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: TEXT, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{label}</div>
    </div>
  );
}

interface Props {
  intern: InternSummary;
}

export function GuardianViewClient({ intern }: Props) {
  const tasksPercent = intern.tasks_total > 0
    ? Math.round((intern.tasks_completed / intern.tasks_total) * 100)
    : 0;

  const roleLabel = intern.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "0", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          .gv-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      {/* Header Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${AMBER}22, ${AMBER}08)`,
        borderBottom: `1px solid ${AMBER}30`,
        padding: "20px 24px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 26 }}>👨‍👩‍👧</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Guardian View — Read Only
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            You are viewing <strong style={{ color: TEXT }}>{intern.name || "this intern"}&apos;s</strong> progress. This is a read-only view.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
        {/* Profile Card */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 24,
          flexWrap: "wrap",
        }}>
          {intern.avatar_url ? (
            <img
              src={intern.avatar_url}
              alt={intern.name || "Intern"}
              style={{
                width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
                border: `3px solid ${AMBER}40`, flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${AMBER}, #E65100)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 28, fontWeight: 900,
            }}>
              {(intern.name || "?")[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 8 }}>
              {intern.name || "Intern"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 99,
                background: `${AMBER}20`, color: AMBER, fontSize: 12, fontWeight: 700,
                border: `1px solid ${AMBER}40`,
              }}>
                Level {intern.level}
              </span>
              <span style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 99,
                background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 12, fontWeight: 700,
                border: "1px solid rgba(30,136,229,0.3)",
              }}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="gv-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard label="XP Earned" value={intern.xp.toLocaleString()} accent="#1E88E5" icon="⚡" />
          <StatCard label="Level" value={intern.level} accent="#AB47BC" icon="🏆" />
          <StatCard label="Performance" value={`${intern.performance}%`} accent="#43A047" icon="📈" />
          <StatCard label="Day Streak" value={intern.streak} accent={AMBER} icon="🔥" />
        </div>

        {/* Tasks Progress */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Task Completion</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: AMBER }}>
              {intern.tasks_completed}/{intern.tasks_total} ({tasksPercent}%)
            </div>
          </div>
          <div style={{
            height: 12, borderRadius: 99,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${tasksPercent}%`,
              background: `linear-gradient(90deg, ${AMBER}, #F57C00)`,
              borderRadius: 99,
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
            {intern.tasks_completed} tasks completed out of {intern.tasks_total} total assigned
          </div>
        </div>

        {/* Last Active */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: "16px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🕐</span>
          <div>
            <div style={{ fontSize: 12, color: MUTED }}>Last Active</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
              {intern.last_seen ? `Active ${relativeTime(intern.last_seen)}` : "No activity recorded"}
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div style={{
          padding: "14px 18px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${BORDER}`,
          fontSize: 12,
          color: MUTED,
          lineHeight: 1.6,
        }}>
          <strong style={{ color: TEXT }}>ℹ️ Privacy note:</strong> This view is provided by the intern. Contact them directly if you have questions. You can only see their XP, level, performance, and task completion — no messages, posts, or personal content.
        </div>
      </div>
    </div>
  );
}

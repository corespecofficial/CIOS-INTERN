"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Assessment } from "@/app/actions/skills-lab";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  card2: "#161D2E",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
};

const DIFF_COLOR: Record<string, string> = {
  beginner: "#66BB6A",
  intermediate: "#FFC107",
  advanced: "#EF5350",
};

interface Attempt {
  id: string;
  assessment_title: string;
  percentage: number;
  passed: boolean;
  completed_at: string;
}

interface Props {
  assessments: Assessment[];
  attempts: Attempt[];
}

export default function SkillsLabClient({ assessments, attempts }: Props) {
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<string>("all");

  const domains = useMemo(() => {
    return Array.from(new Set(assessments.map((a) => a.skill_domain))).sort();
  }, [assessments]);

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (domainFilter !== "all" && a.skill_domain !== domainFilter) return false;
      if (diffFilter !== "all" && a.difficulty !== diffFilter) return false;
      return true;
    });
  }, [assessments, domainFilter, diffFilter]);

  const passedCount = attempts.filter((a) => a.passed).length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .sl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .sl-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        @media (max-width: 800px) { .sl-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px) { .sl-grid { grid-template-columns: 1fr; } .sl-stat-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "inline-block", background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#66BB6A", marginBottom: 12, textTransform: "uppercase" }}>
          🧪 Skills Lab
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Prove what you know.</h1>
        <p style={{ margin: "6px 0 0", color: C.dim, fontSize: 14, maxWidth: 600, lineHeight: 1.6 }}>
          Timed, auto-scored assessments across every skill domain. Your scores stay on your verified profile — companies filter talent by them.
        </p>
      </div>

      {/* Stats */}
      <div className="sl-stat-grid">
        <Stat label="Available" value={String(assessments.length)} accent="#4DA8FF" />
        <Stat label="Attempts" value={String(attempts.length)} accent="#FFC107" />
        <Stat label="Passed" value={String(passedCount)} accent="#66BB6A" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          style={{ padding: "9px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}
        >
          <option value="all">All domains</option>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          style={{ padding: "9px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}
        >
          <option value="all">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: C.dim, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧪</div>
          No assessments match your filters yet.
        </div>
      ) : (
        <div className="sl-grid">
          {filtered.map((a) => {
            const passRate = a.attempt_count > 0 ? Math.round((a.pass_count / a.attempt_count) * 100) : null;
            return (
              <Link
                key={a.id}
                href={`/skills-lab/${a.id}`}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: 20,
                  textDecoration: "none",
                  color: C.text,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 28 }}>{a.cover_emoji}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{a.title}</div>
                  {a.description && (
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>
                      {a.description.length > 90 ? `${a.description.slice(0, 90)}…` : a.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                  <span style={{ fontSize: 10, background: `${DIFF_COLOR[a.difficulty]}22`, color: DIFF_COLOR[a.difficulty], padding: "3px 10px", borderRadius: 999, fontWeight: 700, textTransform: "uppercase" }}>
                    {a.difficulty}
                  </span>
                  <span style={{ fontSize: 10, background: "rgba(77,168,255,0.12)", color: "#4DA8FF", padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>
                    {a.skill_domain}
                  </span>
                  <span style={{ fontSize: 10, color: C.dim, padding: "3px 0", fontWeight: 600 }}>
                    ⏱ {a.duration_min}m
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.dim, borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                  {a.attempt_count > 0 ? `${a.attempt_count} attempts · ${passRate}% pass rate` : "Be the first to try"}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Your recent attempts</h2>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            {attempts.slice(0, 8).map((att, i) => (
              <div
                key={att.id}
                style={{
                  padding: "14px 18px",
                  borderBottom: i < Math.min(attempts.length, 8) - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{att.assessment_title}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                    {new Date(att.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, fontWeight: 700, background: att.passed ? "rgba(102,187,106,0.15)" : "rgba(239,83,80,0.15)", color: att.passed ? "#66BB6A" : "#EF5350", textTransform: "uppercase" }}>
                  {att.passed ? "✓ Passed" : "Failed"}
                </span>
                <div style={{ fontSize: 15, fontWeight: 800, color: att.passed ? "#66BB6A" : "#EF5350", minWidth: 50, textAlign: "right" }}>
                  {att.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, marginTop: 6 }}>{value}</div>
    </div>
  );
}

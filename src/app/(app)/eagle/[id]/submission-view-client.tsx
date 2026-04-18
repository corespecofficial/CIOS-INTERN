"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { EagleSubmission, SectionScore } from "@/app/actions/eagle";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "#9CA3AF" },
  submitted: { label: "Submitted", color: "#4CAF50" },
  late: { label: "Submitted (Late)", color: "#FF7043" },
  graded: { label: "Graded", color: "#1E88E5" },
};

const SECTION_LABELS: Record<string, { label: string; max: number }> = {
  A: { label: "Reflection Essay", max: 20 },
  B: { label: "Three Pillars Audit", max: 15 },
  C: { label: "Discipline Case Study", max: 15 },
  D: { label: "4-Day Activation Planner", max: 15 },
  E: { label: "Goal-Setting Grid", max: 10 },
  F: { label: "Design Challenge", max: 15 },
  G: { label: "CIOS Career Ladder Map", max: 5 },
  H: { label: "Eagle Covenant", max: 5 },
};

interface Props {
  submission: EagleSubmission & {
    section_scores: SectionScore[];
    submitter: { full_name: string; track: string | null; avatar_url: string | null } | null;
  };
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? "#4CAF50" : pct >= 60 ? "#FFC107" : "#EF5350";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ color, fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{score}/{max}</span>
    </div>
  );
}

export function EagleSubmissionView({ submission }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const status = submission.status;
  const cfg = STATUS_CONFIG[status];
  const scoreMap: Record<string, SectionScore> = {};
  for (const s of submission.section_scores) scoreMap[s.section] = s;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "0 0 40px" : undefined }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#E8EDF5" }}>
              🦅 Eagle Project Submission
            </h1>
            <span style={{
              padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: `${cfg.color}20`, color: cfg.color,
            }}>{cfg.label}</span>
          </div>
          {submission.submitter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              {submission.submitter.avatar_url
                ? <img src={submission.submitter.avatar_url} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800 }}>{submission.submitter.full_name.charAt(0)}</div>
              }
              <span style={{ color: "#9CA3AF", fontSize: 13 }}>{submission.submitter.full_name}</span>
              {submission.submitter.track && <span style={{ color: "#5A6478", fontSize: 12 }}>· {submission.submitter.track}</span>}
            </div>
          )}
        </div>
        {submission.total_score !== null && (
          <div style={{
            background: "rgba(30,136,229,0.1)", border: "1px solid rgba(30,136,229,0.2)",
            borderRadius: 12, padding: isMobile ? "12px 18px" : "16px 24px", textAlign: "center",
          }}>
            <div style={{ color: "#5A6478", fontSize: 11, marginBottom: 4 }}>TOTAL SCORE</div>
            <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: submission.total_score >= 70 ? "#4CAF50" : "#FFC107" }}>
              {submission.total_score}<span style={{ fontSize: 16, color: "#5A6478" }}>/100</span>
            </div>
          </div>
        )}
      </div>

      {/* Section scores (if graded) */}
      {status === "graded" && Object.keys(SECTION_LABELS).length > 0 && (
        <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: isMobile ? "16px 14px" : "20px 24px", marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Section Scores</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(SECTION_LABELS).map(([sec, meta]) => {
              const score = scoreMap[sec];
              return (
                <div key={sec}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>Section {sec} — {meta.label}</span>
                  </div>
                  {score ? (
                    <>
                      <ScoreBar score={score.score} max={score.max_score} />
                      {score.feedback && (
                        <p style={{ margin: "6px 0 0", color: "#9CA3AF", fontSize: 12, fontStyle: "italic", lineHeight: 1.6 }}>
                          {score.feedback}
                        </p>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "#5A6478", fontSize: 13 }}>Not yet graded</div>
                  )}
                </div>
              );
            })}
          </div>
          {submission.overall_feedback && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ margin: "0 0 8px", color: "#1E88E5", fontSize: 14, fontWeight: 700 }}>Coach&rsquo;s Overall Feedback</h3>
              <p style={{ margin: 0, color: "#B0BEC5", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{submission.overall_feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Submission content — read-only sections */}
      {[
        { key: "section_a" as const, label: "Section A — Reflection Essay" },
        { key: "section_b" as const, label: "Section B — Three Pillars Audit" },
        { key: "section_c" as const, label: "Section C — Discipline Case Study" },
        { key: "section_d" as const, label: "Section D — 4-Day Planner" },
        { key: "section_e" as const, label: "Section E — Goal-Setting Grid" },
        { key: "section_f" as const, label: "Section F — Design Challenge" },
        { key: "section_g" as const, label: "Section G — Career Ladder Map" },
        { key: "section_h" as const, label: "Section H — Eagle Covenant" },
      ].map(({ key, label }) => {
        const data = submission[key];
        if (!data || Object.keys(data).length === 0) return null;
        return (
          <div key={key} style={{
            background: "#131929", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: isMobile ? "14px 14px" : "18px 24px", marginBottom: 14,
          }}>
            <h3 style={{ margin: "0 0 14px", color: "#E8EDF5", fontSize: 15, fontWeight: 700 }}>{label}</h3>
            <pre style={{
              margin: 0, color: "#9CA3AF", fontSize: 13, lineHeight: 1.7,
              whiteSpace: "pre-wrap", fontFamily: "inherit",
              maxHeight: 300, overflowY: "auto",
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
      })}

      <button
        onClick={() => router.push("/projects/eagle")}
        style={{
          marginTop: 8, padding: "10px 22px",
          background: "#1E2640", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "#E8EDF5", cursor: "pointer",
        }}
      >
        ← Back to Eagle Project
      </button>
    </div>
  );
}

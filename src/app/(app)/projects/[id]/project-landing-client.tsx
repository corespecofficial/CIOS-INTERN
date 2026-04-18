"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { Project, ProjectSubmission } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_ICONS, SECTION_TYPE_LABELS } from "@/app/actions/custom-projects-types";

interface Props {
  project: Project;
  mySubmission: ProjectSubmission | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "In Progress",       color: "#FFC107", bg: "rgba(255,193,7,0.12)"  },
  submitted: { label: "Submitted",         color: "#4CAF50", bg: "rgba(76,175,80,0.12)"  },
  late:      { label: "Submitted (Late)",  color: "#FF7043", bg: "rgba(255,112,67,0.12)" },
  graded:    { label: "Graded",            color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
};

function Countdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Deadline passed"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h remaining`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m remaining`);
      else setTimeLeft(`${m}m remaining`);
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [deadline]);

  const isPast = new Date(deadline).getTime() < Date.now();
  return <span style={{ color: isPast ? "#FF7043" : "#FFC107", fontWeight: 600 }}>{timeLeft}</span>;
}

export function ProjectLandingClient({ project, mySubmission }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const totalPoints = project.sections.reduce((s, sec) => s + sec.points, 0);
  const subCfg = mySubmission ? STATUS_CONFIG[mySubmission.status] : null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "16px 16px 40px" : "24px 20px 48px" }}>
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
      >
        ← Back to Projects
      </button>

      {/* Hero card */}
      <div style={{
        background: "#131929",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: isMobile ? "20px 18px" : "28px 30px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", gap: isMobile ? 14 : 20, alignItems: "flex-start" }}>
          <div style={{ fontSize: isMobile ? 40 : 52, flexShrink: 0, lineHeight: 1 }}>{project.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#E8EDF5" }}>
                {project.title}
              </h1>
              {subCfg && (
                <span style={{
                  padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: subCfg.bg, color: subCfg.color,
                }}>
                  {subCfg.label}
                </span>
              )}
            </div>

            <p style={{ margin: "0 0 14px", color: "#9CA3AF", fontSize: 14, lineHeight: 1.6 }}>
              {project.description}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 16, fontSize: 13, color: "#9CA3AF" }}>
              <span>📦 {project.sections.length} sections</span>
              <span>🏆 {totalPoints} total points</span>
              <span>⚡ +{project.xp_on_submit} XP on submit</span>
              {project.xp_bonus_threshold > 0 && (
                <span>🎯 +{project.xp_bonus_amount} XP if ≥{project.xp_bonus_threshold}%</span>
              )}
            </div>

            {project.deadline && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <span style={{ color: "#5A6478" }}>Deadline: </span>
                <span style={{ color: "#E8EDF5", fontWeight: 600 }}>
                  {new Date(project.deadline).toLocaleString()}
                </span>
                <span style={{ marginLeft: 8 }}>
                  · <Countdown deadline={project.deadline} />
                </span>
              </div>
            )}

            {project.deadline && project.late_fine_amount > 0 && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#FF7043" }}>
                ⚠️ Late submissions incur a -{project.late_fine_amount} XP fine
              </p>
            )}

            {/* Score if graded */}
            {mySubmission?.status === "graded" && mySubmission.total_score !== null && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16,
                background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.25)",
                borderRadius: 12, padding: "10px 18px",
              }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#4CAF50" }}>{mySubmission.total_score}</span>
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>/ {totalPoints} pts</span>
                <span style={{ color: "#4CAF50", fontSize: 13 }}>
                  ({Math.round((mySubmission.total_score / totalPoints) * 100)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!mySubmission && (
            <button
              onClick={() => router.push(`/projects/${project.id}/submit`)}
              style={{
                padding: isMobile ? "13px 22px" : "11px 26px",
                borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#1E88E5,#FFC107)",
                color: "#0A0E1A", fontWeight: 800, fontSize: 15,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Start Assignment →
            </button>
          )}
          {mySubmission?.status === "draft" && (
            <button
              onClick={() => router.push(`/projects/${project.id}/submit`)}
              style={{
                padding: isMobile ? "13px 22px" : "11px 26px",
                borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#1E88E5,#FFC107)",
                color: "#0A0E1A", fontWeight: 800, fontSize: 15,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Continue Assignment →
            </button>
          )}
          {mySubmission && mySubmission.status !== "draft" && (
            <button
              onClick={() => router.push(`/projects/${project.id}/submissions/${mySubmission.id}`)}
              style={{
                padding: isMobile ? "13px 22px" : "11px 26px",
                borderRadius: 10, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#E8EDF5", fontWeight: 700, fontSize: 14,
                width: isMobile ? "100%" : "auto",
              }}
            >
              View Submission
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {project.instructions && (
        <div style={{
          background: "#131929", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: isMobile ? "16px 18px" : "20px 24px", marginBottom: 16,
        }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#5A6478", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Instructions
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {project.instructions}
          </p>
        </div>
      )}

      {/* Sections overview */}
      <div style={{
        background: "#131929", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14, padding: isMobile ? "16px 18px" : "20px 24px",
      }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#5A6478", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Sections Overview
        </h2>
        <div>
          {project.sections.map((sec, idx) => (
            <div
              key={sec.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 12px",
                borderRadius: 10, marginBottom: 4,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span style={{ color: "#5A6478", fontSize: 11, minWidth: 20, textAlign: "right" }}>{idx + 1}.</span>
              <span style={{ fontSize: 18 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>{sec.label}</div>
                <div style={{ color: "#5A6478", fontSize: 11, marginTop: 2 }}>{SECTION_TYPE_LABELS[sec.type]}</div>
              </div>
              <div style={{ color: "#1E88E5", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {sec.points} pts
              </div>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "11px 12px", marginTop: 4,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 700, paddingLeft: 32 }}>Total</span>
            <span style={{ color: "#1E88E5", fontSize: 14, fontWeight: 800 }}>{totalPoints} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

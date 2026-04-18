"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectSubmission } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_ICONS, SECTION_TYPE_LABELS } from "@/app/actions/custom-projects-types";

interface Props {
  project: Project;
  mySubmission: ProjectSubmission | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: "In Progress",      color: "#FFC107", bg: "rgba(255,193,7,0.12)",  border: "rgba(255,193,7,0.25)"  },
  submitted: { label: "Submitted ✓",      color: "#4CAF50", bg: "rgba(76,175,80,0.12)",  border: "rgba(76,175,80,0.25)"  },
  late:      { label: "Late Submission",  color: "#FF7043", bg: "rgba(255,112,67,0.12)", border: "rgba(255,112,67,0.25)" },
  graded:    { label: "Graded",           color: "#1E88E5", bg: "rgba(30,136,229,0.12)", border: "rgba(30,136,229,0.25)" },
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
      if (d > 0) setTimeLeft(`${d}d ${h}h left`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m left`);
      else setTimeLeft(`${m}m left`);
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [deadline]);
  const isPast = new Date(deadline).getTime() < Date.now();
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20,
      background: isPast ? "rgba(239,83,80,0.12)" : "rgba(255,193,7,0.12)",
      color: isPast ? "#EF5350" : "#FFC107",
      fontSize: 11, fontWeight: 700,
    }}>
      ⏰ {timeLeft}
    </span>
  );
}

export function ProjectLandingClient({ project, mySubmission }: Props) {
  const router = useRouter();
  const totalPoints = project.sections.reduce((s, sec) => s + sec.points, 0);
  const subCfg = mySubmission ? STATUS_CONFIG[mySubmission.status] : null;
  const isGraded = mySubmission?.status === "graded";
  const score = mySubmission?.total_score ?? null;
  const scorePct = score !== null ? Math.round((score / totalPoints) * 100) : null;

  const canStart    = !mySubmission;
  const canContinue = mySubmission?.status === "draft";
  const canView     = mySubmission && mySubmission.status !== "draft";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        /* ── Project landing ── */
        .pl-back { background: none; border: none; color: #5A6478; cursor: pointer; font-size: 13px; font-family: 'Nunito', sans-serif; display: flex; align-items: center; gap: 6px; padding: 0; margin-bottom: 18px; }
        .pl-back:hover { color: #E8EDF5; }

        .pl-hero { background: linear-gradient(135deg, #131929 60%, rgba(30,136,229,0.08)); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; margin-bottom: 14px; position: relative; overflow: hidden; }
        .pl-hero::before { content: ''; position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(30,136,229,0.1), transparent 70%); pointer-events: none; }
        .pl-hero-top { display: flex; gap: 18px; align-items: flex-start; }
        .pl-emoji { font-size: 52px; line-height: 1; flex-shrink: 0; }
        .pl-hero-body { flex: 1; min-width: 0; }
        .pl-title { font-size: 22px; font-weight: 800; color: #E8EDF5; margin: 0 0 6px; font-family: 'Space Grotesk', sans-serif; line-height: 1.3; }
        .pl-desc { font-size: 13px; color: #8892A4; line-height: 1.65; margin: 0 0 14px; }

        .pl-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .pl-chip { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 5px; }

        .pl-deadline-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; font-size: 12px; color: #5A6478; }

        .pl-score-card { display: inline-flex; align-items: center; gap: 14px; margin-top: 14px; background: rgba(76,175,80,0.08); border: 1px solid rgba(76,175,80,0.2); border-radius: 14px; padding: 14px 20px; }
        .pl-score-num { font-size: 36px; font-weight: 800; color: #4CAF50; font-family: 'Space Grotesk', sans-serif; line-height: 1; }
        .pl-score-label { font-size: 12px; color: #8892A4; }
        .pl-score-pct { font-size: 18px; font-weight: 800; color: #4CAF50; }

        .pl-cta { margin-top: 22px; }
        .pl-btn-primary { width: 100%; padding: 16px; border: none; border-radius: 12px; background: linear-gradient(135deg, #1E88E5, #43A047); color: #fff; font-size: 16px; font-weight: 800; cursor: pointer; font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.3px; transition: opacity 0.2s; }
        .pl-btn-primary:hover { opacity: 0.9; }
        .pl-btn-secondary { width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; background: rgba(255,255,255,0.04); color: #E8EDF5; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; transition: background 0.2s; }
        .pl-btn-secondary:hover { background: rgba(255,255,255,0.07); }

        .pl-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px 22px; margin-bottom: 12px; }
        .pl-card-head { font-size: 10px; font-weight: 700; color: #5A6478; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }

        .pl-instr { font-size: 13px; color: #9CA3AF; line-height: 1.8; white-space: pre-wrap; }

        .pl-section-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); margin-bottom: 6px; }
        .pl-section-num { font-size: 11px; color: #5A6478; min-width: 18px; text-align: right; }
        .pl-section-icon { font-size: 18px; }
        .pl-section-body { flex: 1; min-width: 0; }
        .pl-section-label { color: #E8EDF5; font-size: 13px; font-weight: 600; }
        .pl-section-type { color: #5A6478; font-size: 11px; margin-top: 1px; }
        .pl-section-pts { color: #1E88E5; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .pl-total-row { display: flex; justify-content: space-between; padding: 12px 12px 0; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 4px; }

        @media (max-width: 640px) {
          .pl-hero { padding: 18px 16px; }
          .pl-emoji { font-size: 40px; }
          .pl-title { font-size: 18px; }
          .pl-hero::before { display: none; }
          .pl-card { padding: 16px; }
          .pl-score-card { width: 100%; }
        }
      `}</style>

      {/* Back */}
      <button className="pl-back" onClick={() => router.push("/projects")}>
        ← Back to Projects
      </button>

      {/* Hero card */}
      <div className="pl-hero">
        <div className="pl-hero-top">
          <div className="pl-emoji">{project.emoji}</div>
          <div className="pl-hero-body">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 className="pl-title">{project.title}</h1>
              {subCfg && (
                <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: subCfg.bg, color: subCfg.color, border: `1px solid ${subCfg.border}`, flexShrink: 0, marginTop: 4 }}>
                  {subCfg.label}
                </span>
              )}
            </div>
            <p className="pl-desc">{project.description}</p>

            {/* Chips */}
            <div className="pl-chips">
              <span className="pl-chip" style={{ background: "rgba(30,136,229,0.12)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.2)" }}>
                📦 {project.sections.length} sections
              </span>
              <span className="pl-chip" style={{ background: "rgba(102,187,106,0.12)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.2)" }}>
                🏆 {totalPoints} points
              </span>
              <span className="pl-chip" style={{ background: "rgba(171,71,188,0.12)", color: "#AB47BC", border: "1px solid rgba(171,71,188,0.2)" }}>
                ⚡ +{project.xp_on_submit} XP
              </span>
              {project.xp_bonus_threshold > 0 && (
                <span className="pl-chip" style={{ background: "rgba(255,193,7,0.12)", color: "#FFC107", border: "1px solid rgba(255,193,7,0.2)" }}>
                  🎯 +{project.xp_bonus_amount} bonus XP at {project.xp_bonus_threshold}%
                </span>
              )}
            </div>

            {/* Deadline row */}
            {project.deadline && (
              <div className="pl-deadline-row">
                <span>Deadline: <strong style={{ color: "#E8EDF5" }}>{new Date(project.deadline).toLocaleString()}</strong></span>
                <Countdown deadline={project.deadline} />
                {project.late_fine_amount > 0 && (
                  <span style={{ color: "#FF7043" }}>⚠️ ₦{project.late_fine_amount.toLocaleString()} late fine</span>
                )}
              </div>
            )}

            {/* Score card if graded */}
            {isGraded && score !== null && (
              <div className="pl-score-card">
                <div>
                  <div className="pl-score-num">{score}</div>
                  <div className="pl-score-label">/ {totalPoints} pts</div>
                </div>
                <div>
                  <div className="pl-score-pct">{scorePct}%</div>
                  <div className="pl-score-label">{scorePct! >= 85 ? "🏆 Excellent!" : scorePct! >= 70 ? "✅ Good work" : "Keep going"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="pl-cta">
          {canStart && (
            <button className="pl-btn-primary" onClick={() => router.push(`/projects/${project.id}/submit`)}>
              Start Assignment →
            </button>
          )}
          {canContinue && (
            <button className="pl-btn-primary" onClick={() => router.push(`/projects/${project.id}/submit`)}>
              Continue Assignment →
            </button>
          )}
          {canView && (
            <button className="pl-btn-secondary" onClick={() => router.push(`/projects/${project.id}/submissions/${mySubmission!.id}`)}>
              View My Submission
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {project.instructions && (
        <div className="pl-card">
          <div className="pl-card-head">📋 Instructions</div>
          <p className="pl-instr">{project.instructions}</p>
        </div>
      )}

      {/* Sections overview */}
      <div className="pl-card">
        <div className="pl-card-head">📑 Sections Overview</div>
        {project.sections.map((sec, idx) => (
          <div key={sec.id} className="pl-section-row">
            <span className="pl-section-num">{idx + 1}.</span>
            <span className="pl-section-icon">{SECTION_TYPE_ICONS[sec.type]}</span>
            <div className="pl-section-body">
              <div className="pl-section-label">{sec.label}</div>
              <div className="pl-section-type">{SECTION_TYPE_LABELS[sec.type]}</div>
            </div>
            <span className="pl-section-pts">{sec.points} pts</span>
          </div>
        ))}
        <div className="pl-total-row">
          <span style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 700 }}>Total</span>
          <span style={{ color: "#1E88E5", fontSize: 15, fontWeight: 800 }}>{totalPoints} pts</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { SectionRenderer } from "@/components/projects/section-renderer";
import type { ProjectSubmission, SectionConfig, ProjectSectionScore } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_ICONS } from "@/app/actions/custom-projects-types";

type FullSubmission = ProjectSubmission & {
  section_scores: ProjectSectionScore[];
  submitter: { full_name: string; avatar_url: string | null } | null;
  project: { title: string; sections: SectionConfig[] };
};

interface Props {
  submission: FullSubmission;
  projectId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",            color: "#FFC107", bg: "rgba(255,193,7,0.12)"  },
  submitted: { label: "Submitted",        color: "#4CAF50", bg: "rgba(76,175,80,0.12)"  },
  late:      { label: "Submitted (Late)", color: "#FF7043", bg: "rgba(255,112,67,0.12)" },
  graded:    { label: "Graded",           color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
};

export function SubmissionViewClient({ submission, projectId }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const sections = submission.project.sections;
  const answers = (submission.answers ?? {}) as Record<string, unknown>;
  const scoresMap: Record<string, ProjectSectionScore> = {};
  for (const sc of submission.section_scores) {
    scoresMap[sc.section_id] = sc;
  }

  const totalPoints = sections.reduce((s, sec) => s + sec.points, 0);
  const badge = STATUS_CONFIG[submission.status];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "16px 16px 48px" : "24px 20px 56px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 14, padding: "4px 0", flexShrink: 0 }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 800, color: "#E8EDF5" }}>
              {submission.project.title}
            </h1>
            {badge && (
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            )}
          </div>
          {submission.submitter && (
            <p style={{ margin: "4px 0 0", color: "#5A6478", fontSize: 12 }}>
              By {submission.submitter.full_name}
              {submission.submitted_at && ` · Submitted ${new Date(submission.submitted_at).toLocaleString()}`}
            </p>
          )}
        </div>

        {/* Score */}
        {submission.status === "graded" && submission.total_score !== null && (
          <div style={{
            textAlign: "right", flexShrink: 0,
            background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.2)",
            borderRadius: 12, padding: "10px 16px",
          }}>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: "#4CAF50", lineHeight: 1 }}>
              {submission.total_score}
            </div>
            <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>/ {totalPoints} pts</div>
            <div style={{ color: "#4CAF50", fontSize: 12 }}>
              {Math.round((submission.total_score / totalPoints) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Overall feedback */}
      {submission.overall_feedback && (
        <div style={{
          background: "rgba(30,136,229,0.06)", border: "1px solid rgba(30,136,229,0.2)",
          borderRadius: 12, padding: isMobile ? "14px 16px" : "16px 20px", marginBottom: 18,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Overall Feedback
          </div>
          <p style={{ margin: 0, color: "#E8EDF5", fontSize: 13, lineHeight: 1.7 }}>
            {submission.overall_feedback}
          </p>
        </div>
      )}

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((sec) => {
          const score = scoresMap[sec.id];
          const scorePct = score ? score.score / sec.points : null;
          const scoreColor = scorePct !== null ? (scorePct >= 0.7 ? "#4CAF50" : "#FF7043") : "#5A6478";

          return (
            <div
              key={sec.id}
              style={{
                background: "#131929", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, overflow: "hidden",
              }}
            >
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: isMobile ? "12px 16px" : "12px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)", flexWrap: "wrap", gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                  <span style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 13 }}>{sec.label}</span>
                </div>
                <div>
                  {score ? (
                    <span style={{ color: scoreColor, fontWeight: 800, fontSize: 14 }}>
                      {score.score}/{sec.points}
                    </span>
                  ) : (
                    <span style={{ color: "#5A6478", fontSize: 12 }}>{sec.points} pts · not graded</span>
                  )}
                </div>
              </div>

              {/* Section content */}
              <div style={{ padding: isMobile ? "14px 16px" : "16px 20px" }}>
                <SectionRenderer section={sec} answer={answers[sec.id]} readOnly />
              </div>

              {/* Coach feedback */}
              {score?.feedback && (
                <div style={{ padding: isMobile ? "0 16px 14px" : "0 20px 16px" }}>
                  <div style={{
                    background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.18)",
                    borderRadius: 10, padding: "11px 14px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#FFC107", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                      Coach Feedback
                    </div>
                    <p style={{ margin: 0, color: "#E8EDF5", fontSize: 13, lineHeight: 1.65 }}>
                      {score.feedback}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submission.status !== "graded" && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#5A6478", fontSize: 14 }}>
          Awaiting grading from your coach.
        </div>
      )}
    </div>
  );
}

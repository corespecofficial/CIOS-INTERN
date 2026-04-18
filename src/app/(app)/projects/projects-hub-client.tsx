"use client";

import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { Project } from "@/app/actions/custom-projects-types";

const STATUS_CONFIG = {
  draft: { label: "In Progress", color: "#FFC107", bg: "rgba(255,193,7,0.1)" },
  submitted: { label: "Submitted", color: "#4CAF50", bg: "rgba(76,175,80,0.1)" },
  late: { label: "Late", color: "#FF7043", bg: "rgba(255,112,67,0.1)" },
  graded: { label: "Graded", color: "#1E88E5", bg: "rgba(30,136,229,0.1)" },
};

interface Props {
  eagleStatus: "draft" | "submitted" | "late" | "graded" | null;
  eagleScore: number | null;
  customProjects: (Project & { my_submission?: { id: string; status: string; total_score: number | null } | null })[];
}

export function ProjectsHubClient({ eagleStatus, eagleScore, customProjects }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const eagleCfg = eagleStatus ? STATUS_CONFIG[eagleStatus] : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 16px 90px" : "0 0 40px" }}>
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: "#E8EDF5" }}>📁 Projects</h1>
        <p style={{ margin: "6px 0 0", color: "#5A6478", fontSize: 13 }}>
          All class assignments and projects. New ones appear automatically when assigned.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? 14 : 18 }}>
        {/* Eagle Project card */}
        <div
          onClick={() => router.push("/projects/eagle")}
          style={{
            background: "#131929",
            border: `1px solid ${eagleCfg ? eagleCfg.color + "40" : "rgba(255,193,7,0.2)"}`,
            borderRadius: 14, padding: isMobile ? "18px 20px" : "22px 24px", cursor: "pointer",
            transition: "border-color 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <span style={{ fontSize: 36 }}>🦅</span>
            {eagleCfg ? (
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: eagleCfg.bg, color: eagleCfg.color,
              }}>
                {eagleCfg.label}
                {eagleScore !== null && ` · ${eagleScore}/100`}
              </span>
            ) : (
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#5A6478" }}>
                Not started
              </span>
            )}
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#E8EDF5" }}>
            The Eagle Project
          </h2>
          <p style={{ margin: "0 0 14px", color: "#9CA3AF", fontSize: 13, lineHeight: 1.6 }}>
            Weekend activation assignment. 8 sections, 100 points. Reflection, discipline, planning, design, and covenant.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Reflection", "Planning", "Design", "Covenant"].map((tag) => (
              <span key={tag} style={{
                padding: "3px 9px", borderRadius: 20, fontSize: 11,
                background: "rgba(255,255,255,0.04)", color: "#5A6478",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Custom project cards */}
        {customProjects.map((project) => {
          const sub = project.my_submission;
          const subCfg = sub ? STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] : null;
          const totalPoints = project.sections.reduce((s, sec) => s + sec.points, 0);

          return (
            <div
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              style={{
                background: "#131929",
                border: `1px solid ${subCfg ? subCfg.color + "40" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14, padding: isMobile ? "18px 20px" : "22px 24px", cursor: "pointer",
                transition: "border-color 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <span style={{ fontSize: 36 }}>{project.emoji}</span>
                {subCfg ? (
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: subCfg.bg, color: subCfg.color,
                  }}>
                    {subCfg.label}
                    {sub?.total_score !== null && sub?.total_score !== undefined && ` · ${sub.total_score}/${totalPoints}`}
                  </span>
                ) : (
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#5A6478" }}>
                    Not started
                  </span>
                )}
              </div>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#E8EDF5" }}>
                {project.title}
              </h2>
              <p style={{ margin: "0 0 14px", color: "#9CA3AF", fontSize: 13, lineHeight: 1.6 }}>
                {project.description}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#5A6478" }}>
                <span>📦 {project.sections.length} sections</span>
                <span>🏆 {totalPoints} pts</span>
                {project.deadline && (
                  <span>⏰ {new Date(project.deadline).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state / placeholder */}
        {customProjects.length === 0 && (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "22px 24px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minHeight: 180, textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>＋</div>
            <p style={{ margin: 0, color: "#5A6478", fontSize: 13 }}>
              New projects will appear here when assigned by your coach.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

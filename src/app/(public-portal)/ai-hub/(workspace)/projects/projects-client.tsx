"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ACCENT } from "../_components/workspace-shell";

interface Project {
  id: string;
  title: string;
  blurb: string;
  updatedAt: string;
  example?: boolean;
}

const EXAMPLE_PROJECTS: Project[] = [
  {
    id: "how-to-use-cios",
    title: "How to use CIOS",
    blurb:
      "An example project that also doubles as a how-to guide for using CIOS. Chat with it to learn more about how to get the most out of chatting with CIOS!",
    updatedAt: "1 month ago",
    example: true,
  },
];

export function ProjectsClient() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"activity" | "name">("activity");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? EXAMPLE_PROJECTS.filter((p) => p.title.toLowerCase().includes(q) || p.blurb.toLowerCase().includes(q))
      : EXAMPLE_PROJECTS;
    return sort === "name" ? [...list].sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [query, sort]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>Projects</h1>
          <button
            onClick={() => toast("Projects creation coming soon")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: 10,
              background: "var(--ws-text, #1F2430)",
              color: "var(--ws-canvas, #fff)",
              fontWeight: 800,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
          >
            + New project
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--ws-text-faint, #8F8B80)", pointerEvents: "none" }}>🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            style={{
              width: "100%",
              padding: "14px 16px 14px 44px",
              borderRadius: 12,
              border: `1.5px solid ${ACCENT}`,
              fontSize: 15,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              background: "var(--ws-canvas, #fff)",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, margin: "6px 0 18px", color: "var(--ws-text-muted, #55524A)", fontSize: 13 }}>
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "activity" | "name")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--ws-border, #EAE7DF)",
              background: "var(--ws-canvas, #fff)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            <option value="activity">Activity</option>
            <option value="name">Name</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            emoji="📁"
            title="No projects yet"
            subtitle="Projects let you group chats, instructions, and reference files together."
            cta="Create project"
            onCta={() => toast("Projects creation coming soon")}
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 14,
        border: "1px solid var(--ws-border, #EAE7DF)",
        background: "var(--ws-canvas, #fff)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ws-text, #1F2430)" }}>{project.title}</div>
        {project.example && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ws-text-muted, #55524A)", background: "var(--ws-chip, #F2F1ED)", padding: "3px 8px", borderRadius: 999 }}>
            Example project
          </span>
        )}
      </div>
      <p style={{ margin: "6px 0 10px", color: "var(--ws-text-muted, #55524A)", fontSize: 14, lineHeight: 1.55 }}>{project.blurb}</p>
      <div style={{ color: "var(--ws-text-faint, #8F8B80)", fontSize: 12 }}>Updated {project.updatedAt}</div>
    </div>
  );
}

function EmptyState({ emoji, title, subtitle, cta, onCta }: { emoji: string; title: string; subtitle: string; cta: string; onCta: () => void }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--ws-text, #1F2430)", marginBottom: 6 }}>{title}</div>
      <div style={{ color: "var(--ws-text-faint, #8F8B80)", fontSize: 14, maxWidth: 480, margin: "0 auto 18px" }}>{subtitle}</div>
      <button
        onClick={onCta}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          border: "1px solid var(--ws-border, #EAE7DF)",
          background: "var(--ws-canvas, #fff)",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        + {cta}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMyTrack, toggleMilestone, type UserCareerPath } from "@/app/actions/career-path";
import { CAREER_TRACKS, getTrack, type Milestone } from "@/lib/career-tracks";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  green: "#66BB6A",
};

interface Props {
  initialPath: UserCareerPath | null;
}

export default function CareerPathClient({ initialPath }: Props) {
  const router = useRouter();
  const [path, setPath] = useState<UserCareerPath | null>(initialPath);
  const [pending, startTransition] = useTransition();
  const [showTrackPicker, setShowTrackPicker] = useState(!initialPath);

  function pickTrack(slug: string) {
    startTransition(async () => {
      const track = getTrack(slug);
      const res = await setMyTrack(slug, track?.roles[0]);
      if (res.ok && res.data) {
        setPath(res.data);
        setShowTrackPicker(false);
        router.refresh();
      }
    });
  }

  function handleToggle(id: string) {
    if (!path) return;
    startTransition(async () => {
      const res = await toggleMilestone(id);
      if (res.ok && res.data) {
        setPath({ ...path, completed_milestones: res.data });
      }
    });
  }

  const track = path ? getTrack(path.track_slug) : null;
  const completed = path?.completed_milestones ?? [];
  const progressPct = track && track.milestones.length > 0
    ? Math.round((completed.length / track.milestones.length) * 100)
    : 0;

  if (showTrackPicker || !track) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Choose your career path</h1>
        <p style={{ margin: "6px 0 26px", color: C.dim, fontSize: 14, maxWidth: 620 }}>
          Each track has 8 milestones from foundation to advanced. AI uses your progress to recommend courses, projects, and resources. Switch anytime.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {CAREER_TRACKS.map((t) => (
            <button
              key={t.slug}
              onClick={() => pickTrack(t.slug)}
              disabled={pending}
              style={{
                textAlign: "left",
                background: path?.track_slug === t.slug ? `${t.color}22` : C.card,
                border: `1px solid ${path?.track_slug === t.slug ? t.color : C.border}`,
                borderRadius: 14,
                padding: 22,
                cursor: pending ? "wait" : "pointer",
                color: C.text,
              }}
            >
              <div style={{ fontSize: 32 }}>{t.emoji}</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 10, letterSpacing: -0.3 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>{t.description}</div>
              <div style={{ fontSize: 11, color: t.color, marginTop: 10, fontWeight: 700 }}>
                {t.milestones.length} milestones · {t.roles.length} target roles
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const byTier: Record<"foundation" | "intermediate" | "advanced", Milestone[]> = {
    foundation: track.milestones.filter((m) => m.tier === "foundation"),
    intermediate: track.milestones.filter((m) => m.tier === "intermediate"),
    advanced: track.milestones.filter((m) => m.tier === "advanced"),
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${track.color}22, ${C.card})`, border: `1px solid ${track.color}33`, borderRadius: 16, padding: 24, marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 40 }}>{track.emoji}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Your path</div>
            <h1 style={{ margin: "4px 0", fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>{track.title}</h1>
            <div style={{ fontSize: 12, color: C.dim }}>Target: {path?.target_role || track.roles[0]}</div>
          </div>
          <button onClick={() => setShowTrackPicker(true)} style={{ padding: "8px 14px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Change track
          </button>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim, marginBottom: 4 }}>
            <span>{completed.length} / {track.milestones.length} milestones</span>
            <span style={{ color: track.color, fontWeight: 700 }}>{progressPct}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: track.color, transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Milestones by tier */}
      {(["foundation", "intermediate", "advanced"] as const).map((tier) => (
        <div key={tier} style={{ marginBottom: 26 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>
            {tier}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byTier[tier].map((m, idx) => {
              const done = completed.includes(m.id);
              const isCurrent = !done && idx === byTier[tier].findIndex((x) => !completed.includes(x.id));
              return (
                <div
                  key={m.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${done ? `${track.color}66` : isCurrent ? `${track.color}44` : C.border}`,
                    borderLeft: `3px solid ${done ? track.color : isCurrent ? track.color : "transparent"}`,
                    borderRadius: 10,
                    padding: 16,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <button
                    onClick={() => handleToggle(m.id)}
                    disabled={pending}
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: `2px solid ${done ? track.color : C.border}`,
                      background: done ? track.color : "transparent",
                      color: done ? "#fff" : "transparent",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {done ? "✓" : " "}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: done ? C.dim : C.text, textDecoration: done ? "line-through" : "none", letterSpacing: -0.2 }}>
                        {m.title}
                      </div>
                      {isCurrent && <span style={{ fontSize: 9, background: `${track.color}22`, color: track.color, padding: "2px 8px", borderRadius: 999, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Up next</span>}
                      <span style={{ fontSize: 10, color: C.dim, marginLeft: "auto" }}>Week {m.suggested_week}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>{m.description}</div>
                    {m.cta_href && !done && (
                      <Link href={m.cta_href} style={{ fontSize: 11, color: track.color, textDecoration: "none", marginTop: 6, display: "inline-block", fontWeight: 700 }}>
                        Work on this →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {completed.length === track.milestones.length && (
        <div style={{ marginTop: 30, padding: 28, background: `linear-gradient(135deg, ${track.color}22, rgba(255,255,255,0.02))`, border: `2px solid ${track.color}44`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>🏆</div>
          <h2 style={{ margin: "10px 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>Track complete!</h2>
          <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>You&apos;ve finished all {track.milestones.length} milestones. Time to chase the next role.</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EagleSubmission } from "@/app/actions/eagle";

const SECTIONS = [
  { id: "A", label: "Reflection Essay", points: 20, icon: "✍️" },
  { id: "B", label: "Three Pillars Audit", points: 15, icon: "🏛️" },
  { id: "C", label: "Discipline Case Study", points: 15, icon: "🔬" },
  { id: "D", label: "4-Day Activation Planner", points: 15, icon: "📅" },
  { id: "E", label: "Goal-Setting Grid", points: 10, icon: "🎯" },
  { id: "F", label: "Design Challenge", points: 15, icon: "🎨" },
  { id: "G", label: "CIOS Career Ladder Map", points: 5, icon: "🪜" },
  { id: "H", label: "Eagle Covenant", points: 5, icon: "🦅" },
];

const STATUS_CONFIG = {
  draft: { label: "In Progress", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  submitted: { label: "Submitted", color: "#4CAF50", bg: "rgba(76,175,80,0.12)" },
  late: { label: "Submitted (Late)", color: "#FF7043", bg: "rgba(255,112,67,0.12)" },
  graded: { label: "Graded", color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
};

function Countdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setIsPast(true); setTimeLeft("Deadline passed"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  return (
    <span style={{ color: isPast ? "#EF5350" : "#FFC107", fontWeight: 700, fontFamily: "monospace", fontSize: 16 }}>
      {timeLeft}
    </span>
  );
}

interface Props {
  submission: EagleSubmission | null;
  deadline: string;
  userName: string;
}

export function EagleLandingClient({ submission, deadline, userName }: Props) {
  const router = useRouter();
  const status = submission?.status;
  const cfg = status ? STATUS_CONFIG[status] : null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 4px" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30,136,229,0.08) 0%, rgba(255,193,7,0.06) 100%)",
        border: "1px solid rgba(255,193,7,0.15)",
        borderRadius: 16, padding: "36px 32px 28px", marginBottom: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🦅</div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#E8EDF5", letterSpacing: -0.5 }}>
          The Eagle Project
        </h1>
        <p style={{ margin: "10px 0 0", color: "#9CA3AF", fontSize: 15 }}>
          Weekend Activation Assignment · 100 Points · 8 Sections
        </p>
        <p style={{ margin: "18px 0 0", color: "#B0BEC5", fontSize: 14, fontStyle: "italic", maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
          &ldquo;An eagle was raised among chickens. It scratched for grain and forgot it had wings.
          One day it looked up — and answered the sky. You are that eagle.
          This assignment is the moment you look up.&rdquo;
        </p>
        <p style={{ margin: "10px 0 0", color: "#5A6478", fontSize: 12 }}>— Coach Joshua</p>
      </div>

      {/* Deadline + status */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{
          flex: 1, minWidth: 200, background: "#131929", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <div style={{ color: "#5A6478", fontSize: 12, marginBottom: 6 }}>DEADLINE (Tuesday 7:45 PM WAT)</div>
          <Countdown deadline={deadline} />
        </div>
        {cfg && (
          <div style={{
            flex: 1, minWidth: 200, background: cfg.bg,
            border: `1px solid ${cfg.color}30`,
            borderRadius: 12, padding: "16px 20px",
          }}>
            <div style={{ color: "#5A6478", fontSize: 12, marginBottom: 6 }}>STATUS</div>
            <span style={{ color: cfg.color, fontWeight: 700, fontSize: 16 }}>{cfg.label}</span>
            {submission?.total_score !== null && submission?.total_score !== undefined && (
              <span style={{ color: "#9CA3AF", fontSize: 14, marginLeft: 10 }}>
                Score: <strong style={{ color: "#E8EDF5" }}>{submission.total_score}/100</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sections overview */}
      <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>Assignment Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {SECTIONS.map((s) => (
            <div key={s.id} style={{
              background: "rgba(255,255,255,0.03)", borderRadius: 8,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>
                  Section {s.id} · {s.points} pts
                </div>
                <div style={{ color: "#5A6478", fontSize: 11 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coaching philosophy snippets */}
      <div style={{
        background: "rgba(30,136,229,0.06)", border: "1px solid rgba(30,136,229,0.12)",
        borderRadius: 12, padding: "20px 24px", marginBottom: 28,
      }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 1 }}>
          Three Pillars
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { title: "Sincerity", sub: "Sincerity is the soil", desc: "Show up for the right reasons. The soil must be right before seed can grow." },
            { title: "Dedication", sub: "Interest is feeling; dedication is decision", desc: "You are either all in or you are not in — there is no productive middle ground." },
            { title: "Sacrifice", sub: "Nothing worth having is free", desc: "What are you willing to give up? That is the true measure of how much you want it." },
          ].map((p) => (
            <div key={p.title} style={{ padding: "12px 0" }}>
              <div style={{ color: "#E8EDF5", fontWeight: 700, marginBottom: 2 }}>{p.title}</div>
              <div style={{ color: "#FFC107", fontSize: 12, marginBottom: 6, fontStyle: "italic" }}>&ldquo;{p.sub}&rdquo;</div>
              <div style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {(!status || status === "draft") && (
          <button
            onClick={() => router.push("/eagle/submit")}
            style={{
              flex: 1, minWidth: 200, padding: "14px 24px",
              background: "linear-gradient(135deg,#1E88E5,#FFC107)",
              color: "#0A0E1A", fontWeight: 800, fontSize: 16,
              border: "none", borderRadius: 10, cursor: "pointer",
            }}
          >
            {status === "draft" ? "✏️ Continue Assignment" : "🦅 Start Assignment"}
          </button>
        )}
        {(status === "submitted" || status === "late" || status === "graded") && (
          <button
            onClick={() => router.push(`/eagle/${submission!.id}`)}
            style={{
              flex: 1, minWidth: 200, padding: "14px 24px",
              background: "#1E2640", color: "#E8EDF5", fontWeight: 700, fontSize: 15,
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, cursor: "pointer",
            }}
          >
            📋 View My Submission
          </button>
        )}
        <button
          onClick={() => router.push("/eagle/wall")}
          style={{
            padding: "14px 24px",
            background: "transparent", color: "#FFC107", fontWeight: 700, fontSize: 15,
            border: "1px solid rgba(255,193,7,0.3)", borderRadius: 10, cursor: "pointer",
          }}
        >
          🤝 Covenant Wall
        </button>
      </div>

      <p style={{ color: "#5A6478", fontSize: 12, marginTop: 24, textAlign: "center" }}>
        Hello, {userName}. Your progress auto-saves every 30 seconds. You can return anytime before the deadline.
      </p>
    </div>
  );
}

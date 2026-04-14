"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "cios-last-lesson";

export interface LastLesson {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  href: string;
  progressPct?: number;
  savedAt: number;
}

/** Call this from a lesson page whenever the user lands on or progresses
 *  through a lesson so the dashboard can offer a resume link. */
export function rememberLesson(v: Omit<LastLesson, "savedAt">) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...v, savedAt: Date.now() })); } catch { /* ignore */ }
}

export function clearLastLesson() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function ResumeCard() {
  const [last, setLast] = useState<LastLesson | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LastLesson;
      // Ignore records older than 30 days.
      if (Date.now() - parsed.savedAt > 30 * 86400000) return;
      setLast(parsed);
    } catch { /* ignore */ }
  }, []);

  if (!last) return null;

  return (
    <Link href={last.href} style={{ textDecoration: "none", display: "block", marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        background: "linear-gradient(135deg, rgba(30,136,229,0.16), rgba(171,71,188,0.08))",
        border: "1px solid rgba(30,136,229,0.3)",
        borderRadius: 14, padding: "12px 16px", cursor: "pointer",
        transition: "transform 0.15s, border-color 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}>
        <div style={{ fontSize: 28 }}>🎯</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Pick up where you left off
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {last.lessonTitle}
          </div>
          <div style={{ fontSize: 11, color: "#B0BEC5", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            in {last.courseTitle}{typeof last.progressPct === "number" ? ` · ${last.progressPct}% complete` : ""}
          </div>
        </div>
        <div style={{ padding: "8px 14px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
          Resume →
        </div>
      </div>
    </Link>
  );
}

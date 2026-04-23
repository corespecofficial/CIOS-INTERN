"use client";

/* Due Reviews Panel — Phase 3.
 *
 * Surfaces the user's SRS queue (concepts whose due_at <= now) as actionable
 * cards. Designed to drop into the main dashboard OR stand alone. Uses only
 * the --ws-* theme tokens so it flips between light/dark cleanly.
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { listDueReviews, type MasteryRow } from "@/app/actions/study-buddy-v2";

export function DueReviewsPanel({ limit = 5, showHeader = true }: { limit?: number; showHeader?: boolean }) {
  const [rows, setRows] = useState<MasteryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await listDueReviews(limit);
      if (!r.ok) { setError(r.error); return; }
      setRows(r.data!);
    });
  }, [limit]);

  if (error) {
    return (
      <div style={shell}>
        <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)" }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={shell}>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#60A5FA", letterSpacing: 0.4 }}>STUDY BUDDY</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--ws-text, #0F172A)", marginTop: 2 }}>
              Due for review
            </div>
          </div>
          <Link href="/study-buddy/learn" style={linkPill}>+ New session</Link>
        </div>
      )}

      {isLoading && rows === null && (
        <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)" }}>Loading your review queue…</div>
      )}

      {rows !== null && rows.length === 0 && (
        <div style={emptyBox}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>🌿</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ws-text, #0F172A)" }}>Nothing due right now</div>
          <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 4, lineHeight: 1.5 }}>
            Quiz a concept to build your review queue. We&apos;ll resurface it before you forget.
          </div>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <DueCard key={`${r.sessionId}:${r.conceptId}`} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function DueCard({ row }: { row: MasteryRow }) {
  const overdue = row.dueAt ? new Date(row.dueAt).getTime() < Date.now() - 86_400_000 : false;
  const href = row.sessionId ? `/study-buddy/learn?session=${row.sessionId}&concept=${encodeURIComponent(row.conceptId)}` : "/study-buddy/learn";
  const dueText = formatDueText(row.dueAt);

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", borderRadius: 12,
        background: "var(--ws-canvas, #fff)",
        border: `1px solid ${overdue ? "#F87171" : "var(--ws-border, #E2E8F0)"}`,
        cursor: "pointer", transition: "border-color .15s",
      }}>
        <MasteryRing score={row.lastScore} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ws-text, #0F172A)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.conceptTitle || row.conceptId}
          </div>
          <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 2 }}>
            {row.sessionTopic ? `${row.sessionTopic} · ` : ""}{dueText}
          </div>
        </div>
        <span style={{ fontSize: 16, color: overdue ? "#DC2626" : "var(--ws-text-faint, #64748B)" }}>→</span>
      </div>
    </Link>
  );
}

export function MasteryRing({ score, size = 32 }: { score: number; size?: number }) {
  const radius = size / 2 - 3;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;

  const color = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke="var(--ws-border, #E2E8F0)" strokeWidth={3} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={3} fill="none"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size > 40 ? 11 : 9, fontWeight: 800, color: "var(--ws-text, #0F172A)",
      }}>
        {pct}
      </div>
    </div>
  );
}

function formatDueText(dueAt: string | null): string {
  if (!dueAt) return "Due now";
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return "Overdue · yesterday";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

const shell: React.CSSProperties = {
  padding: 16, borderRadius: 16,
  background: "var(--ws-chip, #F8FAFC)",
  border: "1px solid var(--ws-border, #E2E8F0)",
};

const linkPill: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 999,
  background: "#60A5FA", color: "#fff",
  fontSize: 11, fontWeight: 800, textDecoration: "none",
  whiteSpace: "nowrap",
};

const emptyBox: React.CSSProperties = {
  padding: "18px 14px", textAlign: "center",
  background: "var(--ws-canvas, #fff)",
  border: "1px dashed var(--ws-border, #E2E8F0)",
  borderRadius: 12,
};

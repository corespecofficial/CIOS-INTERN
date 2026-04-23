"use client";

/* Cohort leaderboard — Phase 5.
 *
 * Ranks interns in the same cohort by average mastery across all their
 * study-buddy sessions. Surfaces friendly competition without turning into
 * a grind — uses green-mastered-count as the primary human-readable stat,
 * with avg-mastery as the tie-breaker ranking signal.
 *
 * Drop-in anywhere. Hidden (returns null) for users without a cohort. */

import { useEffect, useState, useTransition } from "react";
/* eslint-disable-next-line @next/next/no-img-element */
import { listCohortLeaderboard, type CohortLeaderRow } from "@/app/actions/study-buddy-cohort";

export function CohortLeaderboard({ limit = 10, showHeader = true, hideWhenNoCohort = true }: {
  limit?: number;
  showHeader?: boolean;
  hideWhenNoCohort?: boolean;
}) {
  const [rows, setRows] = useState<CohortLeaderRow[] | null>(null);
  const [cohortNumber, setCohortNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await listCohortLeaderboard(limit);
      if (!r.ok) { setError(r.error); return; }
      setRows(r.data!.rows);
      setCohortNumber(r.data!.cohortNumber);
    });
  }, [limit]);

  // Public user with no cohort → hide the component completely
  if (hideWhenNoCohort && !isLoading && rows !== null && cohortNumber === null) {
    return null;
  }

  if (error) {
    return <div style={shell}><div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)" }}>{error}</div></div>;
  }

  return (
    <div style={shell}>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#8B5CF6", letterSpacing: 0.4 }}>COHORT LEADERBOARD</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--ws-text, #0F172A)", marginTop: 2 }}>
              {cohortNumber != null ? `Cohort #${cohortNumber}` : "Your cohort"}
            </div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999,
            background: "var(--ws-chip, #F1F5F9)",
            color: "var(--ws-text-muted, #475569)",
          }}>Ranked by mastery</div>
        </div>
      )}

      {isLoading && rows === null && (
        <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)" }}>Loading leaderboard…</div>
      )}

      {rows !== null && rows.length === 0 && (
        <div style={emptyBox}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🏆</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ws-text, #0F172A)" }}>Nobody on the board yet</div>
          <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 4, lineHeight: 1.5 }}>
            Finish a quiz or flashcard deck to plant your flag.
          </div>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r, i) => <Row key={r.userId} row={r} rank={i + 1} />)}
        </div>
      )}
    </div>
  );
}

function Row({ row, rank }: { row: CohortLeaderRow; rank: number }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  const masteryColor = row.avgMastery >= 80 ? "#10B981" : row.avgMastery >= 50 ? "#F59E0B" : "#94A3B8";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 12,
      background: row.isMe ? "#8B5CF614" : "var(--ws-canvas, #fff)",
      border: `1px solid ${row.isMe ? "#8B5CF6" : "var(--ws-border, #E2E8F0)"}`,
    }}>
      <div style={{
        minWidth: 28, textAlign: "center",
        fontSize: medal ? 20 : 13, fontWeight: 900,
        color: row.isMe ? "#8B5CF6" : "var(--ws-text-muted, #475569)",
      }}>
        {medal || `#${rank}`}
      </div>

      {row.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.avatarUrl}
          alt=""
          width={32}
          height={32}
          style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--ws-border, #E2E8F0)" }}
        />
      ) : (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--ws-chip, #F1F5F9)",
          color: "var(--ws-text-muted, #475569)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, flexShrink: 0,
        }}>
          {(row.name || "?").slice(0, 1).toUpperCase()}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ws-text, #0F172A)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.name || "Unnamed intern"}
          {row.isMe && <span style={{ marginLeft: 6, fontSize: 10, color: "#8B5CF6", fontWeight: 800 }}>YOU</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 2, display: "flex", gap: 8 }}>
          <span>✨ {row.conceptsMastered} mastered</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{row.totalReviewed} reviewed</span>
        </div>
      </div>

      <div style={{
        fontSize: 14, fontWeight: 900, color: masteryColor,
        minWidth: 44, textAlign: "right",
      }}>
        {row.avgMastery}%
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  padding: 16, borderRadius: 16,
  background: "var(--ws-chip, #F8FAFC)",
  border: "1px solid var(--ws-border, #E2E8F0)",
};

const emptyBox: React.CSSProperties = {
  padding: "18px 14px", textAlign: "center",
  background: "var(--ws-canvas, #fff)",
  border: "1px dashed var(--ws-border, #E2E8F0)",
  borderRadius: 12,
};

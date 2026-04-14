"use client";

import { useEffect, useState } from "react";
import { getCourseLeaderboard, type LeaderRow } from "@/app/actions/engagement-v2";

export function CourseLeaderboard({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    getCourseLeaderboard(courseId).then((r) => { if (r.ok) setRows(r.data!); });
  }, [courseId]);

  if (!rows) return null;
  if (rows.length === 0) return null;

  const medal = (n: number) => n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : `#${n}`;

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>🏆 This week&apos;s leaders</div>
        <div style={{ fontSize: 10, color: "#8892A4" }}>Resets weekly</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => (
          <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: r.rank === 1 ? "rgba(255,193,7,0.08)" : "#0A0E1A", borderRadius: 8 }}>
            <div style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: 800, color: r.rank <= 3 ? "#FFC107" : "#8892A4" }}>
              {medal(r.rank)}
            </div>
            {r.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.avatar_url} alt="" width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                {(r.name || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.name || "Unnamed"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#FFC107" }}>
              +{r.xp_week} XP
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

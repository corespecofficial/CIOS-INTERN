"use client";

import { useEffect, useState } from "react";
import { getMyMiniBadges, type MiniBadgeRow } from "@/app/actions/engagement-v2";

export function MiniBadgesGrid({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<MiniBadgeRow[] | null>(null);

  useEffect(() => {
    getMyMiniBadges(userId).then((r) => { if (r.ok) setRows(r.data!); });
  }, [userId]);

  if (!rows) return null;
  if (rows.length === 0) return null;

  const unlocked = rows.filter((r) => r.awarded_at).length;

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>🎖 Mini-badges</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>Collectable milestones</div>
        </div>
        <div style={{ fontSize: 12, color: "#FFC107", fontWeight: 800 }}>
          {unlocked}/{rows.length}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
        {rows.map((b) => {
          const locked = !b.awarded_at;
          return (
            <div
              key={b.id}
              title={locked ? `🔒 ${b.description}` : `${b.name} · earned ${new Date(b.awarded_at!).toLocaleDateString()}`}
              style={{
                textAlign: "center", padding: 10, borderRadius: 10,
                background: locked ? "rgba(255,255,255,0.03)" : `${b.color}18`,
                border: `1px solid ${locked ? "rgba(255,255,255,0.05)" : b.color + "55"}`,
                opacity: locked ? 0.4 : 1,
                filter: locked ? "grayscale(0.8)" : "none",
                cursor: "help",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{b.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: locked ? "#8892A4" : b.color, textAlign: "center", lineHeight: 1.2 }}>
                {b.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

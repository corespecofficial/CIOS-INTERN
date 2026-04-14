"use client";
/* eslint-disable @next/next/no-img-element */

import { useUser } from "@clerk/nextjs";
import { useCohortPresence } from "@/lib/use-chat-realtime";

export function CohortPresence({ courseId }: { courseId: string }) {
  const { user } = useUser();
  const members = useCohortPresence(courseId, user?.id || null);
  // Exclude self.
  const others = members.filter((m) => m.clientId !== user?.id);

  if (others.length === 0) {
    return (
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#8892A4" }}>
        🧘 You&apos;re the only one studying this right now.
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(102,187,106,0.08)", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", marginRight: 4 }}>
        {others.slice(0, 4).map((m, i) => (
          <div key={m.clientId} style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "linear-gradient(135deg,#66BB6A,#43A047)",
            border: "2px solid #111827",
            marginLeft: i === 0 ? 0 : -8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, color: "#fff",
          }}>
            {m.data?.name ? m.data.name.slice(0, 1).toUpperCase() : "●"}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, fontSize: 12, color: "#E8EDF5", fontWeight: 600 }}>
        🟢 {others.length} other intern{others.length === 1 ? "" : "s"} studying now
      </div>
    </div>
  );
}

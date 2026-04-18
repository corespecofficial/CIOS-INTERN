"use client";

import { useRouter } from "next/navigation";
import type { Checklist } from "@/app/actions/checklist";

export function ChecklistHistoryClient({ checklists }: { checklists: Checklist[] }) {
  const router = useRouter();

  const completedCount = checklists.filter((c) => c.status === "completed").length;
  const totalItems = checklists.reduce((s, c) => s + (c.total_items ?? 0), 0);
  const avgScore = checklists.length > 0 ? Math.round(checklists.reduce((s, c) => s + c.completion_pct, 0) / checklists.length) : 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <button onClick={() => router.push("/checklist")} style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 20, fontFamily: "'Nunito', sans-serif" }}>
        ← Back to Checklists
      </button>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>📜 Checklist History</h1>
        <p style={{ fontSize: 13, color: "#5A6478", margin: "4px 0 0" }}>Your completed and archived checklists</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Completed", value: completedCount, color: "#66BB6A" },
          { label: "Total Items Done", value: totalItems, color: "#1E88E5" },
          { label: "Avg. Completion", value: `${avgScore}%`, color: "#AB47BC" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#5A6478", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {checklists.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 18, padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📜</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#E8EDF5" }}>No history yet</div>
          <div style={{ fontSize: 13, color: "#5A6478", marginTop: 4 }}>Completed checklists will appear here</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {checklists.map((cl) => (
            <div key={cl.id} onClick={() => router.push(`/checklist/${cl.id}`)} style={{ background: "#111827", border: `1px solid ${cl.status === "completed" ? "rgba(102,187,106,0.15)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 50, background: cl.status === "completed" ? "rgba(102,187,106,0.12)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {cl.status === "completed" ? "✅" : "📦"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.title}</div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>
                  {cl.total_items ?? 0} items · {cl.completion_pct}% · {cl.category}
                  {cl.due_date && ` · Due ${new Date(cl.due_date).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: cl.status === "completed" ? "rgba(102,187,106,0.12)" : "rgba(90,100,120,0.1)", color: cl.status === "completed" ? "#66BB6A" : "#5A6478" }}>
                  {cl.status === "completed" ? "Completed ✓" : "Archived"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

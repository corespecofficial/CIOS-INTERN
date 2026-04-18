"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Checklist } from "@/app/actions/checklist";
import { createChecklistFromTemplate } from "@/app/actions/checklist";

const CATEGORY_ICONS: Record<string, string> = {
  general: "📋", onboarding: "🚀", launch: "🎯", compliance: "🔐",
  performance: "📈", daily: "☀️", weekly: "📅", project: "🏗️",
};

interface Props { templates: Checklist[]; userRole: string }

export function ChecklistTemplatesClient({ templates, userRole }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function useTemplate(id: string) {
    start(async () => {
      const res = await createChecklistFromTemplate(id);
      if (res.ok) { toast.success("Checklist created! ✅"); router.push(`/checklist/${res.data.id}`); }
      else toast.error(res.error);
    });
  }

  const PRIORITY_COLORS = { low: "#8892A4", medium: "#FFC107", high: "#FF7043", urgent: "#EF5350" } as const;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <button onClick={() => router.push("/checklist")} style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 20, fontFamily: "'Nunito', sans-serif" }}>
        ← Back to Checklists
      </button>

      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>📋 Checklist Templates</h1>
        <p style={{ fontSize: 13, color: "#5A6478", margin: "4px 0 0" }}>Start from a proven framework · Customize after</p>
      </div>

      {templates.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 20, padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#E8EDF5" }}>No templates yet</div>
          <div style={{ fontSize: 13, color: "#5A6478", marginTop: 4 }}>Admins can create templates from the checklist builder</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 14 }}>
          {templates.map((tmpl) => (
            <div key={tmpl.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(30,136,229,0.12)", border: "1px solid rgba(30,136,229,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {CATEGORY_ICONS[tmpl.category] ?? "📋"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#E8EDF5" }}>{tmpl.title}</div>
                  {tmpl.description && <div style={{ fontSize: 12, color: "#5A6478", marginTop: 3, lineHeight: 1.5 }}>{tmpl.description}</div>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#5A6478" }}>
                  {tmpl.total_items ?? 0} items
                </span>
                <span style={{ padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[tmpl.priority as keyof typeof PRIORITY_COLORS] ?? "#5A6478" }}>
                  {tmpl.priority}
                </span>
                {tmpl.signature_required && (
                  <span style={{ padding: "2px 8px", background: "rgba(171,71,188,0.1)", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#AB47BC" }}>
                    ✍️ Signature
                  </span>
                )}
                <span style={{ padding: "2px 8px", background: "rgba(66,187,106,0.1)", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#66BB6A" }}>
                  +{tmpl.xp_reward} XP
                </span>
              </div>

              <button
                onClick={() => useTemplate(tmpl.id)}
                disabled={pending}
                style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg,#1E88E5,#43A047)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif", opacity: pending ? 0.6 : 1 }}
              >
                {pending ? "Creating…" : "Use This Template →"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserGamificationSnapshot } from "@/lib/gamification";

export const dynamic = "force-dynamic";

const STREAK_KINDS = [
  { kind: "login", label: "Daily login", emoji: "📆", color: "#1E88E5" },
  { kind: "learning", label: "Learning", emoji: "📚", color: "#AB47BC" },
  { kind: "task", label: "Task completion", emoji: "✅", color: "#66BB6A" },
  { kind: "attendance", label: "Class attendance", emoji: "🎓", color: "#FFC107" },
  { kind: "community", label: "Community activity", emoji: "💬", color: "#FF7043" },
];

export default async function StreaksPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const snap = await getUserGamificationSnapshot(me.id);
  const byKind = new Map(snap.streaks.map((s) => [s.kind, s]));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,112,67,0.15)", color: "#FF7043", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>STREAKS</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔥 Consistency is your superpower</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Show up daily to keep your streaks alive and unlock bonus XP.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {STREAK_KINDS.map((k) => {
          const s = byKind.get(k.kind);
          const current = s?.current || 0;
          const best = s?.best || 0;
          return (
            <div key={k.kind} style={{ background: `linear-gradient(135deg, ${k.color}18, #111827)`, border: `1px solid ${k.color}33`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{k.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{k.label}</div>
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Current</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: "'Space Grotesk', sans-serif" }}>{current}<span style={{ fontSize: 13, color: "#8892A4", marginLeft: 3 }}>days</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Best</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#E8EDF5" }}>{best}d</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getMyLiveStreaks } from "@/app/actions/streaks-live";

export const dynamic = "force-dynamic";

const STREAK_META: Record<string, { label: string; emoji: string; color: string; help: string }> = {
  login:      { label: "Daily login",         emoji: "📆", color: "#1E88E5", help: "Sign in every day to keep this alive." },
  learning:   { label: "Learning",            emoji: "📚", color: "#AB47BC", help: "Open a course, class, or note each day." },
  task:       { label: "Task completion",     emoji: "✅", color: "#66BB6A", help: "Complete at least one task per day." },
  attendance: { label: "Class attendance",    emoji: "🎓", color: "#FFC107", help: "Join live classes on their days." },
  community:  { label: "Community activity",  emoji: "💬", color: "#FF7043", help: "Post or comment in Community." },
};

export default async function StreaksPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const r = await getMyLiveStreaks();
  const streaks = r.ok ? r.data! : [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,112,67,0.15)", color: "#FF7043", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>STREAKS · LIVE</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔥 Consistency is your superpower</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Computed in real time from your actions — no caching, no drift.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {streaks.map((s) => {
          const k = STREAK_META[s.kind] || { label: s.kind, emoji: "🔥", color: "#8892A4", help: "" };
          return (
            <div key={s.kind} style={{ background: `linear-gradient(135deg, ${k.color}18, #111827)`, border: `1px solid ${k.color}33`, borderRadius: 14, padding: 20, position: "relative" }}>
              {s.activeToday && (
                <span style={{ position: "absolute", top: 14, right: 14, padding: "2px 8px", borderRadius: 99, background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>
                  ● ACTIVE TODAY
                </span>
              )}
              <div style={{ fontSize: 32, marginBottom: 8 }}>{k.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{k.label}</div>
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{k.help}</div>
              <div style={{ display: "flex", gap: 20, marginTop: 14, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Current</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.current}<span style={{ fontSize: 13, color: "#8892A4", marginLeft: 3 }}>days</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Best</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#E8EDF5" }}>{s.best}d</div>
                </div>
              </div>
              {s.lastActive && !s.activeToday && (
                <div style={{ fontSize: 10, color: "#5A6478", marginTop: 12, fontStyle: "italic" }}>
                  Last active {s.lastActive === new Date(Date.now() - 86400_000).toISOString().slice(0, 10) ? "yesterday" : s.lastActive}
                  {s.current === 0 && " — streak broken, start again"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "rgba(30,136,229,0.05)", border: "1px solid rgba(30,136,229,0.15)", borderRadius: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1E88E5", marginBottom: 4 }}>💡 How streaks work</div>
        <div style={{ fontSize: 12, color: "#B0BEC5", lineHeight: 1.6 }}>
          Each streak counts consecutive UTC days where you performed that activity. Miss a day → the streak resets.
          Your best-ever streak sticks around as a badge of honour. Streak Saver (50 XP) in the Gamification Hub can
          rescue a broken login streak once per reset.
        </div>
      </div>
    </div>
  );
}

import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserGamificationSnapshot, levelProgress, rankFromLevel, xpForLevel, formatXP, RANKS } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function LevelsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const snap = await getUserGamificationSnapshot(me.id);
  const xp = snap.user?.xp || 0;
  const progress = levelProgress(xp);
  const rank = rankFromLevel(progress.level);

  const maxLevel = 50;
  const rows: { level: number; xpNeeded: number; rank: ReturnType<typeof rankFromLevel>; current: boolean }[] = [];
  for (let L = 1; L <= maxLevel; L++) {
    rows.push({ level: L, xpNeeded: xpForLevel(L), rank: rankFromLevel(L), current: L === progress.level });
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: `${rank.color}22`, color: rank.color, fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>LEVELS & RANKS</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Level {progress.level} · {rank.emoji} {rank.title}</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>{formatXP(progress.xpToNext)} XP to Level {progress.nextLevel}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <section style={panel}>
          <h2 style={sectionHeader}>📜 Rank tiers</h2>
          {RANKS.map((r) => (
            <div key={r.title} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
              <span style={{ color: progress.level >= r.minLevel ? r.color : "#8892A4", fontWeight: progress.level >= r.minLevel ? 700 : 500 }}>
                {r.emoji} {r.title}
              </span>
              <span style={{ color: "#8892A4", fontSize: 11 }}>Lv {r.minLevel}+</span>
            </div>
          ))}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>🎯 Level curve (first 15)</h2>
          {rows.slice(0, 15).map((r) => (
            <div key={r.level} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12, background: r.current ? "rgba(30,136,229,0.08)" : "transparent", paddingLeft: r.current ? 8 : 0, borderRadius: r.current ? 6 : 0 }}>
              <span style={{ color: r.current ? "#1E88E5" : "#E8EDF5", fontWeight: r.current ? 700 : 500 }}>
                Level {r.level} {r.current && "· YOU"}
              </span>
              <span style={{ color: "#8892A4" }}>{formatXP(r.xpNeeded)} XP</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, margin: "0 0 10px 0" };

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
      <style>{`
        .levels-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 640px) {
          .levels-grid {
            grid-template-columns: 1fr;
          }
        }
        .level-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 10px;
          border-radius: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 13px;
        }
        .level-row.current {
          background: rgba(30,136,229,0.1);
          border-bottom-color: transparent;
        }
        .rank-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 10px;
          border-radius: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 14px;
        }
      `}</style>

      {/* Hero header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: "inline-block", padding: "3px 12px",
          background: `${rank.color}22`, color: rank.color,
          fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 8,
        }}>
          LEVELS & RANKS
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0", lineHeight: 1.3 }}>
          Level {progress.level} · {rank.emoji} {rank.title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>{formatXP(progress.xpToNext)} XP to Level {progress.nextLevel}</p>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 999, overflow: "hidden", maxWidth: 160 }}>
            <div style={{
              height: "100%", borderRadius: 999,
              background: `linear-gradient(90deg, ${rank.color}, ${rank.color}99)`,
              width: `${Math.round((1 - progress.xpToNext / xpForLevel(progress.nextLevel)) * 100)}%`,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      </div>

      <div className="levels-grid">
        {/* Rank Tiers */}
        <section style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.8, textTransform: "uppercase", margin: "0 0 12px 0" }}>
            📜 Rank Tiers
          </h2>
          {RANKS.map((r) => {
            const unlocked = progress.level >= r.minLevel;
            return (
              <div key={r.title} className="rank-row">
                <span style={{ color: unlocked ? r.color : "#4B5563", fontWeight: unlocked ? 700 : 500, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 18 }}>{r.emoji}</span>
                  <span>{r.title}</span>
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: unlocked ? r.color : "#374151",
                  background: unlocked ? `${r.color}18` : "rgba(255,255,255,0.04)",
                  padding: "2px 8px", borderRadius: 20,
                }}>
                  Lv {r.minLevel}+
                </span>
              </div>
            );
          })}
        </section>

        {/* Level Curve */}
        <section style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.8, textTransform: "uppercase", margin: "0 0 12px 0" }}>
            🎯 Level Curve (First 15)
          </h2>
          {rows.slice(0, 15).map((r) => (
            <div key={r.level} className={`level-row${r.current ? " current" : ""}`}>
              <span style={{ color: r.current ? "#1E88E5" : "#E8EDF5", fontWeight: r.current ? 800 : 500, display: "flex", alignItems: "center", gap: 6 }}>
                {r.current && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1E88E5", display: "inline-block" }} />}
                Level {r.level}
                {r.current && <span style={{ fontSize: 10, fontWeight: 700, color: "#1E88E5", background: "rgba(30,136,229,0.15)", padding: "1px 7px", borderRadius: 20 }}>YOU</span>}
              </span>
              <span style={{ color: r.current ? "#1E88E5" : "#6B7280", fontWeight: r.current ? 700 : 400, fontSize: 12 }}>
                {formatXP(r.xpNeeded)} XP
              </span>
            </div>
          ))}
        </section>
      </div>

      {/* Full level table — all 50 */}
      <section style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.8, textTransform: "uppercase", margin: "0 0 14px 0" }}>
          📊 Full Level Table
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.level} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", borderRadius: 10,
              background: r.current ? "rgba(30,136,229,0.12)" : "rgba(255,255,255,0.03)",
              border: r.current ? "1px solid rgba(30,136,229,0.3)" : "1px solid transparent",
            }}>
              <span style={{ fontSize: 12, fontWeight: r.current ? 800 : 500, color: r.current ? "#1E88E5" : "#9CA3AF" }}>
                Lv {r.level}
              </span>
              <span style={{ fontSize: 11, color: r.current ? "#1E88E5" : "#4B5563", fontWeight: r.current ? 700 : 400 }}>
                {formatXP(r.xpNeeded)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

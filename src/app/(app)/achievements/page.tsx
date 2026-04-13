import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAllBadgesWithOwnership, getUserGamificationSnapshot } from "@/lib/gamification";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [badges, snap] = await Promise.all([
    getAllBadgesWithOwnership(me.id),
    getUserGamificationSnapshot(me.id),
  ]);

  const earned = badges.filter((b) => !b.locked).sort((a, b) => (b.earnedAt || "").localeCompare(a.earnedAt || ""));
  const locked = badges.filter((b) => b.locked);
  const lifetime = (snap.events || []).reduce((s, e) => s + Math.max(0, e.amount), 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>ACHIEVEMENTS</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Your unlock history</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="Badges earned" value={earned.length} />
        <Stat label="Still locked" value={locked.length} />
        <Stat label="Lifetime XP" value={lifetime.toLocaleString()} />
        <Stat label="XP events" value={(snap.events || []).length} />
      </div>

      <section style={panel}>
        <h2 style={sectionHeader}>🏆 Unlocked</h2>
        {earned.length === 0 && <div style={{ color: "#8892A4", fontSize: 13 }}>No achievements yet. <Link href="/missions" style={{ color: "#1E88E5" }}>Start a mission →</Link></div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {earned.map((b) => (
            <div key={b.id} style={{ display: "flex", gap: 10, background: "#0A0E1A", padding: 10, borderRadius: 10, border: "1px solid rgba(255,193,7,0.2)" }}>
              <div style={{ fontSize: 30 }}>{b.icon_url || "🏆"}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>{b.description}</div>
                {b.earnedAt && <div style={{ fontSize: 10, color: "#66BB6A", marginTop: 2 }}>{new Date(b.earnedAt).toLocaleDateString()}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...panel, marginTop: 16 }}>
        <h2 style={sectionHeader}>🔒 Locked</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {locked.map((b) => {
            const crit = b.criteria as { type?: string; value?: number };
            return (
              <div key={b.id} style={{ display: "flex", gap: 10, background: "#0A0E1A", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", opacity: 0.7 }}>
                <div style={{ fontSize: 30, filter: "grayscale(1)" }}>{b.icon_url || "🏆"}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{b.description}</div>
                  {crit?.type && <div style={{ fontSize: 10, color: "#FFC107", marginTop: 2 }}>Target: {crit.value} {crit.type.replaceAll("_", " ")}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, margin: "0 0 10px 0" };

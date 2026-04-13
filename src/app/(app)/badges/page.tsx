import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAllBadgesWithOwnership } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function BadgesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const badges = await getAllBadgesWithOwnership(me.id);

  const grouped = new Map<string, typeof badges>();
  for (const b of badges) {
    const arr = grouped.get(b.category) || [];
    arr.push(b);
    grouped.set(b.category, arr);
  }

  const earned = badges.filter((b) => !b.locked).length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>BADGE COLLECTION</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Badges ({earned} / {badges.length})</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Earn badges by completing real actions across the platform.</p>
      </div>

      {Array.from(grouped.entries()).map(([cat, items]) => (
        <section key={cat} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{cat}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {items.map((b) => (
              <div key={b.id} style={{
                background: b.locked ? "#0A0E1A" : "#111827",
                border: `1px solid ${b.locked ? "rgba(255,255,255,0.05)" : "rgba(255,193,7,0.3)"}`,
                borderRadius: 12, padding: 16, textAlign: "center",
                opacity: b.locked ? 0.5 : 1, position: "relative",
              }}>
                <div style={{ fontSize: 40, marginBottom: 8, filter: b.locked ? "grayscale(1)" : "none" }}>{b.icon_url || "🏆"}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "#8892A4", minHeight: 28 }}>{b.description}</div>
                {b.earnedAt && <div style={{ fontSize: 10, color: "#66BB6A", marginTop: 6 }}>Earned {new Date(b.earnedAt).toLocaleDateString()}</div>}
                {b.locked && <div style={{ fontSize: 10, color: "#8892A4", marginTop: 6 }}>🔒 Locked</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

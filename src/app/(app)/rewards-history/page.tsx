import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserGamificationSnapshot } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function RewardsHistoryPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const snap = await getUserGamificationSnapshot(me.id);
  const events = snap.events || [];
  const totalPositive = events.reduce((s, e) => s + Math.max(0, e.amount), 0);
  const totalNegative = events.reduce((s, e) => s + Math.min(0, e.amount), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>XP HISTORY</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Rewards & penalties ledger</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <Stat label="Events" value={events.length} color="#1E88E5" />
        <Stat label="XP earned" value={`+${totalPositive.toLocaleString()}`} color="#66BB6A" />
        <Stat label="XP penalties" value={totalNegative.toLocaleString()} color="#EF5350" />
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        {events.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#8892A4" }}>No XP events yet. Start learning, completing tasks, or helping peers!</div>}
        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div>
              <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, textTransform: "capitalize" }}>{e.event_type.replaceAll("_", " ")}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>{new Date(e.created_at).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: e.amount >= 0 ? "#66BB6A" : "#EF5350", fontFamily: "'Space Grotesk', sans-serif" }}>
              {e.amount >= 0 ? "+" : ""}{e.amount} XP
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
    </div>
  );
}

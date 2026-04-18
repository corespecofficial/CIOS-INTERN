"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { claimMissionAction } from "@/app/actions/gamification";
import { celebrateAward, fireConfetti } from "@/lib/celebrate";

interface Mission {
  id: string; key: string; title: string; description: string;
  cadence: string; target: number; xp_reward: number; coin_reward: number;
  progress: number; claimed: boolean; complete: boolean;
}

const MASTERCLASS_KEYS = [
  "social_media_pioneer", "digital_products_builder", "meta_business_setup",
  "content_calendar_built", "first_posts_live", "masterclass_complete",
];

export function MissionsClient({ missions }: { missions: Mission[] }) {
  const masterclass = missions.filter((m) => MASTERCLASS_KEYS.includes(m.key));
  const daily = missions.filter((m) => m.cadence === "daily" && !MASTERCLASS_KEYS.includes(m.key));
  const weekly = missions.filter((m) => m.cadence === "weekly" && !MASTERCLASS_KEYS.includes(m.key));
  const totalXp = masterclass.reduce((s, m) => s + m.xp_reward, 0);
  const completedMc = masterclass.filter((m) => m.complete).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>MISSIONS</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Complete missions · Earn XP & coins</h1>
      </div>

      {/* Masterclass Mission Block */}
      {masterclass.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(255,193,7,0.08), rgba(255,112,67,0.06))",
            border: "1px solid rgba(255,193,7,0.2)",
            borderRadius: 14, padding: "14px 16px", marginBottom: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#FFC107", letterSpacing: 0.5, textTransform: "uppercase" }}>ACTIVE ASSIGNMENT</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginTop: 2 }}>📱 Social Media & Digital Products Masterclass</div>
              <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>Complete all 6 missions to earn up to {totalXp.toLocaleString()} XP</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#FFC107", fontFamily: "'Space Grotesk', sans-serif" }}>{completedMc}/{masterclass.length}</div>
              <div style={{ fontSize: 10, color: "#8892A4" }}>missions done</div>
            </div>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ width: `${masterclass.length > 0 ? (completedMc / masterclass.length) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, #FFC107, #FF7043)", transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {masterclass.map((m) => <Row key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {daily.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionHeader}>☀️ Daily</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {daily.map((m) => <Row key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {weekly.length > 0 && (
        <section>
          <h2 style={sectionHeader}>📅 Weekly</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {weekly.map((m) => <Row key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {missions.length === 0 && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 32, textAlign: "center", color: "#8892A4" }}>
          No missions available. Admin can seed missions from /super-admin.
        </div>
      )}
    </div>
  );
}

function Row({ m }: { m: Mission }) {
  const [pending, start] = useTransition();
  const [claimed, setClaimed] = useState(m.claimed);
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  const onClaim = () => start(async () => {
    const res = await claimMissionAction(m.id);
    if (res.ok) {
      setClaimed(true);
      celebrateAward({ awarded: res.data?.xp || 0, reason: "ok" });
      if (res.data?.coins) toast.success(`+${res.data.coins} 🪙`);
      fireConfetti(60);
    } else toast.error(res.error);
  });
  return (
    <div style={{ background: "#111827", border: `1px solid ${m.complete ? "rgba(102,187,106,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{m.title}</div>
          <div style={{ fontSize: 12, color: "#8892A4" }}>{m.description}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#1E88E5", fontWeight: 700 }}>+{m.xp_reward} XP</div>
          {m.coin_reward > 0 && <div style={{ fontSize: 10, color: "#FFC107" }}>+{m.coin_reward} 🪙</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
        <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: m.complete ? "#66BB6A" : "linear-gradient(90deg, #1E88E5, #AB47BC)", transition: "width 0.4s" }} />
        </div>
        <span style={{ fontSize: 11, color: "#8892A4", minWidth: 40, textAlign: "right" }}>{m.progress}/{m.target}</span>
        {m.complete && !claimed && (
          <button onClick={onClaim} disabled={pending} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#66BB6A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: pending ? "wait" : "pointer" }}>
            {pending ? "..." : "Claim"}
          </button>
        )}
        {claimed && <span style={{ fontSize: 12, color: "#66BB6A", fontWeight: 700 }}>✓ Claimed</span>}
      </div>
    </div>
  );
}

const sectionHeader: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, margin: "0 0 10px 0" };

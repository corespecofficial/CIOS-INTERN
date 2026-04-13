/* eslint-disable @next/next/no-img-element */
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const admin = supabaseAdmin();
  let active: Array<{ id: string; title: string; description: string; starts_at: string; ends_at: string; prize_xp: number; prize_coins: number }> = [];
  try {
    const { data } = await admin.from("challenges").select("id, title, description, starts_at, ends_at, prize_xp, prize_coins").eq("active", true).order("ends_at", { ascending: true });
    active = data || [];
  } catch {/* table may not exist yet */}

  // Load top-5 standings for each active challenge
  const standingsById: Record<string, Array<{ user_id: string; score: number; rank: number; users: { id: string; name: string; avatar_url: string | null; level: number } }>> = {};
  for (const c of active) {
    try {
      const { data } = await admin.from("challenge_entries")
        .select("user_id, score, rank, users(id, name, avatar_url, level)")
        .eq("challenge_id", c.id).order("score", { ascending: false }).limit(5);
      standingsById[c.id] = (data || []) as typeof standingsById[string];
    } catch { standingsById[c.id] = []; }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(239,83,80,0.15)", color: "#EF5350", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>CHALLENGES</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>⚔️ Compete · Earn · Win</h1>
      </div>

      {active.length === 0 && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 32, textAlign: "center", color: "#8892A4" }}>
          No active challenges right now. Admins can launch challenges from the super admin panel.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {active.map((c) => {
          const msLeft = new Date(c.ends_at).getTime() - Date.now();
          const hoursLeft = Math.max(0, Math.round(msLeft / 3600000));
          return (
            <div key={c.id} style={{ background: "linear-gradient(135deg, rgba(239,83,80,0.12), #111827)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{c.title}</h3>
                  <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 0 0" }}>{c.description}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#EF5350", fontWeight: 700 }}>⏱ {hoursLeft}h left</div>
                  <div style={{ fontSize: 12, color: "#FFC107", marginTop: 4 }}>🏆 {c.prize_xp} XP{c.prize_coins ? ` + ${c.prize_coins} 🪙` : ""}</div>
                </div>
              </div>
              {(standingsById[c.id] || []).length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>🏅 Top 5</div>
                  {(standingsById[c.id] || []).map((s, idx) => (
                    <Link key={s.user_id} href={`/community/profile/${s.user_id}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", textDecoration: "none", color: "#E8EDF5" }}>
                      <span style={{ width: 22, textAlign: "center", fontSize: 12, fontWeight: 800 }}>{idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1}</span>
                      {s.users?.avatar_url
                        ? <img src={s.users.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                        : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{s.users?.name?.slice(0, 1) || "?"}</div>}
                      <span style={{ flex: 1, fontSize: 12 }}>{s.users?.name || "Unknown"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#EF5350" }}>{s.score} XP</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

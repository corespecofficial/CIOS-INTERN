"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { formatXP, type Rank } from "@/lib/gamification-shared";
import { claimMissionAction } from "@/app/actions/gamification";
import { buyStreakSaver, getMyReferralCode } from "@/app/actions/engagement";
import { celebrateAward, fireConfetti } from "@/lib/celebrate";
import { useEffect } from "react";

interface UserSummary {
  id: string; name: string; avatarUrl: string | null; role: string;
  xp: number; level: number; streak: number; bestStreak: number; reputation: number; coins: number;
}
interface Progress {
  level: number; nextLevel: number; progressPct: number; xpInLevel: number; xpToNext: number;
}
interface BadgeItem { id: string; name: string; description: string; icon_url: string; category: string; earnedAt: string }
interface Mission { id: string; key: string; title: string; description: string; cadence: string; target: number; xp_reward: number; coin_reward: number; progress: number; claimed: boolean; complete: boolean }
interface Event { event_type: string; amount: number; created_at: string }
interface TopRow { id: string; name: string; avatarUrl: string | null; xp: number; level: number; rank: number }

export function GamificationHub({
  user, progress, rank, badges, events, missions, top10,
}: {
  user: UserSummary;
  progress: Progress;
  rank: Rank;
  badges: BadgeItem[];
  events: Event[];
  missions: Mission[];
  top10: TopRow[];
}) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${rank.color}22, #111827)`, border: `1px solid ${rank.color}33`, borderRadius: 16, padding: 24, marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <RingLevel level={progress.level} pct={progress.progressPct} color={rank.color} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: rank.color, marginBottom: 4 }}>{rank.emoji} {rank.title.toUpperCase()}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{user.name}</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: "4px 0 12px 0" }}>Level {progress.level} · {formatXP(user.xp)} XP · {progress.xpToNext > 0 ? `${formatXP(progress.xpToNext)} to Level ${progress.nextLevel}` : "Max tier"}</p>
          <XPBar pct={progress.progressPct} color={rank.color} />
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <Stat label="Streak"   value={`${user.streak}d`}      emoji="🔥" />
            <Stat label="Best"     value={`${user.bestStreak}d`}  emoji="🏅" />
            <Stat label="Badges"   value={badges.length}           emoji="🎖️" />
            <Stat label="Reputation" value={user.reputation}       emoji="⭐" />
            <Stat label="Coins"    value={user.coins}              emoji="🪙" />
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <NavTile href="/leaderboard"       emoji="🏆" label="Leaderboard" />
        <NavTile href="/badges"            emoji="🎖️" label="Badges" />
        <NavTile href="/achievements"      emoji="⭐" label="Achievements" />
        <NavTile href="/missions"          emoji="🎯" label="Missions" />
        <NavTile href="/streaks"           emoji="🔥" label="Streaks" />
        <NavTile href="/levels"            emoji="📈" label="Levels" />
        <NavTile href="/rewards-history"   emoji="📜" label="History" />
        <NavTile href="/challenges"        emoji="⚔️" label="Challenges" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Missions */}
        <section style={panel}>
          <div style={sectionHeader}>
            <span>🎯 Active missions</span>
            <Link href="/missions" style={linkMuted}>View all →</Link>
          </div>
          {missions.length === 0 && <Empty text="No missions available yet." />}
          {missions.slice(0, 6).map((m) => <MissionRow key={m.id} m={m} />)}
        </section>

        {/* Top 10 */}
        <section style={panel}>
          <div style={sectionHeader}>
            <span>🏆 Top 10 this season</span>
            <Link href="/leaderboard" style={linkMuted}>Full board →</Link>
          </div>
          {top10.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 800, color: r.rank === 1 ? "#FFD54F" : r.rank === 2 ? "#C0C0C0" : r.rank === 3 ? "#CD7F32" : "#8892A4" }}>
                {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
              </div>
              {r.avatarUrl
                ? <img src={r.avatarUrl} alt={r.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{r.name.slice(0, 1)}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>Lv {r.level}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1E88E5" }}>{formatXP(r.xp)}</div>
            </div>
          ))}
        </section>
      </div>

      {/* Recent badges + events */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <section style={panel}>
          <div style={sectionHeader}>
            <span>🎖️ Recent badges</span>
            <Link href="/badges" style={linkMuted}>View all →</Link>
          </div>
          {badges.length === 0 && <Empty text="Complete actions to earn your first badge." />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
            {badges.slice(0, 8).map((b) => <BadgeCard key={b.id} b={b} userName={user.name} />)}
          </div>
        </section>

        <section style={panel}>
          <div style={sectionHeader}><span>📈 Recent XP</span></div>
          {events.length === 0 && <Empty text="No XP activity yet — start completing tasks!" />}
          {events.slice(0, 8).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
              <span style={{ color: "#E8EDF5" }}>{e.event_type.replaceAll("_", " ")}</span>
              <span style={{ color: e.amount >= 0 ? "#66BB6A" : "#EF5350", fontWeight: 700 }}>{e.amount >= 0 ? "+" : ""}{e.amount} XP</span>
            </div>
          ))}
        </section>
      </div>

      <EngagementBlock currentXp={user.xp} currentStreak={user.streak} />
    </div>
  );
}

function EngagementBlock({ currentXp, currentStreak }: { currentXp: number; currentStreak: number }) {
  const [referral, setReferral] = useState<{ code: string; url: string; count: number } | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const r = await getMyReferralCode();
      if (r.ok && r.data) setReferral(r.data);
    })();
  }, []);

  const onSaveStreak = () => startTransition(async () => {
    if (!confirm("Spend 50 XP to preserve your streak?")) return;
    const r = await buyStreakSaver();
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`🛟 Streak saved at ${r.data!.newStreak} days!`);
    setTimeout(() => window.location.reload(), 800);
  });

  const copyLink = async () => {
    if (!referral) return;
    try { await navigator.clipboard.writeText(referral.url); toast.success("Referral link copied"); }
    catch { prompt("Copy this link:", referral.url); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
      {/* Streak Saver */}
      <section style={{ background: "linear-gradient(135deg, rgba(255,112,67,0.12), #111827)", border: "1px solid rgba(255,112,67,0.25)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#FF7043", marginBottom: 6 }}>🛟 STREAK SAVER</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>Lost a day? Save your streak.</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 14 }}>Spend <strong style={{ color: "#FFC107" }}>50 XP</strong> to preserve your <strong>{currentStreak}-day</strong> streak. You currently have {currentXp.toLocaleString()} XP.</div>
        <button onClick={onSaveStreak} disabled={busy || currentXp < 50} style={{ width: "100%", padding: "10px 16px", background: currentXp < 50 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #FF7043, #FF5722)", color: currentXp < 50 ? "#5A6478" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: currentXp < 50 ? "not-allowed" : "pointer" }}>
          {busy ? "Saving…" : currentXp < 50 ? "Need 50 XP" : "Spend 50 XP — save streak"}
        </button>
      </section>

      {/* Referral */}
      <section style={{ background: "linear-gradient(135deg, rgba(102,187,106,0.12), #111827)", border: "1px solid rgba(102,187,106,0.25)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#66BB6A", marginBottom: 6 }}>🎁 INVITE FRIENDS</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>Earn 200 XP per signup</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 14 }}>You've referred <strong style={{ color: "#66BB6A" }}>{referral?.count ?? 0}</strong> {referral?.count === 1 ? "friend" : "friends"}.</div>
        {referral ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input readOnly value={referral.url} style={{ flex: 1, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", color: "#B0BEC5", fontSize: 11, outline: "none" }} />
              <button onClick={copyLink} style={{ padding: "8px 14px", background: "linear-gradient(135deg, #66BB6A, #43A047)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Copy</button>
            </div>
            <div style={{ fontSize: 10, color: "#5A6478" }}>Code: <strong style={{ color: "#E8EDF5" }}>{referral.code}</strong></div>
          </>
        ) : <div style={{ fontSize: 12, color: "#8892A4" }}>Loading referral link…</div>}
      </section>
    </div>
  );
}

function RingLevel({ level, pct, color }: { level: number; pct: number; color: string }) {
  const R = 44, C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
        <circle cx="55" cy="55" r={R} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 1 }}>LEVEL</div>
        <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif" }}>{level}</div>
      </div>
    </div>
  );
}

function XPBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}AA)`, transition: "width 0.8s ease" }} />
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{value}</div>
      </div>
    </div>
  );
}

function NavTile({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link href={href} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px", textDecoration: "none", color: "#E8EDF5", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span> {label}
    </Link>
  );
}

function MissionRow({ m }: { m: Mission }) {
  const [pending, start] = useTransition();
  const [claimed, setClaimed] = useState(m.claimed);
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  const onClaim = () => start(async () => {
    const res = await claimMissionAction(m.id);
    if (res.ok) {
      setClaimed(true);
      toast.success(`+${res.data?.xp || 0} XP${res.data?.coins ? ` · +${res.data.coins} coins` : ""}`);
    } else toast.error(res.error);
  });
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{m.title} <span style={{ fontSize: 10, color: "#8892A4", fontWeight: 500 }}>· {m.cadence}</span></div>
          <div style={{ fontSize: 11, color: "#8892A4" }}>{m.description}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#1E88E5", fontWeight: 700 }}>+{m.xp_reward} XP</div>
          {m.coin_reward > 0 && <div style={{ fontSize: 10, color: "#FFC107" }}>+{m.coin_reward} 🪙</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: m.complete ? "#66BB6A" : "#1E88E5", transition: "width 0.4s" }} />
        </div>
        <span style={{ fontSize: 11, color: "#8892A4", minWidth: 32, textAlign: "right" }}>{m.progress}/{m.target}</span>
        {m.complete && !claimed && (
          <button onClick={onClaim} disabled={pending} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#1E88E5", color: "#fff", fontSize: 11, fontWeight: 700, cursor: pending ? "wait" : "pointer" }}>
            {pending ? "..." : "Claim"}
          </button>
        )}
        {claimed && <span style={{ fontSize: 11, color: "#66BB6A", fontWeight: 700 }}>✓</span>}
      </div>
    </div>
  );
}

function BadgeCard({ b, userName }: { b: BadgeItem; userName?: string }) {
  const onShare = async () => {
    const payload = { name: userName || "CIOS Intern", body: b.name, emoji: b.icon_url || "🏆", xp: 0 };
    const code = btoa(JSON.stringify(payload)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const url = `${window.location.origin}/achievement/${code}`;
    try {
      if (navigator.share) await navigator.share({ title: `${b.name} — CIOS achievement`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    } catch { /* cancel */ }
  };
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, textAlign: "center", position: "relative" }}>
      <button onClick={onShare} title="Share" style={{ position: "absolute", top: 6, right: 6, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, color: "#8892A4", fontSize: 12, cursor: "pointer", padding: "2px 6px" }}>🔗</button>
      <div style={{ fontSize: 26, marginBottom: 4 }}>{b.icon_url || "🏆"}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{b.name}</div>
      <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2, textTransform: "capitalize" }}>{b.category}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ color: "#8892A4", fontSize: 12, padding: "10px 0" }}>{text}</div>;
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 };
const linkMuted: React.CSSProperties = { fontSize: 11, color: "#1E88E5", textDecoration: "none", textTransform: "none", letterSpacing: 0 };

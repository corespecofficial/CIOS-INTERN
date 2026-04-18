"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { formatXP, type Rank } from "@/lib/gamification-shared";
import { claimMissionAction } from "@/app/actions/gamification";
import { buyStreakSaver, getMyReferralCode } from "@/app/actions/engagement";
import { fireConfetti } from "@/lib/celebrate";
import { useEffect } from "react";
import { SpinWheel } from "@/components/ui/spin-wheel";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  const isMobile = useIsMobile();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(135deg, ${rank.color}22, #111827)`,
        border: `1px solid ${rank.color}33`,
        borderRadius: 16,
        padding: isMobile ? "16px 14px" : 24,
        marginBottom: isMobile ? 14 : 20,
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 14 : 20,
      }}>
        <RingLevel level={progress.level} pct={progress.progressPct} color={rank.color} size={isMobile ? 80 : 110} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: rank.color, marginBottom: 2 }}>
            {rank.emoji} {rank.title.toUpperCase()}
          </div>
          <h1 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: "#E8EDF5", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name}
          </h1>
          <p style={{ color: "#8892A4", fontSize: isMobile ? 11 : 13, margin: "3px 0 10px 0" }}>
            Level {progress.level} · {formatXP(user.xp)} XP
            {progress.xpToNext > 0 && !isMobile && ` · ${formatXP(progress.xpToNext)} to Lv ${progress.nextLevel}`}
          </p>
          <XPBar pct={progress.progressPct} color={rank.color} />
          {/* Stats — horizontal scroll on mobile */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            <Stat label="Streak"     value={`${user.streak}d`}     emoji="🔥" compact={isMobile} />
            <Stat label="Best"       value={`${user.bestStreak}d`} emoji="🏅" compact={isMobile} />
            <Stat label="Badges"     value={badges.length}          emoji="🎖️" compact={isMobile} />
            <Stat label="Rep"        value={user.reputation}        emoji="⭐" compact={isMobile} />
            <Stat label="Coins"      value={user.coins}             emoji="🪙" compact={isMobile} />
          </div>
        </div>
      </div>

      {/* ── Quick Nav ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(8, 1fr)",
        gap: isMobile ? 8 : 8,
        marginBottom: isMobile ? 14 : 20,
      }}>
        {[
          { href: "/leaderboard",    emoji: "🏆", label: "Board" },
          { href: "/badges",         emoji: "🎖️", label: "Badges" },
          { href: "/achievements",   emoji: "⭐", label: "Achieve" },
          { href: "/missions",       emoji: "🎯", label: "Missions" },
          { href: "/streaks",        emoji: "🔥", label: "Streaks" },
          { href: "/levels",         emoji: "📈", label: "Levels" },
          { href: "/rewards-history",emoji: "📜", label: "History" },
          { href: "/challenges",     emoji: "⚔️", label: "Challenges" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: isMobile ? "10px 4px" : "10px 12px",
            textDecoration: "none",
            color: "#E8EDF5",
            fontSize: isMobile ? 11 : 13,
            fontWeight: 600,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: isMobile ? 4 : 8,
            textAlign: "center",
          }}>
            <span style={{ fontSize: isMobile ? 18 : 16 }}>{item.emoji}</span>
            <span style={{ lineHeight: 1.2 }}>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Daily Spin Wheel ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.06))",
        border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: 16,
        padding: isMobile ? "16px 14px" : 24,
        marginBottom: isMobile ? 14 : 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🎰</span>
          <div>
            <h2 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Daily Spin Wheel</h2>
            <p style={{ fontSize: 11, color: "#8892A4", margin: 0 }}>Spin once a day — win XP, wallet credits, or a bonus spin!</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SpinWheel size={isMobile ? 240 : 280} />
        </div>
      </div>

      {/* ── Missions + Top 10 ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 14, alignItems: "start" }}>
        <section style={panel(isMobile)}>
          <div style={sectionHeader}>
            <span>🎯 Active missions</span>
            <Link href="/missions" style={linkMuted}>View all →</Link>
          </div>
          {missions.length === 0 && <Empty text="No missions available yet." />}
          {missions.slice(0, isMobile ? 4 : 6).map((m) => <MissionRow key={m.id} m={m} isMobile={isMobile} />)}
        </section>

        <section style={panel(isMobile)}>
          <div style={sectionHeader}>
            <span>🏆 Top 10 this season</span>
            <Link href="/leaderboard" style={linkMuted}>Full board →</Link>
          </div>
          {top10.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 800, color: r.rank === 1 ? "#FFD54F" : r.rank === 2 ? "#C0C0C0" : r.rank === 3 ? "#CD7F32" : "#8892A4", flexShrink: 0 }}>
                {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
              </div>
              {r.avatarUrl
                ? <img src={r.avatarUrl} alt={r.name} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{r.name.slice(0, 1)}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 10, color: "#8892A4" }}>Lv {r.level}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", flexShrink: 0 }}>{formatXP(r.xp)}</div>
            </div>
          ))}
        </section>
      </div>

      {/* ── Badges + Recent XP ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 14 }}>
        <section style={panel(isMobile)}>
          <div style={sectionHeader}>
            <span>🎖️ Recent badges</span>
            <Link href="/badges" style={linkMuted}>View all →</Link>
          </div>
          {badges.length === 0 && <Empty text="Complete actions to earn your first badge." />}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 90 : 110}px, 1fr))`, gap: 8 }}>
            {badges.slice(0, isMobile ? 6 : 8).map((b) => <BadgeCard key={b.id} b={b} userName={user.name} />)}
          </div>
        </section>

        <section style={panel(isMobile)}>
          <div style={sectionHeader}><span>📈 Recent XP</span></div>
          {events.length === 0 && <Empty text="No XP activity yet — start completing tasks!" />}
          {events.slice(0, 8).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: isMobile ? 11 : 12 }}>
              <span style={{ color: "#E8EDF5", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{e.event_type.replaceAll("_", " ")}</span>
              <span style={{ color: e.amount >= 0 ? "#66BB6A" : "#EF5350", fontWeight: 700, flexShrink: 0 }}>{e.amount >= 0 ? "+" : ""}{e.amount} XP</span>
            </div>
          ))}
        </section>
      </div>

      <EngagementBlock currentXp={user.xp} currentStreak={user.streak} isMobile={isMobile} />
    </div>
  );
}

function EngagementBlock({ currentXp, currentStreak, isMobile }: { currentXp: number; currentStreak: number; isMobile: boolean }) {
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
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 14 }}>
      {/* Streak Saver */}
      <section style={{ background: "linear-gradient(135deg, rgba(255,112,67,0.12), #111827)", border: "1px solid rgba(255,112,67,0.25)", borderRadius: 14, padding: isMobile ? "14px" : 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#FF7043", marginBottom: 6 }}>🛟 STREAK SAVER</div>
        <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>Lost a day? Save your streak.</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 12 }}>
          Spend <strong style={{ color: "#FFC107" }}>50 XP</strong> to keep your <strong>{currentStreak}-day</strong> streak. You have {currentXp.toLocaleString()} XP.
        </div>
        <button onClick={onSaveStreak} disabled={busy || currentXp < 50} style={{ width: "100%", padding: "10px 16px", background: currentXp < 50 ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #FF7043, #FF5722)", color: currentXp < 50 ? "#5A6478" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: currentXp < 50 ? "not-allowed" : "pointer" }}>
          {busy ? "Saving…" : currentXp < 50 ? "Need 50 XP" : "Spend 50 XP — save streak"}
        </button>
      </section>

      {/* Referral */}
      <section style={{ background: "linear-gradient(135deg, rgba(102,187,106,0.12), #111827)", border: "1px solid rgba(102,187,106,0.25)", borderRadius: 14, padding: isMobile ? "14px" : 18 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#66BB6A", marginBottom: 6 }}>🎁 INVITE FRIENDS</div>
        <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>Earn 200 XP per signup</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 12 }}>
          You&apos;ve referred <strong style={{ color: "#66BB6A" }}>{referral?.count ?? 0}</strong> {referral?.count === 1 ? "friend" : "friends"}.
        </div>
        {referral ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input readOnly value={referral.url} style={{ flex: 1, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", color: "#B0BEC5", fontSize: 11, outline: "none", minWidth: 0 }} />
              <button onClick={copyLink} style={{ padding: "8px 12px", background: "linear-gradient(135deg, #66BB6A, #43A047)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Copy</button>
            </div>
            <div style={{ fontSize: 10, color: "#5A6478" }}>Code: <strong style={{ color: "#E8EDF5" }}>{referral.code}</strong></div>
          </>
        ) : <div style={{ fontSize: 12, color: "#8892A4" }}>Loading referral link…</div>}
      </section>
    </div>
  );
}

function RingLevel({ level, pct, color, size = 110 }: { level: number; pct: number; color: string; size?: number }) {
  const R = (size / 2) * 0.8;
  const C = 2 * Math.PI * R;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="none" />
        <circle cx={cx} cy={cy} r={R} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C}
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 9, color: "#8892A4", letterSpacing: 1 }}>LEVEL</div>
        <div style={{ fontSize: size < 100 ? 20 : 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif" }}>{level}</div>
      </div>
    </div>
  );
}

function XPBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}AA)`, transition: "width 0.8s ease" }} />
    </div>
  );
}

function Stat({ label, value, emoji, compact }: { label: string; value: string | number; emoji: string; compact?: boolean }) {
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: compact ? "5px 10px" : "6px 12px", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <span style={{ fontSize: compact ? 13 : 14 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 9, color: "#8892A4", letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: "#E8EDF5" }}>{value}</div>
      </div>
    </div>
  );
}

function MissionRow({ m, isMobile }: { m: Mission; isMobile: boolean }) {
  const [pending, start] = useTransition();
  const [claimed, setClaimed] = useState(m.claimed);
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  const onClaim = () => start(async () => {
    const res = await claimMissionAction(m.id);
    if (res.ok) {
      setClaimed(true);
      toast.success(`+${res.data?.xp || 0} XP${res.data?.coins ? ` · +${res.data.coins} coins` : ""}`);
      fireConfetti?.();
    } else toast.error(res.error);
  });
  return (
    <div style={{ padding: isMobile ? "8px 0" : "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 12 : 13, color: "#E8EDF5", fontWeight: 600 }}>
            {m.title} <span style={{ fontSize: 10, color: "#8892A4", fontWeight: 500 }}>· {m.cadence}</span>
          </div>
          {!isMobile && <div style={{ fontSize: 11, color: "#8892A4" }}>{m.description}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#1E88E5", fontWeight: 700 }}>+{m.xp_reward} XP</div>
          {m.coin_reward > 0 && <div style={{ fontSize: 10, color: "#FFC107" }}>+{m.coin_reward} 🪙</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: m.complete ? "#66BB6A" : "#1E88E5", transition: "width 0.4s" }} />
        </div>
        <span style={{ fontSize: 10, color: "#8892A4", minWidth: 30, textAlign: "right", flexShrink: 0 }}>{m.progress}/{m.target}</span>
        {m.complete && !claimed && (
          <button onClick={onClaim} disabled={pending} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#1E88E5", color: "#fff", fontSize: 11, fontWeight: 700, cursor: pending ? "wait" : "pointer", flexShrink: 0 }}>
            {pending ? "…" : "Claim"}
          </button>
        )}
        {claimed && <span style={{ fontSize: 11, color: "#66BB6A", fontWeight: 700, flexShrink: 0 }}>✓</span>}
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
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 8px", textAlign: "center", position: "relative" }}>
      <button onClick={onShare} title="Share" style={{ position: "absolute", top: 4, right: 4, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, color: "#8892A4", fontSize: 11, cursor: "pointer", padding: "2px 5px" }}>🔗</button>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{b.icon_url || "🏆"}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#E8EDF5" }}>{b.name}</div>
      <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2, textTransform: "capitalize" }}>{b.category}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ color: "#8892A4", fontSize: 12, padding: "10px 0" }}>{text}</div>;
}

const panel = (isMobile: boolean): React.CSSProperties => ({
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: isMobile ? "14px 12px" : 16,
});
const sectionHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 };
const linkMuted: React.CSSProperties = { fontSize: 11, color: "#1E88E5", textDecoration: "none", textTransform: "none", letterSpacing: 0 };

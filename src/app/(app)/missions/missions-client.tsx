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

const MC_ICONS: Record<string, string> = {
  social_media_pioneer:    "📱",
  digital_products_builder:"💰",
  meta_business_setup:     "📊",
  content_calendar_built:  "📅",
  first_posts_live:        "🚀",
  masterclass_complete:    "🎓",
};

export function MissionsClient({ missions }: { missions: Mission[] }) {
  const masterclass = missions.filter((m) => MASTERCLASS_KEYS.includes(m.key));
  const daily       = missions.filter((m) => m.cadence === "daily"  && !MASTERCLASS_KEYS.includes(m.key));
  const weekly      = missions.filter((m) => m.cadence === "weekly" && !MASTERCLASS_KEYS.includes(m.key));

  const totalXp    = masterclass.reduce((s, m) => s + m.xp_reward, 0);
  const completedMc = masterclass.filter((m) => m.complete).length;
  const mcPct       = masterclass.length > 0 ? Math.round((completedMc / masterclass.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* ── Missions page ── */
        .ms-h1 { font-size: 26px; font-weight: 800; color: #E8EDF5; margin: 0; font-family: 'Space Grotesk', sans-serif; }
        .ms-sub { font-size: 13px; color: #5A6478; margin: 4px 0 0; }

        /* Masterclass banner */
        .ms-mc-banner {
          background: linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,112,67,0.07));
          border: 1px solid rgba(255,193,7,0.25);
          border-radius: 18px; padding: 20px; margin-bottom: 20px; position: relative; overflow: hidden;
        }
        .ms-mc-banner::before {
          content: ''; position: absolute; top: -20px; right: -20px;
          width: 120px; height: 120px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,193,7,0.12), transparent 70%);
          pointer-events: none;
        }
        .ms-mc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
        .ms-mc-badge { font-size: 10px; font-weight: 700; color: #FFC107; letter-spacing: 0.8px; text-transform: uppercase; background: rgba(255,193,7,0.12); border: 1px solid rgba(255,193,7,0.2); padding: 3px 10px; border-radius: 20px; display: inline-block; margin-bottom: 6px; }
        .ms-mc-title { font-size: 17px; font-weight: 800; color: #E8EDF5; line-height: 1.3; font-family: 'Space Grotesk', sans-serif; }
        .ms-mc-desc { font-size: 12px; color: #8892A4; margin-top: 3px; }
        .ms-mc-score { text-align: right; flex-shrink: 0; }
        .ms-mc-score-num { font-size: 28px; font-weight: 800; color: #FFC107; font-family: 'Space Grotesk', sans-serif; line-height: 1; }
        .ms-mc-score-label { font-size: 10px; color: #8892A4; margin-top: 2px; }

        .ms-mc-progress-wrap { margin-bottom: 16px; }
        .ms-mc-progress-bar { height: 8px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
        .ms-mc-progress-fill { height: 100%; background: linear-gradient(90deg, #FFC107, #FF7043); border-radius: 99px; transition: width 0.5s ease; }
        .ms-mc-progress-labels { display: flex; justify-content: space-between; font-size: 11px; color: #5A6478; margin-top: 5px; }

        /* Masterclass step cards */
        .ms-mc-steps { display: grid; gap: 8px; }
        .ms-mc-step { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 14px; display: flex; gap: 12px; align-items: center; transition: border-color 0.2s; }
        .ms-mc-step-done { background: rgba(102,187,106,0.05); border-color: rgba(102,187,106,0.2) !important; }
        .ms-mc-step-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; background: rgba(255,255,255,0.06); }
        .ms-mc-step-icon-done { background: rgba(102,187,106,0.15) !important; }
        .ms-mc-step-body { flex: 1; min-width: 0; }
        .ms-mc-step-title { font-size: 13px; font-weight: 700; color: #E8EDF5; }
        .ms-mc-step-desc { font-size: 11px; color: #5A6478; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ms-mc-step-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .ms-mc-step-xp { font-size: 11px; font-weight: 700; color: #1E88E5; }
        .ms-mc-step-check { width: 22px; height: 22px; border-radius: 50%; background: #66BB6A; display: flex; align-items: center; justify-content: center; }

        /* Regular mission row */
        .ms-section-head { font-size: 11px; font-weight: 700; color: #5A6478; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 10px; display: flex; align-items: center; gap: 8px; }
        .ms-section-head::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

        .ms-row { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 16px; margin-bottom: 8px; transition: border-color 0.2s; }
        .ms-row-done { border-color: rgba(102,187,106,0.25) !important; background: rgba(102,187,106,0.03) !important; }
        .ms-row-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .ms-row-title { font-size: 14px; font-weight: 700; color: #E8EDF5; line-height: 1.4; }
        .ms-row-desc { font-size: 12px; color: #5A6478; margin-top: 3px; line-height: 1.4; }
        .ms-row-rewards { text-align: right; flex-shrink: 0; }
        .ms-row-xp { font-size: 13px; font-weight: 700; color: #1E88E5; }
        .ms-row-coins { font-size: 11px; color: #FFC107; margin-top: 2px; }

        .ms-row-bottom { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .ms-progress-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
        .ms-progress-fill-active { height: 100%; background: linear-gradient(90deg, #1E88E5, #AB47BC); border-radius: 99px; transition: width 0.4s; }
        .ms-progress-fill-done { height: 100%; background: #66BB6A; border-radius: 99px; }
        .ms-row-count { font-size: 11px; color: #5A6478; min-width: 36px; text-align: right; }

        .ms-claim-btn { padding: 7px 16px; border-radius: 8px; border: none; background: linear-gradient(135deg, #66BB6A, #43A047); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; white-space: nowrap; }
        .ms-claimed { font-size: 12px; color: #66BB6A; font-weight: 700; }

        @media (max-width: 640px) {
          .ms-h1 { font-size: 22px !important; }
          .ms-mc-banner { padding: 16px; }
          .ms-mc-title { font-size: 15px; }
          .ms-mc-score-num { font-size: 24px; }
          .ms-mc-step { padding: 10px 12px; }
          .ms-mc-step-desc { display: none; }
          .ms-row { padding: 12px 14px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="ms-h1">Missions</h1>
        <p className="ms-sub">Complete challenges · Earn XP &amp; coins</p>
      </div>

      {/* ── Masterclass Block ── */}
      {masterclass.length > 0 && (
        <div className="ms-mc-banner">
          <div className="ms-mc-top">
            <div>
              <span className="ms-mc-badge">Active Assignment</span>
              <div className="ms-mc-title">📱 Social Media &amp; Digital Products Masterclass</div>
              <div className="ms-mc-desc">Complete all steps to earn up to {totalXp.toLocaleString()} XP</div>
            </div>
            <div className="ms-mc-score">
              <div className="ms-mc-score-num">{completedMc}/{masterclass.length}</div>
              <div className="ms-mc-score-label">completed</div>
            </div>
          </div>

          <div className="ms-mc-progress-wrap">
            <div className="ms-mc-progress-bar">
              <div className="ms-mc-progress-fill" style={{ width: `${mcPct}%` }} />
            </div>
            <div className="ms-mc-progress-labels">
              <span>{mcPct}% complete</span>
              <span>{masterclass.length - completedMc} remaining</span>
            </div>
          </div>

          <div className="ms-mc-steps">
            {masterclass.map((m, idx) => (
              <StepRow key={m.id} m={m} idx={idx} icon={MC_ICONS[m.key] || "⭐"} />
            ))}
          </div>
        </div>
      )}

      {/* ── Daily ── */}
      {daily.length > 0 && (
        <section>
          <div className="ms-section-head">☀️ Daily Missions</div>
          {daily.map((m) => <Row key={m.id} m={m} />)}
        </section>
      )}

      {/* ── Weekly ── */}
      {weekly.length > 0 && (
        <section>
          <div className="ms-section-head">📅 Weekly Missions</div>
          {weekly.map((m) => <Row key={m.id} m={m} />)}
        </section>
      )}

      {missions.length === 0 && (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: 40, textAlign: "center", color: "#5A6478" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>No missions yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Admin can seed missions from the super-admin panel.</div>
        </div>
      )}
    </div>
  );
}

/* ── Masterclass step row (compact) ── */
function StepRow({ m, idx, icon }: { m: Mission; idx: number; icon: string }) {
  const [pending, start] = useTransition();
  const [claimed, setClaimed] = useState(m.claimed);

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
    <div className={`ms-mc-step${m.complete ? " ms-mc-step-done" : ""}`}>
      <div className={`ms-mc-step-icon${m.complete ? " ms-mc-step-icon-done" : ""}`}>
        {m.complete ? "✅" : icon}
      </div>
      <div className="ms-mc-step-body">
        <div className="ms-mc-step-title" style={{ color: m.complete ? "#66BB6A" : "#E8EDF5" }}>
          Step {idx + 1}: {m.title.replace(/^[^\s]+ /, "")}
        </div>
        <div className="ms-mc-step-desc">{m.description}</div>
      </div>
      <div className="ms-mc-step-right">
        <span className="ms-mc-step-xp">+{m.xp_reward} XP</span>
        {m.complete && !claimed && (
          <button onClick={onClaim} disabled={pending} className="ms-claim-btn" style={{ padding: "5px 12px", fontSize: 11 }}>
            {pending ? "..." : "Claim"}
          </button>
        )}
        {claimed && <span style={{ fontSize: 11, color: "#66BB6A", fontWeight: 700 }}>Claimed ✓</span>}
      </div>
    </div>
  );
}

/* ── Regular mission row ── */
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
    <div className={`ms-row${m.complete ? " ms-row-done" : ""}`}>
      <div className="ms-row-top">
        <div style={{ flex: 1 }}>
          <div className="ms-row-title">{m.title}</div>
          <div className="ms-row-desc">{m.description}</div>
        </div>
        <div className="ms-row-rewards">
          <div className="ms-row-xp">+{m.xp_reward} XP</div>
          {m.coin_reward > 0 && <div className="ms-row-coins">+{m.coin_reward} 🪙</div>}
        </div>
      </div>
      <div className="ms-row-bottom">
        <div className="ms-progress-bar">
          <div className={m.complete ? "ms-progress-fill-done" : "ms-progress-fill-active"} style={{ width: `${pct}%` }} />
        </div>
        <span className="ms-row-count">{m.progress}/{m.target}</span>
        {m.complete && !claimed && (
          <button onClick={onClaim} disabled={pending} className="ms-claim-btn">
            {pending ? "..." : "Claim 🎁"}
          </button>
        )}
        {claimed && <span className="ms-claimed">✓ Claimed</span>}
      </div>
    </div>
  );
}

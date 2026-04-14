"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateEngagementFeatures } from "@/app/actions/engagement-v2";
import type { EngagementFeatures } from "@/lib/engagement-shared";

const FEATURES: Array<{ key: keyof EngagementFeatures; label: string; hint: string; emoji: string }> = [
  { key: "dailyQuests",  label: "Daily quests",      hint: "3 picked quests per day with XP bonuses.",                 emoji: "🎯" },
  { key: "streakFreeze", label: "Streak freezes",    hint: "Interns can spend XP to protect a missed-day streak.",    emoji: "🧊" },
  { key: "reactions",    label: "Lesson reactions",  hint: "🔥 💡 👏 emoji reactions on course lessons.",              emoji: "💖" },
  { key: "leaderboards", label: "Course leaderboards", hint: "Weekly top-5 XP per course, visible on course pages.", emoji: "🏆" },
  { key: "badges",       label: "Mini-badges",       hint: "Collectable milestone badges shown on profile.",          emoji: "🎖" },
  { key: "xpBurst",      label: "XP burst animation", hint: "Confetti + flying +XP on any XP earn.",                  emoji: "✨" },
  { key: "peerReview",   label: "Peer review",       hint: "2 random peers auto-review every assignment submission.", emoji: "📝" },
  { key: "teams",        label: "Team challenges",   hint: "Squads compete weekly on combined XP.",                   emoji: "🏳" },
  { key: "shareCert",    label: "Shareable certificates", hint: "Public OG image + /c/[slug] share link for every certificate.", emoji: "🔗" },
  { key: "liveSessions", label: "Live classes",      hint: "Embed YouTube Live / Twitch / TikTok Live / Google Meet / Classroom / Zoom.", emoji: "📡" },
  { key: "bossQuiz",     label: "Boss quizzes",      hint: "Timed, cooldown-gated quizzes with a weekly leaderboard.", emoji: "👹" },
  { key: "studyBuddy",   label: "AI study buddy",    hint: "Per-course AI chat that knows the lessons and gives hints.", emoji: "🤖" },
  { key: "cohortPresence", label: "Cohort presence", hint: "Shows who else is studying the same course right now.",    emoji: "🟢" },
];

const NUMBERS: Array<{ key: keyof EngagementFeatures; label: string; hint: string; min: number; max: number }> = [
  { key: "questXpBonus",        label: "Quest XP bonus",      hint: "XP awarded when an intern claims a completed quest.", min: 0,   max: 500 },
  { key: "freezeCostXp",        label: "Streak freeze cost",  hint: "XP deducted to buy one streak freeze.",                min: 0,   max: 2000 },
  { key: "leaderboardResetDay", label: "Leaderboard reset day", hint: "1=Mon … 7=Sun (ISO day). Weekly reset time is 00:00 UTC.", min: 1, max: 7 },
  { key: "teamSize",            label: "Team size (max members)", hint: "Upper bound on members per team.", min: 2, max: 12 },
  { key: "reviewXpReward",      label: "Peer review XP reward",   hint: "XP awarded to a reviewer when they submit thoughtful feedback.", min: 0, max: 300 },
  { key: "bossQuizCooldownMin", label: "Boss-quiz cooldown (min)", hint: "Minutes an intern must wait before retrying a boss quiz.", min: 0, max: 1440 },
];

export function EngagementSettingsClient({ initial }: { initial: EngagementFeatures }) {
  const [features, setFeatures] = useState<EngagementFeatures>(initial);
  const [pending, start] = useTransition();

  const save = (patch: Partial<EngagementFeatures>) => start(async () => {
    const optimistic = { ...features, ...patch };
    setFeatures(optimistic);
    const r = await updateEngagementFeatures(patch);
    if (!r.ok) { toast.error(r.error); setFeatures(initial); return; }
    toast.success("Saved");
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={card}>
        <h3 style={h3}>Feature toggles</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FEATURES.map((f) => (
            <label key={f.key} style={row}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <span style={{ fontSize: 20 }}>{f.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{f.hint}</div>
                </div>
              </div>
              <Toggle
                on={Boolean(features[f.key])}
                disabled={pending}
                onChange={(v) => save({ [f.key]: v } as Partial<EngagementFeatures>)}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>Tunables</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {NUMBERS.map((n) => (
            <div key={n.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5", display: "block", marginBottom: 4 }}>
                {n.label}
              </label>
              <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 6 }}>{n.hint}</div>
              <input
                type="number"
                min={n.min}
                max={n.max}
                defaultValue={Number(features[n.key] ?? 0)}
                onBlur={(e) => {
                  const v = Math.max(n.min, Math.min(n.max, parseInt(e.target.value) || 0));
                  if (v !== features[n.key]) save({ [n.key]: v } as Partial<EngagementFeatures>);
                }}
                style={input}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, background: "rgba(30,136,229,0.06)", borderColor: "rgba(30,136,229,0.2)" }}>
        <div style={{ fontSize: 12, color: "#B0BEC5", lineHeight: 1.6 }}>
          💡 <strong style={{ color: "#E8EDF5" }}>How these work:</strong> toggling a feature off hides it from dashboards, courses, and profiles instantly. In-flight quests and purchased freezes remain in the database but are not shown or redeemable until you re-enable the feature.
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      style={{
        width: 48, height: 26, borderRadius: 13, border: "none",
        background: on ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "#334155",
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s", flexShrink: 0,
      }}
      aria-pressed={on}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 25 : 3,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff", transition: "left 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

const card: React.CSSProperties = {
  background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14, padding: 20,
};
const h3: React.CSSProperties = {
  fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px",
};
const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 16,
  padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
  cursor: "pointer",
};
const input: React.CSSProperties = {
  width: 160, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
};

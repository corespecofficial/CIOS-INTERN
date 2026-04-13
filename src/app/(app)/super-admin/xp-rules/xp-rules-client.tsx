"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { XPEventType } from "@/lib/gamification-shared";
import { saveXPRules, createChallenge, scoreChallengeAction, finalizeChallengeAction } from "@/app/actions/xp-admin";

interface Challenge { id: string; title: string; starts_at: string; ends_at: string; active: boolean; prize_xp: number; prize_coins: number }

export function XPRulesClient({
  defaults, overrides, challenges,
}: {
  defaults: Record<string, number>;
  overrides: Partial<Record<XPEventType, number>>;
  challenges: Challenge[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaults)) out[k] = String(overrides[k as XPEventType] ?? v);
    return out;
  });
  const [pending, start] = useTransition();

  const onSave = () => start(async () => {
    const payload: Partial<Record<XPEventType, number>> = {};
    for (const [k, v] of Object.entries(values)) {
      const n = parseInt(v);
      if (!isNaN(n) && n !== defaults[k]) payload[k as XPEventType] = n;
    }
    const res = await saveXPRules(payload);
    if (res.ok) toast.success("XP rules saved");
    else toast.error(res.error);
  });

  const onReset = () => start(async () => {
    const res = await saveXPRules({});
    if (res.ok) {
      toast.success("Reset to defaults");
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(defaults)) out[k] = String(v);
      setValues(out);
    } else toast.error(res.error);
  });

  const categories: Record<string, string[]> = {
    Learning: ["lesson_completed", "module_completed", "course_completed", "quiz_passed", "perfect_quiz"],
    Productivity: ["task_completed", "task_on_time"],
    Community: ["helpful_comment", "brilliant_comment", "valuable_post", "accepted_solution"],
    Attendance: ["class_attended", "class_on_time", "weekly_attendance"],
    Leadership: ["mentor_action", "team_win", "lead_generated", "login_streak"],
    Penalties: ["missed_class", "late_attendance", "overdue_task", "warning_issued", "spam_flagged"],
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>SUPER ADMIN</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>⚙️ Gamification rules</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Tune XP amounts per event. Overrides persist and kick in immediately.</p>
      </div>

      <section style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={sectionHeader}>⚡ XP event rates</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onReset} disabled={pending} style={btnGhost}>Reset defaults</button>
            <button onClick={onSave} disabled={pending} style={btnPrimary}>{pending ? "Saving..." : "💾 Save changes"}</button>
          </div>
        </div>

        {Object.entries(categories).map(([cat, keys]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
              {keys.map((k) => {
                const def = defaults[k];
                const curr = parseInt(values[k] || "0");
                const isOverride = !isNaN(curr) && curr !== def;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0A0E1A", padding: "8px 10px", borderRadius: 8, border: `1px solid ${isOverride ? "#AB47BC" : "rgba(255,255,255,0.06)"}` }}>
                    <label style={{ flex: 1, fontSize: 12, color: "#E8EDF5" }}>{k.replaceAll("_", " ")}</label>
                    <input
                      type="number"
                      value={values[k]}
                      onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                      style={{ width: 70, padding: "4px 8px", fontSize: 12, background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, textAlign: "right" }}
                    />
                    <span style={{ fontSize: 10, color: "#8892A4", minWidth: 30 }}>XP</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section style={{ ...panel, marginTop: 16 }}>
        <h2 style={sectionHeader}>⚔️ Challenges</h2>
        <CreateChallenge />
        <div style={{ marginTop: 16 }}>
          {challenges.length === 0 && <div style={{ color: "#8892A4", fontSize: 12 }}>No challenges yet.</div>}
          {challenges.map((c) => <ChallengeRow key={c.id} c={c} />)}
        </div>
      </section>
    </div>
  );
}

function CreateChallenge() {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState(7);
  const [prizeXP, setPrizeXP] = useState(500);
  const [prizeCoins, setPrizeCoins] = useState(100);
  const [selected, setSelected] = useState<XPEventType[]>(["task_completed", "module_completed"]);

  const toggle = (e: XPEventType) => setSelected((s) => s.includes(e) ? s.filter((x) => x !== e) : [...s, e]);

  const onCreate = () => start(async () => {
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + days * 86400000).toISOString();
    const res = await createChallenge({ title, description, startsAt, endsAt, eventTypes: selected, prizeXP, prizeCoins });
    if (res.ok) { toast.success("Challenge launched"); setTitle(""); setDescription(""); }
    else toast.error(res.error);
  });

  const ALL: XPEventType[] = ["task_completed", "module_completed", "course_completed", "quiz_passed", "perfect_quiz", "helpful_comment", "brilliant_comment", "valuable_post", "class_attended", "class_on_time"];

  return (
    <div style={{ background: "#0A0E1A", padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Launch new challenge</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={input} />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={input} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <LabeledInput label="Duration (days)" value={days} onChange={setDays} />
        <LabeledInput label="Prize XP" value={prizeXP} onChange={setPrizeXP} />
        <LabeledInput label="Prize coins" value={prizeCoins} onChange={setPrizeCoins} />
      </div>
      <div style={{ fontSize: 10, color: "#8892A4", marginBottom: 6 }}>Event types counted toward score:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {ALL.map((e) => (
          <button key={e} onClick={() => toggle(e)} style={{
            padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700,
            background: selected.includes(e) ? "#AB47BC" : "transparent",
            color: selected.includes(e) ? "#fff" : "#8892A4",
            border: `1px solid ${selected.includes(e) ? "#AB47BC" : "rgba(255,255,255,0.1)"}`, cursor: "pointer",
          }}>{e.replaceAll("_", " ")}</button>
        ))}
      </div>
      <button onClick={onCreate} disabled={pending || !title.trim()} style={btnPrimary}>{pending ? "Launching..." : "🚀 Launch challenge"}</button>
    </div>
  );
}

function ChallengeRow({ c }: { c: Challenge }) {
  const [pending, start] = useTransition();
  const ends = new Date(c.ends_at);
  const ended = ends.getTime() < Date.now();
  const onScore = () => start(async () => { const r = await scoreChallengeAction(c.id); r.ok ? toast.success(`${r.data?.entries} entries scored`) : toast.error(r.error); });
  const onFinalize = () => start(async () => { const r = await finalizeChallengeAction(c.id); r.ok ? toast.success(`${r.data?.winners} winners rewarded`) : toast.error(r.error); });
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{c.title}</div>
        <div style={{ fontSize: 11, color: "#8892A4" }}>{new Date(c.starts_at).toLocaleDateString()} → {ends.toLocaleDateString()} · 🏆 {c.prize_xp} XP{c.prize_coins ? ` · ${c.prize_coins} 🪙` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, background: c.active ? "rgba(102,187,106,0.15)" : "rgba(136,146,164,0.15)", color: c.active ? "#66BB6A" : "#8892A4" }}>
          {c.active ? (ended ? "ENDED" : "LIVE") : "CLOSED"}
        </span>
        {c.active && <button onClick={onScore} disabled={pending} style={btnTiny}>Score</button>}
        {c.active && ended && <button onClick={onFinalize} disabled={pending} style={btnDanger}>Finalize</button>}
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5 }}>{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)} style={{ ...input, width: "100%" }} />
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 };
const sectionHeader: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", margin: 0 };
const input: React.CSSProperties = { padding: "7px 10px", fontSize: 12, background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6 };
const btnPrimary: React.CSSProperties = { padding: "7px 14px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "7px 14px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnTiny: React.CSSProperties = { padding: "3px 10px", fontSize: 10, fontWeight: 700, background: "#1E88E5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "3px 10px", fontSize: 10, fontWeight: 700, background: "#EF5350", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" };

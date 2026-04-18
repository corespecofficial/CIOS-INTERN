"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  saveEagleDraft, submitEagleProject,
  type EagleSubmission, type SectionA, type SectionB, type SectionBPillar,
  type SectionC, type SectionD, type DaySlots, type SectionE, type Goal,
  type SectionF, type SectionG, type SectionH,
} from "@/app/actions/eagle";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

// ── Helpers ────────────────────────────────────────────────────────────────────

function wordCount(s: string) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

function WC({ text, target }: { text: string; target: number }) {
  const n = wordCount(text);
  return (
    <span style={{ fontSize: 11, color: n >= target ? "#4CAF50" : "#9CA3AF" }}>
      {n}/{target} words
    </span>
  );
}

function TA({ label, value, onChange, target, rows = 5, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  target?: number; rows?: number; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600 }}>{label}</label>
        {target && <WC text={value} target={target} />}
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "10px 14px",
          resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "10px 14px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function PillarScore({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 8, display: "block" }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
              background: value === n
                ? "linear-gradient(135deg,#1E88E5,#FFC107)"
                : "rgba(255,255,255,0.06)",
              color: value === n ? "#0A0E1A" : "#9CA3AF",
              fontWeight: value === n ? 800 : 400, fontSize: 14,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section components ─────────────────────────────────────────────────────────

function SectionAForm({ data, onChange }: { data: SectionA; onChange: (d: SectionA) => void }) {
  const questions = [
    { key: "q1" as const, q: "Retell the eagle parable in your own words. Which sentence struck you most and why?" },
    { key: "q2" as const, q: "Identify ONE area of your life right now where you are \"eating grain\" instead of flying. Be specific and honest." },
    { key: "q3" as const, q: "Define SCAFFOLDING in your own words. Name 3 scaffolds currently in your life (people, environments, habits, structures)." },
    { key: "q4" as const, q: "Complete this sentence in at least 100 words: \"The fullest version of myself is a person who...\"" },
    { key: "q5" as const, q: "Describe a hidden \"diamond\" inside yourself. What raw potential do you sense that hasn't been polished yet? What's preventing the polish?" },
    { key: "q6" as const, q: "Name ONE latent ability that this internship could activate. What would success look like 6 months from now if it was activated?" },
    { key: "q7" as const, q: "The hardest question: If you died today, what gift would go unopened with you? What are you withholding from the world?" },
  ];
  return (
    <div>
      {questions.map((q, i) => (
        <TA
          key={q.key}
          label={`Q${i + 1}. ${q.q}`}
          value={data[q.key] ?? ""}
          onChange={(v) => onChange({ ...data, [q.key]: v })}
          target={150}
          rows={6}
          placeholder="Write your honest, thoughtful answer here (minimum 150 words)..."
        />
      ))}
    </div>
  );
}

function PillarForm({ label, data, onChange }: {
  label: string; data: SectionBPillar; onChange: (d: SectionBPillar) => void;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 12px", color: "#FFC107", fontSize: 16 }}>{label}</h4>
      <PillarScore label="Rate yourself (1 = low, 7 = high)" value={data.score ?? 0} onChange={(v) => onChange({ ...data, score: v })} />
      <TA label="Explain your score — be brutally honest" value={data.explanation ?? ""} onChange={(v) => onChange({ ...data, explanation: v })} target={80} rows={4} />
      <TA label="ONE concrete action this weekend to strengthen this pillar" value={data.action ?? ""} onChange={(v) => onChange({ ...data, action: v })} rows={3} />
    </div>
  );
}

function SectionBForm({ data, onChange }: { data: SectionB; onChange: (d: SectionB) => void }) {
  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 0, lineHeight: 1.6 }}>
        Rate yourself honestly on each of Mr. Emmanuel&rsquo;s three pillars (1–7 scale).
        Then explain your score and commit to ONE action.
      </p>
      <PillarForm label="🌱 Sincerity — Am I showing up for the right reasons?" data={data.sincerity ?? {}} onChange={(v) => onChange({ ...data, sincerity: v })} />
      <PillarForm label="⚡ Dedication — Am I fully in, or just interested?" data={data.dedication ?? {}} onChange={(v) => onChange({ ...data, dedication: v })} />
      <PillarForm label="🔥 Sacrifice — What am I willing to give up?" data={data.sacrifice ?? {}} onChange={(v) => onChange({ ...data, sacrifice: v })} />
    </div>
  );
}

function SectionCForm({ data, onChange }: { data: SectionC; onChange: (d: SectionC) => void }) {
  const sources = data.sources ?? ["", "", ""];
  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 0, lineHeight: 1.6 }}>
        Research ONE successful person using at least 3 sources (articles, interviews, biographies, documentaries).
        Suggested: Elon Musk, Mandela, Oprah, Dangote, Achebe, Serena, Jobs, Saro-Wiwa, Chimamanda.
      </p>
      <Input label="Person studied" value={data.person_studied ?? ""} onChange={(v) => onChange({ ...data, person_studied: v })} placeholder="Full name" />
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>Sources (URLs or titles)</label>
        {sources.map((src, i) => (
          <input key={i} value={src} onChange={(e) => {
            const updated = [...sources]; updated[i] = e.target.value;
            onChange({ ...data, sources: updated });
          }} placeholder={`Source ${i + 1}`} style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "8px 14px", boxSizing: "border-box", marginBottom: 8 }} />
        ))}
      </div>
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const key = `discipline_${n}` as keyof SectionC;
        return (
          <TA key={n} label={`Discipline ${n} — specific, repeatable behaviour (not vague traits)`} value={(data[key] as string) ?? ""} onChange={(v) => onChange({ ...data, [key]: v })} rows={3} placeholder='e.g. "Woke at 4:30 AM daily for 5 years"' />
        );
      })}
      <TA label="C1 — What was their hardest season? What did they do that most people wouldn't?" value={data.hardest_season ?? ""} onChange={(v) => onChange({ ...data, hardest_season: v })} target={120} rows={5} />
      <TA label="C2 — Is there a parallel to YOUR current season? What is it?" value={data.parallel ?? ""} onChange={(v) => onChange({ ...data, parallel: v })} target={100} rows={5} />
    </div>
  );
}

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday"];
const TIME_SLOTS = [
  { key: "morning" as const, label: "Morning (6–9 AM)" },
  { key: "mid_morning" as const, label: "Mid-Morning (9–12 PM)" },
  { key: "afternoon" as const, label: "Afternoon (12–3 PM)" },
  { key: "mid_afternoon" as const, label: "Mid-Afternoon (3–6 PM)" },
  { key: "evening" as const, label: "Evening (6–9 PM)" },
  { key: "night" as const, label: "Night (9 PM – Close)" },
];

function SectionDForm({ data, onChange }: { data: SectionD; onChange: (d: SectionD) => void }) {
  const days: DaySlots[] = data.days ?? DAYS.map(() => ({}));
  return (
    <div>
      <TA label="D1 — What ONE thing must you accomplish before Tuesday 8 PM to make you proud?" value={data.d1_goal ?? ""} onChange={(v) => onChange({ ...data, d1_goal: v })} rows={3} />
      <TA label="D2 — What are your THREE non-negotiables this weekend?" value={data.d2_nonnegotiables ?? ""} onChange={(v) => onChange({ ...data, d2_nonnegotiables: v })} rows={3} />
      <div style={{ marginTop: 20 }}>
        {DAYS.map((day, di) => {
          const dayData = days[di] ?? {};
          const update = (updates: Partial<DaySlots>) => {
            const updated = [...days];
            updated[di] = { ...dayData, ...updates };
            onChange({ ...data, days: updated });
          };
          return (
            <div key={day} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
              <h4 style={{ margin: "0 0 12px", color: "#1E88E5", fontSize: 15 }}>{day}</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {TIME_SLOTS.map((slot) => (
                  <div key={slot.key}>
                    <label style={{ color: "#9CA3AF", fontSize: 12, display: "block", marginBottom: 4 }}>{slot.label}</label>
                    <input value={dayData[slot.key] ?? ""} onChange={(e) => update({ [slot.key]: e.target.value })} placeholder="Plan for this time block..." style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#E8EDF5", fontSize: 13, padding: "7px 12px", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <label style={{ color: "#4CAF50", fontSize: 12, display: "block", marginBottom: 4 }}>Win of the Day</label>
                  <input value={dayData.win ?? ""} onChange={(e) => update({ win: e.target.value })} placeholder="What went well?" style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#E8EDF5", fontSize: 13, padding: "7px 12px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: "#FF7043", fontSize: 12, display: "block", marginBottom: 4 }}>Struggle / Lesson</label>
                  <input value={dayData.struggle ?? ""} onChange={(e) => update({ struggle: e.target.value })} placeholder="What was hard? What did you learn?" style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#E8EDF5", fontSize: 13, padding: "7px 12px", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HORIZONS = [
  { key: "horizon_1" as const, label: "This Week (by Sunday)", color: "#4CAF50" },
  { key: "horizon_2" as const, label: "This Month", color: "#1E88E5" },
  { key: "horizon_3" as const, label: "This Quarter (90 days)", color: "#AB47BC" },
  { key: "horizon_4" as const, label: "This Year (by Dec 2026)", color: "#FFC107" },
];

function SectionEForm({ data, onChange }: { data: SectionE; onChange: (d: SectionE) => void }) {
  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 0 }}>Write 3 SMART goals for each time horizon.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {HORIZONS.map((h) => {
          const goals: Goal[] = (data[h.key] ?? [{}, {}, {}]) as Goal[];
          return (
            <div key={h.key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "16px 18px" }}>
              <h4 style={{ margin: "0 0 12px", color: h.color, fontSize: 14 }}>{h.label}</h4>
              {[0, 1, 2].map((i) => {
                const g = goals[i] ?? {};
                const updateGoal = (updates: Partial<Goal>) => {
                  const updated = [...goals];
                  updated[i] = { ...g, ...updates };
                  onChange({ ...data, [h.key]: updated });
                };
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <label style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase" }}>Goal {i + 1}</label>
                    <input value={g.goal ?? ""} onChange={(e) => updateGoal({ goal: e.target.value })} placeholder="What specifically?" style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#E8EDF5", fontSize: 13, padding: "7px 12px", boxSizing: "border-box", marginTop: 4 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                      <input value={g.deadline ?? ""} onChange={(e) => updateGoal({ deadline: e.target.value })} placeholder="Deadline" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#9CA3AF", fontSize: 12, padding: "6px 10px" }} />
                      <input value={g.how ?? ""} onChange={(e) => updateGoal({ how: e.target.value })} placeholder="How?" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#9CA3AF", fontSize: 12, padding: "6px 10px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TRACKS = ["UI/UX Design", "Web Development", "AI/ML", "Content Creation", "Digital Marketing", "Social Media", "Video & Motion", "Copywriting", "Data Analysis", "Business Development"];

function SectionFForm({ data, onChange }: { data: SectionF; onChange: (d: SectionF) => void }) {
  const [uploading, setUploading] = useState(false);
  const colors = data.colors ?? ["", "", ""];
  const values = data.values ?? ["", "", ""];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, { folder: "eagle-designs" });
      onChange({ ...data, design_url: res.secureUrl });
      toast.success("Design uploaded!");
    } catch { toast.error("Upload failed. Try again."); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 0 }}>
        Create a ONE-PAGE personal brand / &ldquo;Eagle Identity&rdquo; visual (Canva, Figma, Adobe Express, PowerPoint, or hand-drawn + photo).
        Upload the image below, then fill in all 7 required elements.
      </p>
      {/* Upload */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>Upload Design Image *</label>
        {data.design_url && (
          <div style={{ marginBottom: 10 }}>
            <img src={data.design_url} alt="Design" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, objectFit: "contain", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
        )}
        <label style={{
          display: "inline-block", padding: "10px 20px", background: uploading ? "#1E2640" : "rgba(30,136,229,0.15)",
          border: "1px dashed rgba(30,136,229,0.4)", borderRadius: 8, cursor: uploading ? "wait" : "pointer", color: "#1E88E5",
        }}>
          {uploading ? "Uploading..." : data.design_url ? "Replace Image" : "📎 Choose Image"}
          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
        </label>
      </div>
      <Input label="1. Your Full Name (as it should appear on the design)" value={data.design_url ? (data.rationale ? "filled" : data.north_star ?? "") : ""} onChange={() => {}} placeholder="" />
      <Input label="Personal Tagline — one sentence: who you are becoming" value={data.tagline ?? ""} onChange={(v) => onChange({ ...data, tagline: v })} placeholder='"I am a digital architect building Africa\'s future."' />
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>Your CIOS Track</label>
        <select value={data.track ?? ""} onChange={(e) => onChange({ ...data, track: e.target.value })} style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "10px 14px" }}>
          <option value="">Select track...</option>
          {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>Colour Palette (3 colours representing you)</label>
        <div style={{ display: "flex", gap: 10 }}>
          {colors.map((c, i) => (
            <input key={i} value={c} onChange={(e) => { const u = [...colors]; u[i] = e.target.value; onChange({ ...data, colors: u }); }} placeholder={`Colour ${i + 1} (e.g. #1E88E5 or "Ocean Blue")`} style={{ flex: 1, background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 13, padding: "9px 12px" }} />
          ))}
        </div>
      </div>
      <Input label="Visual Symbol (icon or illustration that represents you)" value={data.symbol ?? ""} onChange={(v) => onChange({ ...data, symbol: v })} placeholder="e.g. Eagle silhouette, rising sun, open book..." />
      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>Top 3 Values</label>
        <div style={{ display: "flex", gap: 10 }}>
          {values.map((v, i) => (
            <input key={i} value={v} onChange={(e) => { const u = [...values]; u[i] = e.target.value; onChange({ ...data, values: u }); }} placeholder={`Value ${i + 1}`} style={{ flex: 1, background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 13, padding: "9px 12px" }} />
          ))}
        </div>
      </div>
      <Input label='"North Star" Quote (original or borrowed — carry you through 6 months)' value={data.north_star ?? ""} onChange={(v) => onChange({ ...data, north_star: v })} />
      <TA label="Design Rationale (150 words) — why did you design it this way?" value={data.rationale ?? ""} onChange={(v) => onChange({ ...data, rationale: v })} target={150} rows={6} />
    </div>
  );
}

const LADDER = ["New Intern", "Active Intern", "Senior Intern", "Team Lead", "Department Lead", "Trainer", "Manager", "Admin", "Executive"];

function SectionGForm({ data, onChange }: { data: SectionG; onChange: (d: SectionG) => void }) {
  const actions = data.actions ?? ["", "", ""];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {(["current_position", "target_30d", "target_6m"] as const).map((key) => (
          <div key={key}>
            <label style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              {key === "current_position" ? "Where you are today" : key === "target_30d" ? "Target in 30 days" : "Target at 6 months"}
            </label>
            <select value={data[key] ?? ""} onChange={(e) => onChange({ ...data, [key]: e.target.value })} style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 13, padding: "9px 12px" }}>
              <option value="">Select...</option>
              {LADDER.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Current XP / Score (estimate)</label>
          <input type="number" value={data.current_xp ?? ""} onChange={(e) => onChange({ ...data, current_xp: Number(e.target.value) })} placeholder="e.g. 500" style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "9px 12px", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Target XP by end of month</label>
          <input type="number" value={data.target_xp ?? ""} onChange={(e) => onChange({ ...data, target_xp: Number(e.target.value) })} placeholder="e.g. 1200" style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "9px 12px", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>3 Concrete Actions THIS WEEK to climb closer</label>
        {actions.map((a, i) => (
          <input key={i} value={a} onChange={(e) => { const u = [...actions]; u[i] = e.target.value; onChange({ ...data, actions: u }); }} placeholder={`Action ${i + 1}`} style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "9px 12px", boxSizing: "border-box", marginBottom: 8 }} />
        ))}
      </div>
      <TA label="G1 — What ONE thing is preventing your promotion? (brutal honesty)" value={data.g1 ?? ""} onChange={(v) => onChange({ ...data, g1: v })} rows={4} />
      <TA label="G2 — What will you do about it starting TODAY?" value={data.g2 ?? ""} onChange={(v) => onChange({ ...data, g2: v })} rows={4} />
    </div>
  );
}

const COVENANT_TEXT = `I AM NOT A CHICKEN. I AM AN EAGLE THAT HAS NOT YET LOOKED UP.

I will show up, even when inconvenient.
I will submit assignments on time because my name is on them.
I will not bribe my growth with a fine.
I will be sincere in learning, dedicated in effort, sacrificial in commitment.
I will be disciplined — not because someone watches, but because I am becoming.
I will honour my coach, respect my classmates, and respect the person I am becoming.

I will look up. And when I see the sky, I will answer it.`;

function SectionHForm({ data, onChange }: { data: SectionH; onChange: (d: SectionH) => void }) {
  return (
    <div>
      <div style={{
        background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.2)",
        borderRadius: 12, padding: "20px 24px", marginBottom: 24,
      }}>
        <h4 style={{ margin: "0 0 14px", color: "#FFC107", fontSize: 16 }}>The Eagle Covenant</h4>
        <pre style={{
          color: "#E8EDF5", fontSize: 14, lineHeight: 1.8, fontFamily: "inherit",
          whiteSpace: "pre-wrap", margin: 0,
        }}>{COVENANT_TEXT}</pre>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 20 }}>
        <input
          type="checkbox"
          checked={data.agreed ?? false}
          onChange={(e) => onChange({ ...data, agreed: e.target.checked, signed_at: e.target.checked ? new Date().toISOString() : undefined })}
          style={{ width: 18, height: 18, cursor: "pointer" }}
        />
        <span style={{ color: "#E8EDF5", fontSize: 15 }}>I agree to this covenant. I sign it with full intention.</span>
      </label>
      <Input label="Your Full Signature Name" value={data.signature_name ?? ""} onChange={(v) => onChange({ ...data, signature_name: v })} placeholder="Sign your full name exactly as it appears on your ID" />
      <Input label="Witness Name (a classmate who can verify this)" value={data.witness_name ?? ""} onChange={(v) => onChange({ ...data, witness_name: v })} placeholder="Classmate's full name" />
    </div>
  );
}

// ── Section metadata ───────────────────────────────────────────────────────────

const SECTIONS_META = [
  { id: "A" as const, label: "Reflection Essay", icon: "✍️", points: 20 },
  { id: "B" as const, label: "Three Pillars Audit", icon: "🏛️", points: 15 },
  { id: "C" as const, label: "Discipline Case Study", icon: "🔬", points: 15 },
  { id: "D" as const, label: "4-Day Planner", icon: "📅", points: 15 },
  { id: "E" as const, label: "Goal-Setting Grid", icon: "🎯", points: 10 },
  { id: "F" as const, label: "Design Challenge", icon: "🎨", points: 15 },
  { id: "G" as const, label: "Career Ladder Map", icon: "🪜", points: 5 },
  { id: "H" as const, label: "Eagle Covenant", icon: "🦅", points: 5 },
];

function isSectionComplete(id: string, data: Record<string, unknown>): boolean {
  switch (id) {
    case "A": { const d = data as SectionA; return !!(d.q1 && d.q2 && d.q7); }
    case "B": { const d = data as SectionB; return !!(d.sincerity?.score && d.dedication?.score && d.sacrifice?.score); }
    case "C": { const d = data as SectionC; return !!(d.person_studied && d.discipline_1); }
    case "D": { const d = data as SectionD; return !!(d.d1_goal && d.days?.length); }
    case "E": { const d = data as SectionE; return !!(d.horizon_1?.[0]?.goal); }
    case "F": { const d = data as SectionF; return !!(d.design_url && d.rationale); }
    case "G": { const d = data as SectionG; return !!(d.current_position && d.g1); }
    case "H": { const d = data as SectionH; return !!(d.agreed && d.signature_name); }
    default: return false;
  }
}

// ── Main wizard ────────────────────────────────────────────────────────────────

interface Props {
  initialSubmission: EagleSubmission | null;
  deadline: string;
  userName: string;
}

export function EagleWizardClient({ initialSubmission, deadline, userName }: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(0);
  const [sectionA, setSectionA] = useState<SectionA>(initialSubmission?.section_a ?? {});
  const [sectionB, setSectionB] = useState<SectionB>(initialSubmission?.section_b ?? {});
  const [sectionC, setSectionC] = useState<SectionC>(initialSubmission?.section_c ?? {});
  const [sectionD, setSectionD] = useState<SectionD>(initialSubmission?.section_d ?? {});
  const [sectionE, setSectionE] = useState<SectionE>(initialSubmission?.section_e ?? {});
  const [sectionF, setSectionF] = useState<SectionF>(initialSubmission?.section_f ?? {});
  const [sectionG, setSectionG] = useState<SectionG>(initialSubmission?.section_g ?? {});
  const [sectionH, setSectionH] = useState<SectionH>(initialSubmission?.section_h ?? {});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentData = [sectionA, sectionB, sectionC, sectionD, sectionE, sectionF, sectionG, sectionH];

  const doSave = useCallback(async () => {
    setSaving(true);
    const res = await saveEagleDraft({
      section_a: sectionA, section_b: sectionB, section_c: sectionC,
      section_d: sectionD, section_e: sectionE, section_f: sectionF,
      section_g: sectionG, section_h: sectionH,
    });
    setSaving(false);
    if (res.ok) setLastSaved(new Date());
    else toast.error("Auto-save failed: " + res.error);
  }, [sectionA, sectionB, sectionC, sectionD, sectionE, sectionF, sectionG, sectionH]);

  // Auto-save every 30s
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(doSave, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [doSave]);

  const handleSubmit = () => {
    startSubmit(async () => {
      // Save first
      await doSave();
      const res = await submitEagleProject();
      if (res.ok) {
        toast.success(res.data.late
          ? "Submitted (late) — a ₦500 fine has been applied."
          : "Eagle Project submitted! 🦅 +200 XP earned!");
        router.push("/eagle");
      } else {
        toast.error(res.error);
      }
    });
  };

  const sec = SECTIONS_META[activeSection];
  const isDeadlinePast = new Date(deadline) < new Date();

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 100px)", minHeight: 600 }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: "#131929",
        border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12,
        padding: "16px 12px", overflowY: "auto",
      }}>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#5A6478", fontSize: 11, marginBottom: 4 }}>DEADLINE</div>
          <div style={{ color: isDeadlinePast ? "#EF5350" : "#FFC107", fontSize: 12, fontWeight: 700 }}>
            {isDeadlinePast ? "PASSED" : new Date(deadline).toLocaleString()}
          </div>
        </div>
        {SECTIONS_META.map((s, i) => {
          const done = isSectionComplete(s.id, currentData[i] as Record<string, unknown>);
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(i)}
              style={{
                width: "100%", textAlign: "left", padding: "10px 12px",
                background: activeSection === i ? "rgba(30,136,229,0.15)" : "transparent",
                border: activeSection === i ? "1px solid rgba(30,136,229,0.3)" : "1px solid transparent",
                borderRadius: 8, cursor: "pointer", marginBottom: 4,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>{done ? "✅" : s.icon}</span>
              <div>
                <div style={{ color: activeSection === i ? "#1E88E5" : "#E8EDF5", fontSize: 13, fontWeight: 600 }}>
                  {s.id}. {s.label}
                </div>
                <div style={{ color: "#5A6478", fontSize: 11 }}>{s.points} pts</div>
              </div>
            </button>
          );
        })}
        {/* Save status */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", color: "#5A6478", fontSize: 11 }}>
          {saving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Not saved yet"}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, color: "#E8EDF5", fontSize: 20, fontWeight: 800 }}>
                {sec.icon} Section {sec.id} — {sec.label}
              </h2>
              <p style={{ margin: "4px 0 0", color: "#5A6478", fontSize: 13 }}>{sec.points} points · Hello, {userName}</p>
            </div>
            <button
              onClick={doSave}
              disabled={saving}
              style={{
                padding: "8px 18px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                color: "#9CA3AF", cursor: saving ? "wait" : "pointer", fontSize: 13,
              }}
            >
              {saving ? "Saving..." : "💾 Save Draft"}
            </button>
          </div>

          {activeSection === 0 && <SectionAForm data={sectionA} onChange={setSectionA} />}
          {activeSection === 1 && <SectionBForm data={sectionB} onChange={setSectionB} />}
          {activeSection === 2 && <SectionCForm data={sectionC} onChange={setSectionC} />}
          {activeSection === 3 && <SectionDForm data={sectionD} onChange={setSectionD} />}
          {activeSection === 4 && <SectionEForm data={sectionE} onChange={setSectionE} />}
          {activeSection === 5 && <SectionFForm data={sectionF} onChange={setSectionF} />}
          {activeSection === 6 && <SectionGForm data={sectionG} onChange={setSectionG} />}
          {activeSection === 7 && <SectionHForm data={sectionH} onChange={setSectionH} />}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
            disabled={activeSection === 0}
            style={{ padding: "10px 22px", background: "#1E2640", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: activeSection === 0 ? "#5A6478" : "#E8EDF5", cursor: activeSection === 0 ? "default" : "pointer" }}
          >
            ← Previous
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            {activeSection < 7 ? (
              <button
                onClick={() => { doSave(); setActiveSection(activeSection + 1); }}
                style={{ padding: "10px 22px", background: "rgba(30,136,229,0.15)", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 8, color: "#1E88E5", cursor: "pointer", fontWeight: 700 }}
              >
                Save & Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: "12px 28px",
                  background: submitting ? "#1E2640" : "linear-gradient(135deg,#1E88E5,#FFC107)",
                  border: "none", borderRadius: 8,
                  color: submitting ? "#9CA3AF" : "#0A0E1A",
                  cursor: submitting ? "wait" : "pointer", fontWeight: 800, fontSize: 15,
                }}
              >
                {submitting ? "Submitting..." : "🦅 Submit Eagle Project"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

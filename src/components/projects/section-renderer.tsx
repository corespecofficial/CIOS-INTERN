"use client";

import { useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import toast from "react-hot-toast";
import type { SectionConfig } from "@/app/actions/custom-projects-types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function wordCount(s: string) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

function WC({ text, target }: { text: string; target: number }) {
  const n = wordCount(text);
  return <span style={{ fontSize: 11, color: n >= target ? "#4CAF50" : "#9CA3AF" }}>{n}/{target} words</span>;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "9px 12px", boxSizing: "border-box",
};
const TA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE, resize: "vertical" as const, fontFamily: "inherit", lineHeight: 1.6,
};

// ── Section renderers ─────────────────────────────────────────────────────────

function EssayRenderer({ config, answer, onChange, readOnly }: {
  config: { questions: Array<{ id: string; text: string; wordTarget?: number }> };
  answer: Record<string, string>;
  onChange?: (v: Record<string, string>) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      {config.questions.map((q, i) => {
        const val = answer[q.id] ?? "";
        return (
          <div key={q.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600 }}>Q{i + 1}. {q.text}</label>
              {q.wordTarget && <WC text={val} target={q.wordTarget} />}
            </div>
            {readOnly ? (
              <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{val || "—"}</p>
            ) : (
              <textarea rows={5} value={val} onChange={(e) => onChange?.({ ...answer, [q.id]: e.target.value })}
                placeholder={`Answer (${q.wordTarget ? `min ${q.wordTarget} words` : ""})`}
                style={TA_STYLE} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RatingScaleRenderer({ config, answer, onChange, readOnly }: {
  config: { pillars: Array<{ id: string; name: string; description?: string }>; minLabel?: string; maxLabel?: string };
  answer: Record<string, { score?: number; explanation?: string; action?: string }>;
  onChange?: (v: typeof answer) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#5A6478", fontSize: 12 }}>
        <span>1 = {config.minLabel ?? "Low"}</span>
        <span>7 = {config.maxLabel ?? "High"}</span>
      </div>
      {config.pillars.map((p) => {
        const a = answer[p.id] ?? {};
        const update = (patch: Partial<typeof a>) => onChange?.({ ...answer, [p.id]: { ...a, ...patch } });
        return (
          <div key={p.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: "#FFC107", fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              {p.description && <div style={{ color: "#5A6478", fontSize: 12 }}>{p.description}</div>}
            </div>
            {readOnly ? (
              <div style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Score: {a.score ?? "—"}/7</div>
            ) : (
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,7].map((n) => (
                  <button key={n} onClick={() => update({ score: n })} style={{
                    width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                    background: a.score === n ? "linear-gradient(135deg,#1E88E5,#FFC107)" : "rgba(255,255,255,0.06)",
                    color: a.score === n ? "#0A0E1A" : "#9CA3AF",
                    fontWeight: a.score === n ? 800 : 400,
                  }}>{n}</button>
                ))}
              </div>
            )}
            {readOnly ? (
              <>
                <p style={{ margin: "0 0 6px", color: "#9CA3AF", fontSize: 13 }}><strong style={{ color: "#E8EDF5" }}>Explanation:</strong> {a.explanation || "—"}</p>
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13 }}><strong style={{ color: "#E8EDF5" }}>Action:</strong> {a.action || "—"}</p>
              </>
            ) : (
              <>
                <textarea rows={3} value={a.explanation ?? ""} onChange={(e) => update({ explanation: e.target.value })}
                  placeholder="Explain your score honestly..." style={{ ...TA_STYLE, marginBottom: 8 }} />
                <textarea rows={2} value={a.action ?? ""} onChange={(e) => update({ action: e.target.value })}
                  placeholder="ONE concrete action to strengthen this..." style={TA_STYLE} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TextFieldsRenderer({ config, answer, onChange, readOnly }: {
  config: { fields: Array<{ id: string; label: string; multiline?: boolean; placeholder?: string }> };
  answer: Record<string, string>;
  onChange?: (v: Record<string, string>) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      {config.fields.map((f) => {
        const val = answer[f.id] ?? "";
        return (
          <div key={f.id} style={{ marginBottom: 16 }}>
            <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>{f.label}</label>
            {readOnly ? (
              <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13, whiteSpace: "pre-wrap" }}>{val || "—"}</p>
            ) : f.multiline ? (
              <textarea rows={4} value={val} onChange={(e) => onChange?.({ ...answer, [f.id]: e.target.value })}
                placeholder={f.placeholder} style={TA_STYLE} />
            ) : (
              <input value={val} onChange={(e) => onChange?.({ ...answer, [f.id]: e.target.value })}
                placeholder={f.placeholder} style={INPUT_STYLE} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const TIME_SLOTS_DEFAULT = ["Morning (6–9 AM)", "Mid-Morning (9–12 PM)", "Afternoon (12–3 PM)", "Mid-Afternoon (3–6 PM)", "Evening (6–9 PM)", "Night (9 PM–Close)"];

function PlannerRenderer({ config, answer, onChange, readOnly }: {
  config: { days: number; dayNames?: string[] };
  answer: Array<{ slots?: Record<string, string>; win?: string; struggle?: string }>;
  onChange?: (v: typeof answer) => void;
  readOnly?: boolean;
}) {
  const days = Array.from({ length: config.days }, (_, i) => ({
    name: config.dayNames?.[i] ?? `Day ${i + 1}`,
    data: answer[i] ?? {},
  }));

  return (
    <div>
      {days.map((day, di) => {
        const update = (patch: Partial<typeof day.data>) => {
          const updated = [...answer];
          updated[di] = { ...day.data, ...patch };
          onChange?.(updated);
        };
        const updateSlot = (slot: string, val: string) => {
          const slots = { ...(day.data.slots ?? {}), [slot]: val };
          update({ slots });
        };
        return (
          <div key={di} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <h4 style={{ margin: "0 0 10px", color: "#1E88E5", fontSize: 14 }}>{day.name}</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginBottom: 10 }}>
              {TIME_SLOTS_DEFAULT.map((slot) => (
                <div key={slot}>
                  <label style={{ color: "#9CA3AF", fontSize: 11, display: "block", marginBottom: 3 }}>{slot}</label>
                  {readOnly
                    ? <p style={{ margin: 0, color: "#E8EDF5", fontSize: 13 }}>{day.data.slots?.[slot] || "—"}</p>
                    : <input value={day.data.slots?.[slot] ?? ""} onChange={(e) => updateSlot(slot, e.target.value)} placeholder="Plan..." style={{ ...INPUT_STYLE, fontSize: 12, padding: "6px 10px" }} />
                  }
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              <div>
                <label style={{ color: "#4CAF50", fontSize: 12, display: "block", marginBottom: 3 }}>Win of the Day</label>
                {readOnly
                  ? <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13 }}>{day.data.win || "—"}</p>
                  : <input value={day.data.win ?? ""} onChange={(e) => update({ win: e.target.value })} placeholder="What went well?" style={{ ...INPUT_STYLE, fontSize: 12, padding: "6px 10px" }} />
                }
              </div>
              <div>
                <label style={{ color: "#FF7043", fontSize: 12, display: "block", marginBottom: 3 }}>Struggle / Lesson</label>
                {readOnly
                  ? <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13 }}>{day.data.struggle || "—"}</p>
                  : <input value={day.data.struggle ?? ""} onChange={(e) => update({ struggle: e.target.value })} placeholder="What was hard?" style={{ ...INPUT_STYLE, fontSize: 12, padding: "6px 10px" }} />
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GoalGridRenderer({ config, answer, onChange, readOnly }: {
  config: { horizons: Array<{ label: string; count: number }> };
  answer: Record<string, Array<{ goal?: string; deadline?: string; how?: string }>>;
  onChange?: (v: typeof answer) => void;
  readOnly?: boolean;
}) {
  const COLORS = ["#4CAF50", "#1E88E5", "#AB47BC", "#FFC107"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
      {config.horizons.map((h, hi) => {
        const goals = answer[h.label] ?? Array.from({ length: h.count }, () => ({}));
        const color = COLORS[hi % COLORS.length];
        return (
          <div key={h.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 16px" }}>
            <h4 style={{ margin: "0 0 12px", color, fontSize: 13 }}>{h.label}</h4>
            {goals.map((g, gi) => {
              const updateGoal = (patch: Partial<typeof g>) => {
                const updated = [...goals];
                updated[gi] = { ...g, ...patch };
                onChange?.({ ...answer, [h.label]: updated });
              };
              return (
                <div key={gi} style={{ marginBottom: 12 }}>
                  <label style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase" }}>Goal {gi + 1}</label>
                  {readOnly ? (
                    <p style={{ margin: "4px 0 0", color: "#E8EDF5", fontSize: 13 }}>{g.goal || "—"}</p>
                  ) : (
                    <>
                      <input value={g.goal ?? ""} onChange={(e) => updateGoal({ goal: e.target.value })} placeholder="What specifically?" style={{ ...INPUT_STYLE, marginTop: 4 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                        <input value={g.deadline ?? ""} onChange={(e) => updateGoal({ deadline: e.target.value })} placeholder="Deadline" style={{ ...INPUT_STYLE, fontSize: 12, padding: "6px 10px" }} />
                        <input value={g.how ?? ""} onChange={(e) => updateGoal({ how: e.target.value })} placeholder="How?" style={{ ...INPUT_STYLE, fontSize: 12, padding: "6px 10px" }} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FileUploadRenderer({ config, answer, onChange, readOnly }: {
  config: { uploadLabel?: string; extraFields?: Array<{ id: string; label: string }> };
  answer: { url?: string } & Record<string, string>;
  onChange?: (v: typeof answer) => void;
  readOnly?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, { folder: "project-uploads" });
      onChange?.({ ...answer, url: res.secureUrl });
      toast.success("File uploaded!");
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>
          {config.uploadLabel ?? "Upload File"}
        </label>
        {answer.url && (
          <div style={{ marginBottom: 10 }}>
            {/\.(jpg|jpeg|png|gif|webp)$/i.test(answer.url)
              ? <img src={answer.url} alt="Upload" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, objectFit: "contain", border: "1px solid rgba(255,255,255,0.1)" }} />
              : <a href={answer.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1E88E5" }}>View uploaded file</a>
            }
          </div>
        )}
        {!readOnly && (
          <label style={{ display: "inline-block", padding: "9px 18px", background: "rgba(30,136,229,0.12)", border: "1px dashed rgba(30,136,229,0.35)", borderRadius: 8, cursor: uploading ? "wait" : "pointer", color: "#1E88E5", fontSize: 13 }}>
            {uploading ? "Uploading..." : answer.url ? "Replace File" : "📎 Choose File"}
            <input type="file" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
          </label>
        )}
      </div>
      {(config.extraFields ?? []).map((f) => (
        <div key={f.id} style={{ marginBottom: 14 }}>
          <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>{f.label}</label>
          {readOnly
            ? <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13, whiteSpace: "pre-wrap" }}>{answer[f.id] || "—"}</p>
            : <textarea rows={4} value={answer[f.id] ?? ""} onChange={(e) => onChange?.({ ...answer, [f.id]: e.target.value })} style={TA_STYLE} />
          }
        </div>
      ))}
    </div>
  );
}

function CovenantRenderer({ config, answer, onChange, readOnly }: {
  config: { text: string };
  answer: { agreed?: boolean; signature_name?: string };
  onChange?: (v: typeof answer) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.18)", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
        <pre style={{ margin: 0, color: "#E8EDF5", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
          {config.text}
        </pre>
      </div>
      {readOnly ? (
        <div>
          <p style={{ color: answer.agreed ? "#4CAF50" : "#9CA3AF", fontWeight: 700 }}>
            {answer.agreed ? "✅ Signed" : "Not signed"}
          </p>
          {answer.signature_name && <p style={{ color: "#9CA3AF", fontFamily: "Georgia, serif", fontStyle: "italic" }}>{answer.signature_name}</p>}
        </div>
      ) : (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={answer.agreed ?? false}
              onChange={(e) => onChange?.({ ...answer, agreed: e.target.checked })}
              style={{ width: 18, height: 18, cursor: "pointer" }} />
            <span style={{ color: "#E8EDF5", fontSize: 14 }}>I agree to this covenant and sign it with full intention.</span>
          </label>
          <div>
            <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>Your Full Signature Name</label>
            <input value={answer.signature_name ?? ""} onChange={(e) => onChange?.({ ...answer, signature_name: e.target.value })}
              placeholder="Sign your full name..." style={INPUT_STYLE} />
          </div>
        </>
      )}
    </div>
  );
}

function FreeFormRenderer({ config, answer, onChange, readOnly }: {
  config: { label?: string; placeholder?: string; wordTarget?: number };
  answer: { text?: string };
  onChange?: (v: typeof answer) => void;
  readOnly?: boolean;
}) {
  const val = answer.text ?? "";
  return (
    <div>
      {config.label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600 }}>{config.label}</label>
          {config.wordTarget && <WC text={val} target={config.wordTarget} />}
        </div>
      )}
      {readOnly
        ? <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{val || "—"}</p>
        : <textarea rows={8} value={val} onChange={(e) => onChange?.({ ...answer, text: e.target.value })}
            placeholder={config.placeholder} style={TA_STYLE} />
      }
    </div>
  );
}

// ── Main renderer ──────────────────────────────────────────────────────────────

interface Props {
  section: SectionConfig;
  answer: unknown;
  onChange?: (v: unknown) => void;
  readOnly?: boolean;
}

export function SectionRenderer({ section, answer, onChange, readOnly }: Props) {
  const ans = (answer ?? {}) as Record<string, unknown>;

  switch (section.type) {
    case "essay":
      return <EssayRenderer config={section.config} answer={ans as Record<string, string>} onChange={onChange as (v: Record<string, string>) => void} readOnly={readOnly} />;
    case "rating_scale":
      return <RatingScaleRenderer config={section.config} answer={ans as Record<string, { score?: number; explanation?: string; action?: string }>} onChange={onChange as never} readOnly={readOnly} />;
    case "text_fields":
      return <TextFieldsRenderer config={section.config} answer={ans as Record<string, string>} onChange={onChange as (v: Record<string, string>) => void} readOnly={readOnly} />;
    case "planner":
      return <PlannerRenderer config={section.config} answer={(ans as { days?: Array<Record<string, unknown>> }).days ?? []} onChange={(v) => onChange?.({ days: v })} readOnly={readOnly} />;
    case "goal_grid":
      return <GoalGridRenderer config={section.config} answer={ans as Record<string, Array<{ goal?: string; deadline?: string; how?: string }>>} onChange={onChange as never} readOnly={readOnly} />;
    case "file_upload":
      return <FileUploadRenderer config={section.config} answer={ans as { url?: string } & Record<string, string>} onChange={onChange as never} readOnly={readOnly} />;
    case "covenant":
      return <CovenantRenderer config={section.config} answer={ans as { agreed?: boolean; signature_name?: string }} onChange={onChange as never} readOnly={readOnly} />;
    case "free_form":
      return <FreeFormRenderer config={section.config} answer={ans as { text?: string }} onChange={onChange as never} readOnly={readOnly} />;
    default:
      return <div style={{ color: "#5A6478" }}>Unknown section type.</div>;
  }
}

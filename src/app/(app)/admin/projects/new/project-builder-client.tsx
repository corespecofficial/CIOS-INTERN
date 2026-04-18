"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { createProject, updateProject } from "@/app/actions/custom-projects";
import {
  SECTION_TYPE_LABELS, SECTION_TYPE_ICONS,
  type SectionConfig, type SectionType, type ProjectInput, type Project,
} from "@/app/actions/custom-projects-types";

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: { maxWidth: 960, margin: "0 auto", padding: "24px 20px" } as React.CSSProperties,
  card: { background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "22px 24px" } as React.CSSProperties,
  label: { color: "#9CA3AF", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 } as React.CSSProperties,
  input: {
    width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "10px 14px",
    boxSizing: "border-box" as const, outline: "none",
  },
  textarea: {
    width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#E8EDF5", fontSize: 13, padding: "10px 14px",
    resize: "vertical" as const, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none",
  },
  errorInput: {
    width: "100%", background: "#0D1117", border: "1px solid rgba(239,83,80,0.5)",
    borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "10px 14px",
    boxSizing: "border-box" as const, outline: "none",
  },
  btnPrimary: {
    padding: "10px 24px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg,#1E88E5,#FFC107)",
    color: "#0A0E1A", cursor: "pointer", fontWeight: 800, fontSize: 14,
  } as React.CSSProperties,
  btn: (color = "#9CA3AF") => ({
    padding: "9px 18px", borderRadius: 8, border: `1px solid ${color}40`,
    background: `${color}12`, color, cursor: "pointer", fontSize: 13, fontWeight: 600,
  } as React.CSSProperties),
  btnGreen: {
    padding: "10px 24px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg,#4CAF50,#2E7D32)",
    color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14,
  } as React.CSSProperties,
};

// ── Section default factories ─────────────────────────────────────────────────

function makeSectionId() { return Math.random().toString(36).slice(2, 9); }

const SECTION_DEFAULTS: Record<SectionType, () => SectionConfig> = {
  essay: () => ({ id: makeSectionId(), type: "essay", label: "Essay Section", points: 10, instructions: "", config: { questions: [{ id: makeSectionId(), text: "Describe your experience.", wordTarget: 150 }] } }),
  rating_scale: () => ({ id: makeSectionId(), type: "rating_scale", label: "Rating Scale", points: 10, instructions: "", config: { pillars: [{ id: makeSectionId(), name: "Pillar 1", description: "" }], minLabel: "Strongly Disagree", maxLabel: "Strongly Agree" } }),
  text_fields: () => ({ id: makeSectionId(), type: "text_fields", label: "Text Fields", points: 10, instructions: "", config: { fields: [{ id: makeSectionId(), label: "Field 1", multiline: false, placeholder: "" }] } }),
  planner: () => ({ id: makeSectionId(), type: "planner", label: "Day Planner", points: 10, instructions: "", config: { days: 4, dayNames: ["Day 1", "Day 2", "Day 3", "Day 4"] } }),
  goal_grid: () => ({ id: makeSectionId(), type: "goal_grid", label: "Goal Grid", points: 10, instructions: "", config: { horizons: [{ label: "30-Day Goals", count: 3 }, { label: "90-Day Goals", count: 3 }, { label: "1-Year Goals", count: 3 }] } }),
  file_upload: () => ({ id: makeSectionId(), type: "file_upload", label: "File Upload", points: 10, instructions: "", config: { uploadLabel: "Upload your file", extraFields: [] } }),
  covenant: () => ({ id: makeSectionId(), type: "covenant", label: "Covenant / Agreement", points: 10, instructions: "", config: { text: "I commit to the values and responsibilities of this program..." } }),
  free_form: () => ({ id: makeSectionId(), type: "free_form", label: "Free-Form Response", points: 10, instructions: "", config: { label: "Your Response", placeholder: "Write your answer here...", wordTarget: 200 } }),
};

// ── Section config editor ─────────────────────────────────────────────────────

function SectionConfigEditor({ section, onChange }: { section: SectionConfig; onChange: (s: SectionConfig) => void }) {
  function update(patch: Partial<SectionConfig>) { onChange({ ...section, ...patch } as SectionConfig); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateConfig(patch: Record<string, any>) { onChange({ ...section, config: { ...(section.config as object), ...patch } } as SectionConfig); }

  const fieldStyle = { marginBottom: 14 } as React.CSSProperties;

  return (
    <div>
      {/* Common */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={S.label}>Section Label</label>
          <input value={section.label} onChange={(e) => update({ label: e.target.value })} style={S.input} />
        </div>
        <div>
          <label style={S.label}>Points</label>
          <input type="number" value={section.points} onChange={(e) => update({ points: parseInt(e.target.value) || 0 })} style={S.input} min={0} />
        </div>
      </div>
      <div style={fieldStyle}>
        <label style={S.label}>Instructions (optional)</label>
        <textarea value={section.instructions ?? ""} onChange={(e) => update({ instructions: e.target.value })} rows={2} style={S.textarea} placeholder="Instructions for interns..." />
      </div>

      {/* Essay */}
      {section.type === "essay" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Questions</label>
            <button type="button" onClick={() => updateConfig({ questions: [...section.config.questions, { id: makeSectionId(), text: "", wordTarget: 150 }] })}
              style={{ ...S.btn("#1E88E5"), padding: "4px 10px", fontSize: 12 }}>+ Add</button>
          </div>
          {section.config.questions.map((q, qi) => (
            <div key={q.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <input value={q.text} onChange={(e) => { const qs = [...section.config.questions]; qs[qi] = { ...qs[qi], text: e.target.value }; updateConfig({ questions: qs }); }}
                  placeholder={`Question ${qi + 1}`} style={S.input} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ color: "#5A6478", fontSize: 11 }}>Word target:</span>
                  <input type="number" value={q.wordTarget ?? 150} onChange={(e) => { const qs = [...section.config.questions]; qs[qi] = { ...qs[qi], wordTarget: parseInt(e.target.value) || 0 }; updateConfig({ questions: qs }); }}
                    style={{ ...S.input, width: 70 }} min={0} />
                </div>
              </div>
              {section.config.questions.length > 1 && (
                <button type="button" onClick={() => updateConfig({ questions: section.config.questions.filter((_, i) => i !== qi) })}
                  style={{ background: "none", border: "none", color: "#FF7043", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rating Scale */}
      {section.type === "rating_scale" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Min Label</label>
              <input value={section.config.minLabel ?? ""} onChange={(e) => updateConfig({ minLabel: e.target.value })} style={S.input} placeholder="Strongly Disagree" />
            </div>
            <div>
              <label style={S.label}>Max Label</label>
              <input value={section.config.maxLabel ?? ""} onChange={(e) => updateConfig({ maxLabel: e.target.value })} style={S.input} placeholder="Strongly Agree" />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Pillars</label>
            <button type="button" onClick={() => updateConfig({ pillars: [...section.config.pillars, { id: makeSectionId(), name: "", description: "" }] })}
              style={{ ...S.btn("#1E88E5"), padding: "4px 10px", fontSize: 12 }}>+ Add</button>
          </div>
          {section.config.pillars.map((p, pi) => (
            <div key={p.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={p.name} onChange={(e) => { const ps = [...section.config.pillars]; ps[pi] = { ...ps[pi], name: e.target.value }; updateConfig({ pillars: ps }); }}
                placeholder="Pillar name" style={{ ...S.input, flex: 1 }} />
              <input value={p.description ?? ""} onChange={(e) => { const ps = [...section.config.pillars]; ps[pi] = { ...ps[pi], description: e.target.value }; updateConfig({ pillars: ps }); }}
                placeholder="Description" style={{ ...S.input, flex: 1 }} />
              {section.config.pillars.length > 1 && (
                <button type="button" onClick={() => updateConfig({ pillars: section.config.pillars.filter((_, i) => i !== pi) })}
                  style={{ background: "none", border: "none", color: "#FF7043", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Text Fields */}
      {section.type === "text_fields" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Fields</label>
            <button type="button" onClick={() => updateConfig({ fields: [...section.config.fields, { id: makeSectionId(), label: "", multiline: false, placeholder: "" }] })}
              style={{ ...S.btn("#1E88E5"), padding: "4px 10px", fontSize: 12 }}>+ Add</button>
          </div>
          {section.config.fields.map((f, fi) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input value={f.label} onChange={(e) => { const fs = [...section.config.fields]; fs[fi] = { ...fs[fi], label: e.target.value }; updateConfig({ fields: fs }); }}
                placeholder="Field label" style={{ ...S.input, flex: 1 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#9CA3AF", fontSize: 12, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={f.multiline ?? false} onChange={(e) => { const fs = [...section.config.fields]; fs[fi] = { ...fs[fi], multiline: e.target.checked }; updateConfig({ fields: fs }); }} />
                Multiline
              </label>
              {section.config.fields.length > 1 && (
                <button type="button" onClick={() => updateConfig({ fields: section.config.fields.filter((_, i) => i !== fi) })}
                  style={{ background: "none", border: "none", color: "#FF7043", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Planner */}
      {section.type === "planner" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Number of days</label>
            <input type="number" value={section.config.days} min={1} max={14}
              onChange={(e) => { const n = parseInt(e.target.value) || 1; const names = Array.from({ length: n }, (_, i) => section.config.dayNames?.[i] ?? `Day ${i + 1}`); updateConfig({ days: n, dayNames: names }); }}
              style={S.input} />
          </div>
          <div>
            <label style={S.label}>Day names (comma-separated)</label>
            <input value={(section.config.dayNames ?? []).join(", ")} onChange={(e) => updateConfig({ dayNames: e.target.value.split(",").map((s) => s.trim()) })}
              style={S.input} placeholder="Day 1, Day 2..." />
          </div>
        </div>
      )}

      {/* Goal Grid */}
      {section.type === "goal_grid" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Horizons</label>
            <button type="button" onClick={() => updateConfig({ horizons: [...section.config.horizons, { label: "", count: 3 }] })}
              style={{ ...S.btn("#1E88E5"), padding: "4px 10px", fontSize: 12 }}>+ Add</button>
          </div>
          {section.config.horizons.map((h, hi) => (
            <div key={hi} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={h.label} onChange={(e) => { const hs = [...section.config.horizons]; hs[hi] = { ...hs[hi], label: e.target.value }; updateConfig({ horizons: hs }); }}
                placeholder="e.g. 30-Day Goals" style={{ ...S.input, flex: 1 }} />
              <input type="number" value={h.count} min={1} max={10}
                onChange={(e) => { const hs = [...section.config.horizons]; hs[hi] = { ...hs[hi], count: parseInt(e.target.value) || 1 }; updateConfig({ horizons: hs }); }}
                style={{ ...S.input, width: 60 }} />
              {section.config.horizons.length > 1 && (
                <button type="button" onClick={() => updateConfig({ horizons: section.config.horizons.filter((_, i) => i !== hi) })}
                  style={{ background: "none", border: "none", color: "#FF7043", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File Upload */}
      {section.type === "file_upload" && (
        <div>
          <div style={fieldStyle}>
            <label style={S.label}>Upload button label</label>
            <input value={section.config.uploadLabel ?? ""} onChange={(e) => updateConfig({ uploadLabel: e.target.value })} style={S.input} placeholder="Upload your file" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Extra text fields (optional)</label>
            <button type="button" onClick={() => updateConfig({ extraFields: [...(section.config.extraFields ?? []), { id: makeSectionId(), label: "" }] })}
              style={{ ...S.btn("#1E88E5"), padding: "4px 10px", fontSize: 12 }}>+ Add</button>
          </div>
          {(section.config.extraFields ?? []).map((f, fi) => (
            <div key={f.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={f.label} onChange={(e) => { const fs = [...(section.config.extraFields ?? [])]; fs[fi] = { ...fs[fi], label: e.target.value }; updateConfig({ extraFields: fs }); }}
                placeholder="Field label" style={{ ...S.input, flex: 1 }} />
              <button type="button" onClick={() => updateConfig({ extraFields: (section.config.extraFields ?? []).filter((_, i) => i !== fi) })}
                style={{ background: "none", border: "none", color: "#FF7043", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Covenant */}
      {section.type === "covenant" && (
        <div>
          <label style={S.label}>Covenant text</label>
          <textarea value={section.config.text} onChange={(e) => updateConfig({ text: e.target.value })} rows={5} style={S.textarea} placeholder="I commit to..." />
        </div>
      )}

      {/* Free Form */}
      {section.type === "free_form" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Field label</label>
            <input value={section.config.label ?? ""} onChange={(e) => updateConfig({ label: e.target.value })} style={S.input} placeholder="Your Response" />
          </div>
          <div>
            <label style={S.label}>Word target</label>
            <input type="number" value={section.config.wordTarget ?? 200} onChange={(e) => updateConfig({ wordTarget: parseInt(e.target.value) || 0 })} style={S.input} min={0} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={S.label}>Placeholder text</label>
            <input value={section.config.placeholder ?? ""} onChange={(e) => updateConfig({ placeholder: e.target.value })} style={S.input} placeholder="Write your answer here..." />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main builder ──────────────────────────────────────────────────────────────

interface Props { mode: "create"; initialData?: Project; }

export function ProjectBuilderClient({ mode, initialData }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // Step 1
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [emoji, setEmoji] = useState(initialData?.emoji ?? "📋");
  const [instructions, setInstructions] = useState(initialData?.instructions ?? "");
  const [deadline, setDeadline] = useState(initialData?.deadline ? initialData.deadline.slice(0, 16) : "");
  const [lateFine, setLateFine] = useState(initialData?.late_fine_amount ?? 500);
  const [xpOnSubmit, setXpOnSubmit] = useState(initialData?.xp_on_submit ?? 200);
  const [xpBonusThreshold, setXpBonusThreshold] = useState(initialData?.xp_bonus_threshold ?? 90);
  const [xpBonusAmount, setXpBonusAmount] = useState(initialData?.xp_bonus_amount ?? 500);

  // Step 2
  const [sections, setSections] = useState<SectionConfig[]>(initialData?.sections ?? []);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalPoints = sections.reduce((s, sec) => s + sec.points, 0);

  const addSection = useCallback((type: SectionType) => {
    const newSection = SECTION_DEFAULTS[type]();
    setSections((prev) => { setActiveSectionIdx(prev.length); return [...prev, newSection]; });
    setShowTypeMenu(false);
  }, []);

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
    if (activeSectionIdx === idx) setActiveSectionIdx(null);
    else if (activeSectionIdx !== null && activeSectionIdx > idx) setActiveSectionIdx(activeSectionIdx - 1);
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setSections(arr);
    setActiveSectionIdx(next);
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Required";
    if (!description.trim()) e.description = "Required";
    if (!instructions.trim()) e.instructions = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(publish: boolean) {
    const input: ProjectInput = {
      title, description, emoji, instructions,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      late_fine_amount: lateFine, xp_on_submit: xpOnSubmit,
      xp_bonus_threshold: xpBonusThreshold, xp_bonus_amount: xpBonusAmount,
      sections, cover_image_url: null,
    };
    startTransition(async () => {
      const res = mode === "create" ? await createProject(input) : await updateProject(initialData!.id, input);
      if (!res.ok) { alert(res.error); return; }
      if (publish && res.data) {
        const { publishProject } = await import("@/app/actions/custom-projects");
        await publishProject(res.data.id);
      }
      router.push("/admin/projects");
    });
  }

  const stepLabel = step === 1 ? "Basic Info" : step === 2 ? "Build Sections" : "Preview & Publish";

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push("/admin/projects")}
          style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 14 }}>
          ← Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>
            {mode === "create" ? "Create New Project" : "Edit Project"}
          </h1>
          <div style={{ color: "#5A6478", fontSize: 13, marginTop: 2 }}>Step {step} of 3 — {stepLabel}</div>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 28 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: step === s ? "linear-gradient(135deg,#1E88E5,#FFC107)" : step > s ? "#4CAF50" : "rgba(255,255,255,0.07)",
              color: step >= s ? "#0A0E1A" : "#5A6478",
            }}>
              {step > s ? "✓" : s}
            </div>
            {s < 3 && <div style={{ width: 28, height: 2, background: step > s ? "#4CAF50" : "rgba(255,255,255,0.07)", borderRadius: 1 }} />}
          </div>
        ))}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Emoji</label>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
                style={{ ...S.input, textAlign: "center", fontSize: 24 }} />
            </div>
            <div>
              <label style={S.label}>Project Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                style={errors.title ? S.errorInput : S.input} placeholder="e.g. The Eagle Project" />
              {errors.title && <div style={{ color: "#FF7043", fontSize: 11, marginTop: 4 }}>{errors.title}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Description *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              style={errors.description ? S.errorInput : S.input} placeholder="Brief description shown on project card" />
            {errors.description && <div style={{ color: "#FF7043", fontSize: 11, marginTop: 4 }}>{errors.description}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Instructions * (shown to interns at the top of the assignment)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5}
              style={errors.instructions ? { ...S.textarea, border: "1px solid rgba(239,83,80,0.5)" } : S.textarea}
              placeholder="Detailed instructions..." />
            {errors.instructions && <div style={{ color: "#FF7043", fontSize: 11, marginTop: 4 }}>{errors.instructions}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Deadline (optional)</label>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Late Fine (XP deducted)</label>
              <input type="number" value={lateFine} onChange={(e) => setLateFine(parseInt(e.target.value) || 0)} style={S.input} min={0} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
            <div>
              <label style={S.label}>XP on Submit</label>
              <input type="number" value={xpOnSubmit} onChange={(e) => setXpOnSubmit(parseInt(e.target.value) || 0)} style={S.input} min={0} />
            </div>
            <div>
              <label style={S.label}>Bonus Threshold (%)</label>
              <input type="number" value={xpBonusThreshold} onChange={(e) => setXpBonusThreshold(parseInt(e.target.value) || 0)} style={S.input} min={0} max={100} />
            </div>
            <div>
              <label style={S.label}>Bonus XP Amount</label>
              <input type="number" value={xpBonusAmount} onChange={(e) => setXpBonusAmount(parseInt(e.target.value) || 0)} style={S.input} min={0} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => { if (validateStep1()) setStep(2); }} style={S.btnPrimary}>
              Next: Build Sections →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16 }}>
          {/* Left panel */}
          <div style={isMobile ? {} : { width: 200, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 600 }}>Sections ({sections.length})</span>
              <span style={{ color: "#1E88E5", fontSize: 12, fontWeight: 700 }}>{totalPoints} pts</span>
            </div>

            <div style={isMobile ? { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 } : {}}>
            {sections.map((sec, idx) => (
              <button key={sec.id} onClick={() => setActiveSectionIdx(idx)} style={{
                flexShrink: isMobile ? 0 : undefined,
                width: isMobile ? "auto" : "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, marginBottom: isMobile ? 0 : 4,
                border: activeSectionIdx === idx ? "1px solid rgba(30,136,229,0.5)" : "1px solid rgba(255,255,255,0.06)",
                background: activeSectionIdx === idx ? "rgba(30,136,229,0.12)" : "#131929",
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                  <span style={{ color: "#E8EDF5", fontSize: 12, fontWeight: activeSectionIdx === idx ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
                    {sec.label || SECTION_TYPE_LABELS[sec.type]}
                  </span>
                </div>
                <div style={{ color: "#5A6478", fontSize: 11, marginTop: 2, paddingLeft: 20 }}>{sec.points} pts</div>
              </button>
            ))}

            </div>
            <div style={{ position: "relative", marginTop: 8 }}>
              <button onClick={() => setShowTypeMenu(!showTypeMenu)} style={{
                width: "100%", padding: "9px 12px", borderRadius: 10,
                border: "1px dashed rgba(30,136,229,0.4)", background: "rgba(30,136,229,0.06)",
                color: "#1E88E5", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>
                + Add Section
              </button>
              {showTypeMenu && (
                <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 4, width: 210, background: "#131929", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, zIndex: 10, overflow: "hidden" }}>
                  {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map((type) => (
                    <button key={type} onClick={() => addSection(type)} style={{
                      width: "100%", textAlign: "left", padding: "10px 14px",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#E8EDF5", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span>{SECTION_TYPE_ICONS[type]}</span>
                      <span>{SECTION_TYPE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {errors.sections && <div style={{ color: "#FF7043", fontSize: 11, marginTop: 8 }}>{errors.sections}</div>}
          </div>

          {/* Right: config */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeSectionIdx !== null && sections[activeSectionIdx] ? (
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{SECTION_TYPE_ICONS[sections[activeSectionIdx].type]}</span>
                    <div>
                      <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 14 }}>{SECTION_TYPE_LABELS[sections[activeSectionIdx].type]}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => moveSection(activeSectionIdx, -1)} disabled={activeSectionIdx === 0}
                      style={{ ...S.btn("#9CA3AF"), padding: "5px 10px", opacity: activeSectionIdx === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveSection(activeSectionIdx, 1)} disabled={activeSectionIdx === sections.length - 1}
                      style={{ ...S.btn("#9CA3AF"), padding: "5px 10px", opacity: activeSectionIdx === sections.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => removeSection(activeSectionIdx)} style={{ ...S.btn("#FF7043"), padding: "5px 10px" }}>Remove</button>
                  </div>
                </div>
                <SectionConfigEditor
                  section={sections[activeSectionIdx]}
                  onChange={(updated) => { const arr = [...sections]; arr[activeSectionIdx] = updated; setSections(arr); }}
                />
              </div>
            ) : (
              <div style={{ ...S.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 240, border: "1px dashed rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>📦</div>
                <div style={{ color: "#5A6478", fontSize: 14 }}>
                  {sections.length === 0 ? "Add your first section" : "Select a section to configure it"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => setStep(1)} style={S.btn()}>← Back</button>
          <button onClick={() => { if (sections.length === 0) { setErrors({ sections: "Add at least one section" }); return; } setErrors({}); setStep(3); }} style={S.btnPrimary}>
            Next: Preview →
          </button>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div>
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ fontSize: 44 }}>{emoji}</span>
              <div>
                <h2 style={{ margin: "0 0 4px", color: "#E8EDF5", fontSize: 20, fontWeight: 800 }}>{title}</h2>
                <p style={{ margin: "0 0 10px", color: "#9CA3AF", fontSize: 14 }}>{description}</p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#5A6478" }}>
                  <span>📦 {sections.length} sections</span>
                  <span>🏆 {totalPoints} total pts</span>
                  <span>⚡ {xpOnSubmit} XP on submit</span>
                  {xpBonusThreshold > 0 && <span>🎯 +{xpBonusAmount} XP if ≥{xpBonusThreshold}%</span>}
                  {deadline && <span>⏰ Due {new Date(deadline).toLocaleDateString()}</span>}
                  {lateFine > 0 && deadline && <span>⚠️ -{lateFine} XP late fine</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <h3 style={{ margin: "0 0 14px", color: "#E8EDF5", fontSize: 14, fontWeight: 700 }}>Sections</h3>
            {sections.map((sec, idx) => (
              <div key={sec.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, marginBottom: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#5A6478", fontSize: 12, minWidth: 20 }}>{idx + 1}.</span>
                <span style={{ fontSize: 18 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>{sec.label}</div>
                  <div style={{ color: "#5A6478", fontSize: 11 }}>{SECTION_TYPE_LABELS[sec.type]}</div>
                </div>
                <span style={{ color: "#1E88E5", fontWeight: 700, fontSize: 13 }}>{sec.points} pts</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "#E8EDF5", fontWeight: 800, fontSize: 14 }}>Total: {totalPoints} pts</span>
            </div>
          </div>

          {instructions && (
            <div style={{ ...S.card, marginTop: 12, background: "rgba(255,255,255,0.01)" }}>
              <div style={{ color: "#5A6478", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Instructions Preview</div>
              <p style={{ margin: 0, color: "#9CA3AF", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{instructions}</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)", gap: 10 }}>
            <button onClick={() => setStep(2)} style={S.btn()}>← Back</button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleSubmit(false)} disabled={isPending} style={{ ...S.btn("#9CA3AF"), opacity: isPending ? 0.5 : 1 }}>
                {isPending ? "Saving..." : "Save as Draft"}
              </button>
              <button onClick={() => handleSubmit(true)} disabled={isPending} style={{ ...S.btnGreen, opacity: isPending ? 0.5 : 1 }}>
                {isPending ? "Publishing..." : "✅ Publish to Interns"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProjectDraft, submitProject, recordMasterclassSectionProgress } from "@/app/actions/custom-projects";
import { SectionRenderer } from "@/components/projects/section-renderer";
import type { Project } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_ICONS } from "@/app/actions/custom-projects-types";

interface Props {
  project: Project;
  existingAnswers: Record<string, unknown>;
}

export function ProjectWizardClient({ project, existingAnswers }: Props) {
  const router = useRouter();
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(existingAnswers);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSectionDrawer, setShowSectionDrawer] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedSectionEvents = useRef<Set<string>>(new Set(
    Object.keys(existingAnswers).filter((k) => existingAnswers[k])
  ));

  const sections = project.sections;
  const currentSection = sections[currentSectionIdx];
  const totalPoints = sections.reduce((s, sec) => s + sec.points, 0);

  function isSectionComplete(idx: number): boolean {
    const sec = sections[idx];
    const ans = answers[sec.id];
    if (!ans) return false;
    if (typeof ans === "object" && ans !== null) return Object.keys(ans).length > 0;
    return Boolean(ans);
  }

  const completedCount = sections.filter((_, i) => isSectionComplete(i)).length;
  const overallPct = Math.round((completedCount / sections.length) * 100);

  function triggerAutoSave(newAnswers: Record<string, unknown>) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus("saving");
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const res = await saveProjectDraft(project.id, newAnswers);
        setSaveStatus(res.ok ? "saved" : "error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
  }

  function handleAnswerChange(sectionId: string, value: unknown) {
    const updated = { ...answers, [sectionId]: value };
    setAnswers(updated);
    triggerAutoSave(updated);
    // Fire per-section masterclass mission event once per section
    const hasContent = value && (typeof value !== "object" || Object.keys(value as object).length > 0);
    if (hasContent && !firedSectionEvents.current.has(sectionId)) {
      firedSectionEvents.current.add(sectionId);
      recordMasterclassSectionProgress(project.id, sectionId).catch(() => {});
    }
  }

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  async function handleSubmit() {
    setSaveStatus("saving");
    const saveRes = await saveProjectDraft(project.id, answers);
    if (!saveRes.ok) { setSaveStatus("error"); alert("Failed to save: " + saveRes.error); return; }
    startSubmitTransition(async () => {
      const res = await submitProject(project.id);
      if (res.ok) {
        if (res.data.late) alert("Submitted! Note: Your submission was late. A fine has been applied.");
        router.push(`/projects/${project.id}`);
      } else {
        alert(res.error);
      }
    });
  }

  const saveLabel = saveStatus === "saving" ? "💾 Saving…"
    : saveStatus === "saved"  ? "✓ Saved"
    : saveStatus === "error"  ? "✗ Error"
    : "Auto-saves";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "#0A0E1A", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* ── Sidebar (desktop only) ── */
        .pw-sidebar { width: 240px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.07); background: #0D1117; display: flex; flex-direction: column; }
        .pw-mobile-bar { display: none; flex-shrink: 0; }
        @media (max-width: 768px) {
          .pw-sidebar { display: none !important; }
          .pw-mobile-bar { display: flex; flex-direction: column; }
        }
        @media (min-width: 769px) {
          .pw-mobile-bar { display: none !important; }
        }

        /* ── Header ── */
        .pw-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); background: #0D1117; flex-shrink: 0; gap: 10px; }
        .pw-header-title { font-size: 14px; font-weight: 700; color: #E8EDF5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pw-header-sub { font-size: 11px; color: #5A6478; margin-top: 1px; }
        .pw-submit-btn { padding: 9px 18px; background: linear-gradient(135deg, #4CAF50, #2E7D32); border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; white-space: nowrap; flex-shrink: 0; }
        .pw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Sidebar items ── */
        .pw-sb-item { width: 100%; text-align: left; padding: 9px 11px; border-radius: 8px; margin-bottom: 3px; cursor: pointer; font-family: 'Nunito', sans-serif; display: flex; align-items: center; justify-content: space-between; border: none; }

        /* ── Form area ── */
        .pw-form-area { flex: 1; overflow-y: auto; padding: 28px 24px; }
        @media (max-width: 768px) {
          .pw-form-area { padding: 16px 16px 24px; }
        }

        /* ── Desktop bottom nav ── */
        .pw-bottom { flex-shrink: 0; padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.07); background: #0D1117; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .pw-nav-btn { padding: 11px 22px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; }
        /* Fixed-size dot containers — prevent width shifts */
        .pw-dot-wrap { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pw-dot { height: 8px; border-radius: 99px; border: none; cursor: pointer; padding: 0; transition: background 0.2s; }

        /* ── Mobile bottom nav ── */
        .pw-mob-bottom { display: none; }
        @media (max-width: 768px) {
          .pw-bottom { display: none !important; }
          .pw-mob-bottom {
            display: flex; flex-direction: column; flex-shrink: 0;
            background: #0D1117; border-top: 1px solid rgba(255,255,255,0.07);
            padding: 10px 16px 20px; gap: 10px;
          }
          .pw-mob-nav-row { display: flex; align-items: center; gap: 10px; }
          .pw-mob-prev { flex: 1; padding: 13px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #9CA3AF; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; text-align: center; }
          .pw-mob-prev:disabled { opacity: 0.35; }
          .pw-mob-next { flex: 2; padding: 13px; border-radius: 12px; border: none; background: linear-gradient(135deg, #1E88E5, #1565C0); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; text-align: center; }
          .pw-mob-submit { flex: 2; padding: 13px; border-radius: 12px; border: none; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; text-align: center; }
          .pw-mob-submit:disabled { opacity: 0.5; }
          .pw-mob-progress { height: 3px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
          .pw-mob-progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #1E88E5, #4CAF50); transition: width 0.35s ease; }
          .pw-mob-step-info { display: flex; align-items: center; justify-content: space-between; }
        }

        /* ── Mobile section bar (top) ── */
        .pw-mob-secbar { background: #0D1117; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .pw-mob-secbar-btn { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 16px; background: none; border: none; cursor: pointer; text-align: left; font-family: 'Nunito', sans-serif; }
        .pw-mob-secbar-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(30,136,229,0.12); border: 1px solid rgba(30,136,229,0.2); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .pw-mob-secbar-badge { margin-left: auto; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        /* ── Section header in form ── */
        .pw-sec-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
        .pw-sec-icon { width: 46px; height: 46px; border-radius: 13px; background: rgba(30,136,229,0.12); border: 1px solid rgba(30,136,229,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .pw-sec-title { font-size: 18px; font-weight: 800; color: #E8EDF5; font-family: 'Space Grotesk', sans-serif; line-height: 1.3; }
        .pw-sec-meta { font-size: 12px; color: #5A6478; margin-top: 4px; }

        .pw-instr { background: rgba(30,136,229,0.07); border: 1px solid rgba(30,136,229,0.18); border-radius: 12px; padding: 13px 16px; margin-bottom: 20px; color: #9CA3AF; font-size: 13px; line-height: 1.75; }

        /* ── Drawer (mobile sections sheet) ── */
        .pw-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; backdrop-filter: blur(2px); }
        .pw-drawer { position: fixed; bottom: 0; left: 0; right: 0; background: #131929; border-radius: 24px 24px 0 0; max-height: 82dvh; overflow: hidden; display: flex; flex-direction: column; z-index: 101; box-shadow: 0 -8px 40px rgba(0,0,0,0.5); }
        .pw-drawer-handle { width: 44px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 12px auto 4px; }
        .pw-drawer-header { padding: 8px 20px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .pw-drawer-scroll { overflow-y: auto; padding: 10px 14px 36px; }
        .pw-drawer-item { width: 100%; text-align: left; padding: 14px 14px; border-radius: 14px; margin-bottom: 7px; cursor: pointer; display: flex; align-items: center; gap: 13px; font-family: 'Nunito', sans-serif; border: none; }

        /* ── Confirm modal ── */
        .pw-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200; display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(3px); }
        .pw-modal { background: #131929; border-radius: 24px 24px 0 0; padding: 24px 20px 40px; width: 100%; border-top: 1px solid rgba(255,255,255,0.08); box-shadow: 0 -8px 40px rgba(0,0,0,0.5); }
        @media (min-width: 640px) {
          .pw-modal-overlay { align-items: center; padding: 20px; }
          .pw-modal { border-radius: 20px; max-width: 460px; padding: 30px; }
        }
        .pw-confirm-check { display: flex; align-items: center; gap: 11px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .pw-confirm-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
      `}</style>

      {/* ── Top header ── */}
      <div className="pw-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={() => router.push(`/projects/${project.id}`)}
            style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 20, flexShrink: 0, lineHeight: 1, padding: "4px 6px" }}>
            ←
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="pw-header-title">{project.emoji} {project.title}</div>
            <div className="pw-header-sub">{completedCount}/{sections.length} sections · {overallPct}% done</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: saveStatus === "saved" ? "#4CAF50" : saveStatus === "error" ? "#FF7043" : "#5A6478", whiteSpace: "nowrap" }}>
            {saveLabel}
          </span>
          <button className="pw-submit-btn" onClick={() => setShowConfirm(true)} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit All"}
          </button>
        </div>
      </div>

      {/* ── Mobile: section bar ── */}
      <div className="pw-mobile-bar pw-mob-secbar">
        <button className="pw-mob-secbar-btn" onClick={() => setShowSectionDrawer(true)}>
          <div className="pw-mob-secbar-icon">{SECTION_TYPE_ICONS[currentSection.type]}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentSection.label}</div>
            <div style={{ color: "#5A6478", fontSize: 11, marginTop: 1 }}>Section {currentSectionIdx + 1} of {sections.length} · {currentSection.points} pts</div>
          </div>
          <div className="pw-mob-secbar-badge">
            {isSectionComplete(currentSectionIdx)
              ? <span style={{ background: "rgba(76,175,80,0.15)", color: "#4CAF50", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>✓ Done</span>
              : <span style={{ background: "rgba(255,193,7,0.12)", color: "#FFC107", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>Pending</span>
            }
            <span style={{ color: "#5A6478", fontSize: 16 }}>☰</span>
          </div>
        </button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Desktop sidebar */}
        <div className="pw-sidebar">
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ color: "#5A6478", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Sections · {totalPoints} pts
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
              <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,#1E88E5,#4CAF50)", transition: "width 0.35s ease" }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {sections.map((sec, idx) => {
              const complete = isSectionComplete(idx);
              const active = currentSectionIdx === idx;
              return (
                <button key={sec.id} className="pw-sb-item" onClick={() => setCurrentSectionIdx(idx)} style={{
                  border: active ? "1px solid rgba(30,136,229,0.4)" : "1px solid transparent",
                  background: active ? "rgba(30,136,229,0.1)" : "transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: active ? "#1E88E5" : "#E8EDF5", fontSize: 12, fontWeight: active ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 124 }}>{sec.label}</div>
                      <div style={{ color: "#5A6478", fontSize: 10, marginTop: 1 }}>{sec.points} pts</div>
                    </div>
                  </div>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: complete ? "#4CAF50" : "rgba(255,255,255,0.06)", color: complete ? "#fff" : "#5A6478" }}>
                    {complete ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: saveStatus === "saved" ? "#4CAF50" : saveStatus === "error" ? "#FF7043" : "#5A6478" }}>
            {saveLabel}
          </div>
        </div>

        {/* Section form */}
        <div className="pw-form-area">
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div className="pw-sec-header">
              <div className="pw-sec-icon">{SECTION_TYPE_ICONS[currentSection.type]}</div>
              <div>
                <div className="pw-sec-title">{currentSection.label}</div>
                <div className="pw-sec-meta">
                  Section {currentSectionIdx + 1} of {sections.length} &middot; {currentSection.points} pts &middot;{" "}
                  {isSectionComplete(currentSectionIdx)
                    ? <span style={{ color: "#4CAF50" }}>✓ Filled in</span>
                    : <span style={{ color: "#FFC107" }}>Not yet filled</span>}
                </div>
              </div>
            </div>
            {currentSection.instructions && (
              <div className="pw-instr">{currentSection.instructions}</div>
            )}
            <SectionRenderer
              section={currentSection}
              answer={answers[currentSection.id]}
              onChange={(value) => handleAnswerChange(currentSection.id, value)}
            />
          </div>
        </div>
      </div>

      {/* ── Desktop bottom navigation — fixed dot containers prevent shaking ── */}
      <div className="pw-bottom">
        <button className="pw-nav-btn"
          onClick={() => setCurrentSectionIdx((i) => Math.max(0, i - 1))}
          disabled={currentSectionIdx === 0}
          style={{ border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: currentSectionIdx === 0 ? "#5A6478" : "#9CA3AF", opacity: currentSectionIdx === 0 ? 0.4 : 1 }}>
          ← Prev
        </button>

        {/* Each dot sits inside a fixed 22×22 container — no layout shift */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center", flex: 1, flexWrap: "wrap" }}>
          {sections.map((_, idx) => (
            <div key={idx} className="pw-dot-wrap">
              <button className="pw-dot" onClick={() => setCurrentSectionIdx(idx)} style={{
                width: idx === currentSectionIdx ? 20 : 8,
                background: idx === currentSectionIdx ? "#1E88E5" : isSectionComplete(idx) ? "#4CAF50" : "rgba(255,255,255,0.12)",
              }} />
            </div>
          ))}
        </div>

        {currentSectionIdx < sections.length - 1 ? (
          <button className="pw-nav-btn"
            onClick={() => setCurrentSectionIdx((i) => i + 1)}
            style={{ background: "rgba(30,136,229,0.15)", border: "1px solid rgba(30,136,229,0.35)", color: "#1E88E5" }}>
            Next →
          </button>
        ) : (
          <button className="pw-nav-btn"
            onClick={() => setShowConfirm(true)} disabled={isSubmitting}
            style={{ background: "linear-gradient(135deg,#4CAF50,#2E7D32)", border: "none", color: "#fff", opacity: isSubmitting ? 0.5 : 1 }}>
            Submit ✓
          </button>
        )}
      </div>

      {/* ── Mobile bottom navigation ── */}
      <div className="pw-mob-bottom">
        {/* Progress bar */}
        <div className="pw-mob-progress">
          <div className="pw-mob-progress-fill" style={{ width: `${((currentSectionIdx + 1) / sections.length) * 100}%` }} />
        </div>
        {/* Step counter + save status */}
        <div className="pw-mob-step-info">
          <span style={{ color: "#5A6478", fontSize: 11, fontWeight: 600 }}>
            {currentSectionIdx + 1} / {sections.length} sections
          </span>
          <span style={{ fontSize: 11, color: saveStatus === "saved" ? "#4CAF50" : saveStatus === "error" ? "#FF7043" : "#5A6478" }}>
            {saveLabel}
          </span>
        </div>
        {/* Prev / Next or Submit */}
        <div className="pw-mob-nav-row">
          <button className="pw-mob-prev"
            onClick={() => setCurrentSectionIdx((i) => Math.max(0, i - 1))}
            disabled={currentSectionIdx === 0}>
            ← Back
          </button>
          {currentSectionIdx < sections.length - 1 ? (
            <button className="pw-mob-next" onClick={() => setCurrentSectionIdx((i) => i + 1)}>
              Next →
            </button>
          ) : (
            <button className="pw-mob-submit" onClick={() => setShowConfirm(true)} disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit All ✓"}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile: sections drawer ── */}
      {showSectionDrawer && (
        <>
          <div className="pw-drawer-overlay" onClick={() => setShowSectionDrawer(false)} />
          <div className="pw-drawer">
            <div className="pw-drawer-handle" />
            <div className="pw-drawer-header">
              <div>
                <div style={{ color: "#E8EDF5", fontWeight: 800, fontSize: 16 }}>All Sections</div>
                <div style={{ color: "#5A6478", fontSize: 11, marginTop: 2 }}>{completedCount} of {sections.length} complete</div>
              </div>
              <button onClick={() => setShowSectionDrawer(false)}
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#9CA3AF", cursor: "pointer", fontSize: 15, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div className="pw-drawer-scroll">
              {sections.map((sec, idx) => {
                const complete = isSectionComplete(idx);
                const active = currentSectionIdx === idx;
                return (
                  <button key={sec.id} className="pw-drawer-item"
                    onClick={() => { setCurrentSectionIdx(idx); setShowSectionDrawer(false); }}
                    style={{ background: active ? "rgba(30,136,229,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${active ? "rgba(30,136,229,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: active ? "rgba(30,136,229,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${active ? "rgba(30,136,229,0.3)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {SECTION_TYPE_ICONS[sec.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: active ? "#1E88E5" : "#E8EDF5", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.label}</div>
                      <div style={{ color: "#5A6478", fontSize: 11, marginTop: 2 }}>{sec.points} pts</div>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: complete ? "rgba(76,175,80,0.2)" : active ? "rgba(30,136,229,0.15)" : "rgba(255,255,255,0.06)", color: complete ? "#4CAF50" : active ? "#1E88E5" : "#5A6478", border: `1px solid ${complete ? "rgba(76,175,80,0.3)" : active ? "rgba(30,136,229,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                      {complete ? "✓" : idx + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Submit confirmation ── */}
      {showConfirm && (
        <div className="pw-modal-overlay">
          <div className="pw-modal">
            <h3 style={{ margin: "0 0 6px", color: "#E8EDF5", fontSize: 18, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Submit {project.title}?</h3>
            <p style={{ margin: "0 0 18px", color: "#8892A4", fontSize: 13, lineHeight: 1.6 }}>Once submitted you cannot edit your answers.</p>
            <div style={{ marginBottom: 18 }}>
              {sections.map((sec, idx) => (
                <div key={sec.id} className="pw-confirm-check">
                  <div className="pw-confirm-dot" style={{ background: isSectionComplete(idx) ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.07)", color: isSectionComplete(idx) ? "#4CAF50" : "#5A6478", border: `1px solid ${isSectionComplete(idx) ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                    {isSectionComplete(idx) ? "✓" : "○"}
                  </div>
                  <span style={{ color: isSectionComplete(idx) ? "#E8EDF5" : "#5A6478", fontSize: 13, flex: 1 }}>{sec.label}</span>
                  <span style={{ fontSize: 11, color: "#5A6478" }}>{sec.points} pts</span>
                </div>
              ))}
            </div>
            {project.deadline && new Date() > new Date(project.deadline) && (
              <div style={{ background: "rgba(255,112,67,0.1)", border: "1px solid rgba(255,112,67,0.3)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, color: "#FF7043", fontSize: 13 }}>
                ⚠️ Deadline passed — a ₦{project.late_fine_amount.toLocaleString()} fine will be applied.
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <button onClick={() => { setShowConfirm(false); handleSubmit(); }} disabled={isSubmitting}
                style={{ padding: "15px", borderRadius: 13, background: "linear-gradient(135deg,#4CAF50,#2E7D32)", border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? "Submitting…" : "Confirm & Submit ✓"}
              </button>
              <button onClick={() => setShowConfirm(false)}
                style={{ padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9CA3AF", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

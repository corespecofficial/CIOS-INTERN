"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProjectDraft, submitProject } from "@/app/actions/custom-projects";
import { SectionRenderer } from "@/components/projects/section-renderer";
import type { Project } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_ICONS } from "@/app/actions/custom-projects-types";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Props {
  project: Project;
  existingAnswers: Record<string, unknown>;
}

export function ProjectWizardClient({ project, existingAnswers }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(existingAnswers);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSectionDrawer, setShowSectionDrawer] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "100dvh" : "calc(100vh - 64px)", overflow: "hidden", background: "var(--bg-primary)" }}>

      {/* ── Top header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "12px 16px" : "12px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "#0D1117", flexShrink: 0, gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button onClick={() => router.push(`/projects/${project.id}`)}
            style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>
            ←
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#E8EDF5", fontSize: isMobile ? 13 : 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.emoji} {project.title}
            </div>
            <div style={{ color: "#5A6478", fontSize: 11 }}>
              {completedCount}/{sections.length} sections done
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Save indicator */}
          <span style={{ fontSize: 11, color: saveStatus === "saved" ? "#4CAF50" : saveStatus === "error" ? "#FF7043" : "#5A6478" }}>
            {saveStatus === "saving" ? "💾" : saveStatus === "saved" ? "✓ Saved" : saveStatus === "error" ? "✗" : ""}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            style={{
              padding: isMobile ? "8px 14px" : "8px 18px",
              background: "linear-gradient(135deg,#4CAF50,#2E7D32)",
              border: "none", borderRadius: 8, color: "#fff",
              fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: "pointer",
              opacity: isSubmitting ? 0.5 : 1,
            }}>
            {isSubmitting ? "Submitting..." : "Submit All"}
          </button>
        </div>
      </div>

      {/* ── Mobile: section progress bar + section picker ── */}
      {isMobile && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0A0E1A" }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
            <div style={{
              height: "100%", width: `${((currentSectionIdx + 1) / sections.length) * 100}%`,
              background: "linear-gradient(90deg,#1E88E5,#4CAF50)", transition: "width 0.3s ease",
            }} />
          </div>

          {/* Section name + toggle */}
          <button
            onClick={() => setShowSectionDrawer(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{SECTION_TYPE_ICONS[currentSection.type]}</span>
              <div>
                <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>{currentSection.label}</div>
                <div style={{ color: "#5A6478", fontSize: 11 }}>Section {currentSectionIdx + 1} of {sections.length} · {currentSection.points} pts</div>
              </div>
            </div>
            <span style={{ color: "#5A6478", fontSize: 12 }}>All sections ▾</span>
          </button>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", background: "#0A0E1A", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#5A6478", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Sections · {totalPoints} pts
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {sections.map((sec, idx) => {
                const complete = isSectionComplete(idx);
                const active = currentSectionIdx === idx;
                return (
                  <button key={sec.id} onClick={() => setCurrentSectionIdx(idx)} style={{
                    width: "100%", textAlign: "left", padding: "9px 11px", borderRadius: 8, marginBottom: 3,
                    border: active ? "1px solid rgba(30,136,229,0.4)" : "1px solid transparent",
                    background: active ? "rgba(30,136,229,0.1)" : "transparent", cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 13 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                        <span style={{ color: active ? "#1E88E5" : "#E8EDF5", fontSize: 12, fontWeight: active ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
                          {sec.label}
                        </span>
                      </div>
                      <span style={{
                        width: 16, height: 16, borderRadius: "50%", fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        background: complete ? "#4CAF50" : "rgba(255,255,255,0.06)",
                        color: complete ? "#fff" : "#5A6478",
                      }}>{complete ? "✓" : ""}</span>
                    </div>
                    <div style={{ color: "#5A6478", fontSize: 10, marginTop: 2, paddingLeft: 20 }}>{sec.points} pts</div>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "#5A6478" }}>
              {saveStatus === "saving" ? "💾 Saving..." : saveStatus === "saved" ? <span style={{ color: "#4CAF50" }}>✓ Saved</span> : saveStatus === "error" ? <span style={{ color: "#FF7043" }}>✗ Failed</span> : "Auto-saves as you type"}
            </div>
          </div>
        )}

        {/* Section form */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 16px 120px" : "24px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>{SECTION_TYPE_ICONS[currentSection.type]}</span>
                <div>
                  <h2 style={{ margin: 0, color: "#E8EDF5", fontSize: 18, fontWeight: 800 }}>{currentSection.label}</h2>
                  <div style={{ color: "#5A6478", fontSize: 12, marginTop: 2 }}>
                    Section {currentSectionIdx + 1} of {sections.length} · {currentSection.points} pts
                  </div>
                </div>
              </div>
            )}

            {currentSection.instructions && (
              <div style={{
                background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)",
                borderRadius: 10, padding: isMobile ? "10px 14px" : "12px 16px",
                marginBottom: 16, color: "#9CA3AF", fontSize: 13, lineHeight: 1.6,
              }}>
                {currentSection.instructions}
              </div>
            )}

            <SectionRenderer
              section={currentSection}
              answer={answers[currentSection.id]}
              onChange={(value) => handleAnswerChange(currentSection.id, value)}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom navigation ── */}
      <div style={{
        flexShrink: 0, padding: isMobile ? "12px 16px" : "12px 24px",
        borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0D1117",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>
        <button
          onClick={() => setCurrentSectionIdx((i) => Math.max(0, i - 1))}
          disabled={currentSectionIdx === 0}
          style={{
            padding: isMobile ? "10px 16px" : "9px 20px",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            background: "transparent", color: currentSectionIdx === 0 ? "#5A6478" : "#9CA3AF",
            cursor: currentSectionIdx === 0 ? "default" : "pointer", fontSize: 13, fontWeight: 600,
            opacity: currentSectionIdx === 0 ? 0.4 : 1,
          }}>
          ← Prev
        </button>

        {/* Dot indicators */}
        <div style={{ display: "flex", gap: isMobile ? 5 : 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center", flex: 1 }}>
          {sections.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentSectionIdx(idx)} style={{
              width: isMobile ? 8 : 10, height: isMobile ? 8 : 10, borderRadius: "50%", border: "none",
              cursor: "pointer", padding: 0,
              background: idx === currentSectionIdx ? "#1E88E5" : isSectionComplete(idx) ? "#4CAF50" : "rgba(255,255,255,0.12)",
              transition: "background 0.2s",
            }} />
          ))}
        </div>

        {currentSectionIdx < sections.length - 1 ? (
          <button
            onClick={() => setCurrentSectionIdx((i) => i + 1)}
            style={{
              padding: isMobile ? "10px 16px" : "9px 20px",
              background: "rgba(30,136,229,0.2)", border: "1px solid rgba(30,136,229,0.4)",
              borderRadius: 8, color: "#1E88E5", cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}>
            Next →
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            style={{
              padding: isMobile ? "10px 16px" : "9px 20px",
              background: "linear-gradient(135deg,#4CAF50,#2E7D32)",
              border: "none", borderRadius: 8, color: "#fff",
              cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: isSubmitting ? 0.5 : 1,
            }}>
            Submit
          </button>
        )}
      </div>

      {/* ── Mobile: Section drawer overlay ── */}
      {isMobile && showSectionDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div onClick={() => setShowSectionDrawer(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#131929", borderRadius: "20px 20px 0 0",
            maxHeight: "75vh", overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 15 }}>All Sections</span>
              <button onClick={() => setShowSectionDrawer(false)}
                style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 12px 24px" }}>
              {sections.map((sec, idx) => {
                const complete = isSectionComplete(idx);
                const active = currentSectionIdx === idx;
                return (
                  <button key={sec.id} onClick={() => { setCurrentSectionIdx(idx); setShowSectionDrawer(false); }} style={{
                    width: "100%", textAlign: "left", padding: "14px 14px", borderRadius: 10, marginBottom: 6,
                    border: active ? "1px solid rgba(30,136,229,0.4)" : "1px solid rgba(255,255,255,0.05)",
                    background: active ? "rgba(30,136,229,0.1)" : "rgba(255,255,255,0.02)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ fontSize: 20 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: active ? "#1E88E5" : "#E8EDF5", fontSize: 14, fontWeight: 600 }}>{sec.label}</div>
                      <div style={{ color: "#5A6478", fontSize: 12, marginTop: 2 }}>{sec.points} pts</div>
                    </div>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      background: complete ? "#4CAF50" : "rgba(255,255,255,0.06)",
                      color: complete ? "#fff" : "#5A6478",
                    }}>{complete ? "✓" : idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Submit confirmation modal ── */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
          <div style={{
            background: "#131929", borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "24px 20px 36px" : "28px 28px 24px",
            width: isMobile ? "100%" : "min(440px, 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <h3 style={{ margin: "0 0 8px", color: "#E8EDF5", fontSize: 18, fontWeight: 800 }}>
              Submit {project.title}?
            </h3>
            <p style={{ margin: "0 0 16px", color: "#9CA3AF", fontSize: 14, lineHeight: 1.6 }}>
              Once submitted you can&apos;t edit your answers.
            </p>
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {sections.map((sec, idx) => (
                <div key={sec.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: isSectionComplete(idx) ? "#4CAF50" : "rgba(255,255,255,0.08)",
                    color: isSectionComplete(idx) ? "#fff" : "#5A6478",
                  }}>{isSectionComplete(idx) ? "✓" : "○"}</span>
                  <span style={{ color: isSectionComplete(idx) ? "#E8EDF5" : "#5A6478", fontSize: 13 }}>{sec.label}</span>
                </div>
              ))}
            </div>
            {project.deadline && new Date() > new Date(project.deadline) && (
              <div style={{ background: "rgba(255,112,67,0.1)", border: "1px solid rgba(255,112,67,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#FF7043", fontSize: 13 }}>
                ⚠️ The deadline has passed. A {project.late_fine_amount} XP fine will be applied.
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
              <button onClick={() => setShowConfirm(false)} style={{
                flex: 1, padding: "13px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                color: "#9CA3AF", cursor: "pointer", fontSize: 14, fontWeight: 600,
              }}>Cancel</button>
              <button onClick={() => { setShowConfirm(false); handleSubmit(); }} disabled={isSubmitting} style={{
                flex: 1, padding: "13px",
                background: "linear-gradient(135deg,#4CAF50,#2E7D32)",
                border: "none", borderRadius: 10, color: "#fff",
                cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: isSubmitting ? 0.5 : 1,
              }}>
                {isSubmitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

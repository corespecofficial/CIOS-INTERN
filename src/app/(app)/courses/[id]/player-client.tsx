"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { CourseFull, CourseModuleRow, DiscussionRow, MaterialRow } from "@/lib/db";
import { enrollInCourse, markModuleComplete, issueCertificate, submitQuizAttempt, submitAssignment } from "@/app/actions/courses-lms";
import { addDiscussion, deleteDiscussion, upvoteDiscussion, pinDiscussion } from "@/app/actions/classroom-extras";
import { uploadToCloudinary, humanFileSize } from "@/lib/cloudinary-upload";
import { parseVideoEmbed, embedIframeProps } from "@/lib/video-embed";
import { BossQuizFrame } from "@/components/engagement/boss-quiz-frame";
import { StudyBuddyWidget } from "@/components/engagement/study-buddy-widget";
import { rememberLesson } from "@/components/engagement/resume-card";
import { reportQuestProgress } from "@/app/actions/engagement-v2";
import { useIsMobile } from "@/hooks/use-is-mobile";

/* ─── types ────────────────────────────────────────────────── */
type Tab = "overview" | "qa" | "resources";

/* ─── colours (dark theme) ─────────────────────────────────── */
const C = {
  bg: "#0A0E1A",
  surface: "#111827",
  surfaceHover: "#1a2234",
  border: "rgba(255,255,255,0.07)",
  borderActive: "rgba(30,136,229,0.4)",
  primary: "#1E88E5",
  primaryDim: "rgba(30,136,229,0.15)",
  green: "#66BB6A",
  greenDim: "rgba(102,187,106,0.15)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.12)",
  yellow: "#FFC107",
  text: "#E8EDF5",
  muted: "#8892A4",
  faint: "#5A6478",
};

/* ─── PlayerClient ──────────────────────────────────────────── */
export function PlayerClient({
  course, modules, enrollment, iAmInstructor, meId, meName,
  discussions: initialDiscussions, materials,
}: {
  course: CourseFull;
  modules: CourseModuleRow[];
  enrollment: { enrolled: boolean; progress: number; completedModules: string[]; status: string } | null;
  iAmInstructor: boolean;
  meId: string;
  meName: string;
  discussions: DiscussionRow[];
  materials: MaterialRow[];
}) {
  const isMobile = useIsMobile();
  const [enrolled, setEnrolled] = useState(enrollment?.enrolled || false);
  const [progress, setProgress] = useState(enrollment?.progress || 0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(enrollment?.completedModules || []));
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(modules[0]?.id || null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const active = modules.find((m) => m.id === activeId) || null;
  const activeIdx = modules.findIndex((m) => m.id === activeId);
  const prevModule = activeIdx > 0 ? modules[activeIdx - 1] : null;
  const nextModule = activeIdx < modules.length - 1 ? modules[activeIdx + 1] : null;
  const canWatch = iAmInstructor || enrolled || (active?.is_free_preview ?? false);
  const isComplete = progress >= 100;
  const isQuizOrAssignment = active?.content_type === "quiz" || active?.content_type === "assignment";

  useEffect(() => {
    if (!active) return;
    rememberLesson({ courseId: course.id, courseTitle: course.title, lessonId: active.id, lessonTitle: active.title, href: `/courses/${course.id}`, progressPct: progress });
  }, [active?.id, progress, course.id, course.title, active]);

  // Close drawer when changing lesson
  useEffect(() => { setDrawerOpen(false); }, [activeId]);

  const goTo = useCallback((id: string) => {
    setActiveId(id);
    setTab("overview");
    if (isMobile) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isMobile]);

  async function handleEnroll() {
    setBusy(true);
    const r = await enrollInCourse(course.id);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    setEnrolled(true);
    toast.success("You're enrolled! Start learning 🎓");
  }

  async function handleComplete(m: CourseModuleRow) {
    if (!enrolled) { toast.error("Enroll first to track progress"); return; }
    setBusy(true);
    const r = await markModuleComplete(course.id, m.id);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    const newCompleted = new Set([...completedIds, m.id]);
    setCompletedIds(newCompleted);
    setProgress(r.data!.progress);
    reportQuestProgress("lesson_completed").catch(() => {});
    window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: 20, label: m.title } }));
    if (r.data!.completed) {
      toast.success("🎉 Course completed! Claim your certificate below.");
    } else {
      toast.success(`✓ Marked complete · +20 XP · ${r.data!.progress}% done`);
    }
  }

  async function claimCertificate() {
    setBusy(true);
    const r = await issueCertificate(course.id);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`🏆 Certificate issued: ${r.data!.certificateNumber}`);
    window.location.href = "/instructor/certificates";
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", maxWidth: 1280, margin: "0 auto", position: "relative" }}>

      {/* ── Mobile curriculum drawer ── */}
      {isMobile && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300 }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(320px, 90vw)",
            background: C.surface, borderLeft: `1px solid ${C.border}`,
            zIndex: 301, display: "flex", flexDirection: "column", overflowY: "auto",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Course Content</div>
              <button onClick={() => setDrawerOpen(false)} style={iconBtn}>✕</button>
            </div>
            <CurriculumList modules={modules} completedIds={completedIds} activeId={activeId} iAmInstructor={iAmInstructor} enrolled={enrolled} progress={progress} onSelect={goTo} />
          </div>
        </>
      )}

      {/* ── Top navigation bar ── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: isMobile ? "10px 14px" : "12px 20px",
        marginBottom: 12, display: "flex", alignItems: "center", gap: 10,
      }}>
        <Link href="/courses" style={{ color: C.muted, textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          ← Courses
        </Link>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: isMobile ? 12 : 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {course.title}
        </div>
        {enrolled && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 80, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary}, ${C.green})`, transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{progress}%</span>
              </div>
            )}
            <button
              onClick={() => prevModule && goTo(prevModule.id)}
              disabled={!prevModule}
              title="Previous lesson"
              style={{ ...iconBtn, opacity: prevModule ? 1 : 0.3 }}
            >◀</button>
            <button
              onClick={() => nextModule && goTo(nextModule.id)}
              disabled={!nextModule}
              title="Next lesson"
              style={{ ...iconBtn, opacity: nextModule ? 1 : 0.3 }}
            >▶</button>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setDrawerOpen(true)} style={{ ...iconBtn, background: C.primaryDim, color: C.primary, border: `1px solid ${C.borderActive}` }}>
            ☰
          </button>
        )}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Video area */}
          {active && canWatch && active.content_type === "video" && (() => {
            const v = parseVideoEmbed(active.youtube_id);
            if (!v) return (
              <div style={{ aspectRatio: "16/9", borderRadius: 12, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
                {active.youtube_id ? "Unsupported video link" : "No video linked yet"}
              </div>
            );
            const isPortrait = v.provider === "instagram" || v.provider === "tiktok";
            const ifp = embedIframeProps(v.provider);
            return (
              <div style={{ aspectRatio: isPortrait ? "9/16" : "16/9", maxWidth: isPortrait ? 380 : "100%", margin: isPortrait ? "0 auto" : 0, borderRadius: 12, overflow: "hidden", background: "#000" }}>
                <iframe src={v.embedUrl} title={active.title} allow={ifp.allow} allowFullScreen={ifp.allowFullScreen} scrolling="no" style={{ width: "100%", height: "100%", border: "none" }} />
              </div>
            );
          })()}

          {/* Locked state */}
          {active && !canWatch && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
              <p style={{ color: C.muted, marginBottom: 16, fontSize: 14 }}>Enroll to unlock this lesson.</p>
              <button onClick={handleEnroll} disabled={busy} style={btnPrimary}>
                {busy ? "…" : course.price_naira === 0 ? "🎓 Enroll for free" : `🎓 Enroll · ₦${course.price_naira.toLocaleString()}`}
              </button>
            </div>
          )}

          {/* Lesson title + meta */}
          {active && canWatch && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? "14px" : "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {moduleTypeLabel(active.content_type)} · {active.duration_minutes}m
                    </span>
                    {completedIds.has(active.id) && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: C.greenDim, color: C.green, borderRadius: 6, fontWeight: 700 }}>✓ Completed</span>
                    )}
                    {active.is_free_preview && (
                      <span style={{ fontSize: 10, padding: "2px 8px", background: C.greenDim, color: C.green, borderRadius: 6, fontWeight: 700 }}>Free preview</span>
                    )}
                  </div>
                  <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.3 }}>{active.title}</h2>
                </div>
                {!isMobile && enrolled && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {prevModule && (
                      <button onClick={() => goTo(prevModule.id)} style={btnGhostSm}>← Prev</button>
                    )}
                    {nextModule && (
                      <button onClick={() => goTo(nextModule.id)} style={btnGhostSm}>Next →</button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Quiz: clean focused mode ── */}
              {active.content_type === "quiz" && enrolled && (
                active.is_boss_quiz ? (
                  <BossQuizFrame module={active}>
                    <QuizRunner module={active} courseId={course.id} completed={completedIds.has(active.id)}
                      onPassed={() => {
                        setCompletedIds((prev) => new Set([...prev, active.id]));
                        setProgress((p) => Math.max(p, Math.round(((completedIds.size + 1) / modules.length) * 100)));
                      }} />
                  </BossQuizFrame>
                ) : (
                  <QuizRunner module={active} courseId={course.id} completed={completedIds.has(active.id)}
                    onPassed={() => {
                      setCompletedIds((prev) => new Set([...prev, active.id]));
                      setProgress((p) => Math.max(p, Math.round(((completedIds.size + 1) / modules.length) * 100)));
                    }} />
                )
              )}

              {/* ── Assignment ── */}
              {active.content_type === "assignment" && enrolled && (
                <AssignmentRunner module={active} courseId={course.id}
                  onSubmitted={() => {
                    setCompletedIds((prev) => new Set([...prev, active.id]));
                    toast.success("Assignment submitted!");
                  }} />
              )}

              {/* ── Mark complete (non-quiz, non-assignment) ── */}
              {!isQuizOrAssignment && enrolled && !completedIds.has(active.id) && (
                <button onClick={() => handleComplete(active)} disabled={busy} style={{ ...btnPrimary, marginTop: 14 }}>
                  {busy ? "Saving…" : "✓ Mark complete · +20 XP"}
                </button>
              )}

              {/* ── Completed card with next lesson ── */}
              {!isQuizOrAssignment && completedIds.has(active.id) && (
                <CompletedCard nextModule={nextModule} onNext={() => nextModule && goTo(nextModule.id)} />
              )}

              {/* ── Enroll CTA ── */}
              {!enrolled && !iAmInstructor && (
                <button onClick={handleEnroll} disabled={busy} style={{ ...btnPrimary, marginTop: 14 }}>
                  {busy ? "…" : course.price_naira === 0 ? "🎓 Enroll for free" : `🎓 Enroll · ₦${course.price_naira.toLocaleString()}`}
                </button>
              )}

              {/* ── Certificate CTA ── */}
              {isComplete && enrolled && (
                <button onClick={claimCertificate} disabled={busy} style={{ ...btnPrimary, marginTop: 10, background: "linear-gradient(135deg, #FFC107, #F57C00)" }}>
                  {busy ? "…" : "🏆 Claim your certificate"}
                </button>
              )}

              {/* ── Edit (instructor) ── */}
              {iAmInstructor && (
                <Link href={`/instructor/course-builder/${course.id}`} style={{ ...btnGhostSm, display: "inline-block", marginTop: 10, textDecoration: "none" }}>✎ Edit course</Link>
              )}
            </div>
          )}

          {/* ── Content tabs (only for non-quiz/assignment lessons) ── */}
          {active && canWatch && !isQuizOrAssignment && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              {/* Tab bar */}
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                {(["overview", "qa", "resources"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: isMobile ? "11px 14px" : "12px 22px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: "transparent", border: "none",
                      borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
                      color: tab === t ? C.primary : C.muted,
                      textTransform: "capitalize",
                    }}
                  >
                    {t === "overview" ? "Overview" : t === "qa" ? `Q&A (${initialDiscussions.length})` : `Resources (${materials.length})`}
                  </button>
                ))}
              </div>

              {/* Overview tab */}
              {tab === "overview" && (
                <div style={{ padding: isMobile ? "14px" : "20px 24px" }}>
                  {active.summary && (
                    <div style={{ marginBottom: 14, padding: "12px 16px", background: C.bg, borderRadius: 10, borderLeft: `3px solid ${C.primary}` }}>
                      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>{active.summary}</p>
                    </div>
                  )}
                  {active.description ? (
                    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{active.description}</div>
                  ) : (
                    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No description for this lesson.</p>
                  )}
                  {/* AI study tools — only on video/article, not quiz/assignment */}
                  {(active.content_type === "video" || active.content_type === "article") && (
                    <AiLessonTools module={active} />
                  )}
                </div>
              )}

              {/* Q&A tab */}
              {tab === "qa" && (
                <div style={{ padding: isMobile ? "14px" : "20px 24px" }}>
                  <DiscussionsPanel
                    courseId={course.id} moduleId={active.id}
                    initial={initialDiscussions}
                    meId={meId} meName={meName} iAmInstructor={iAmInstructor}
                  />
                </div>
              )}

              {/* Resources tab */}
              {tab === "resources" && (
                <div style={{ padding: isMobile ? "14px" : "20px 24px" }}>
                  {materials.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No resources attached to this course.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {materials.map((m) => (
                        <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer" download
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bg, borderRadius: 10, textDecoration: "none", color: "inherit", border: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 20 }}>📎</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                            {m.file_size > 0 && <div style={{ fontSize: 11, color: C.muted }}>{humanFileSize(m.file_size)}</div>}
                          </div>
                          <span style={{ fontSize: 11, color: C.primary, fontWeight: 700, flexShrink: 0 }}>Download</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Course about section */}
          {course.description && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? "14px" : "20px 24px" }}>
              <h3 style={sectionTitle}>About this course</h3>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{course.description}</div>
              {course.tags.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {course.tags.map((t) => (
                    <span key={t} style={{ fontSize: 10, padding: "3px 9px", background: C.primaryDim, color: C.primary, borderRadius: 6, fontWeight: 600 }}>#{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mobile: progress bar at bottom */}
          {isMobile && enrolled && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
                <span>{completedIds.size} / {modules.length} lessons</span>
                <span style={{ fontWeight: 700, color: C.text }}>{progress}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary}, ${C.green})`, transition: "width 0.5s" }} />
              </div>
              {nextModule && (
                <button onClick={() => goTo(nextModule.id)} style={{ ...btnPrimary, marginTop: 12, fontSize: 13 }}>
                  Next: {nextModule.title} →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop curriculum sidebar ── */}
        {!isMobile && (
          <aside style={{ width: 300, flexShrink: 0, position: "sticky", top: 16, maxHeight: "calc(100vh - 40px)", overflow: "hidden", display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            {/* Sidebar header */}
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Course Content</div>
                <span style={{ fontSize: 11, color: C.muted }}>{completedIds.size}/{modules.length}</span>
              </div>
              {enrolled && (
                <>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary}, ${C.green})`, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{progress}% complete</div>
                </>
              )}
            </div>
            {/* Module list */}
            <CurriculumList modules={modules} completedIds={completedIds} activeId={activeId} iAmInstructor={iAmInstructor} enrolled={enrolled} progress={progress} onSelect={goTo} />
          </aside>
        )}
      </div>

      {enrolled && <StudyBuddyWidget courseId={course.id} />}
    </div>
  );
}

/* ─── Curriculum list (shared between sidebar + drawer) ───── */
function CurriculumList({ modules, completedIds, activeId, iAmInstructor, enrolled, progress: _p, onSelect }: {
  modules: CourseModuleRow[]; completedIds: Set<string>; activeId: string | null;
  iAmInstructor: boolean; enrolled: boolean; progress: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
      {modules.length === 0 && <p style={{ fontSize: 12, color: C.muted, padding: "8px 10px" }}>No lessons yet.</p>}
      {modules.map((m, i) => {
        const done = completedIds.has(m.id);
        const isActive = m.id === activeId;
        const locked = !iAmInstructor && !enrolled && !m.is_free_preview;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              width: "100%", padding: "10px 10px",
              background: isActive ? C.primaryDim : "transparent",
              border: isActive ? `1px solid ${C.borderActive}` : "1px solid transparent",
              borderRadius: 9, cursor: "pointer", textAlign: "left", marginBottom: 2,
            }}
          >
            {/* Completion indicator */}
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
              background: done ? C.green : isActive ? C.primaryDim : "rgba(255,255,255,0.05)",
              color: done ? "#fff" : isActive ? C.primary : C.faint,
              border: done ? `2px solid ${C.green}` : isActive ? `2px solid ${C.primary}` : "2px solid rgba(255,255,255,0.08)",
            }}>
              {done ? "✓" : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? C.text : (done ? C.muted : C.text), lineHeight: 1.35, marginBottom: 3 }}>
                {m.title}
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 10, color: C.faint }}>
                <span>{moduleTypeIcon(m.content_type)}</span>
                <span>{m.duration_minutes}m</span>
                {m.is_free_preview && <span style={{ color: C.green }}>· Free</span>}
                {locked && <span>· 🔒</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Completed card ────────────────────────────────────────── */
function CompletedCard({ nextModule, onNext }: { nextModule: CourseModuleRow | null; onNext: () => void }) {
  return (
    <div style={{ marginTop: 14, padding: 16, background: "linear-gradient(135deg, rgba(102,187,106,0.1), rgba(30,136,229,0.06))", border: `1px solid rgba(102,187,106,0.25)`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: nextModule ? 10 : 0 }}>
        <span style={{ fontSize: 22 }}>✅</span>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.green }}>Lesson completed! Well done.</div>
      </div>
      {nextModule && (
        <>
          <div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 2 }}>Up next</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>{nextModule.title}</div>
          <button onClick={onNext} style={btnPrimary}>Continue →</button>
        </>
      )}
      {!nextModule && (
        <div style={{ fontSize: 13, color: C.text }}>🎓 You&apos;ve completed every lesson! Claim your certificate above.</div>
      )}
    </div>
  );
}

/* ─── Quiz runner — one question at a time ─────────────────── */
function QuizRunner({
  module: m, courseId: _cid, completed, onPassed,
}: { module: CourseModuleRow; courseId: string; completed: boolean; onPassed: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [stepRevealed, setStepRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<{ score: number; passed: boolean; per: Record<string, boolean> } | null>(null);
  const [started, setStarted] = useState(false);

  const questions = m.quiz_questions || [];
  const passScore = m.pass_score || 60;

  function reset() {
    setStep(0);
    setAnswers({});
    setStepRevealed(false);
    setFinalResult(null);
    setStarted(false);
  }

  if (questions.length === 0) {
    return <p style={{ fontSize: 13, color: C.muted, padding: "16px 0" }}>This quiz has no questions yet.</p>;
  }

  // Start screen
  if (!started) {
    return (
      <div style={{ marginTop: 16, padding: "28px 24px", background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>❓</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: "0 0 6px 0" }}>{m.title}</h3>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          {questions.length} question{questions.length !== 1 ? "s" : ""} · Pass at {passScore}%
          {m.pass_score && <> · Multiple attempts allowed</>}
        </div>
        {completed && (
          <div style={{ marginBottom: 14, padding: "8px 14px", background: C.greenDim, border: `1px solid rgba(102,187,106,0.3)`, borderRadius: 8, display: "inline-block", fontSize: 12, fontWeight: 700, color: C.green }}>
            ✓ You&apos;ve already passed this quiz
          </div>
        )}
        <button onClick={() => setStarted(true)} style={btnPrimary}>
          {completed ? "Retake quiz" : "Start quiz"}
        </button>
      </div>
    );
  }

  // Final result screen
  if (finalResult) {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{
          padding: "28px 24px", borderRadius: 14, textAlign: "center",
          background: finalResult.passed ? "linear-gradient(135deg, rgba(102,187,106,0.1), rgba(30,136,229,0.06))" : C.redDim,
          border: `1px solid ${finalResult.passed ? "rgba(102,187,106,0.3)" : "rgba(239,83,80,0.3)"}`,
        }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{finalResult.passed ? "🎉" : "💪"}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: finalResult.passed ? C.green : C.red, marginBottom: 4 }}>
            {finalResult.score}%
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {finalResult.passed ? "You passed!" : "Not quite this time"}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
            Required {passScore}% · You got {finalResult.score}%
          </div>
          {/* Per-question breakdown */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {questions.map((q, i) => (
              <div key={q.id} style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 12, fontWeight: 700,
                background: finalResult.per[q.id] ? C.greenDim : C.redDim,
                color: finalResult.per[q.id] ? C.green : C.red,
                border: `2px solid ${finalResult.per[q.id] ? "rgba(102,187,106,0.4)" : "rgba(239,83,80,0.4)"}`,
              }}>
                {i + 1}
              </div>
            ))}
          </div>
          <button onClick={reset} style={btnGhostSm}>🔁 Try again</button>
        </div>
      </div>
    );
  }

  const q = questions[step];
  const multi = q.options.filter((o) => o.correct).length > 1;
  const selected = answers[q.id] || [];
  const answered = selected.length > 0;
  const isLast = step === questions.length - 1;

  function toggleOption(oid: string) {
    if (stepRevealed) return;
    setAnswers((prev) => {
      const cur = prev[q.id] || [];
      if (multi) return { ...prev, [q.id]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] };
      return { ...prev, [q.id]: cur.includes(oid) ? [] : [oid] };
    });
  }

  async function submitStep() {
    if (!answered) { toast.error("Select an answer first"); return; }
    if (isLast) {
      // Final submit — include all answers
      const all = { ...answers };
      if (!all[q.id]?.length) return;
      setSubmitting(true);
      const r = await submitQuizAttempt(m.id, questions.map((qu) => ({ questionId: qu.id, optionIds: all[qu.id] || [] })));
      setSubmitting(false);
      if (!r.ok) { toast.error(r.error); return; }
      setFinalResult({ score: r.data!.score, passed: r.data!.passed, per: r.data!.per });
      window.dispatchEvent(new CustomEvent("quiz-submitted", { detail: { score: r.data!.score, passed: r.data!.passed } }));
      if (r.data!.passed) { toast.success(`🎉 Passed! +30 XP`); onPassed(); }
      else toast.error(`Scored ${r.data!.score}%, need ${passScore}%`);
    } else {
      setStepRevealed(true);
    }
  }

  function nextStep() {
    setStep((s) => s + 1);
    setStepRevealed(false);
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: C.text }}>Question {step + 1} of {questions.length}</span>
          <span>Pass: {passScore}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${((step) / questions.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary}, #AB47BC)`, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Question card */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 18px", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.5, marginBottom: 16 }}>
          {q.text}
          {multi && <span style={{ fontSize: 10, color: "#AB47BC", marginLeft: 10, fontWeight: 600 }}>Select all that apply</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((o) => {
            const isSel = selected.includes(o.id);
            const showResult = stepRevealed;
            const isCorrect = o.correct;

            let bg = "transparent";
            let border = `1px solid ${C.border}`;
            let textColor = C.text;
            if (showResult) {
              if (isCorrect) { bg = C.greenDim; border = `1px solid rgba(102,187,106,0.4)`; textColor = C.green; }
              else if (isSel && !isCorrect) { bg = C.redDim; border = `1px solid rgba(239,83,80,0.4)`; textColor = C.red; }
            } else if (isSel) {
              bg = C.primaryDim;
              border = `1px solid ${C.primary}`;
            }

            return (
              <button
                key={o.id}
                onClick={() => toggleOption(o.id)}
                disabled={showResult}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 10,
                  background: bg, border,
                  cursor: showResult ? "default" : "pointer",
                  textAlign: "left", transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: multi ? 4 : "50%",
                  border: `2px solid ${isSel || (showResult && isCorrect) ? C.primary : C.faint}`,
                  background: isSel ? C.primary : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 10, color: "#fff",
                }}>
                  {isSel && "✓"}
                  {!isSel && showResult && isCorrect && <span style={{ color: C.green }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: textColor, flex: 1, lineHeight: 1.4 }}>{o.text}</span>
                {showResult && isCorrect && <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>Correct</span>}
                {showResult && isSel && !isCorrect && <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>Wrong</span>}
              </button>
            );
          })}
        </div>

        {/* Per-step feedback */}
        {stepRevealed && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: selected.every((id) => q.options.find((o) => o.id === id)?.correct) && selected.length === q.options.filter((o) => o.correct).length ? C.greenDim : C.redDim, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: selected.every((id) => q.options.find((o) => o.id === id)?.correct) ? C.green : C.red }}>
              {selected.every((id) => q.options.find((o) => o.id === id)?.correct) && selected.length === q.options.filter((o) => o.correct).length ? "✓ Correct!" : "✕ Incorrect"}
            </div>
            {/* Show explanation if it exists in the question data */}
            {(q as { explanation?: string }).explanation && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{(q as { explanation?: string }).explanation}</div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!stepRevealed && (
        <button onClick={submitStep} disabled={submitting || !answered} style={{ ...btnPrimary, opacity: answered ? 1 : 0.5 }}>
          {submitting ? "Scoring…" : isLast ? "Submit quiz" : "Submit answer"}
        </button>
      )}
      {stepRevealed && !isLast && (
        <button onClick={nextStep} style={btnPrimary}>Next question →</button>
      )}
    </div>
  );
}

/* ─── Assignment runner ────────────────────────────────────── */
function AssignmentRunner({ module: m, courseId: _cid, onSubmitted }: { module: CourseModuleRow; courseId: string; onSubmitted: () => void }) {
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ grade: number | null; feedback: string | null; status: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/my-submission/${m.id}`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data?.submission) {
          setContent(data.submission.content || "");
          setFileUrl(data.submission.file_url || null);
          setSubmitted({ grade: data.submission.grade, feedback: data.submission.feedback, status: data.submission.status });
        }
      }
    }).catch(() => {});
  }, [m.id]);

  async function onFile(files: FileList | null) {
    if (!files?.[0]) return;
    const f = files[0];
    if (f.size > 10 * 1024 * 1024) { toast.error("File too big (max 10MB)"); return; }
    setUploading(true);
    try {
      const up = await uploadToCloudinary(f, { folder: "cios-assignments", resourceType: "auto", filename: f.name });
      setFileUrl(up.secureUrl); setFilename(f.name);
      toast.success("Uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  async function submit() {
    setBusy(true);
    const r = await submitAssignment(m.id, content, fileUrl);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    setSubmitted({ grade: null, feedback: null, status: "submitted" });
    setPreviewOpen(false);
    onSubmitted();
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Brief */}
      {m.assignment_prompt && (
        <div style={{ background: "rgba(171,71,188,0.07)", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#AB47BC", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Assignment brief · Max {m.assignment_max_score} pts</div>
          <div style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{m.assignment_prompt}</div>
        </div>
      )}

      {/* Status banners */}
      {submitted?.status === "graded" && (
        <div style={{ background: C.greenDim, border: "1px solid rgba(102,187,106,0.3)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>✓ Graded</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{submitted.grade} / {m.assignment_max_score}</div>
          </div>
          {submitted.feedback && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Instructor feedback</div>
              <p style={{ fontSize: 13, color: C.text, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{submitted.feedback}</p>
            </div>
          )}
        </div>
      )}
      {submitted?.status === "submitted" && (
        <div style={{ background: "rgba(255,193,7,0.07)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.yellow }}>⏳ Submitted · awaiting grade</div>
          <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0 0" }}>You can still update your submission.</p>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Your response</div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
        placeholder="Write your submission here…"
        style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 130, boxSizing: "border-box" }} />

      <div style={{ marginTop: 10 }}>
        <input ref={fileRef} type="file" hidden onChange={(e) => onFile(e.target.files)} />
        {fileUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.muted }}>
            📎 <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }}>
              {filename || "Attached file"}
            </a>
            <button onClick={() => { setFileUrl(null); setFilename(""); }} style={{ background: "transparent", border: `1px solid rgba(239,83,80,0.3)`, color: C.red, borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Remove</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={btnGhostSm}>
            {uploading ? "Uploading…" : "📎 Attach file (max 10MB)"}
          </button>
        )}
      </div>

      <button onClick={() => { if (!content.trim() && !fileUrl) { toast.error("Write something or attach a file"); return; } setPreviewOpen(true); }}
        disabled={busy || uploading} style={{ ...btnPrimary, marginTop: 14 }}>
        {submitted ? "Preview update" : "Preview & submit"}
      </button>

      {/* Preview modal */}
      {previewOpen && (
        <div onClick={() => setPreviewOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, maxHeight: "88vh", overflowY: "auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: C.yellow, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Preview before sending</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "4px 0 0" }}>{m.title}</h3>
              </div>
              <button onClick={() => setPreviewOpen(false)} style={iconBtn}>✕</button>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              {content.trim() ? (
                <p style={{ fontSize: 14, color: C.text, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{content}</p>
              ) : (
                <p style={{ fontSize: 12, color: C.muted, margin: 0, fontStyle: "italic" }}>No written response.</p>
              )}
              {fileUrl && (
                <div style={{ marginTop: 10, padding: 10, background: C.primaryDim, border: `1px solid rgba(30,136,229,0.2)`, borderRadius: 8 }}>
                  📎 <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }}>{filename || "Attached file"}</a>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 10, color: C.faint }}>
                <span>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setPreviewOpen(false)} style={btnGhostSm}>Go back</button>
              <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Submitting…" : "✓ Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AI study tools ──────────────────────────────────────── */
function AiLessonTools({ module: m }: { module: CourseModuleRow }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string | null>(null);
  const [busy, setBusy] = useState<"summary" | "practice" | null>(null);
  const [open, setOpen] = useState(false);

  const baseText = [m.summary, m.description].filter(Boolean).join("\n\n").slice(0, 6000);

  async function doSummarize() {
    if (!baseText) { toast.error("No text to summarize"); return; }
    setBusy("summary");
    try {
      const res = await fetch("/api/ai/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: baseText }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); } else { setSummary(data.summary); }
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  async function doPractice() {
    if (!baseText) { toast.error("No content to generate from"); return; }
    setBusy("practice");
    try {
      const res = await fetch("/api/ai/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: baseText, count: 5 }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); } else { setQuestions(data.text); }
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  return (
    <div style={{ marginTop: 18, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #AB47BC, #1E88E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🤖</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#AB47BC" }}>AI Study Tools</span>
        <span style={{ fontSize: 10, color: C.faint, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={doSummarize} disabled={busy !== null} style={btnPillPrimary}>{busy === "summary" ? "Summarizing…" : "✨ Summarize"}</button>
            <button onClick={doPractice} disabled={busy !== null} style={btnPillGhost}>{busy === "practice" ? "Generating…" : "📝 Practice Qs"}</button>
          </div>
          {summary && <AiBlock label="Summary" content={summary} onClose={() => setSummary(null)} />}
          {questions && <AiBlock label="Practice questions" content={questions} onClose={() => setQuestions(null)} />}
        </div>
      )}
    </div>
  );
}

function AiBlock({ label, content, onClose }: { label: string; content: string; onClose: () => void }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.faint, cursor: "pointer", fontSize: 12 }}>✕</button>
      </div>
      <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{content}</div>
    </div>
  );
}

/* ─── Discussion panel ──────────────────────────────────────── */
function DiscussionsPanel({ courseId, moduleId, initial, meId, meName, iAmInstructor }: {
  courseId: string; moduleId: string | null; initial: DiscussionRow[];
  meId: string; meName: string; iAmInstructor: boolean;
}) {
  const [rows, setRows] = useState<DiscussionRow[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(parentId: string | null, content: string) {
    if (!content.trim()) { toast.error("Write something"); return null; }
    setBusy(true);
    const r = await addDiscussion({ courseId, moduleId, parentId, content });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return null; }
    const newRow: DiscussionRow = { id: r.data!.id, course_id: courseId, module_id: moduleId, parent_id: parentId, author_id: meId, author_name: meName, author_avatar: null, content: content.trim(), is_pinned: false, is_instructor_reply: iAmInstructor, upvotes: 0, created_at: new Date().toISOString() };
    setRows((prev) => [...prev, newRow]);
    return newRow;
  }

  const topLevel = rows.filter((x) => !x.parent_id).sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question or share a thought…" rows={3}
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 60, boxSizing: "border-box" }} />
        <button onClick={async () => { const r = await post(null, draft); if (r) setDraft(""); }} disabled={busy || !draft.trim()} style={{ ...btnPillPrimary, marginTop: 8 }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
      {topLevel.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted }}>No questions yet. Be the first to ask!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topLevel.map((p) => (
            <DiscussionPost key={p.id} post={p} replies={rows.filter((r) => r.parent_id === p.id)} meId={meId} iAmInstructor={iAmInstructor}
              onReply={(c) => post(p.id, c)}
              onDelete={async (id) => { if (!confirm("Delete?")) return; const r = await deleteDiscussion(id); if (r.ok) setRows((prev) => prev.filter((x) => x.id !== id && x.parent_id !== id)); }}
              onUpvote={async (id) => { const r = await upvoteDiscussion(id); if (r.ok) setRows((prev) => prev.map((x) => x.id === id ? { ...x, upvotes: r.data!.upvotes } : x)); }}
              onPin={async (id, pinned) => { const r = await pinDiscussion(id, pinned); if (r.ok) setRows((prev) => prev.map((x) => x.id === id ? { ...x, is_pinned: pinned } : x)); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscussionPost({ post, replies, meId, iAmInstructor, onReply, onDelete, onUpvote, onPin }: {
  post: DiscussionRow; replies: DiscussionRow[]; meId: string; iAmInstructor: boolean;
  onReply: (c: string) => Promise<DiscussionRow | null>;
  onDelete: (id: string) => void;
  onUpvote: (id: string) => void;
  onPin: (id: string, p: boolean) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const initials = (post.author_name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div style={{ background: C.bg, border: post.is_pinned ? `1px solid rgba(255,193,7,0.3)` : `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {post.author_avatar
          ? <img src={post.author_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials || "?"}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{post.author_name || "Unknown"}</span>
            {post.is_instructor_reply && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", borderRadius: 6, fontWeight: 700 }}>INSTRUCTOR</span>}
            {post.is_pinned && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(255,193,7,0.12)", color: C.yellow, borderRadius: 6, fontWeight: 700 }}>📌 PINNED</span>}
            <span style={{ fontSize: 10, color: C.faint }}>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 8 }}>{post.content}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
            <button onClick={() => onUpvote(post.id)} style={miniBtn}>▲ {post.upvotes}</button>
            <button onClick={() => setReplyOpen(!replyOpen)} style={miniBtn}>↩ Reply</button>
            {iAmInstructor && <button onClick={() => onPin(post.id, !post.is_pinned)} style={miniBtn}>{post.is_pinned ? "Unpin" : "📌 Pin"}</button>}
            {post.author_id === meId && <button onClick={() => onDelete(post.id)} style={{ ...miniBtn, color: C.red }}>Delete</button>}
          </div>
          {replyOpen && (
            <div style={{ marginTop: 8 }}>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Your reply…" rows={2}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
              <button onClick={async () => { const r = await onReply(replyText); if (r) { setReplyText(""); setReplyOpen(false); } }} disabled={!replyText.trim()} style={{ ...btnPillPrimary, marginTop: 6 }}>Reply</button>
            </div>
          )}
          {replies.length > 0 && (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
              {replies.map((r) => {
                const rInit = (r.author_name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
                return (
                  <div key={r.id} style={{ display: "flex", gap: 8 }}>
                    {r.author_avatar
                      ? <img src={r.author_avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{rInit}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{r.author_name || "Unknown"}</span>
                        {r.is_instructor_reply && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", borderRadius: 4, fontWeight: 700 }}>INSTRUCTOR</span>}
                        <span style={{ fontSize: 10, color: C.faint }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{r.content}</div>
                      {r.author_id === meId && <button onClick={() => onDelete(r.id)} style={{ ...miniBtn, color: C.red, fontSize: 10, marginTop: 4 }}>Delete</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────────── */
function moduleTypeLabel(type: string) {
  const map: Record<string, string> = { video: "Video", article: "Article", quiz: "Quiz", assignment: "Assignment", live: "Live" };
  return map[type] || type;
}
function moduleTypeIcon(type: string) {
  const map: Record<string, string> = { video: "▶", article: "📄", quiz: "❓", assignment: "📝", live: "🔴" };
  return map[type] || "📄";
}

/* ─── shared styles ─────────────────────────────────────────── */
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: C.text, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 };
const iconBtn: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.muted, width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 };
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", width: "100%", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const btnGhostSm: React.CSSProperties = { background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnPillPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnPillGhost: React.CSSProperties = { background: "transparent", color: "#AB47BC", border: "1px solid rgba(171,71,188,0.3)", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const miniBtn: React.CSSProperties = { background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" };

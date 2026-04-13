"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { CourseFull, CourseModuleRow, DiscussionRow, MaterialRow } from "@/lib/db";
import { enrollInCourse, markModuleComplete, issueCertificate, submitQuizAttempt, submitAssignment } from "@/app/actions/courses-lms";
import { addDiscussion, deleteDiscussion, upvoteDiscussion, pinDiscussion } from "@/app/actions/classroom-extras";
import { uploadToCloudinary, humanFileSize } from "@/lib/cloudinary-upload";

export function PlayerClient({
  course, modules, enrollment, iAmInstructor, meId, meName, discussions: initialDiscussions, materials,
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
  const [enrolled, setEnrolled] = useState(enrollment?.enrolled || false);
  const [progress, setProgress] = useState(enrollment?.progress || 0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(enrollment?.completedModules || []));
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(modules[0]?.id || null);

  const active = modules.find((m) => m.id === activeId) || null;
  const canWatch = iAmInstructor || enrolled || (active?.is_free_preview ?? false);
  const isComplete = progress >= 100;

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
    setCompletedIds((prev) => new Set([...prev, m.id]));
    setProgress(r.data!.progress);
    if (r.data!.completed) {
      toast.success("🎉 Course completed! You can now claim your certificate.");
    } else {
      toast.success(`+20 XP · ${r.data!.progress}% complete`);
      // Auto-advance to next module
      const idx = modules.findIndex((x) => x.id === m.id);
      if (idx < modules.length - 1) setActiveId(modules[idx + 1].id);
    }
  }

  async function claimCertificate() {
    setBusy(true);
    const r = await issueCertificate(course.id);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Certificate issued: ${r.data!.certificateNumber}`);
    window.location.href = "/instructor/certificates";
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, fontFamily: "'Nunito', sans-serif" }}>
      {/* Main content */}
      <div style={{ minWidth: 0 }}>
        {/* Header */}
        <div style={{
          background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" style={{ width: 120, aspectRatio: "16/9", borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 120, aspectRatio: "16/9", borderRadius: 10, background: "linear-gradient(135deg, #1E88E5, #AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>📚</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {course.category} · {course.difficulty}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0, lineHeight: 1.3 }}>{course.title}</h1>
              {course.subtitle && <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 0 0" }}>{course.subtitle}</p>}
              {course.instructor_name && (
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 6 }}>
                  Taught by <span style={{ color: "#E8EDF5", fontWeight: 600 }}>{course.instructor_name}</span>
                </div>
              )}
            </div>
          </div>

          {enrolled && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8892A4", marginBottom: 4 }}>
                <span>Your progress</span>
                <span>{completedIds.size} / {modules.length} · {progress}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #66BB6A)", transition: "width 0.5s" }} />
              </div>
            </>
          )}

          {!enrolled && !iAmInstructor && (
            <button onClick={handleEnroll} disabled={busy} style={btnPrimaryBig}>
              {course.price_naira === 0 ? "🎓 Enroll for free" : `🎓 Enroll · ₦${course.price_naira.toLocaleString()}`}
            </button>
          )}
          {isComplete && enrolled && (
            <button onClick={claimCertificate} disabled={busy} style={{ ...btnPrimaryBig, background: "linear-gradient(135deg, #FFC107, #F57C00)" }}>
              🏆 Claim your certificate
            </button>
          )}
          {iAmInstructor && (
            <Link href={`/instructor/course-builder/${course.id}`} style={btnGhost}>✎ Edit course</Link>
          )}
        </div>

        {/* Player */}
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          {!active ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              No lessons published yet.
            </div>
          ) : !canWatch ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
              <p style={{ marginBottom: 16 }}>This lesson is for enrolled students only.</p>
              <button onClick={handleEnroll} disabled={busy} style={btnPrimaryBig}>
                Enroll to continue
              </button>
            </div>
          ) : (
            <>
              {/* Video area */}
              {active.content_type === "video" && active.youtube_id ? (
                <div style={{ aspectRatio: "16/9", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${active.youtube_id}?rel=0&modestbranding=1`}
                    title={active.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              ) : active.content_type === "video" ? (
                <div style={{ aspectRatio: "16/9", borderRadius: 10, background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", color: "#8892A4", marginBottom: 14 }}>
                  No video linked yet
                </div>
              ) : null}

              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5", margin: "0 0 6px 0" }}>{active.title}</h2>
              <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 14, textTransform: "capitalize" }}>
                {active.content_type} · {active.duration_minutes}m
              </div>
              {active.summary && <p style={{ fontSize: 14, color: "#8892A4", marginBottom: 14 }}>{active.summary}</p>}
              {active.description && (
                <div style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 14 }}>
                  {active.description}
                </div>
              )}

              {/* Quiz runner */}
              {active.content_type === "quiz" && enrolled && (
                <QuizRunner
                  module={active}
                  courseId={course.id}
                  completed={completedIds.has(active.id)}
                  onPassed={() => {
                    setCompletedIds((prev) => new Set([...prev, active.id]));
                    setProgress((p) => Math.max(p, Math.round(((completedIds.size + 1) / modules.length) * 100)));
                  }}
                />
              )}

              {/* Assignment runner */}
              {active.content_type === "assignment" && enrolled && (
                <AssignmentRunner
                  module={active}
                  courseId={course.id}
                  onSubmitted={() => toast.success("Submission received")}
                />
              )}

              {/* Standard complete button for non-quiz/assignment types */}
              {active.content_type !== "quiz" && active.content_type !== "assignment" && enrolled && !completedIds.has(active.id) && (
                <button onClick={() => handleComplete(active)} disabled={busy} style={{ ...btnPrimaryBig, marginTop: 20 }}>
                  {busy ? "Saving…" : "✓ Mark as complete · +20 XP"}
                </button>
              )}
              {active.content_type !== "quiz" && completedIds.has(active.id) && (
                <div style={{ marginTop: 20, padding: "10px 16px", background: "rgba(102,187,106,0.1)", color: "#66BB6A", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                  ✓ Completed
                </div>
              )}
            </>
          )}
        </div>

        {/* AI tools for active lesson */}
        {active && (active.content_type === "video" || active.content_type === "article") && (
          <AiLessonTools module={active} />
        )}

        {/* Discussions */}
        <DiscussionsPanel
          courseId={course.id}
          moduleId={active?.id || null}
          initial={initialDiscussions}
          meId={meId}
          meName={meName}
          iAmInstructor={iAmInstructor}
        />

        {/* Course materials */}
        {materials.length > 0 && (
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>📁 Course materials</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {materials.map((m) => (
                <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer" download style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#0A0E1A", borderRadius: 10, textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontSize: 20 }}>📎</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: "#8892A4" }}>{m.file_size > 0 ? humanFileSize(m.file_size) : ""}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "#1E88E5", fontWeight: 700 }}>Download</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        {course.description && (
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>About this course</h3>
            <div style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{course.description}</div>
            {course.tags.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {course.tags.map((t) => (
                  <span key={t} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(30,136,229,0.1)", color: "#1E88E5", borderRadius: 6, fontWeight: 600 }}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar: curriculum */}
      <aside style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16, height: "fit-content", position: "sticky", top: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Curriculum
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "70vh", overflowY: "auto" }}>
          {modules.length === 0 && <p style={{ fontSize: 12, color: "#8892A4" }}>No lessons yet.</p>}
          {modules.map((m, i) => {
            const done = completedIds.has(m.id);
            const isActive = m.id === activeId;
            const locked = !iAmInstructor && !enrolled && !m.is_free_preview;
            return (
              <button
                key={m.id}
                onClick={() => setActiveId(m.id)}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px",
                  background: isActive ? "rgba(30,136,229,0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(30,136,229,0.3)" : "1px solid transparent",
                  borderRadius: 8, cursor: "pointer", textAlign: "left", color: "#E8EDF5",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: done ? "#66BB6A" : "#5A6478", minWidth: 18, marginTop: 2 }}>
                  {done ? "✓" : i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#1E88E5" : "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#8892A4", display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                    <span>{m.content_type === "video" ? "🎬" : m.content_type === "quiz" ? "❓" : "📄"}</span>
                    <span>{m.duration_minutes}m</span>
                    {m.is_free_preview && <span style={{ color: "#66BB6A" }}>· Free</span>}
                    {locked && <span>· 🔒</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/* ── Quiz runner ── */

function QuizRunner({
  module: m, courseId: _cid, completed, onPassed,
}: { module: CourseModuleRow; courseId: string; completed: boolean; onPassed: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; per: Record<string, boolean> } | null>(null);

  const questions = m.quiz_questions || [];
  const passScore = m.pass_score || 60;

  if (questions.length === 0) {
    return <p style={{ fontSize: 13, color: "#8892A4", padding: 16 }}>This quiz has no questions yet.</p>;
  }

  function toggle(qid: string, oid: string, multi: boolean) {
    setAnswers((prev) => {
      const cur = prev[qid] || [];
      if (multi) {
        return { ...prev, [qid]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] };
      }
      return { ...prev, [qid]: cur.includes(oid) ? [] : [oid] };
    });
  }

  async function submit() {
    for (const q of questions) {
      if (!answers[q.id] || answers[q.id].length === 0) {
        toast.error(`Answer all questions before submitting`);
        return;
      }
    }
    setSubmitting(true);
    const r = await submitQuizAttempt(
      m.id,
      questions.map((q) => ({ questionId: q.id, optionIds: answers[q.id] || [] }))
    );
    setSubmitting(false);
    if (!r.ok) { toast.error(r.error); return; }
    setResult({ score: r.data!.score, passed: r.data!.passed, per: r.data!.per });
    if (r.data!.passed) {
      toast.success(`🎉 Passed! +30 XP`);
      onPassed();
    } else {
      toast.error(`Not quite — scored ${r.data!.score}%, need ${passScore}%`);
    }
  }

  function retry() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>
          {questions.length} question{questions.length === 1 ? "" : "s"} · Pass at {passScore}%
        </div>
        {completed && <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderRadius: 8, fontWeight: 700 }}>✓ Passed</span>}
      </div>

      {questions.map((q, qi) => {
        const multi = q.options.filter((o) => o.correct).length > 1;
        const selected = answers[q.id] || [];
        const perResult = result?.per[q.id];
        return (
          <div key={q.id} style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5", marginBottom: 10 }}>
              <span style={{ color: "#5A6478", marginRight: 6 }}>Q{qi + 1}.</span>
              {q.text}
              {multi && <span style={{ fontSize: 10, color: "#AB47BC", marginLeft: 8 }}>(select all that apply)</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {q.options.map((o) => {
                const isSel = selected.includes(o.id);
                const showResult = result != null;
                const isCorrect = o.correct;
                const bg = showResult
                  ? (isCorrect ? "rgba(102,187,106,0.12)" : (isSel ? "rgba(239,83,80,0.1)" : "transparent"))
                  : (isSel ? "rgba(30,136,229,0.12)" : "transparent");
                const border = showResult
                  ? (isCorrect ? "1px solid #66BB6A" : (isSel ? "1px solid #EF5350" : "1px solid rgba(255,255,255,0.05)"))
                  : (isSel ? "1px solid #1E88E5" : "1px solid rgba(255,255,255,0.05)");
                return (
                  <button
                    key={o.id}
                    disabled={showResult}
                    onClick={() => toggle(q.id, o.id, multi)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 8,
                      background: bg, border,
                      cursor: showResult ? "default" : "pointer",
                      textAlign: "left", color: "#E8EDF5", fontSize: 13,
                    }}
                  >
                    <span style={{
                      width: 18, height: 18,
                      border: "2px solid " + (isSel ? "#1E88E5" : "#5A6478"),
                      background: isSel ? "#1E88E5" : "transparent",
                      borderRadius: multi ? 4 : "50%",
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff",
                    }}>{isSel ? "✓" : ""}</span>
                    <span style={{ flex: 1 }}>{o.text}</span>
                    {showResult && isCorrect && <span style={{ fontSize: 13, color: "#66BB6A" }}>✓</span>}
                    {showResult && !isCorrect && isSel && <span style={{ fontSize: 13, color: "#EF5350" }}>✕</span>}
                  </button>
                );
              })}
            </div>
            {result && perResult != null && (
              <div style={{ marginTop: 8, fontSize: 11, color: perResult ? "#66BB6A" : "#EF5350", fontWeight: 700 }}>
                {perResult ? "✓ Correct" : "✕ Incorrect"}
              </div>
            )}
          </div>
        );
      })}

      {!result && (
        <button onClick={submit} disabled={submitting} style={{ ...btnPrimaryBig, marginTop: 10 }}>
          {submitting ? "Scoring…" : `Submit quiz (${Object.keys(answers).length}/${questions.length} answered)`}
        </button>
      )}
      {result && (
        <div style={{
          marginTop: 14, padding: 16, borderRadius: 12,
          background: result.passed ? "rgba(102,187,106,0.12)" : "rgba(239,83,80,0.1)",
          border: `1px solid ${result.passed ? "rgba(102,187,106,0.3)" : "rgba(239,83,80,0.3)"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: result.passed ? "#66BB6A" : "#EF5350" }}>
              {result.passed ? "🎉 Passed!" : "❌ Didn't pass"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{result.score}%</div>
          </div>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 10px 0" }}>
            Required: {passScore}% · You got {result.score}%
          </p>
          {!result.passed && (
            <button onClick={retry} style={btnGhost}>🔁 Retry</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Assignment runner ── */

function AssignmentRunner({
  module: m, courseId: _cid, onSubmitted,
}: { module: CourseModuleRow; courseId: string; onSubmitted: () => void }) {
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState<{ grade: number | null; feedback: string | null; status: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch existing submission
    (async () => {
      const res = await fetch(`/api/my-submission/${m.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.submission) {
          setContent(data.submission.content || "");
          setFileUrl(data.submission.file_url || null);
          setSubmitted({ grade: data.submission.grade, feedback: data.submission.feedback, status: data.submission.status });
        }
      }
    })();
  }, [m.id]);

  async function onFileChange(files: FileList | null) {
    if (!files || !files[0]) return;
    const f = files[0];
    if (f.size > 10 * 1024 * 1024) { toast.error("File too big (max 10MB)"); return; }
    setUploading(true);
    try {
      const up = await uploadToCloudinary(f, { folder: "cios-assignments", resourceType: "auto", filename: f.name });
      setFileUrl(up.secureUrl);
      setFilename(f.name);
      toast.success("Uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  async function submit() {
    if (!content.trim() && !fileUrl) { toast.error("Write something or attach a file"); return; }
    setBusy(true);
    const r = await submitAssignment(m.id, content, fileUrl);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    setSubmitted({ grade: null, feedback: null, status: "submitted" });
    onSubmitted();
  }

  return (
    <div style={{ marginTop: 20 }}>
      {m.assignment_prompt && (
        <div style={{ background: "rgba(171,71,188,0.08)", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#AB47BC", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            📝 Assignment brief · Max score {m.assignment_max_score}
          </div>
          <div style={{ fontSize: 14, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.assignment_prompt}</div>
        </div>
      )}

      {submitted?.status === "graded" ? (
        <div style={{ background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#66BB6A" }}>✓ Graded</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#66BB6A" }}>{submitted.grade} / {m.assignment_max_score}</div>
          </div>
          {submitted.feedback && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Instructor feedback</div>
              <p style={{ fontSize: 13, color: "#E8EDF5", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{submitted.feedback}</p>
            </div>
          )}
        </div>
      ) : submitted?.status === "submitted" ? (
        <div style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FFC107" }}>⏳ Submitted · awaiting grade</div>
          <p style={{ fontSize: 11, color: "#8892A4", margin: "4px 0 0 0" }}>You can still update your submission below.</p>
        </div>
      ) : null}

      <div style={lbl}>Your response</div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        placeholder="Write your submission here..."
        style={{ ...input, minHeight: 140, resize: "vertical" }}
      />
      <div style={{ marginTop: 10 }}>
        <input ref={fileInputRef} type="file" hidden onChange={(e) => onFileChange(e.target.files)} />
        {fileUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8892A4" }}>
            📎 <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1E88E5", textDecoration: "underline" }}>{filename || "Attached file"}</a>
            <button onClick={() => { setFileUrl(null); setFilename(""); }} style={{ background: "transparent", border: "1px solid rgba(239,83,80,0.3)", color: "#EF5350", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Remove</button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={btnGhost}>
            {uploading ? "Uploading…" : "📎 Attach file (optional, max 10MB)"}
          </button>
        )}
      </div>

      <button onClick={submit} disabled={busy || uploading} style={{ ...btnPrimaryBig, marginTop: 14 }}>
        {busy ? "Submitting…" : submitted ? "Update submission" : "Submit assignment"}
      </button>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};

/* ── AI lesson tools ── */

function AiLessonTools({ module: m }: { module: CourseModuleRow }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string | null>(null);
  const [busy, setBusy] = useState<"summary" | "practice" | null>(null);

  const baseText = [m.summary, m.description].filter(Boolean).join("\n\n").slice(0, 6000);

  async function doSummarize() {
    if (!baseText) { toast.error("No text content to summarize"); return; }
    setBusy("summary");
    try {
      const res = await fetch("/api/ai/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: baseText }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); setBusy(null); return; }
      setSummary(data.summary);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  async function doPractice() {
    if (!baseText) { toast.error("No content to generate from"); return; }
    setBusy("practice");
    try {
      const res = await fetch("/api/ai/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: baseText, count: 5 }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); setBusy(null); return; }
      setQuestions(data.text);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(null);
  }

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(171,71,188,0.1), rgba(30,136,229,0.05))", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 14, padding: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #AB47BC, #1E88E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#AB47BC", letterSpacing: 0.5, textTransform: "uppercase" }}>AI study helper</div>
          <div style={{ fontSize: 11, color: "#8892A4" }}>Powered by the admin-configured LLM. Free for students.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={doSummarize} disabled={busy !== null} style={btnPillPrimary}>
          {busy === "summary" ? "Summarizing…" : "✨ Summarize this lesson"}
        </button>
        <button onClick={doPractice} disabled={busy !== null} style={btnPillGhost}>
          {busy === "practice" ? "Generating…" : "📝 Practice questions"}
        </button>
      </div>
      {summary && (
        <div style={{ marginTop: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Summary</div>
          <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{summary}</div>
        </div>
      )}
      {questions && (
        <div style={{ marginTop: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Practice questions</div>
          <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{questions}</div>
        </div>
      )}
    </div>
  );
}

/* ── Discussion panel ── */

function DiscussionsPanel({
  courseId, moduleId, initial, meId, meName, iAmInstructor,
}: {
  courseId: string; moduleId: string | null;
  initial: DiscussionRow[];
  meId: string; meName: string;
  iAmInstructor: boolean;
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
    const newRow: DiscussionRow = {
      id: r.data!.id, course_id: courseId, module_id: moduleId, parent_id: parentId,
      author_id: meId, author_name: meName, author_avatar: null,
      content: content.trim(), is_pinned: false, is_instructor_reply: iAmInstructor, upvotes: 0,
      created_at: new Date().toISOString(),
    };
    setRows((prev) => [...prev, newRow]);
    return newRow;
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const r = await deleteDiscussion(id);
    if (!r.ok) { toast.error(r.error); return; }
    setRows((prev) => prev.filter((x) => x.id !== id && x.parent_id !== id));
  }

  async function onUpvote(id: string) {
    const r = await upvoteDiscussion(id);
    if (!r.ok) { toast.error(r.error); return; }
    setRows((prev) => prev.map((x) => x.id === id ? { ...x, upvotes: r.data!.upvotes } : x));
  }

  async function onPin(id: string, pinned: boolean) {
    const r = await pinDiscussion(id, pinned);
    if (!r.ok) { toast.error(r.error); return; }
    setRows((prev) => prev.map((x) => x.id === id ? { ...x, is_pinned: pinned } : x));
  }

  const topLevel = rows.filter((x) => x.parent_id === null).sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginTop: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
        💬 Discussion ({rows.length})
      </h3>

      <div style={{ marginBottom: 16 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question or share a thought…"
          rows={3}
          style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 60 }}
        />
        <button
          onClick={async () => { const r = await post(null, draft); if (r) setDraft(""); }}
          disabled={busy || !draft.trim()}
          style={{ ...btnPillPrimary, marginTop: 8 }}
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>

      {topLevel.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8892A4" }}>No discussion yet. Be the first.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {topLevel.map((p) => {
            const replies = rows.filter((r) => r.parent_id === p.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return (
              <DiscussionPost
                key={p.id}
                post={p}
                replies={replies}
                meId={meId}
                iAmInstructor={iAmInstructor}
                onReply={(content) => post(p.id, content)}
                onDelete={onDelete}
                onUpvote={onUpvote}
                onPin={onPin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiscussionPost({
  post, replies, meId, iAmInstructor, onReply, onDelete, onUpvote, onPin,
}: {
  post: DiscussionRow; replies: DiscussionRow[];
  meId: string; iAmInstructor: boolean;
  onReply: (content: string) => Promise<DiscussionRow | null>;
  onDelete: (id: string) => void;
  onUpvote: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const mine = post.author_id === meId;

  const initials = (post.author_name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div style={{ background: "#0A0E1A", border: post.is_pinned ? "1px solid rgba(255,193,7,0.3)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {post.author_avatar ? (
          <img src={post.author_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials || "?"}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{post.author_name || "Unknown"}</span>
            {post.is_instructor_reply && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", borderRadius: 6, fontWeight: 700, textTransform: "uppercase" }}>Instructor</span>}
            {post.is_pinned && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(255,193,7,0.15)", color: "#FFC107", borderRadius: 6, fontWeight: 700, textTransform: "uppercase" }}>📌 Pinned</span>}
            <span style={{ fontSize: 10, color: "#5A6478" }}>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 8 }}>{post.content}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
            <button onClick={() => onUpvote(post.id)} style={miniAction}>▲ {post.upvotes}</button>
            <button onClick={() => setReplyOpen(!replyOpen)} style={miniAction}>↩ Reply</button>
            {iAmInstructor && <button onClick={() => onPin(post.id, !post.is_pinned)} style={miniAction}>{post.is_pinned ? "Unpin" : "📌 Pin"}</button>}
            {mine && <button onClick={() => onDelete(post.id)} style={{ ...miniAction, color: "#EF5350" }}>Delete</button>}
          </div>
          {replyOpen && (
            <div style={{ marginTop: 8 }}>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Your reply…" rows={2}
                style={{ width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#E8EDF5", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 50 }} />
              <button
                onClick={async () => {
                  const r = await onReply(replyText);
                  if (r) { setReplyText(""); setReplyOpen(false); }
                }}
                disabled={!replyText.trim()}
                style={{ ...btnPillPrimary, marginTop: 6 }}
              >Reply</button>
            </div>
          )}
          {replies.length > 0 && (
            <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
              {replies.map((r) => {
                const rInitials = (r.author_name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
                return (
                  <div key={r.id} style={{ display: "flex", gap: 8 }}>
                    {r.author_avatar ? (
                      <img src={r.author_avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{rInitials || "?"}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#E8EDF5" }}>{r.author_name || "Unknown"}</span>
                        {r.is_instructor_reply && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", borderRadius: 4, fontWeight: 700 }}>Instructor</span>}
                        <span style={{ fontSize: 10, color: "#5A6478" }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{r.content}</div>
                      {r.author_id === meId && (
                        <button onClick={() => onDelete(r.id)} style={{ ...miniAction, color: "#EF5350", fontSize: 10, marginTop: 4 }}>Delete</button>
                      )}
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

const miniAction: React.CSSProperties = {
  background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
  color: "#8892A4", borderRadius: 6, padding: "3px 8px",
  fontSize: 11, fontWeight: 600, cursor: "pointer",
};
const btnPillPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 20, padding: "8px 16px",
  fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const btnPillGhost: React.CSSProperties = {
  background: "transparent", color: "#AB47BC",
  border: "1px solid rgba(171,71,188,0.3)", borderRadius: 20, padding: "8px 16px",
  fontSize: 12, fontWeight: 700, cursor: "pointer",
};

const btnPrimaryBig: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "12px 20px", width: "100%",
  fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};

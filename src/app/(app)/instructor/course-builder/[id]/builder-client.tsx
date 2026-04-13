"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { CourseFull, CourseModuleRow } from "@/lib/db";
import {
  addModule, updateModule, deleteModule, reorderModules,
  updateCourse, deleteCourse, saveQuiz, saveAssignment,
} from "@/app/actions/courses-lms";
import type { QuizQuestion } from "@/lib/db";

type ContentType = "video" | "article" | "quiz" | "assignment";

export function BuilderClient({ course, initialModules }: { course: CourseFull; initialModules: CourseModuleRow[] }) {
  const router = useRouter();
  const [modules, setModules] = useState<CourseModuleRow[]>(initialModules);
  const [editing, setEditing] = useState<CourseModuleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(course.status);

  async function togglePublish() {
    const next = status === "published" ? "draft" : "published";
    if (next === "published" && modules.length === 0) {
      toast.error("Add at least one lesson before publishing");
      return;
    }
    const r = await updateCourse(course.id, { status: next });
    if (!r.ok) { toast.error(r.error); return; }
    setStatus(next);
    toast.success(next === "published" ? "Course published! Students can now enroll." : "Course set to draft");
  }

  async function onDelete() {
    if (!confirm(`Delete course "${course.title}"? This is permanent and removes all enrollments.`)) return;
    const r = await deleteCourse(course.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Course deleted");
    router.push("/instructor");
  }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = modules.map((m) => m.id);
    const from = ids.indexOf(dragId); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...modules];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setModules(next.map((m, i) => ({ ...m, order_index: i })));
    setDragId(null);
    const r = await reorderModules(course.id, next.map((m) => m.id));
    if (!r.ok) toast.error(r.error);
  }

  async function onDeleteModule(id: string) {
    if (!confirm("Delete this lesson?")) return;
    const r = await deleteModule(id);
    if (!r.ok) { toast.error(r.error); return; }
    setModules((prev) => prev.filter((m) => m.id !== id));
    toast.success("Lesson deleted");
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(30,136,229,0.08))",
        border: "1px solid rgba(171,71,188,0.25)",
        borderRadius: 16, padding: 20, marginBottom: 18,
        display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
      }}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt="" style={{ width: 100, height: 60, borderRadius: 10, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 100, height: 60, borderRadius: 10, background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📚</div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "inline-block", padding: "3px 10px", background: status === "published" ? "rgba(102,187,106,0.2)" : "rgba(255,193,7,0.2)", color: status === "published" ? "#66BB6A" : "#FFC107", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
            {status}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{course.title}</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>
            {modules.length} lesson{modules.length === 1 ? "" : "s"} · {course.total_enrolled} student{course.total_enrolled === 1 ? "" : "s"} · {course.category} · {course.difficulty}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/courses/${course.id}`} style={btnGhost} target="_blank">👁 Preview</Link>
          <button onClick={togglePublish} style={{ ...btnPrimary, background: status === "published" ? "#8892A4" : "linear-gradient(135deg, #66BB6A, #2E7D32)" }}>
            {status === "published" ? "Unpublish" : "🚀 Publish"}
          </button>
        </div>
      </div>

      {/* Lessons / modules list */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Lessons</h3>
            <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0" }}>Drag to reorder</p>
          </div>
          <button onClick={() => setCreating(true)} style={btnPrimary}>+ Add lesson</button>
        </div>

        {modules.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#8892A4", fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📖</div>
            No lessons yet. Add your first lesson to get started.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {modules.map((m, i) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10, padding: "12px 14px", cursor: "grab",
              }}
            >
              <span style={{ color: "#5A6478", fontWeight: 700, width: 24, fontSize: 13 }}>{i + 1}</span>
              <span style={{ fontSize: 18, flexShrink: 0 }}>
                {m.content_type === "video" ? "🎬" : m.content_type === "quiz" ? "❓" : m.content_type === "assignment" ? "📝" : "📄"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
                  {m.content_type} · {m.duration_minutes}m{m.is_free_preview ? " · Free preview" : ""}
                  {m.youtube_id && ` · YouTube: ${m.youtube_id}`}
                </div>
              </div>
              <button onClick={() => setEditing(m)} style={iconBtn}>✎</button>
              <button onClick={() => onDeleteModule(m.id)} style={{ ...iconBtn, color: "#EF5350" }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ marginTop: 18, padding: 16, border: "1px solid rgba(239,83,80,0.25)", borderRadius: 14, background: "rgba(239,83,80,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#EF5350" }}>Delete course</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Permanent. Removes all enrollments + progress.</div>
          </div>
          <button onClick={onDelete} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.4)" }}>Delete course</button>
        </div>
      </div>

      {/* Modals */}
      {(editing || creating) && (
        <ModuleEditor
          courseId={course.id}
          module={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(saved, isNew) => {
            if (isNew) setModules((prev) => [...prev, saved]);
            else setModules((prev) => prev.map((m) => m.id === saved.id ? saved : m));
          }}
        />
      )}
    </div>
  );
}

function ModuleEditor({
  courseId, module: mod, onClose, onSaved,
}: { courseId: string; module: CourseModuleRow | null; onClose: () => void; onSaved: (m: CourseModuleRow, isNew: boolean) => void }) {
  const isNew = !mod;
  const [title, setTitle] = useState(mod?.title || "");
  const [description, setDescription] = useState(mod?.description || "");
  const [summary, setSummary] = useState(mod?.summary || "");
  const [contentType, setContentType] = useState<ContentType>((mod?.content_type as ContentType) || "video");
  const [youtubeId, setYoutubeId] = useState(mod?.youtube_id || "");
  const [duration, setDuration] = useState(mod?.duration_minutes ?? 10);
  const [isFree, setIsFree] = useState(mod?.is_free_preview ?? false);
  const [busy, setBusy] = useState(false);
  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>(mod?.quiz_questions || []);
  const [passScore, setPassScore] = useState<number>(mod?.pass_score ?? 60);
  // Assignment state
  const [assignmentPrompt, setAssignmentPrompt] = useState<string>(mod?.assignment_prompt || "");
  const [assignmentMaxScore, setAssignmentMaxScore] = useState<number>(mod?.assignment_max_score ?? 100);

  async function save() {
    if (!title.trim()) { toast.error("Title required"); return; }
    // Validate quiz/assignment content
    if (contentType === "quiz") {
      if (questions.length === 0) { toast.error("Add at least one quiz question"); return; }
      for (const q of questions) {
        if (!q.text.trim()) { toast.error("Every question needs text"); return; }
        if (q.options.length < 2) { toast.error("Each question needs at least 2 options"); return; }
        if (!q.options.some((o) => o.correct)) { toast.error("Each question needs at least one correct answer marked"); return; }
      }
    }
    if (contentType === "assignment" && !assignmentPrompt.trim()) {
      toast.error("Assignment needs a prompt"); return;
    }

    setBusy(true);
    let savedId: string;
    if (isNew) {
      const r = await addModule({
        courseId, title, description, summary,
        contentType, youtubeId: youtubeId || null,
        durationMinutes: Number(duration) || 0,
        isFreePreview: isFree,
      });
      if (!r.ok) { setBusy(false); toast.error(r.error); return; }
      savedId = r.data!.id;
    } else {
      const r = await updateModule(mod!.id, {
        title, description, summary, contentType,
        youtubeId: youtubeId || null, durationMinutes: Number(duration) || 0,
        isFreePreview: isFree,
      });
      if (!r.ok) { setBusy(false); toast.error(r.error); return; }
      savedId = mod!.id;
    }

    // Persist quiz or assignment data
    if (contentType === "quiz") {
      const qr = await saveQuiz(savedId, questions, passScore);
      if (!qr.ok) { setBusy(false); toast.error(qr.error); return; }
    }
    if (contentType === "assignment") {
      const ar = await saveAssignment(savedId, assignmentPrompt, assignmentMaxScore);
      if (!ar.ok) { setBusy(false); toast.error(ar.error); return; }
    }

    setBusy(false);
    toast.success(isNew ? "Lesson added" : "Lesson updated");
    const saved: CourseModuleRow = {
      id: savedId, course_id: courseId, title, description, summary,
      content_type: contentType, content_url: null, youtube_id: youtubeId || null,
      duration_minutes: Number(duration) || 0, order_index: mod?.order_index ?? 999, is_free_preview: isFree,
      quiz_questions: contentType === "quiz" ? questions : [],
      pass_score: passScore,
      assignment_prompt: contentType === "assignment" ? assignmentPrompt : null,
      assignment_max_score: assignmentMaxScore,
      created_at: mod?.created_at || new Date().toISOString(),
    };
    onSaved(saved, isNew);
    onClose();
  }

  function addQuestion() {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setQuestions((prev) => [...prev, {
      id, text: "", points: 1,
      options: [
        { id: "o1", text: "", correct: false },
        { id: "o2", text: "", correct: false },
      ],
    }]);
  }

  function updateQuestion(qi: number, patch: Partial<QuizQuestion>) {
    setQuestions((prev) => prev.map((q, i) => i === qi ? { ...q, ...patch } : q));
  }

  function updateOption(qi: number, oi: number, patch: Partial<QuizQuestion["options"][number]>) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, options: q.options.map((o, j) => j === oi ? { ...o, ...patch } : o) };
    }));
  }

  function addOption(qi: number) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      if (q.options.length >= 6) return q;
      const nextId = `o${q.options.length + 1}_${Math.random().toString(36).slice(2, 5)}`;
      return { ...q, options: [...q.options, { id: nextId, text: "", correct: false }] };
    }));
  }

  function removeOption(qi: number, oi: number) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      if (q.options.length <= 2) return q;
      return { ...q, options: q.options.filter((_, j) => j !== oi) };
    }));
  }

  function removeQuestion(qi: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== qi));
  }

  function setSingleCorrect(qi: number, oi: number) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      return { ...q, options: q.options.map((o, j) => ({ ...o, correct: j === oi })) };
    }));
  }

  const ytPreview = youtubeId ? extractId(youtubeId) : null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, maxWidth: 640, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>{isNew ? "New lesson" : "Edit lesson"}</h2>
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={lbl}>Lesson title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intro to prompt engineering" style={input} autoFocus />
          </div>
          <div>
            <div style={lbl}>Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["video", "article", "assignment", "quiz"] as ContentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setContentType(t)}
                  style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: contentType === t ? "#1E88E5" : "transparent",
                    color: contentType === t ? "#fff" : "#8892A4",
                    border: contentType === t ? "none" : "1px solid rgba(255,255,255,0.1)",
                    textTransform: "capitalize",
                  }}
                >
                  {t === "video" ? "🎬" : t === "article" ? "📄" : t === "assignment" ? "📝" : "❓"} {t}
                </button>
              ))}
            </div>
          </div>

          {contentType === "quiz" && (
            <div style={{ background: "#0A0E1A", borderRadius: 10, padding: 14, border: "1px solid rgba(30,136,229,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Quiz questions ({questions.length})
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 11, color: "#8892A4" }}>Pass score %</label>
                  <input type="number" min={0} max={100} value={passScore} onChange={(e) => setPassScore(parseInt(e.target.value) || 0)}
                    style={{ ...input, width: 60, padding: "4px 8px", fontSize: 12 }} />
                </div>
              </div>

              {questions.length === 0 && (
                <p style={{ fontSize: 12, color: "#8892A4", textAlign: "center", padding: 16 }}>
                  No questions yet — click &quot;+ Add question&quot; below.
                </p>
              )}

              {questions.map((q, qi) => (
                <div key={q.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#5A6478", marginTop: 10, minWidth: 20 }}>Q{qi + 1}</span>
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                      placeholder="Question text"
                      style={{ ...input, flex: 1 }}
                    />
                    <input
                      type="number" min={1} value={q.points}
                      onChange={(e) => updateQuestion(qi, { points: parseInt(e.target.value) || 1 })}
                      style={{ ...input, width: 60 }}
                      title="Points"
                    />
                    <button onClick={() => removeQuestion(qi)} style={{ ...iconBtn, color: "#EF5350" }}>✕</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24 }}>
                    {q.options.map((o, oi) => (
                      <div key={o.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={o.correct}
                          onChange={(e) => {
                            // Multiple correct allowed — toggle. For single-answer feel, hold Alt to set-exclusive
                            if ((window.event as KeyboardEvent)?.altKey) setSingleCorrect(qi, oi);
                            else updateOption(qi, oi, { correct: e.target.checked });
                          }}
                          title="Tick = correct answer (Alt+click for single-select mode)"
                        />
                        <input
                          value={o.text}
                          onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                          placeholder={`Option ${oi + 1}`}
                          style={{ ...input, flex: 1, padding: "6px 10px", fontSize: 12 }}
                        />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qi, oi)} style={{ ...iconBtn, width: 24, height: 24, fontSize: 11 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.options.length < 6 && (
                    <button onClick={() => addOption(qi)} style={{ ...btnGhost, marginTop: 6, padding: "4px 10px", fontSize: 11, marginLeft: 24 }}>+ Option</button>
                  )}
                </div>
              ))}

              <button onClick={addQuestion} style={{ ...btnPrimary, width: "100%", marginTop: 4 }}>+ Add question</button>
              <p style={{ fontSize: 10, color: "#5A6478", marginTop: 8 }}>
                Tick ≥1 correct option per question. Students pass if score ≥ pass threshold.
              </p>
            </div>
          )}

          {contentType === "assignment" && (
            <div style={{ background: "#0A0E1A", borderRadius: 10, padding: 14, border: "1px solid rgba(171,71,188,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#AB47BC", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Assignment details
              </div>
              <div style={lbl}>Prompt (shown to students)</div>
              <textarea
                value={assignmentPrompt}
                onChange={(e) => setAssignmentPrompt(e.target.value)}
                rows={5}
                placeholder="What should students do? Any deliverable, format, or length requirements?"
                style={{ ...input, minHeight: 120, resize: "vertical" }}
              />
              <div style={{ marginTop: 8 }}>
                <div style={lbl}>Max score</div>
                <input
                  type="number" min={1}
                  value={assignmentMaxScore}
                  onChange={(e) => setAssignmentMaxScore(parseInt(e.target.value) || 100)}
                  style={{ ...input, width: 100 }}
                />
              </div>
              <p style={{ fontSize: 10, color: "#5A6478", marginTop: 8 }}>
                Students submit text + optional file. You grade from <b>/instructor/submissions</b>.
              </p>
            </div>
          )}

          {contentType === "video" && (
            <div>
              <div style={lbl}>YouTube URL or video ID</div>
              <input value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ" style={input} />
              {ytPreview && (
                <div style={{ marginTop: 8, aspectRatio: "16/9", borderRadius: 10, overflow: "hidden", maxWidth: 480 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${ytPreview}`}
                    title="Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <div style={lbl}>Lesson summary (shown to students)</div>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Brief summary of what students will learn in this lesson..." style={{ ...input, minHeight: 80, resize: "vertical" }} />
          </div>
          <div>
            <div style={lbl}>Full description / notes (markdown-friendly)</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Detailed lesson content, key takeaways, links..." style={{ ...input, minHeight: 120, resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={lbl}>Duration (minutes)</div>
              <input type="number" min={0} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} style={input} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer", marginTop: 22 }}>
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
              Free preview (non-enrolled users can watch)
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={onClose} style={btnGhost}>Cancel</button>
            <button onClick={save} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : isNew ? "Add lesson" : "Save changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractId(input: string): string | null {
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const u = new URL(input);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).slice(0, 11);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v.slice(0, 11);
    }
  } catch {}
  return null;
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
const iconBtn: React.CSSProperties = {
  background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.07)",
  width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 13, padding: 0,
};
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "9px 16px",
  fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block",
};

"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { generateInterviewQuestions, scoreInterviewAnswer, TRACKS, type InterviewQuestion, type QuestionFeedback } from "@/app/actions/ai-interview";

type Phase = "setup" | "session" | "results";

const DIFFICULTIES = [
  { id: "entry", label: "Entry Level", desc: "Just starting out" },
  { id: "mid", label: "Mid Level", desc: "1–3 years experience" },
  { id: "senior", label: "Senior Level", desc: "3+ years experience" },
] as const;

const TYPE_COLOR: Record<string, string> = { behavioral: "#AB47BC", technical: "#1E88E5", situational: "#FF7043" };
const SCORE_COLOR = (n: number) => n >= 8 ? "#66BB6A" : n >= 6 ? "#FFC107" : "#EF5350";

export function InterviewPrepClient() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [track, setTrack] = useState<string>(TRACKS[0]);
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState<"entry" | "mid" | "senior">("entry");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, QuestionFeedback>>({});
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [pending, start] = useTransition();

  const startSession = () => start(async () => {
    if (!role.trim()) { toast.error("Enter the role you're interviewing for"); return; }
    const r = await generateInterviewQuestions(track, role, difficulty);
    if (!r.ok) { toast.error(r.error); return; }
    setQuestions(r.data!);
    setAnswers({});
    setFeedbacks({});
    setCurrent(0);
    setPhase("session");
  });

  const submitAnswer = async () => {
    const q = questions[current];
    const ans = answers[q.id] || "";
    if (ans.trim().length < 20) { toast.error("Write a more complete answer (at least 20 characters)"); return; }
    setLoadingFeedback(true);
    try {
      const r = await scoreInterviewAnswer(q.question, ans, track);
      if (!r.ok) { toast.error(r.error); return; }
      setFeedbacks((prev) => ({ ...prev, [q.id]: { questionId: q.id, ...r.data! } as QuestionFeedback }));
    } finally {
      setLoadingFeedback(false);
    }
  };

  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setPhase("results");
    }
  };

  const avgScore = Object.values(feedbacks).length > 0
    ? Math.round(Object.values(feedbacks).reduce((s, f) => s + f.score, 0) / Object.values(feedbacks).length * 10) / 10
    : 0;
  const answeredCount = Object.values(feedbacks).length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(30,136,229,0.12), rgba(171,71,188,0.06))", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 16, padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <span style={{ fontSize: 11, color: "#1E88E5", fontWeight: 700, letterSpacing: 0.5 }}>AI TOOLS</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>🎤 AI Interview Prep</h1>
            <p style={{ fontSize: 12, color: "#8892A4", margin: 0 }}>Practice with AI-generated questions. Get scored feedback on every answer.</p>
          </div>
          <Link href="/ai-hub" style={btnGhost}>← AI Hub</Link>
        </div>
      </div>

      {/* SETUP PHASE */}
      {phase === "setup" && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 16 }}>Set up your practice session</div>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={lbl}>Your track</label>
              <select value={track} onChange={(e) => setTrack(e.target.value)} style={inp}>
                {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Role you&apos;re targeting</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Junior UI/UX Designer, Frontend Developer…" style={inp} />
            </div>
            <div>
              <label style={lbl}>Difficulty level</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {DIFFICULTIES.map((d) => (
                  <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                    padding: "12px 10px", borderRadius: 10, border: `1px solid ${difficulty === d.id ? "rgba(30,136,229,0.5)" : "rgba(255,255,255,0.08)"}`,
                    background: difficulty === d.id ? "rgba(30,136,229,0.12)" : "#0A0E1A",
                    color: difficulty === d.id ? "#1E88E5" : "#8892A4",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center",
                  }}>
                    <div>{d.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3 }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={startSession} disabled={pending} style={{
              padding: "12px 24px", background: pending ? "rgba(30,136,229,0.3)" : "rgba(30,136,229,0.15)",
              color: "#1E88E5", border: "1px solid rgba(30,136,229,0.4)", borderRadius: 12,
              fontSize: 14, fontWeight: 800, cursor: pending ? "wait" : "pointer", marginTop: 4,
            }}>
              {pending ? "Generating questions…" : "🎤 Start practice session"}
            </button>
          </div>
        </div>
      )}

      {/* SESSION PHASE */}
      {phase === "session" && questions.length > 0 && (
        <div>
          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 6, background: "#1E88E5", width: `${((current + 1) / questions.length) * 100}%`, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap" }}>Q{current + 1} / {questions.length}</span>
          </div>

          {/* Question card */}
          {(() => {
            const q = questions[current];
            const fb = feedbacks[q.id];
            const ans = answers[q.id] || "";
            return (
              <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${TYPE_COLOR[q.type] || "#8892A4"}22`, color: TYPE_COLOR[q.type] || "#8892A4", textTransform: "uppercase" }}>{q.type}</span>
                  {fb && <span style={{ fontSize: 11, fontWeight: 800, color: SCORE_COLOR(fb.score) }}>Score: {fb.score}/10</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", lineHeight: 1.5, marginBottom: 8 }}>{q.question}</div>
                {q.tip && <div style={{ fontSize: 12, color: "#8892A4", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 14, fontStyle: "italic" }}>💡 Tip: {q.tip}</div>}

                {/* Answer input */}
                {!fb && (
                  <>
                    <textarea
                      value={ans}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      rows={6}
                      placeholder="Type your answer here… Be specific and use examples from your experience."
                      style={{ width: "100%", padding: "12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 }}
                    />
                    <div style={{ fontSize: 11, color: ans.length < 20 ? "#5A6478" : "#66BB6A", marginBottom: 12 }}>{ans.length} characters</div>
                    <button onClick={submitAnswer} disabled={loadingFeedback || ans.length < 20} style={{
                      padding: "10px 22px", background: ans.length >= 20 ? "rgba(30,136,229,0.15)" : "rgba(255,255,255,0.04)",
                      color: ans.length >= 20 ? "#1E88E5" : "#5A6478",
                      border: `1px solid ${ans.length >= 20 ? "rgba(30,136,229,0.35)" : "transparent"}`,
                      borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: ans.length >= 20 ? "pointer" : "default",
                    }}>
                      {loadingFeedback ? "Getting feedback…" : "Submit answer & get feedback"}
                    </button>
                  </>
                )}

                {/* Feedback display */}
                {fb && (
                  <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
                    {/* User's answer */}
                    <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: 10, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Your Answer</div>
                      <div style={{ fontSize: 13, color: "#C8D0DC", lineHeight: 1.6 }}>{ans}</div>
                    </div>
                    {/* Score breakdown */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ padding: "12px", background: "rgba(102,187,106,0.06)", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#66BB6A", marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>✓ Strengths</div>
                        <div style={{ fontSize: 12, color: "#C8D0DC", lineHeight: 1.6 }}>{fb.strengths}</div>
                      </div>
                      <div style={{ padding: "12px", background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#FFC107", marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>↑ Improve</div>
                        <div style={{ fontSize: 12, color: "#C8D0DC", lineHeight: 1.6 }}>{fb.improvements}</div>
                      </div>
                    </div>
                    {/* Sample answer */}
                    <div style={{ padding: "12px 14px", background: "rgba(30,136,229,0.06)", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: "#1E88E5", marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>💡 Strong Answer Example</div>
                      <div style={{ fontSize: 12, color: "#C8D0DC", lineHeight: 1.6, fontStyle: "italic" }}>{fb.sampleAnswer}</div>
                    </div>
                    {/* Next button */}
                    <button onClick={nextQuestion} style={{ padding: "10px 22px", background: "rgba(102,187,106,0.12)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", alignSelf: "start" }}>
                      {current < questions.length - 1 ? "Next question →" : "See session results →"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Skip (no feedback) */}
          {!feedbacks[questions[current]?.id] && !loadingFeedback && (
            <div style={{ marginTop: 10, textAlign: "right" }}>
              <button onClick={nextQuestion} style={{ fontSize: 12, color: "#5A6478", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Skip this question →
              </button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS PHASE */}
      {phase === "results" && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Summary card */}
          <div style={{ background: "#111827", border: `1px solid ${avgScore >= 7 ? "rgba(102,187,106,0.3)" : avgScore >= 5 ? "rgba(255,193,7,0.25)" : "rgba(239,83,80,0.25)"}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: SCORE_COLOR(avgScore), fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{avgScore}</div>
            <div style={{ fontSize: 14, color: "#8892A4", marginTop: 4 }}>Average score across {answeredCount} answered questions</div>
            <div style={{ fontSize: 13, color: "#E8EDF5", marginTop: 12, fontWeight: 700 }}>
              {avgScore >= 8 ? "Excellent! You're interview-ready. 🌟" : avgScore >= 6 ? "Good work! A few more practice rounds and you'll nail it." : "Keep practicing! Review the sample answers and try again."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
              <button onClick={() => { setPhase("setup"); setQuestions([]); }} style={btnBlue}>Practice again</button>
              <Link href="/ai-hub" style={btnGhost}>Back to AI Hub</Link>
            </div>
          </div>

          {/* Per-question breakdown */}
          {questions.filter((q) => feedbacks[q.id]).map((q, i) => {
            const fb = feedbacks[q.id];
            return (
              <div key={q.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, color: "#8892A4", fontWeight: 700, width: 24, flexShrink: 0 }}>Q{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{q.question}</div>
                    <div style={{ fontSize: 12, color: SCORE_COLOR(fb.score), fontWeight: 700 }}>Score: {fb.score}/10</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const btnGhost: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnBlue: React.CSSProperties = { padding: "8px 16px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitAttempt, type Assessment, type AssessmentQuestion, type AttemptResult } from "@/app/actions/skills-lab";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#4DA8FF",
  green: "#66BB6A",
  red: "#EF5350",
  gold: "#FFC107",
};

interface Props {
  assessment: Assessment;
  questions: AssessmentQuestion[];
}

type Phase = "intro" | "playing" | "review";

export default function AssessmentPlayer({ assessment, questions }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(assessment.duration_min * 60);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startAssessment() {
    startedAt.current = Date.now();
    setPhase("playing");
  }

  function selectAnswer(qId: string, ans: string) {
    setAnswers((prev) => ({ ...prev, [qId]: ans }));
  }

  function handleSubmit(forced: boolean = false) {
    if (!forced) {
      const answered = Object.keys(answers).length;
      if (answered < questions.length && !confirm(`You've only answered ${answered} of ${questions.length}. Submit anyway?`)) return;
    }
    setError(null);
    const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
    startTransition(async () => {
      const res = await submitAttempt(assessment.id, answers, elapsed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setResult(res.data);
        setPhase("review");
      }
    });
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0;

  if (phase === "intro") {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <Link href="/skills-lab" style={{ color: C.dim, fontSize: 13, textDecoration: "none" }}>← Skills Lab</Link>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 48 }}>{assessment.cover_emoji}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "10px 0 4px", letterSpacing: -0.3 }}>{assessment.title}</h1>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>
            {assessment.skill_domain} · {assessment.difficulty}
          </div>
          {assessment.description && (
            <p style={{ fontSize: 14, color: C.text, marginTop: 14, lineHeight: 1.7 }}>{assessment.description}</p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 22 }}>
            <Box label="Time limit" value={`${assessment.duration_min}m`} />
            <Box label="Questions" value={String(questions.length)} />
            <Box label="Pass mark" value={`${assessment.passing_score}%`} />
          </div>
          <ul style={{ marginTop: 18, padding: 0, listStyle: "none", fontSize: 13, color: C.dim, lineHeight: 1.7 }}>
            <li>• The timer starts the moment you click Start.</li>
            <li>• You cannot pause — finish in one sitting.</li>
            <li>• Your score stays on your verified profile forever.</li>
            <li>• You can retake after a {assessment.max_attempts > 1 ? `${assessment.max_attempts}-attempt` : "single-attempt"} cap resets.</li>
          </ul>
          <button
            onClick={startAssessment}
            disabled={questions.length === 0}
            style={{ marginTop: 20, width: "100%", padding: "13px 20px", background: questions.length === 0 ? "#333" : C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: questions.length === 0 ? "not-allowed" : "pointer" }}
          >
            {questions.length === 0 ? "No questions yet" : "Start Assessment →"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "playing") {
    const q = questions[currentIdx];
    if (!q) return null;
    return (
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "16px 16px 100px", maxWidth: 720, margin: "0 auto" }}>
        {/* Top bar: timer + progress */}
        <div style={{ position: "sticky", top: 0, background: C.bg, zIndex: 10, padding: "12px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: secondsLeft < 60 ? C.red : C.gold }}>
              ⏱ {mm}:{ss}
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>
                Q{currentIdx + 1} of {questions.length} · {progress}% answered
              </div>
              <div style={{ height: 6, background: C.card, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: C.accent, transition: "width 0.3s" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            Question {currentIdx + 1} · {q.points} pts
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 18, fontWeight: 600 }}>{q.prompt}</div>

          {q.kind === "mcq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => selectAnswer(q.id, opt.id)}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    background: answers[q.id] === opt.id ? `${C.accent}22` : C.bg,
                    border: `1px solid ${answers[q.id] === opt.id ? C.accent : C.border}`,
                    borderRadius: 10,
                    color: C.text,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ color: answers[q.id] === opt.id ? C.accent : C.dim, marginRight: 8 }}>
                    {answers[q.id] === opt.id ? "●" : "○"}
                  </strong>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {q.kind === "true_false" && (
            <div style={{ display: "flex", gap: 10 }}>
              {["true", "false"].map((v) => (
                <button
                  key={v}
                  onClick={() => selectAnswer(q.id, v)}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    background: answers[q.id] === v ? `${C.accent}22` : C.bg,
                    border: `1px solid ${answers[q.id] === v ? C.accent : C.border}`,
                    borderRadius: 10,
                    color: C.text,
                    fontSize: 15,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {q.kind === "short_text" && (
            <input
              value={answers[q.id] ?? ""}
              onChange={(e) => selectAnswer(q.id, e.target.value)}
              placeholder="Type your answer…"
              style={{ width: "100%", padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14 }}
            />
          )}
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            style={{ padding: "11px 18px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: currentIdx === 0 ? "not-allowed" : "pointer", opacity: currentIdx === 0 ? 0.5 : 1 }}
          >
            ← Previous
          </button>
          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
              style={{ flex: 1, padding: "11px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={pending}
              style={{ flex: 1, padding: "11px 18px", background: C.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
            >
              {pending ? "Submitting…" : "Submit Assessment ✓"}
            </button>
          )}
        </div>

        {error && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</div>}

        {/* Question grid nav */}
        <div style={{ marginTop: 22, padding: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>Question Map</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {questions.map((qi, i) => (
              <button
                key={qi.id}
                onClick={() => setCurrentIdx(i)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  border: "none",
                  background: i === currentIdx ? C.accent : answers[qi.id] ? `${C.green}44` : C.bg,
                  color: i === currentIdx ? "#fff" : answers[qi.id] ? C.green : C.dim,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // phase === "review"
  if (!result) return null;
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "40px 20px", background: result.passed ? "linear-gradient(135deg, rgba(102,187,106,0.18), rgba(102,187,106,0.05))" : "linear-gradient(135deg, rgba(239,83,80,0.15), rgba(239,83,80,0.03))", border: `1px solid ${result.passed ? C.green : C.red}44`, borderRadius: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 58, marginBottom: 10 }}>{result.passed ? "🏆" : "💪"}</div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: result.passed ? C.green : C.red, letterSpacing: -0.3 }}>
          {result.passed ? "Passed!" : "Not this time"}
        </h2>
        <div style={{ fontSize: 42, fontWeight: 800, marginTop: 14, letterSpacing: -1.5 }}>{result.percentage}%</div>
        <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>
          {result.score} / {result.total_points} points · {Math.round(result.time_taken_sec / 60)}m {result.time_taken_sec % 60}s
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Question breakdown</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {result.breakdown.map((b, i) => {
          const q = questions.find((q) => q.id === b.question_id);
          return (
            <div
              key={b.question_id}
              style={{
                background: C.card,
                border: `1px solid ${b.correct ? C.green : C.red}33`,
                borderLeft: `3px solid ${b.correct ? C.green : C.red}`,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                Q{i + 1} {b.correct ? "✓ Correct" : "✕ Incorrect"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{q?.prompt}</div>
              {!b.correct && (
                <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>
                  <strong>Your answer:</strong> {b.given || "(skipped)"}<br />
                  <strong>Correct answer:</strong> {q?.options.find((o) => o.id === b.expected)?.label ?? b.expected}
                </div>
              )}
              {b.explanation && (
                <div style={{ fontSize: 12, color: C.text, marginTop: 8, padding: "8px 10px", background: `${C.accent}11`, borderRadius: 6, lineHeight: 1.5 }}>
                  💡 {b.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        <button
          onClick={() => router.push("/skills-lab")}
          style={{ flex: 1, padding: "12px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          ← All Assessments
        </button>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0A0E1A", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

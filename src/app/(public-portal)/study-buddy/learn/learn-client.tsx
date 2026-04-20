"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  buildKnowledgeMap,
  generateStudyContent,
  askStudyQuestion,
  gradeStudyAnswer,
  type KnowledgeMap,
  type Concept,
  type StudyContext,
  type StudyTurn,
} from "@/app/actions/study-buddy";

const CIOS_LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const ACCENT = "#60A5FA";
const ACCENT_DARK = "#3B82F6";

const LANGUAGES = [
  "English", "Mandarin Chinese", "Spanish", "French", "German", "Arabic", "Portuguese",
  "Russian", "Japanese", "Korean", "Hindi", "Italian", "Swahili", "Yoruba",
] as const;

const TOPIC_SUGGESTIONS = [
  "🧬 Biology",
  "💻 Python basics",
  "📈 Microeconomics",
  "🗺️ World history",
  "🎨 Design principles",
  "📊 Statistics",
  "🧠 Neuroscience",
  "💼 Marketing fundamentals",
];

type Phase = "welcome" | "topic" | "style" | "level" | "language" | "source" | "map" | "session" | "celebrate";

export function LearnClient({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<Phase>("welcome");

  // Onboarding
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<StudyContext["style"] | "">("");
  const [level, setLevel] = useState<StudyContext["level"] | "">("");
  const [language, setLanguage] = useState<string>("English");

  // Source
  const [source, setSource] = useState("");
  const [sourcePending, startSource] = useTransition();
  const [mapPending, startMap] = useTransition();

  // Map / Session
  const [map, setMap] = useState<KnowledgeMap | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<StudyTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [grading, setGrading] = useState(false);
  const [lastGrade, setLastGrade] = useState<{ correct: boolean; score: number; explanation: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const ctx: StudyContext | null = useMemo(
    () =>
      topic && style && level && language
        ? { topic, style: style as StudyContext["style"], level: level as StudyContext["level"], language }
        : null,
    [topic, style, level, language],
  );

  const activeConcept = useMemo(
    () => (map && activeConceptId ? map.concepts.find((c) => c.id === activeConceptId) || null : null),
    [map, activeConceptId],
  );

  /* ─────────── Onboarding nav ─────────── */

  const startOnboarding = () => setPhase("topic");
  const confirmTopic = () => {
    if (!topic.trim()) return toast.error("Give us a topic to start");
    setPhase("style");
  };
  const confirmStyle = (s: StudyContext["style"]) => { setStyle(s); setPhase("level"); };
  const confirmLevel = (l: StudyContext["level"]) => { setLevel(l); setPhase("language"); };
  const confirmLanguage = () => setPhase("source");

  /* ─────────── Source → Knowledge Map ─────────── */

  const buildMap = (rawSource: string) => {
    if (!ctx) { toast.error("Finish onboarding first"); return; }
    startMap(async () => {
      const res = await buildKnowledgeMap(rawSource, ctx.topic);
      if (!res.ok) return toast.error(res.error);
      setMap(res.data!);
      setPhase("map");
    });
  };

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      setSource(text);
      toast.success(`Loaded ${f.name}`);
    } catch {
      toast.error("Couldn't read file. Paste the text instead.");
    }
  };

  const continueWithSource = () => {
    if (source.trim().length < 80) {
      return toast.error("Paste or upload at least a paragraph of notes");
    }
    buildMap(source);
  };

  const generatePrimer = () => {
    if (!ctx) return;
    startSource(async () => {
      const res = await generateStudyContent(ctx.topic, ctx.level);
      if (!res.ok) return toast.error(res.error);
      setSource(res.data!.content);
      toast.success("CIOS wrote a primer for you");
      buildMap(res.data!.content);
    });
  };

  /* ─────────── Session flow ─────────── */

  const startConcept = (conceptId: string) => {
    setActiveConceptId(conceptId);
    setHistory([]);
    setCurrentQuestion("");
    setAnswerDraft("");
    setLastGrade(null);
    setPhase("session");
    void fetchNextQuestion(conceptId, []);
  };

  const fetchNextQuestion = async (conceptId: string, hist: StudyTurn[]) => {
    if (!ctx || !map) return;
    const concept = map.concepts.find((c) => c.id === conceptId);
    if (!concept) return;
    setSending(true);
    try {
      const res = await askStudyQuestion(ctx, concept, hist);
      if (!res.ok) return toast.error(res.error);
      const q = res.data!.question;
      setCurrentQuestion(q);
      setHistory([...hist, { role: "tutor", content: q }]);
      if (res.data!.done) {
        setMastered((prev) => new Set([...prev, conceptId]));
        setTimeout(() => setPhase("celebrate"), 400);
      }
      if (ttsOn) speak(q, language);
    } finally {
      setSending(false);
    }
  };

  const submitAnswer = async () => {
    const text = answerDraft.trim();
    if (!text) return toast.error("Type or speak an answer");
    if (!ctx || !map || !activeConceptId) return;
    const concept = map.concepts.find((c) => c.id === activeConceptId);
    if (!concept) return;

    setGrading(true);
    try {
      const g = await gradeStudyAnswer(ctx, concept, currentQuestion, text);
      if (!g.ok) return toast.error(g.error);
      setLastGrade(g.data!);
      const nextHistory: StudyTurn[] = [...history, { role: "student", content: text }];
      setHistory(nextHistory);
      setAnswerDraft("");
      if (ttsOn) speak(g.data!.explanation, language);
    } finally {
      setGrading(false);
    }
  };

  const nextStep = async () => {
    if (!activeConceptId) return;
    setLastGrade(null);
    await fetchNextQuestion(activeConceptId, history);
  };

  const moveToNextConcept = () => {
    if (!map || !activeConceptId) return;
    setMastered((prev) => new Set([...prev, activeConceptId]));
    const idx = map.concepts.findIndex((c) => c.id === activeConceptId);
    const nextUnmastered = map.concepts
      .slice(idx + 1)
      .find((c) => !mastered.has(c.id));
    if (nextUnmastered) {
      startConcept(nextUnmastered.id);
    } else {
      setPhase("celebrate");
    }
  };

  /* ─────────── Voice input ─────────── */

  const toggleMic = () => {
    if (!micOn) {
      const Ctor =
        (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
      if (!Ctor) {
        toast.error("Voice input isn't supported here. Use text.");
        return;
      }
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = mapToBcp47(language);
      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let finalText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        }
        if (finalText) setAnswerDraft((d) => (d ? d + " " : "") + finalText.trim());
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      try { rec.start(); setListening(true); } catch { /* ignore */ }
      setMicOn(true);
    } else {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setMicOn(false);
      setListening(false);
    }
  };

  /* ─────────── Render ─────────── */

  return (
    <div
      data-workspace="study-buddy"
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        color: "#1F2430",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Nunito', sans-serif",
        zIndex: 9999,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid #EEF2FF",
          background: "#fff",
        }}
      >
        <Link href="/study-buddy" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src={CIOS_LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#1F2430" }}>CIOS Study Buddy</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Socratic learning · voice or written</div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {map && (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: `${ACCENT}14`,
                color: ACCENT_DARK,
                fontSize: 11,
                fontWeight: 800,
                border: `1px solid ${ACCENT}33`,
              }}
            >
              {mastered.size} / {map.concepts.length} mastered
            </div>
          )}
          <ThemeToggle compact />
          <Link
            href="/study-buddy"
            style={{
              padding: "8px 16px",
              background: "#F1F5F9",
              color: "#1F2430",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Study Buddy
          </Link>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px 20px" }}>
        {phase === "welcome" && (
          <Welcome firstName={firstName} onStart={startOnboarding} />
        )}
        {phase === "topic" && (
          <OnboardingShell step={1} total={4} title="What do you want to learn?" subtitle="A topic, a subject, or even a single concept.">
            <input
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis, TypeScript generics, Cold War"
              style={bigInput}
              onKeyDown={(e) => e.key === "Enter" && confirmTopic()}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s.replace(/^\S+\s*/, ""))}
                  style={chip()}
                >
                  {s}
                </button>
              ))}
            </div>
            <Continue onClick={confirmTopic} disabled={!topic.trim()} label="Continue" />
          </OnboardingShell>
        )}
        {phase === "style" && (
          <OnboardingShell step={2} total={4} title="How do you learn best?" subtitle="We use this to tune our tone and pacing.">
            <div style={optionGrid}>
              <OptionCard emoji="👀" title="Visual"  blurb="Show me examples and diagrams" onClick={() => confirmStyle("visual")} />
              <OptionCard emoji="🎧" title="Auditory" blurb="Read things out to me"        onClick={() => confirmStyle("auditory")} />
              <OptionCard emoji="📖" title="Reading"  blurb="Give me the text, let me read" onClick={() => confirmStyle("reading")} />
              <OptionCard emoji="🌀" title="Mixed"    blurb="A bit of everything"           onClick={() => confirmStyle("mixed")} />
            </div>
          </OnboardingShell>
        )}
        {phase === "level" && (
          <OnboardingShell step={3} total={4} title="What's your level?" subtitle="Be honest — CIOS adapts to you.">
            <div style={optionGrid}>
              <OptionCard emoji="🌱" title="Beginner"     blurb="First time with this topic"     onClick={() => confirmLevel("beginner")} />
              <OptionCard emoji="📘" title="Intermediate" blurb="I know the basics"              onClick={() => confirmLevel("intermediate")} />
              <OptionCard emoji="🚀" title="Advanced"     blurb="Push me — I know this well"    onClick={() => confirmLevel("advanced")} />
            </div>
          </OnboardingShell>
        )}
        {phase === "language" && (
          <OnboardingShell step={4} total={4} title="Which language?" subtitle="CIOS will teach you in this language the whole session.">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ ...bigInput, paddingRight: 40, appearance: "none", WebkitAppearance: "none",
                backgroundImage:
                  'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%2364748B\' d=\'M6 8L0 0h12z\'/></svg>")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 18px center",
              }}
            >
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <Continue onClick={confirmLanguage} label="Start learning →" />
          </OnboardingShell>
        )}
        {phase === "source" && ctx && (
          <SourcePhase
            ctx={ctx}
            source={source}
            onSourceChange={setSource}
            onUpload={onUploadFile}
            onContinue={continueWithSource}
            onGenerate={generatePrimer}
            generating={sourcePending}
            mapping={mapPending}
          />
        )}
        {phase === "map" && map && (
          <MapPhase
            map={map}
            mastered={mastered}
            onPick={startConcept}
          />
        )}
        {phase === "session" && map && activeConcept && (
          <SessionPhase
            firstName={firstName}
            concept={activeConcept}
            map={map}
            mastered={mastered}
            history={history}
            currentQuestion={currentQuestion}
            answerDraft={answerDraft}
            onAnswerChange={setAnswerDraft}
            onSubmit={submitAnswer}
            grading={grading}
            sending={sending}
            lastGrade={lastGrade}
            onNext={nextStep}
            onMoveToNextConcept={moveToNextConcept}
            ttsOn={ttsOn}
            onToggleTts={() => setTtsOn((v) => !v)}
            micOn={micOn}
            listening={listening}
            onToggleMic={toggleMic}
          />
        )}
        {phase === "celebrate" && map && (
          <CelebratePhase
            map={map}
            mastered={mastered}
            onRestart={() => {
              setMap(null);
              setMastered(new Set());
              setHistory([]);
              setSource("");
              setPhase("welcome");
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes sbPulse {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
        @keyframes sbPop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─────────── Phase components ─────────── */

function Welcome({ firstName, onStart }: { firstName: string; onStart: () => void }) {
  return (
    <div style={{ maxWidth: 620, margin: "40px auto 0", textAlign: "center" }}>
      <img
        src={CIOS_LOGO}
        alt="CIOS"
        width={78}
        height={78}
        style={{
          display: "block",
          margin: "0 auto 18px",
          borderRadius: 18,
          boxShadow: "0 6px 20px rgba(96,165,250,0.25)",
          animation: "sbPulse 2.4s ease-in-out infinite",
        }}
      />
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "#0F172A", letterSpacing: -0.4 }}>
        Hi {firstName} 👋
      </h1>
      <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.6, marginTop: 10 }}>
        I&apos;m your CIOS study coach. We&apos;ll set up a quick session together,
        then I&apos;ll build a knowledge map and we&apos;ll learn by conversation.
      </p>
      <button
        onClick={onStart}
        style={{
          marginTop: 26,
          padding: "16px 32px",
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: `0 10px 24px ${ACCENT}44`,
          fontFamily: "inherit",
        }}
      >
        Let&apos;s go →
      </button>
    </div>
  );
}

function OnboardingShell({
  step, total, title, subtitle, children,
}: {
  step: number; total: number; title: string; subtitle: string; children: React.ReactNode;
}) {
  const pct = (step / total) * 100;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 10, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${ACCENT}, #8B5CF6)`,
              width: `${pct}%`,
              transition: "width .3s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748B" }}>
          {step} / {total}
        </div>
      </div>

      <div style={{ animation: "sbPop .4s ease both" }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0F172A", letterSpacing: -0.3 }}>{title}</h2>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 6 }}>{subtitle}</p>
        <div style={{ marginTop: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function OptionCard({ emoji, title, blurb, onClick }: { emoji: string; title: string; blurb: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "20px 18px",
        border: "2px solid #E2E8F0",
        background: "#fff",
        borderRadius: 18,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "border-color .15s, transform .08s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{blurb}</div>
    </button>
  );
}

function Continue({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 22,
        width: "100%",
        padding: "14px 22px",
        background: disabled ? "#E2E8F0" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
        color: disabled ? "#94A3B8" : "#fff",
        border: "none",
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 10px 22px ${ACCENT}33`,
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function SourcePhase({
  ctx, source, onSourceChange, onUpload, onContinue, onGenerate, generating, mapping,
}: {
  ctx: StudyContext;
  source: string;
  onSourceChange: (v: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  onGenerate: () => void;
  generating: boolean;
  mapping: boolean;
}) {
  const busy = generating || mapping;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0F172A", letterSpacing: -0.3 }}>
          Bring your notes on <span style={{ color: ACCENT_DARK }}>{ctx.topic}</span>
        </h2>
        <p style={{ color: "#64748B", fontSize: 14, marginTop: 6 }}>
          Paste a chapter, upload a .txt/.md file, or let CIOS write one for you.
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: 22,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>Study material</label>
          <div style={{ display: "flex", gap: 8 }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "#334155",
              }}
            >
              📎 Upload .txt / .md
              <input type="file" accept=".txt,.md,.rtf,text/plain" onChange={onUpload} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        <textarea
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          rows={12}
          placeholder="Paste your notes, a chapter, or any study text here…"
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            fontSize: 14,
            lineHeight: 1.55,
            background: "#F8FAFC",
            color: "#0F172A",
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>{source.length.toLocaleString()} characters</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
        <button
          onClick={onGenerate}
          disabled={busy}
          style={{
            flex: 1,
            minWidth: 240,
            padding: "13px 18px",
            background: busy ? "#E2E8F0" : "#fff",
            color: busy ? "#94A3B8" : ACCENT_DARK,
            border: `1.5px solid ${busy ? "#E2E8F0" : ACCENT}`,
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {generating ? "Writing a primer…" : "✨ Let CIOS write one for me"}
        </button>
        <button
          onClick={onContinue}
          disabled={busy}
          style={{
            flex: 1,
            minWidth: 240,
            padding: "13px 18px",
            background: busy ? "#E2E8F0" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: busy ? "#94A3B8" : "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
            boxShadow: busy ? "none" : `0 10px 22px ${ACCENT}44`,
            fontFamily: "inherit",
          }}
        >
          {mapping ? "Building map…" : "Build knowledge map →"}
        </button>
      </div>
    </div>
  );
}

function MapPhase({
  map, mastered, onPick,
}: { map: KnowledgeMap; mastered: Set<string>; onPick: (id: string) => void }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.5 }}>YOUR KNOWLEDGE MAP</div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 900, color: "#0F172A", letterSpacing: -0.3 }}>
          {map.mainTopic}
        </h2>
        <p style={{ color: "#475569", fontSize: 14, maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
          {map.overview}
        </p>
      </div>

      <RadialMap map={map} mastered={mastered} onPick={onPick} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 28 }}>
        {map.concepts.map((c, i) => {
          const done = mastered.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              style={{
                textAlign: "left",
                padding: 18,
                border: `1.5px solid ${done ? "#86EFAC" : "#E2E8F0"}`,
                background: done ? "#F0FDF4" : "#fff",
                borderRadius: 18,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "transform .1s, border-color .15s",
              }}
              onMouseEnter={(e) => { if (!done) e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={(e) => { if (!done) e.currentTarget.style.borderColor = "#E2E8F0"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: done ? "#22C55E" : `${ACCENT}22`,
                    color: done ? "#fff" : ACCENT_DARK,
                    fontSize: 12,
                    fontWeight: 900,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{c.title}</div>
              </div>
              <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.55 }}>{c.summary}</div>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#64748B", fontSize: 12, lineHeight: 1.6 }}>
                {c.keyPoints.slice(0, 3).map((kp, k) => <li key={k}>{kp}</li>)}
              </ul>
              <div style={{ marginTop: 10, color: ACCENT_DARK, fontSize: 12, fontWeight: 800 }}>
                {done ? "Practice again →" : "Start this concept →"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RadialMap({ map, mastered, onPick }: { map: KnowledgeMap; mastered: Set<string>; onPick: (id: string) => void }) {
  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const r = 150;
  const n = map.concepts.length || 1;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={size} height={size} role="img" aria-label="Knowledge map">
        {map.concepts.map((_, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          return (
            <line
              key={`l-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={mastered.has(map.concepts[i].id) ? "#22C55E" : "#CBD5E1"}
              strokeWidth={mastered.has(map.concepts[i].id) ? 2.5 : 2}
              strokeDasharray={mastered.has(map.concepts[i].id) ? "" : "4 4"}
            />
          );
        })}
        {/* Outer nodes */}
        {map.concepts.map((c, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const done = mastered.has(c.id);
          return (
            <g key={c.id} transform={`translate(${x},${y})`} style={{ cursor: "pointer" }} onClick={() => onPick(c.id)}>
              <circle r={30} fill={done ? "#22C55E" : "#fff"} stroke={done ? "#22C55E" : ACCENT} strokeWidth={2} />
              <text
                textAnchor="middle"
                dy={4}
                style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 800, fill: done ? "#fff" : ACCENT_DARK }}
              >
                {done ? "✓" : i + 1}
              </text>
              <text
                x={0}
                y={48}
                textAnchor="middle"
                style={{ fontFamily: "inherit", fontSize: 11, fontWeight: 700, fill: "#334155" }}
              >
                {truncate(c.title, 14)}
              </text>
            </g>
          );
        })}
        {/* Hub */}
        <circle cx={cx} cy={cy} r={52} fill="url(#hubGrad)" stroke={ACCENT_DARK} strokeWidth={2} />
        <defs>
          <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#BFDBFE" />
          </radialGradient>
        </defs>
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 900, fill: ACCENT_DARK }}>
          {truncate(map.mainTopic, 18)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontFamily: "inherit", fontSize: 10, fill: "#64748B" }}>
          {map.concepts.length} concepts
        </text>
      </svg>
    </div>
  );
}

function SessionPhase(props: {
  firstName: string;
  concept: Concept;
  map: KnowledgeMap;
  mastered: Set<string>;
  history: StudyTurn[];
  currentQuestion: string;
  answerDraft: string;
  onAnswerChange: (v: string) => void;
  onSubmit: () => void;
  grading: boolean;
  sending: boolean;
  lastGrade: { correct: boolean; score: number; explanation: string } | null;
  onNext: () => void;
  onMoveToNextConcept: () => void;
  ttsOn: boolean;
  onToggleTts: () => void;
  micOn: boolean;
  listening: boolean;
  onToggleMic: () => void;
}) {
  const {
    firstName, concept, map, mastered, history, currentQuestion, answerDraft,
    onAnswerChange, onSubmit, grading, sending, lastGrade, onNext, onMoveToNextConcept,
    ttsOn, onToggleTts, micOn, listening, onToggleMic,
  } = props;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Concept header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${ACCENT}14, rgba(139,92,246,0.08))`,
          border: `1px solid ${ACCENT}33`,
          borderRadius: 18,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.5, marginBottom: 4 }}>
          CONCEPT {map.concepts.findIndex((c) => c.id === concept.id) + 1} / {map.concepts.length}
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A", letterSpacing: -0.3 }}>
          {concept.title}
        </h2>
        <p style={{ color: "#334155", fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{concept.summary}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {concept.keyPoints.slice(0, 4).map((kp, i) => (
            <span
              key={i}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#fff",
                border: "1px solid #CBD5E1",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
              }}
            >
              {kp}
            </span>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: 18,
          display: "grid",
          gap: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {sending && !currentQuestion ? (
          <Thinking />
        ) : (
          <>
            {history.map((t, i) => (
              <Turn key={i} turn={t} firstName={firstName} />
            ))}
            {!lastGrade && currentQuestion && !sending && (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea
                  value={answerDraft}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  rows={4}
                  placeholder={listening ? "Listening… speak naturally." : "Type your answer — or press 🎤 to speak."}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.55,
                    background: listening ? "#FFF7ED" : "#F8FAFC",
                    color: "#0F172A",
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <IconToggle on={micOn} onClick={onToggleMic} label={micOn ? "Stop mic" : "Speak"} activeBg="#FEE2E2" activeColor="#991B1B">
                      {micOn ? "🔴" : "🎤"}
                    </IconToggle>
                    <IconToggle on={ttsOn} onClick={onToggleTts} label={ttsOn ? "Turn voice off" : "Read aloud"}>
                      {ttsOn ? "🔊" : "🔇"}
                    </IconToggle>
                  </div>
                  <button
                    onClick={onSubmit}
                    disabled={grading || !answerDraft.trim()}
                    style={{
                      padding: "10px 20px",
                      background: grading || !answerDraft.trim() ? "#E2E8F0" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                      color: grading || !answerDraft.trim() ? "#94A3B8" : "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: grading || !answerDraft.trim() ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {grading ? "Grading…" : "Submit answer"}
                  </button>
                </div>
              </div>
            )}
            {lastGrade && (
              <GradePanel
                grade={lastGrade}
                onNext={onNext}
                onMoveToNextConcept={onMoveToNextConcept}
                isLastConcept={mastered.size + 1 >= map.concepts.length}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Turn({ turn, firstName }: { turn: StudyTurn; firstName: string }) {
  if (turn.role === "tutor") {
    return (
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.3 }}>CIOS</div>
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            padding: "12px 14px",
            borderRadius: 14,
            fontSize: 14,
            lineHeight: 1.55,
            color: "#0F172A",
            whiteSpace: "pre-wrap",
          }}
        >
          {turn.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 4, textAlign: "right" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#0F172A" }}>{firstName}</div>
      <div
        style={{
          background: `${ACCENT}14`,
          border: `1px solid ${ACCENT}33`,
          padding: "12px 14px",
          borderRadius: 14,
          fontSize: 14,
          lineHeight: 1.55,
          color: "#0F172A",
          whiteSpace: "pre-wrap",
          display: "inline-block",
          marginLeft: "auto",
          maxWidth: "96%",
          textAlign: "left",
        }}
      >
        {turn.content}
      </div>
    </div>
  );
}

function GradePanel({
  grade, onNext, onMoveToNextConcept, isLastConcept,
}: {
  grade: { correct: boolean; score: number; explanation: string };
  onNext: () => void;
  onMoveToNextConcept: () => void;
  isLastConcept: boolean;
}) {
  const good = grade.correct;
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: good ? "#F0FDF4" : "#FFF7ED",
        border: `1px solid ${good ? "#86EFAC" : "#FED7AA"}`,
        animation: "sbPop .4s ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{good ? "🎉" : "💡"}</span>
        <div style={{ fontWeight: 800, color: good ? "#166534" : "#9A3412" }}>
          {good ? "Nice!" : "Close — here's what to note"}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: good ? "#166534" : "#9A3412" }}>
          Score {grade.score}/10
        </span>
      </div>
      <div style={{ color: "#0F172A", fontSize: 14, lineHeight: 1.6 }}>{grade.explanation}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          onClick={onNext}
          style={{
            padding: "10px 18px",
            background: "#fff",
            color: ACCENT_DARK,
            border: `1.5px solid ${ACCENT}`,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Another question →
        </button>
        <button
          onClick={onMoveToNextConcept}
          style={{
            padding: "10px 18px",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {isLastConcept ? "Finish session 🎊" : "Next concept →"}
        </button>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src={CIOS_LOGO} alt="" width={24} height={24} style={{ borderRadius: 6, animation: "sbPulse 1.2s ease-in-out infinite" }} />
      <span style={{ fontSize: 13, color: "#64748B" }}>CIOS is preparing your question…</span>
    </div>
  );
}

function CelebratePhase({ map, mastered, onRestart }: { map: KnowledgeMap; mastered: Set<string>; onRestart: () => void }) {
  return (
    <div style={{ maxWidth: 620, margin: "40px auto 0", textAlign: "center", animation: "sbPop .5s ease both" }}>
      <div style={{ fontSize: 72, marginBottom: 6 }}>🎊</div>
      <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "#0F172A", letterSpacing: -0.3 }}>
        Session complete
      </h2>
      <p style={{ color: "#475569", fontSize: 15, marginTop: 8 }}>
        You mastered <strong>{mastered.size}</strong> of {map.concepts.length} concepts on <strong>{map.mainTopic}</strong>.
      </p>
      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${ACCENT}14, rgba(139,92,246,0.08))`,
          border: `1px solid ${ACCENT}33`,
          textAlign: "left",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.5, marginBottom: 8 }}>
          CONCEPTS YOU PRACTISED
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#0F172A", fontSize: 14, lineHeight: 1.7 }}>
          {map.concepts.map((c) => (
            <li key={c.id} style={{ color: mastered.has(c.id) ? "#166534" : "#64748B" }}>
              {mastered.has(c.id) ? "✓" : "○"} {c.title}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
        <button
          onClick={onRestart}
          style={{
            padding: "12px 22px",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          New session
        </button>
        <Link
          href="/study-buddy"
          style={{
            padding: "12px 22px",
            background: "#F1F5F9",
            color: "#0F172A",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to Study Buddy
        </Link>
      </div>
    </div>
  );
}

/* ─────────── small helpers ─────────── */

const bigInput: React.CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  border: "2px solid #E2E8F0",
  borderRadius: 16,
  fontSize: 16,
  color: "#0F172A",
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const optionGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

function chip(): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function IconToggle({
  children, on, onClick, label, activeBg, activeColor,
}: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
  label: string;
  activeBg?: string;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        background: on ? (activeBg || "#E0E7FF") : "#fff",
        color: on ? (activeColor || "#3730A3") : "#334155",
        fontSize: 16,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function mapToBcp47(language: string): string {
  const m: Record<string, string> = {
    "English": "en-US",
    "Mandarin Chinese": "zh-CN",
    "Spanish": "es-ES",
    "French": "fr-FR",
    "German": "de-DE",
    "Arabic": "ar-SA",
    "Portuguese": "pt-BR",
    "Russian": "ru-RU",
    "Japanese": "ja-JP",
    "Korean": "ko-KR",
    "Hindi": "hi-IN",
    "Italian": "it-IT",
    "Swahili": "sw-KE",
    "Yoruba": "yo-NG",
  };
  return m[language] || "en-US";
}

function speak(text: string, language: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = mapToBcp47(language);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

/* ─────────── Web Speech API types ─────────── */

interface SpeechRecognitionAltLike { transcript: string }
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAltLike;
  [index: number]: SpeechRecognitionAltLike;
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

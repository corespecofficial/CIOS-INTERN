"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { ingestAndBuildMap } from "@/app/actions/study-buddy-v2";
import {
  explainMode,
  storyMode,
  podcastMode,
  flashcardMode,
  quizMode,
  gradeQuiz,
  debateMode,
  debateTurn,
  simulationMode,
  simulationTurn,
  rateFlashcard,
  videoMode,
  pollVideo,
} from "@/app/actions/study-buddy-modes";
import { MODES, DEFAULT_MODE, type ModeId, type ExplainOutput, type StoryOutput, type PodcastOutput, type FlashcardsOutput, type QuizOutput, type DebateOutput, type DebateTurnOutput, type SimulationOutput, type SimulationTurnOutput, type VideoOutput } from "@/lib/study-buddy/modes";
import { getSessionMastery, getOfflinePack, listRecentStudySessions, chunksFromOwnSession, type StudySession } from "@/app/actions/study-buddy-v2";
import { shareSessionToCohort, listCohortShelf, chunksFromCohortShare, type CohortShare } from "@/app/actions/study-buddy-cohort";
import { saveOfflineBundle } from "@/lib/study-buddy/offline";
import { MasteryRing } from "@/components/study-buddy/due-reviews-panel";

/** Client-side mirror of the SourceInput shape accepted by `ingestAndBuildMap`.
 *  Binary uploads are base64-encoded before sending so the server can rehydrate
 *  them into Buffers without needing Storage uploads (Phase 1 scope). */
type PendingSource = {
  kind: "text" | "youtube" | "url" | "pdf" | "docx" | "image" | "audio" | "video";
  ref: string;
  label?: string;
  body?: string;
  bufferBase64?: string;
  mime?: string;
  sizeBytes?: number;
};

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

type Phase = "welcome" | "topic" | "style" | "level" | "language" | "source" | "map" | "mode-pick" | "session" | "celebrate";

export function LearnClient({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<Phase>("welcome");

  // Onboarding
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<StudyContext["style"] | "">("");
  const [level, setLevel] = useState<StudyContext["level"] | "">("");
  const [language, setLanguage] = useState<string>("English");

  // Source
  const [source, setSource] = useState("");
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
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

  // Phase 2 — learning modes. Picking a concept takes the user to mode-pick,
  // which then routes to the right session renderer based on mode.kind.
  const [selectedMode, setSelectedMode] = useState<ModeId>(DEFAULT_MODE);
  const [modeLoading, setModeLoading] = useState(false);
  // Phase 3 — per-concept mastery scores (0-100), keyed by concept id
  const [masteryByConcept, setMasteryByConcept] = useState<Record<string, number>>({});
  const [savingOffline, setSavingOffline] = useState(false);
  // Phase 4 — cohort share state
  const [sharedToCohort, setSharedToCohort] = useState(false);
  const [sharingToCohort, setSharingToCohort] = useState(false);
  const [explainData, setExplainData] = useState<ExplainOutput | null>(null);
  const [storyData, setStoryData] = useState<StoryOutput | null>(null);
  const [podcastData, setPodcastData] = useState<PodcastOutput | null>(null);
  const [flashData, setFlashData] = useState<FlashcardsOutput | null>(null);
  const [quizData, setQuizData] = useState<QuizOutput | null>(null);
  const [debateData, setDebateData] = useState<DebateOutput | null>(null);
  const [simData, setSimData] = useState<SimulationOutput | null>(null);
  const [videoData, setVideoData] = useState<VideoOutput | null>(null);

  const ctx: StudyContext | null = useMemo(
    () =>
      topic && style && level && language
        ? { topic, style: style as StudyContext["style"], level: level as StudyContext["level"], language }
        : null,
    [topic, style, level, language],
  );

  // Phase 3 — refresh the mastery map from the server. Call after any action
  // that writes study_mastery (quiz submission, flashcard rating).
  const refreshMastery = async () => {
    if (!sessionId) return;
    const r = await getSessionMastery(sessionId);
    if (r.ok) {
      const byId: Record<string, number> = {};
      for (const row of r.data!) byId[row.conceptId] = row.lastScore;
      setMasteryByConcept(byId);
    }
  };

  // Phase 4 — publish the current session to the user's cohort shelf
  const shareWithCohort = async () => {
    if (!sessionId || !map) { toast.error("No session to share yet"); return; }
    setSharingToCohort(true);
    try {
      const r = await shareSessionToCohort(sessionId, map.mainTopic);
      if (!r.ok) { toast.error(r.error); return; }
      setSharedToCohort(true);
      toast.success("Shared with your cohort 🎉");
    } finally {
      setSharingToCohort(false);
    }
  };

  // Phase 3 — bundle the current session to localStorage for offline study
  const saveForOffline = async () => {
    if (!sessionId || !map) { toast.error("No session to save yet"); return; }
    setSavingOffline(true);
    try {
      const r = await getOfflinePack(sessionId);
      if (!r.ok) { toast.error(r.error); return; }
      const res = saveOfflineBundle(sessionId, map.mainTopic || "Study session", r.data!);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Saved for offline · visit /study-buddy/library to review without data");
    } finally {
      setSavingOffline(false);
    }
  };

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

  // Phase → previous phase map for the new Back button in OnboardingShell.
  // Welcome has no predecessor so it's omitted.
  const backTo: Partial<Record<Phase, Phase>> = {
    topic: "welcome",
    style: "topic",
    level: "style",
    language: "level",
    source: "language",
  };
  const goBack = () => {
    const prev = backTo[phase];
    if (prev) setPhase(prev);
  };

  /* ─────────── Multi-source ingest → Knowledge Map ─────────── */

  // Internal: legacy single-string map builder kept for the "let CIOS write a primer"
  // path so it doesn't pay the full ingest pipeline for one synthetic paragraph.
  const buildMapFromText = (rawSource: string) => {
    if (!ctx) { toast.error("Finish onboarding first"); return; }
    startMap(async () => {
      const res = await buildKnowledgeMap(rawSource, ctx.topic);
      if (!res.ok) { toast.error(res.error); return; }
      setMap(res.data!);
      setPhase("map");
    });
  };

  const addPendingSource = (s: PendingSource) => {
    setPendingSources((prev) => [...prev, s]);
  };
  const removePendingSource = (idx: number) => {
    setPendingSources((prev) => prev.filter((_, i) => i !== idx));
  };

  // Read a File into a base64 string (for PDF/DOCX/image uploads).
  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : "");
      };
      reader.readAsDataURL(f);
    });

  // Classifies an uploaded File into a SourceKind. Returns null for unsupported.
  const classifyFile = (f: File): PendingSource["kind"] | null => {
    const name = f.name.toLowerCase();
    const mime = (f.type || "").toLowerCase();
    if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
    if (name.endsWith(".docx")) return "docx";
    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf") || mime.startsWith("text/")) return "text";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return null;
  };

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = ""; // allow re-selecting same file

    for (const f of files) {
      const kind = classifyFile(f);
      if (!kind) { toast.error(`Unsupported file: ${f.name}`); continue; }

      if (kind === "text") {
        // Plain-text path — read as text, no base64 round-trip
        try {
          const text = await f.text();
          if (text.trim().length < 1) { toast.error(`${f.name} is empty`); continue; }
          addPendingSource({ kind: "text", ref: f.name, label: f.name, body: text, sizeBytes: f.size });
        } catch {
          toast.error(`Couldn't read ${f.name}`);
        }
      } else {
        try {
          const b64 = await fileToBase64(f);
          addPendingSource({ kind, ref: f.name, label: f.name, bufferBase64: b64, mime: f.type, sizeBytes: f.size });
        } catch {
          toast.error(`Couldn't read ${f.name}`);
        }
      }
    }
    toast.success(`Added ${files.length} source${files.length === 1 ? "" : "s"}`);
  };

  const addLink = (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) return toast.error("Start with http:// or https://");

    const isYouTube = /youtu\.?be/i.test(url);
    addPendingSource({
      kind: isYouTube ? "youtube" : "url",
      ref: url,
      label: isYouTube ? `YouTube · ${url.slice(-11)}` : url,
    });
    toast.success(isYouTube ? "YouTube link queued" : "URL queued");
  };

  const addPasteAsSource = () => {
    const text = source.trim();
    if (text.length < 40) return toast.error("Paste at least a paragraph");
    addPendingSource({ kind: "text", ref: `paste-${Date.now()}`, label: "Pasted notes", body: text });
    setSource("");
    toast.success("Pasted notes added");
  };

  const continueWithSource = () => {
    if (!ctx) return;

    // Gather all sources: pending list + any unqueued text still in the textarea
    const sources: PendingSource[] = [...pendingSources];
    const residual = source.trim();
    if (residual.length >= 40) {
      sources.push({ kind: "text", ref: `paste-${Date.now()}`, label: "Pasted notes", body: residual });
    }

    if (sources.length === 0) {
      return toast.error("Add at least one source — paste notes, a link, or upload a file");
    }

    startMap(async () => {
      const res = await ingestAndBuildMap(
        { topic: ctx.topic, language: ctx.language, level: ctx.level, style: ctx.style },
        sources,
      );
      if (!res.ok) { toast.error(res.error); return; }
      const { sessionId: sid, map: km, warnings } = res.data!;
      setSessionId(sid);
      setMap(km);
      setPendingSources([]);
      setSource("");
      setPhase("map");
      if (warnings.length > 0) {
        toast.error(`Some sources couldn't be read: ${warnings.join(" · ")}`);
      }
    });
  };

  const generatePrimer = () => {
    if (!ctx) return;
    startSource(async () => {
      const res = await generateStudyContent(ctx.topic, ctx.level);
      if (!res.ok) { toast.error(res.error); return; }
      setSource(res.data!.content);
      toast.success("CIOS wrote a primer for you");
      buildMapFromText(res.data!.content);
    });
  };

  /* ─────────── Session flow ─────────── */

  // Clicking a concept on the map now goes to mode-pick. The picker calls
  // launchMode() which does the per-mode setup before routing to the right
  // session view.
  const pickConcept = (conceptId: string) => {
    setActiveConceptId(conceptId);
    setSelectedMode(DEFAULT_MODE);
    setExplainData(null); setStoryData(null); setPodcastData(null);
    setFlashData(null); setQuizData(null); setDebateData(null); setSimData(null);
    setVideoData(null);
    setPhase("mode-pick");
  };

  const launchMode = async (mode: ModeId) => {
    if (!ctx || !activeConceptId || !map || !sessionId) {
      toast.error("Session not ready");
      return;
    }
    const concept = map.concepts.find((c) => c.id === activeConceptId);
    if (!concept) return;
    setSelectedMode(mode);

    // Socratic uses the existing startConcept flow — no change
    if (mode === "socratic") {
      startConcept(activeConceptId);
      return;
    }

    if (mode === "video") {
      toast("Video mode is coming soon — we're cooking up something special.", { icon: "🎬" });
      return;
    }

    setModeLoading(true);
    try {
      switch (mode) {
        case "video": {
          const r = await videoMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setVideoData(r.data!); break;
        }
        case "explain": {
          const r = await explainMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setExplainData(r.data!); break;
        }
        case "story": {
          const r = await storyMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setStoryData(r.data!); break;
        }
        case "podcast": {
          const r = await podcastMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setPodcastData(r.data!); break;
        }
        case "flashcards": {
          const r = await flashcardMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setFlashData(r.data!); break;
        }
        case "quiz": {
          // Phase 3 — adaptive difficulty based on prior mastery
          const priorScore = masteryByConcept[concept.id];
          const r = await quizMode(ctx, concept, sessionId, priorScore);
          if (!r.ok) { toast.error(r.error); return; }
          setQuizData(r.data!); break;
        }
        case "debate": {
          const r = await debateMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setDebateData(r.data!); break;
        }
        case "simulation": {
          const r = await simulationMode(ctx, concept, sessionId);
          if (!r.ok) { toast.error(r.error); return; }
          setSimData(r.data!); break;
        }
      }
      setPhase("session");
    } finally {
      setModeLoading(false);
    }
  };

  const startConcept = (conceptId: string) => {
    setActiveConceptId(conceptId);
    setSelectedMode("socratic");
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
        background: "var(--ws-canvas, #fff)",
        color: "var(--ws-text, #1F2430)",
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
          background: "var(--ws-canvas, #fff)",
        }}
      >
        <Link href="/study-buddy" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src={CIOS_LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--ws-text, #1F2430)" }}>CIOS Study Buddy</div>
            <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)" }}>Socratic learning · voice or written</div>
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
              background: "var(--ws-chip, #F1F5F9)",
              color: "var(--ws-text, #1F2430)",
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
          <OnboardingShell step={1} total={4} title="What do you want to learn?" subtitle="A topic, a subject, or even a single concept." onBack={goBack}>
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
          <OnboardingShell step={2} total={4} title="How do you learn best?" subtitle="We use this to tune our tone and pacing." onBack={goBack}>
            <div style={optionGrid}>
              <OptionCard emoji="👀" title="Visual"  blurb="Show me examples and diagrams" onClick={() => confirmStyle("visual")} />
              <OptionCard emoji="🎧" title="Auditory" blurb="Read things out to me"        onClick={() => confirmStyle("auditory")} />
              <OptionCard emoji="📖" title="Reading"  blurb="Give me the text, let me read" onClick={() => confirmStyle("reading")} />
              <OptionCard emoji="🌀" title="Mixed"    blurb="A bit of everything"           onClick={() => confirmStyle("mixed")} />
            </div>
          </OnboardingShell>
        )}
        {phase === "level" && (
          <OnboardingShell step={3} total={4} title="What's your level?" subtitle="Be honest — CIOS adapts to you." onBack={goBack}>
            <div style={optionGrid}>
              <OptionCard emoji="🌱" title="Beginner"     blurb="First time with this topic"     onClick={() => confirmLevel("beginner")} />
              <OptionCard emoji="📘" title="Intermediate" blurb="I know the basics"              onClick={() => confirmLevel("intermediate")} />
              <OptionCard emoji="🚀" title="Advanced"     blurb="Push me — I know this well"    onClick={() => confirmLevel("advanced")} />
            </div>
          </OnboardingShell>
        )}
        {phase === "language" && (
          <OnboardingShell step={4} total={4} title="Which language?" subtitle="CIOS will teach you in this language the whole session." onBack={goBack}>
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
            pendingSources={pendingSources}
            onAddPaste={addPasteAsSource}
            onAddLink={addLink}
            onAddPendingSource={addPendingSource}
            onRemoveSource={removePendingSource}
            onBack={goBack}
          />
        )}
        {phase === "map" && map && (
          <MapPhase
            map={map}
            mastered={mastered}
            masteryByConcept={masteryByConcept}
            onPick={pickConcept}
            onSaveOffline={saveForOffline}
            savingOffline={savingOffline}
            onShareCohort={shareWithCohort}
            sharingCohort={sharingToCohort}
            sharedCohort={sharedToCohort}
          />
        )}
        {phase === "mode-pick" && activeConcept && ctx && (
          <ModePickerPhase
            concept={activeConcept}
            language={ctx.language}
            onBack={() => setPhase("map")}
            onPick={launchMode}
            loading={modeLoading}
          />
        )}
        {phase === "session" && map && activeConcept && selectedMode === "socratic" && (
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
        {phase === "session" && activeConcept && ctx && sessionId && selectedMode !== "socratic" && (
          <ModeSession
            mode={selectedMode}
            concept={activeConcept}
            ctx={ctx}
            sessionId={sessionId}
            explainData={explainData}
            storyData={storyData}
            podcastData={podcastData}
            flashData={flashData}
            quizData={quizData}
            debateData={debateData}
            simData={simData}
            videoData={videoData}
            onVideoUpdate={setVideoData}
            onBackToMap={() => setPhase("map")}
            onPickAnother={() => setPhase("mode-pick")}
            onConceptMastered={() => {
              setMastered((prev) => new Set([...prev, activeConcept.id]));
              void refreshMastery();
              setPhase("map");
            }}
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
        /* ── Welcome-screen Duolingo-style motion ──────────────────── */
        @keyframes sbBounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes sbWave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10%, 30%, 50% { transform: rotate(14deg); }
          20%, 40%       { transform: rotate(-10deg); }
        }
        @keyframes sbFloatA {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50%      { transform: translate(8px, -14px) rotate(6deg); }
        }
        @keyframes sbFloatB {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50%      { transform: translate(-10px, -18px) rotate(-8deg); }
        }
        @keyframes sbFloatC {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50%      { transform: translate(12px, 10px) rotate(10deg); }
        }
        @keyframes sbFadeUp {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes sbShimmer {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes sbRingPulse {
          0%   { box-shadow: 0 0 0 0 rgba(96,165,250,0.55), 0 14px 30px rgba(96,165,250,0.35); }
          70%  { box-shadow: 0 0 0 22px rgba(96,165,250,0),    0 14px 30px rgba(96,165,250,0.35); }
          100% { box-shadow: 0 0 0 0 rgba(96,165,250,0),       0 14px 30px rgba(96,165,250,0.35); }
        }
        @keyframes sbSparkle {
          0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
          50%      { opacity: 1; transform: scale(1)   rotate(180deg); }
        }
        @keyframes sbSpin {
          from { transform: rotate(0deg); } to { transform: rotate(360deg); }
        }
        @keyframes sbCaret {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        .sb-feature-card { transition: transform .2s cubic-bezier(.34,1.56,.64,1), border-color .15s, box-shadow .15s; }
        .sb-feature-card:hover { transform: translateY(-4px) scale(1.02); }
        .sb-feature-card:hover .sb-feature-emoji { animation: sbWave .8s ease-in-out; }
        .sb-feature-emoji { display: inline-block; transform-origin: 70% 70%; }

        .sb-cta { transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .2s; }
        .sb-cta:hover { transform: translateY(-2px) scale(1.03); }
        .sb-cta:active { transform: translateY(0) scale(0.97); }
        .sb-cta-arrow { display: inline-block; transition: transform .15s; }
        .sb-cta:hover .sb-cta-arrow { transform: translateX(4px); }

        .sb-stagger-1 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .05s; }
        .sb-stagger-2 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .18s; }
        .sb-stagger-3 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .32s; }
        .sb-stagger-4 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .44s; }
        .sb-stagger-5 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .58s; }
        .sb-stagger-6 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .72s; }
        .sb-stagger-7 { animation: sbFadeUp .55s cubic-bezier(.34,1.56,.64,1) both;  animation-delay: .86s; }
      `}</style>
    </div>
  );
}

/* ─────────── Phase components ─────────── */

function Welcome({ firstName, onStart }: { firstName: string; onStart: () => void }) {
  return (
    <div style={{ maxWidth: 780, margin: "24px auto 0", textAlign: "center", padding: "0 16px", position: "relative" }}>
      {/* Floating decorations — pure CSS, pointer-events:none so nothing's clickable */}
      <div aria-hidden style={{ position: "absolute", top: 8, left: "8%", fontSize: 28, animation: "sbFloatA 5s ease-in-out infinite", pointerEvents: "none" }}>📚</div>
      <div aria-hidden style={{ position: "absolute", top: 38, right: "10%", fontSize: 26, animation: "sbFloatB 6s ease-in-out infinite", pointerEvents: "none" }}>✨</div>
      <div aria-hidden style={{ position: "absolute", top: 160, left: "4%", fontSize: 22, animation: "sbFloatC 7s ease-in-out infinite", pointerEvents: "none" }}>🎯</div>
      <div aria-hidden style={{ position: "absolute", top: 140, right: "4%", fontSize: 24, animation: "sbFloatA 8s ease-in-out infinite 0.5s", pointerEvents: "none" }}>🧠</div>
      <div aria-hidden style={{ position: "absolute", top: 240, left: "14%", fontSize: 20, animation: "sbFloatB 6.5s ease-in-out infinite 1s", pointerEvents: "none" }}>🎙</div>

      {/* Mascot with sparkle halo */}
      <div className="sb-stagger-1" style={{ position: "relative", width: 120, height: 120, margin: "0 auto 14px" }}>
        <div aria-hidden style={{
          position: "absolute", inset: -14, borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 70%)`,
          animation: "sbPulse 2.8s ease-in-out infinite",
        }} />
        <img
          src={CIOS_LOGO}
          alt="CIOS"
          width={86}
          height={86}
          style={{
            position: "relative", display: "block", margin: "17px auto 0",
            borderRadius: 20,
            boxShadow: "0 10px 28px rgba(96,165,250,0.35)",
            animation: "sbBounce 2.6s ease-in-out infinite",
          }}
        />
        {/* Sparkles around the mascot */}
        <span aria-hidden style={{ position: "absolute", top: -2, right: 8, fontSize: 18, animation: "sbSparkle 2.2s ease-in-out infinite" }}>✨</span>
        <span aria-hidden style={{ position: "absolute", bottom: 6, left: 4, fontSize: 14, animation: "sbSparkle 2.6s ease-in-out infinite 0.6s" }}>✨</span>
        <span aria-hidden style={{ position: "absolute", top: 24, right: -4, fontSize: 12, animation: "sbSparkle 2.8s ease-in-out infinite 1.2s" }}>⭐</span>
      </div>

      <div className="sb-stagger-2" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 14px", borderRadius: 999,
        background: `${ACCENT}14`,
        border: `1px solid ${ACCENT}44`,
        marginBottom: 14,
      }}>
        <span aria-hidden style={{ fontSize: 12, display: "inline-block", animation: "sbSpin 8s linear infinite" }}>⚡</span>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, color: ACCENT_DARK }}>YOUR AI STUDY COACH</span>
      </div>

      <h1 className="sb-stagger-2" style={{ margin: 0, fontSize: 42, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.6, lineHeight: 1.1 }}>
        <span style={{ display: "block" }}>
          Hi {firstName}, let&apos;s turn your{" "}
          <span aria-hidden style={{ display: "inline-block", marginLeft: 4, transformOrigin: "70% 70%", animation: "sbWave 2.4s ease-in-out infinite" }}>👋</span>
        </span>
        {/* Typewriter lives on its own line — fixed min-height so changing phrase
            length doesn't push the CTA or anything below it up and down. */}
        <span style={{
          display: "block",
          marginTop: 6,
          minHeight: "1.2em",
          lineHeight: 1.2,
        }}>
          <TypewriterPhrase />
        </span>
      </h1>

      <p className="sb-stagger-3" style={{ fontSize: 17, color: "var(--ws-text-muted, #475569)", lineHeight: 1.55, marginTop: 14, maxWidth: 620, marginInline: "auto" }}>
        Drop your chapter, a YouTube link, a PDF — anything — and CIOS turns it into a
        knowledge map you can <strong style={{ color: "var(--ws-text, #0F172A)" }}>quiz, listen to, debate, and remember</strong>.
        In your language. On your schedule.
      </p>

      <div className="sb-stagger-4" style={{ marginTop: 26 }}>
        <button
          className="sb-cta"
          onClick={onStart}
          style={{
            padding: "18px 40px",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: "#fff",
            border: "none",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.2,
            animation: "sbRingPulse 2.2s ease-in-out infinite",
          }}
        >
          Build my first knowledge map <span className="sb-cta-arrow">→</span>
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--ws-text-faint, #64748B)", display: "flex", alignItems: "center", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>⏱ Under 2 minutes</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>🎁 Free to try</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>🔥 No credit card</span>
        </div>
      </div>

      {/* Stat strip — social-proof-ish counters. Numbers are product stats, not fake — real counts wire up in Phase 6+ */}
      <div className="sb-stagger-5" style={{
        marginTop: 32,
        display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap",
      }}>
        <StatPill emoji="🎯" big="9" small="learning modes" />
        <StatPill emoji="🌍" big="14+" small="languages" />
        <StatPill emoji="📎" big="7" small="source types" />
        <StatPill emoji="💾" big="∞" small="offline packs" />
      </div>

      {/* Capability grid */}
      <div style={{
        marginTop: 28,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        textAlign: "left",
      }}>
        <div className="sb-stagger-5"><WelcomeFeature emoji="📖" title="9 learning modes" blurb="Explain · Story · Podcast · Flashcards · Quiz · Debate · Simulation + more" accent="#3B82F6" /></div>
        <div className="sb-stagger-6"><WelcomeFeature emoji="🌍" title="Your language" blurb="Yoruba · Igbo · Hausa · Swahili · English · Chinese — 14+ in all" accent="#10B981" /></div>
        <div className="sb-stagger-6"><WelcomeFeature emoji="📎" title="Any source" blurb="YouTube · PDF · DOCX · web pages · images · voice notes" accent="#F59E0B" /></div>
        <div className="sb-stagger-7"><WelcomeFeature emoji="💾" title="Works offline" blurb="Save a pack — study flashcards & podcasts without data" accent="#8B5CF6" /></div>
      </div>

      <div className="sb-stagger-7" style={{
        marginTop: 28, padding: "18px 22px", borderRadius: 16,
        background: `linear-gradient(135deg, ${ACCENT}0A, #8B5CF60A)`,
        border: `1px solid ${ACCENT}33`,
        maxWidth: 640, marginInline: "auto",
        position: "relative", overflow: "hidden",
      }}>
        <span aria-hidden style={{
          position: "absolute", top: -20, right: -20, fontSize: 90, opacity: 0.08,
          animation: "sbSpin 20s linear infinite",
        }}>🎓</span>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: ACCENT_DARK, marginBottom: 6, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <span aria-hidden style={{ display: "inline-block", animation: "sbWave 3s ease-in-out infinite" }}>💡</span>
          NOT LIKE NOTEBOOKLM
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ws-text-muted, #475569)", lineHeight: 1.55, textAlign: "center" }}>
          NotebookLM reads to you. CIOS <strong style={{ color: "var(--ws-text, #0F172A)" }}>teaches you</strong> —
          grades your answers, challenges you, tracks your mastery, and brings it back for review
          before you forget. The way an actual tutor would.
        </p>
      </div>
    </div>
  );
}

/* Typewriter phrase cycler — only the animated span renders visually; a
 * screen-reader-only static label keeps the headline semantically stable so
 * accessibility tools don't hear letters typing one at a time. */
const TYPE_PHRASES: Array<{ text: string; from: string; mid: string }> = [
  { text: "notes into mastery",        from: "#60A5FA", mid: "#8B5CF6" },
  { text: "lectures into lessons",     from: "#8B5CF6", mid: "#EC4899" },
  { text: "chapters into confidence",  from: "#EC4899", mid: "#F59E0B" },
  { text: "YouTube into expertise",    from: "#F59E0B", mid: "#10B981" },
  { text: "podcasts into knowledge",   from: "#10B981", mid: "#06B6D4" },
  { text: "anything into answers",     from: "#06B6D4", mid: "#60A5FA" },
];
const TYPE_SPEED_MS = 70;       // forward type rate per char
const TYPE_DELETE_MS = 34;      // faster delete so cycle feels snappy
const TYPE_HOLD_MS = 1700;      // hold full phrase before deleting
const TYPE_GAP_MS = 260;        // pause at empty before typing the next phrase

function TypewriterPhrase() {
  const [idx, setIdx] = useState(0);
  const [subIdx, setSubIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = TYPE_PHRASES[idx].text;

    // Finished typing forward — hold, then start deleting
    if (!deleting && subIdx === phrase.length) {
      const t = setTimeout(() => setDeleting(true), TYPE_HOLD_MS);
      return () => clearTimeout(t);
    }

    // Finished deleting — advance and type the next phrase
    if (deleting && subIdx === 0) {
      const t = setTimeout(() => {
        setDeleting(false);
        setIdx((i) => (i + 1) % TYPE_PHRASES.length);
      }, TYPE_GAP_MS);
      return () => clearTimeout(t);
    }

    // Type or delete one character
    const t = setTimeout(() => {
      setSubIdx((s) => s + (deleting ? -1 : 1));
    }, deleting ? TYPE_DELETE_MS : TYPE_SPEED_MS);
    return () => clearTimeout(t);
  }, [subIdx, deleting, idx]);

  const current = TYPE_PHRASES[idx];
  const visible = current.text.slice(0, subIdx);
  const gradientImage = `linear-gradient(90deg, ${current.from} 0%, ${current.mid} 50%, ${current.from} 100%)`;

  return (
    <>
      {/* Screen-reader stable fallback — keeps the h1 semantically meaningful */}
      <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
        notes into mastery
      </span>

      <span aria-hidden style={{ display: "inline" }}>
        <span style={{
          // Use backgroundImage long-hand — mixing `background` shorthand with
          // backgroundClip/backgroundSize triggers a React re-render warning.
          backgroundImage: gradientImage,
          backgroundSize: "200% auto",
          backgroundRepeat: "no-repeat",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
          animation: "sbShimmer 3s ease-in-out infinite",
          transition: "filter .4s",
        }}>
          {visible || " "}{/* non-breaking space keeps the line height stable when empty */}
        </span>
        {/* Solid-colored caret — sits OUTSIDE the gradient span so it stays visible */}
        <span style={{
          display: "inline-block",
          width: 3,
          height: "0.95em",
          verticalAlign: "text-bottom",
          marginLeft: 4,
          borderRadius: 1,
          backgroundColor: current.mid,
          animation: "sbCaret 1s steps(2) infinite",
        }} />
      </span>
    </>
  );
}

function StatPill({ emoji, big, small }: { emoji: string; big: string; small: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 999,
      background: "var(--ws-canvas, #fff)",
      border: "1px solid var(--ws-border, #E2E8F0)",
      transition: "transform .2s cubic-bezier(.34,1.56,.64,1)",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 17, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>{big}</span>
      <span style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", fontWeight: 700 }}>{small}</span>
    </div>
  );
}

function WelcomeFeature({ emoji, title, blurb, accent }: { emoji: string; title: string; blurb: string; accent: string }) {
  return (
    <div
      className="sb-feature-card"
      style={{
        padding: "16px 18px", borderRadius: 16,
        background: "var(--ws-canvas, #fff)",
        border: "1px solid var(--ws-border, #E2E8F0)",
        cursor: "default",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow = `0 10px 24px ${accent}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ws-border, #E2E8F0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Accent swoosh that appears on hover */}
      <span aria-hidden style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accent, opacity: 0.8,
      }} />
      <div className="sb-feature-emoji" style={{ fontSize: 26, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: "var(--ws-text, #0F172A)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", lineHeight: 1.5 }}>{blurb}</div>
    </div>
  );
}

function OnboardingShell({
  step, total, title, subtitle, children, onBack,
}: {
  step: number; total: number; title: string; subtitle: string; children: React.ReactNode;
  onBack?: () => void;
}) {
  const pct = (step / total) * 100;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--ws-chip, #F1F5F9)",
              color: "var(--ws-text-muted, #475569)",
              border: "1px solid var(--ws-border, #E2E8F0)",
              fontSize: 14, fontWeight: 900,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${ACCENT}14`; e.currentTarget.style.color = ACCENT_DARK; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--ws-chip, #F1F5F9)"; e.currentTarget.style.color = "var(--ws-text-muted, #475569)"; }}
          >
            ←
          </button>
        )}
        <div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--ws-chip-hover, #E2E8F0)", overflow: "hidden" }}>
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
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ws-text-faint, #64748B)" }}>
          {step} / {total}
        </div>
      </div>

      <div style={{ animation: "sbPop .4s ease both" }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>{title}</h2>
        <p style={{ fontSize: 14, color: "var(--ws-text-faint, #64748B)", marginTop: 6 }}>{subtitle}</p>
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
        border: "2px solid var(--ws-border, #E2E8F0)",
        background: "var(--ws-canvas, #fff)",
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
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ws-text, #0F172A)" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ws-text-faint, #64748B)", marginTop: 4 }}>{blurb}</div>
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
  pendingSources, onAddPaste, onAddLink, onAddPendingSource, onRemoveSource, onBack,
}: {
  ctx: StudyContext;
  source: string;
  onSourceChange: (v: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  onGenerate: () => void;
  generating: boolean;
  mapping: boolean;
  pendingSources: PendingSource[];
  onAddPaste: () => void;
  onAddLink: (url: string) => void;
  onAddPendingSource: (src: PendingSource) => void;
  onRemoveSource: (idx: number) => void;
  onBack?: () => void;
}) {
  const busy = generating || mapping;
  const [tab, setTab] = useState<"paste" | "upload" | "link" | "record" | "library">("paste");
  const [linkDraft, setLinkDraft] = useState("");

  const handleAddLink = () => {
    if (!linkDraft.trim()) return;
    onAddLink(linkDraft);
    setLinkDraft("");
  };

  const totalSources = pendingSources.length + (source.trim().length >= 40 ? 1 : 0);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            padding: "7px 12px", borderRadius: 8,
            background: "var(--ws-chip, #F1F5F9)",
            color: "var(--ws-text-muted, #475569)",
            border: "1px solid var(--ws-border, #E2E8F0)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            marginBottom: 14,
          }}
        >
          ← Change language
        </button>
      )}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>
          Bring your notes on <span style={{ color: ACCENT_DARK }}>{ctx.topic}</span>
        </h2>
        <p style={{ color: "var(--ws-text-faint, #64748B)", fontSize: 14, marginTop: 6 }}>
          Paste text, drop a YouTube link, upload a PDF/DOCX/image, or let CIOS write a primer.
        </p>
      </div>

      {/* Source chips — shows what the wizard will build from */}
      {pendingSources.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          padding: "12px 14px", marginBottom: 14,
          background: "var(--ws-chip, #F8FAFC)",
          border: "1px solid var(--ws-border, #E2E8F0)",
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ws-text-muted, #475569)", alignSelf: "center", marginRight: 4 }}>
            {pendingSources.length} source{pendingSources.length === 1 ? "" : "s"} queued:
          </div>
          {pendingSources.map((s, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 999,
              background: "var(--ws-canvas, #fff)",
              border: "1px solid var(--ws-border, #E2E8F0)",
              fontSize: 12, fontWeight: 700, color: "var(--ws-text, #0F172A)",
            }}>
              <span>{kindEmoji(s.kind)}</span>
              <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label || s.ref}</span>
              <button onClick={() => onRemoveSource(i)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--ws-text-faint, #64748B)", fontSize: 14, padding: 0, lineHeight: 1,
              }} aria-label="Remove source">×</button>
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          background: "var(--ws-canvas, #fff)",
          border: "1px solid var(--ws-border, #E2E8F0)",
          borderRadius: 20,
          padding: 22,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {(["paste", "upload", "link", "record", "library"] as const).map((t) => {
            const active = tab === t;
            const label = { paste: "📝 Paste", upload: "📎 Upload", link: "🔗 Link", record: "🎙 Record", library: "📚 Library" }[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${active ? ACCENT : "var(--ws-border, #E2E8F0)"}`,
                  background: active ? `${ACCENT}14` : "var(--ws-canvas, #fff)",
                  color: active ? ACCENT_DARK : "var(--ws-text-muted, #475569)",
                  fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tab === "paste" && (
          <>
            <textarea
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              rows={10}
              placeholder="Paste your notes, a chapter, or any study text here…"
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid var(--ws-border, #E2E8F0)",
                borderRadius: 14,
                fontSize: 14, lineHeight: 1.55,
                background: "var(--ws-chip, #F8FAFC)",
                color: "var(--ws-text, #0F172A)",
                fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)" }}>
                {source.length.toLocaleString()} characters
              </div>
              <button
                onClick={onAddPaste}
                disabled={source.trim().length < 40}
                style={{
                  padding: "7px 14px", borderRadius: 8,
                  background: source.trim().length < 40 ? "var(--ws-chip, #F1F5F9)" : ACCENT,
                  color: source.trim().length < 40 ? "var(--ws-text-faint, #94A3B8)" : "#fff",
                  border: "none", fontSize: 12, fontWeight: 800,
                  cursor: source.trim().length < 40 ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                + Add as source
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 10, lineHeight: 1.5 }}>
              Or skip adding — we&apos;ll auto-include this paste when you build the map.
            </p>
          </>
        )}

        {tab === "upload" && (
          <UploadTab onUpload={onUpload} />
        )}

        {tab === "link" && (
          <>
            <label style={{ fontSize: 13, fontWeight: 800, color: "var(--ws-text, #0F172A)", display: "block", marginBottom: 8 }}>
              Paste a YouTube URL or any web page link
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                placeholder="https://youtube.com/watch?v=… or https://en.wikipedia.org/…"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLink(); } }}
                style={{
                  flex: 1, padding: "12px 14px",
                  border: "1px solid var(--ws-border, #E2E8F0)", borderRadius: 12,
                  fontSize: 14, background: "var(--ws-chip, #F8FAFC)",
                  color: "var(--ws-text, #0F172A)", fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={handleAddLink}
                disabled={!linkDraft.trim()}
                style={{
                  padding: "12px 18px", borderRadius: 12,
                  background: !linkDraft.trim() ? "var(--ws-chip, #F1F5F9)" : ACCENT,
                  color: !linkDraft.trim() ? "var(--ws-text-faint, #94A3B8)" : "#fff",
                  border: "none", fontSize: 13, fontWeight: 800, cursor: linkDraft.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                + Add
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 10, lineHeight: 1.5 }}>
              YouTube captions are auto-fetched · Web pages extract the readable article body · You can add multiple links.
            </p>
          </>
        )}

        {tab === "record" && (
          <RecordTab
            language={ctx.language}
            onTranscript={(text, durationSec) => {
              onAddPendingSource({
                kind: "text",
                ref: `rec-${Date.now()}`,
                label: `🎙 Recording (${Math.round(durationSec)}s)`,
                body: text,
              });
            }}
          />
        )}

        {tab === "library" && <LibraryTab onAddSource={onAddPendingSource} />}
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
          disabled={busy || totalSources === 0}
          style={{
            flex: 1,
            minWidth: 240,
            padding: "13px 18px",
            background: busy || totalSources === 0 ? "#E2E8F0" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: busy || totalSources === 0 ? "#94A3B8" : "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: busy || totalSources === 0 ? "not-allowed" : "pointer",
            boxShadow: busy || totalSources === 0 ? "none" : `0 10px 22px ${ACCENT}44`,
            fontFamily: "inherit",
          }}
        >
          {mapping ? "Building map…" : totalSources === 0 ? "Add a source first" : `Build knowledge map → (${totalSources})`}
        </button>
      </div>
    </div>
  );
}

function UploadTab({ onUpload }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Forward a DataTransfer drop into the same onUpload handler we use for
  // the file picker — by synthesizing an <input>.files assignment.
  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (!files || !files.length || !inputRef.current) return;
    const dt = new DataTransfer();
    for (const f of Array.from(files)) dt.items.add(f);
    inputRef.current.files = dt.files;
    inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        display: "block",
        padding: "28px 20px", borderRadius: 14,
        background: dragOver ? `${ACCENT}14` : "var(--ws-chip, #F8FAFC)",
        border: `1.5px dashed ${dragOver ? ACCENT : "var(--ws-border, #E2E8F0)"}`,
        cursor: "pointer", textAlign: "center", transition: "background .15s, border-color .15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.rtf,image/*,text/*"
        onChange={onUpload}
        style={{ display: "none" }}
      />
      <div style={{ fontSize: 30, marginBottom: 6 }}>📎</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ws-text, #0F172A)", marginBottom: 4 }}>
        Drop files here or click to browse
      </div>
      <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", lineHeight: 1.6 }}>
        PDF · DOCX · TXT · MD · RTF · Images (OCR) — multiple files welcome
      </div>
    </label>
  );
}

/* ─── Phase 4 · Record tab ─────────────────────────────────────────────
 * Live-dictation via the browser's SpeechRecognition API. Works today in
 * Chrome / Edge / modern Safari without any install.
 *
 * IMPORTANT: Chrome/Edge send audio to Google's servers for recognition —
 * 500ms-2s latency is normal and depends on the user's connection. To make
 * the delay feel alive (not broken) we layer in:
 *  · A live audio-level pulse (Web Audio API) so users SEE their voice is
 *    being captured even before the transcriber catches up.
 *  · Stage indicators: "Listening…" → "Hearing you…" → "Transcribing…"
 *  · An auto-restart loop that uses refs (not stale closure state) so
 *    recording continues past Chrome's ~60-second per-call limit.
 *
 * At launch, STT_PROVIDER=groq enables server-side full-audio transcription
 * for chunkier uploads and higher accuracy. */
function RecordTab({ language, onTranscript }: { language: string; onTranscript: (text: string, durationSec: number) => void }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [stage, setStage] = useState<"idle" | "listening" | "hearing" | "transcribing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);        // 0..1 from Web Audio analyser

  // All long-lived handles in refs so the onend closure sees current values
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingRef = useRef(false);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef("");                      // final transcript so far
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const hasSR = typeof window !== "undefined" &&
      (Boolean((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition) ||
       Boolean((window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition));
    setSupported(hasSR);
  }, []);

  // Visual audio meter — independent of SpeechRecognition latency. This lets
  // the user see "yes my voice IS being picked up" even while the cloud STT
  // hasn't returned text yet.
  const startMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length / 255; // 0..1
        setAudioLevel(avg);
        // Stage transitions — show "Hearing you…" the moment mic crosses a
        // threshold; stay on "Transcribing…" once text starts flowing.
        if (avg > 0.06 && accumulatedRef.current.length === 0 && stageRef.current !== "transcribing") {
          setStage("hearing");
          stageRef.current = "hearing";
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      // Mic permission denied — recognition may still work if the browser
      // requests its own permission. Don't block recording.
    }
  };
  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAudioLevel(0);
  };

  // Stage is also a ref so the meter loop can read it without re-rendering
  const stageRef = useRef<"idle" | "listening" | "hearing" | "transcribing">("idle");

  const start = async () => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { toast.error("Speech recognition not supported in this browser"); return; }

    accumulatedRef.current = "";
    setDraft("");
    setElapsed(0);
    setStage("listening");
    stageRef.current = "listening";

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = mapToBcp47(language);

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) accumulatedRef.current += piece + " ";
        else interim += piece;
      }
      setDraft((accumulatedRef.current + interim).trim());
      if (stageRef.current !== "transcribing") {
        setStage("transcribing");
        stageRef.current = "transcribing";
      }
    };
    rec.onend = () => {
      // Auto-restart using the ref so the loop survives React re-renders.
      // Chrome terminates continuous recognition after ~60s of silence — we
      // silently restart so a lecture can run for as long as the user wants.
      if (recordingRef.current) {
        try { rec.start(); } catch { /* swallow — will emit another end */ }
      }
    };
    rec.onerror = () => {
      // Chrome fires "no-speech" errors during long pauses; onend will retry
      // via the loop above. For hard errors the user can just click stop.
    };

    rec.start();
    recognitionRef.current = rec;
    recordingRef.current = true;
    startedAtRef.current = Date.now();
    setRecording(true);
    tickRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 500);

    // Kick off the mic meter in parallel so the user sees a live signal
    void startMeter();
  };

  const stop = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    recordingRef.current = false;
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    setRecording(false);
    setStage("idle");
    stageRef.current = "idle";
    try { rec?.stop(); } catch { /* ignore */ }
    stopMeter();
  };

  // Unmount cleanup — fire-and-forget
  useEffect(() => () => { stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    if (!draft.trim()) { toast.error("Nothing was captured — try again"); return; }
    onTranscript(draft.trim(), elapsed || 0);
    setDraft("");
    setElapsed(0);
    toast.success("Recording added as a source");
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (supported === false) {
    return (
      <div style={{ padding: "20px", borderRadius: 14, background: "var(--ws-chip, #F8FAFC)", border: "1px dashed var(--ws-border, #E2E8F0)", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🎙</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ws-text, #0F172A)", marginBottom: 4 }}>
          Recording needs Chrome / Edge / Safari
        </div>
        <p style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", margin: 0, lineHeight: 1.55 }}>
          Your current browser doesn&apos;t support live speech recognition. Use Paste or Upload instead — and full audio file transcription arrives at launch.
        </p>
      </div>
    );
  }

  // Button scale follows mic level so user sees their voice register
  // immediately — independent of any Google STT round-trip lag.
  const pulseScale = recording ? 1 + Math.min(0.35, audioLevel * 1.8) : 1;
  const pulseGlow = recording ? Math.min(18, 4 + audioLevel * 60) : 0;
  const stageLabel =
    stage === "listening"    ? "Listening… speak clearly" :
    stage === "hearing"      ? "Hearing you…" :
    stage === "transcribing" ? "Transcribing" :
                               "Record a lecture or your own voice notes";

  return (
    <div style={{ padding: "18px 16px", borderRadius: 14, background: "var(--ws-chip, #F8FAFC)", border: `1px ${recording ? "solid" : "dashed"} ${recording ? "#EF4444" : "var(--ws-border, #E2E8F0)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <button
          onClick={recording ? stop : start}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: recording ? "#EF4444" : ACCENT,
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: 22, fontWeight: 900, fontFamily: "inherit",
            transform: `scale(${pulseScale})`,
            boxShadow: recording
              ? `0 0 0 ${pulseGlow}px rgba(239,68,68,0.22)`
              : `0 0 0 0 ${ACCENT}33`,
            transition: "transform .08s linear, box-shadow .08s linear, background .2s",
            flexShrink: 0,
          }}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? "■" : "●"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ws-text, #0F172A)", display: "flex", alignItems: "center", gap: 6 }}>
            {stageLabel}
            {recording && (
              <span style={{
                display: "inline-flex", gap: 2, marginLeft: 4,
              }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 3, height: 10, borderRadius: 2,
                    background: audioLevel > 0.04 + i * 0.08 ? "#EF4444" : "var(--ws-border, #E2E8F0)",
                    transition: "background .08s linear",
                  }} />
                ))}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 2 }}>
            {recording ? `${fmt(elapsed)} elapsed · click to stop` : `Language: ${language} · transcript appears below`}
          </div>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder={recording ? "Your words appear here as the browser transcribes (usually 1-2s behind)…" : "Stopped. Edit the transcript if needed, then add it as a source."}
        style={{
          width: "100%", padding: "12px 14px",
          border: "1px solid var(--ws-border, #E2E8F0)",
          borderRadius: 12,
          fontSize: 14, lineHeight: 1.55,
          background: "var(--ws-canvas, #fff)",
          color: "var(--ws-text, #0F172A)",
          fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button
          onClick={commit}
          disabled={recording || !draft.trim()}
          style={{
            padding: "8px 14px", borderRadius: 8,
            background: !draft.trim() || recording ? "var(--ws-chip, #F1F5F9)" : ACCENT,
            color: !draft.trim() || recording ? "var(--ws-text-faint, #94A3B8)" : "#fff",
            border: "none", fontSize: 12, fontWeight: 800,
            cursor: !draft.trim() || recording ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          + Add as source
        </button>
      </div>
      <p style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 10, lineHeight: 1.5 }}>
        Chrome/Edge send audio to Google&apos;s cloud for transcription — expect 1-2s lag on good connections, more on slow ones. The pulsing mic button shows your voice is being captured. Full-audio Whisper (much more accurate) arrives at launch.
      </p>
    </div>
  );
}

/* ─── Phase 4 · Library tab ─────────────────────────────────────────────
 * Universal "bring a past session into this one" shelf. Content:
 *   · 🗂 Your own recent sessions — always shown (everyone builds a library)
 *   · 👥 Cohort shares — only for users in a CIOS cohort (cohort_number set)
 *
 * One click pulls the session's text chunks into the current wizard as a
 * source. Public users without a cohort still see a functional tab — their
 * own session history.
 */
type LibraryItem =
  | { kind: "own";    id: string; title: string; subtitle: string; meta: string; createdAt: string }
  | { kind: "cohort"; id: string; title: string; subtitle: string; meta: string; createdAt: string; note: string | null };

function LibraryTab({ onAddSource }: { onAddSource: (src: PendingSource) => void }) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState<string | null>(null);
  const [hasCohort, setHasCohort] = useState(false);

  useEffect(() => {
    (async () => {
      const [ownRes, cohortRes] = await Promise.all([
        listRecentStudySessions(15),
        listCohortShelf(20),
      ]);

      if (!ownRes.ok && !cohortRes.ok) {
        setError(ownRes.ok ? (cohortRes as { ok: false; error: string }).error : (ownRes as { ok: false; error: string }).error);
        return;
      }

      const own: LibraryItem[] = ((ownRes.ok ? ownRes.data : []) || []).map((s: StudySession) => ({
        kind: "own" as const,
        id: s.id,
        title: s.topic,
        subtitle: "You · past session",
        meta: `${s.language} · ${Array.isArray(s.sources) ? s.sources.length : 0} source${Array.isArray(s.sources) && s.sources.length === 1 ? "" : "s"}`,
        createdAt: s.created_at,
      }));

      const cohortShares = (cohortRes.ok ? cohortRes.data : []) || [];
      const cohort: LibraryItem[] = cohortShares.map((s: CohortShare) => ({
        kind: "cohort" as const,
        id: s.id,
        title: s.title || s.sessionTopic,
        subtitle: s.sharedByName ? `${s.sharedByName} · cohort` : "Cohort member",
        meta: `${s.sessionLanguage} · ${s.sourceCount} source${s.sourceCount === 1 ? "" : "s"}`,
        createdAt: s.createdAt,
        note: s.note,
      }));

      setHasCohort(cohort.length > 0);
      // Merge and sort newest-first so a fresh cohort share still surfaces
      // above a week-old own-session.
      const merged = [...cohort, ...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setItems(merged);
    })();
  }, []);

  const pull = async (item: LibraryItem) => {
    setPulling(item.id);
    try {
      if (item.kind === "own") {
        const r = await chunksFromOwnSession(item.id);
        if (!r.ok) { toast.error(r.error); return; }
        for (const c of r.data!.chunks) onAddSource({ kind: c.kind, ref: c.ref, label: c.label, body: c.body });
        toast.success(`Pulled "${r.data!.title}" from your past sessions`);
      } else {
        const r = await chunksFromCohortShare(item.id);
        if (!r.ok) { toast.error(r.error); return; }
        for (const c of r.data!.chunks) onAddSource({ kind: c.kind, ref: c.ref, label: c.label, body: c.body });
        toast.success(`Pulled "${r.data!.title}" from your cohort`);
      }
    } finally {
      setPulling(null);
    }
  };

  if (error) {
    return <div style={{ padding: 16, fontSize: 13, color: "var(--ws-text-faint, #64748B)" }}>{error}</div>;
  }
  if (items === null) {
    return <div style={{ padding: 16, fontSize: 13, color: "var(--ws-text-faint, #64748B)" }}>Loading your library…</div>;
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: "20px", borderRadius: 14, background: "var(--ws-chip, #F8FAFC)", border: "1px dashed var(--ws-border, #E2E8F0)", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📖</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ws-text, #0F172A)", marginBottom: 4 }}>
          Your library is empty — for now
        </div>
        <p style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", margin: 0, lineHeight: 1.55, maxWidth: 420, marginInline: "auto" }}>
          Finish your first study session and it&apos;ll live here. Next time you open Study Buddy you can reuse it as a source — perfect for building on what you already learned.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text-faint, #64748B)", letterSpacing: 0.4 }}>
        {items.length} item{items.length === 1 ? "" : "s"} · tap any to reuse as a source
        {hasCohort && <> · 👥 = shared by your cohort</>}
      </div>
      {items.map((s) => (
        <div key={`${s.kind}:${s.id}`} style={{
          padding: 14, borderRadius: 12,
          background: "var(--ws-canvas, #fff)",
          border: "1px solid var(--ws-border, #E2E8F0)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: s.kind === "own" ? "#EEF2FF" : "#FDF2F8",
            color: s.kind === "own" ? "#4338CA" : "#BE185D",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, flexShrink: 0,
          }}>
            {s.kind === "own" ? "🗂" : "👥"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ws-text, #0F172A)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 2 }}>
              {s.subtitle} · {s.meta}
            </div>
            {s.kind === "cohort" && s.note && (
              <div style={{ fontSize: 12, color: "var(--ws-text-muted, #475569)", marginTop: 4, fontStyle: "italic" }}>
                “{s.note}”
              </div>
            )}
          </div>
          <button
            onClick={() => pull(s)}
            disabled={pulling === s.id}
            style={{
              padding: "7px 12px", borderRadius: 8,
              background: pulling === s.id ? "var(--ws-chip, #F1F5F9)" : ACCENT,
              color: pulling === s.id ? "var(--ws-text-faint, #94A3B8)" : "#fff",
              border: "none", fontSize: 12, fontWeight: 800,
              cursor: pulling === s.id ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            {pulling === s.id ? "Pulling…" : "+ Use"}
          </button>
        </div>
      ))}
    </div>
  );
}

function kindEmoji(kind: PendingSource["kind"]): string {
  switch (kind) {
    case "text":    return "📝";
    case "youtube": return "▶️";
    case "url":     return "🔗";
    case "pdf":     return "📄";
    case "docx":    return "📃";
    case "image":   return "🖼";
    case "audio":   return "🎙";
    case "video":   return "🎬";
  }
}

function MapPhase({
  map, mastered, masteryByConcept, onPick, onSaveOffline, savingOffline,
  onShareCohort, sharingCohort, sharedCohort,
}: {
  map: KnowledgeMap;
  mastered: Set<string>;
  masteryByConcept: Record<string, number>;
  onPick: (id: string) => void;
  onSaveOffline: () => void;
  savingOffline: boolean;
  onShareCohort: () => void;
  sharingCohort: boolean;
  sharedCohort: boolean;
}) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.5 }}>YOUR KNOWLEDGE MAP</div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>
          {map.mainTopic}
        </h2>
        <p style={{ color: "var(--ws-text-muted, #475569)", fontSize: 14, maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
          {map.overview}
        </p>
        {/* Phase 3 — Save-for-offline button */}
        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onSaveOffline}
            disabled={savingOffline}
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: "var(--ws-canvas, #fff)",
              color: ACCENT_DARK,
              border: `1.5px solid ${ACCENT}`,
              fontSize: 12, fontWeight: 800, cursor: savingOffline ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {savingOffline ? "Saving…" : "💾 Save for offline"}
          </button>
          <Link href="/study-buddy/library" style={{
            padding: "8px 14px", borderRadius: 10,
            background: "var(--ws-chip, #F1F5F9)",
            color: "var(--ws-text-muted, #475569)",
            border: "1px solid var(--ws-border, #E2E8F0)",
            fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: "inherit",
          }}>📚 Offline library</Link>
          <button
            onClick={onShareCohort}
            disabled={sharingCohort || sharedCohort}
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: sharedCohort ? "#D1FAE5" : "var(--ws-canvas, #fff)",
              color: sharedCohort ? "#065F46" : "var(--ws-text-muted, #475569)",
              border: `1px solid ${sharedCohort ? "#A7F3D0" : "var(--ws-border, #E2E8F0)"}`,
              fontSize: 12, fontWeight: 700, cursor: sharedCohort ? "default" : (sharingCohort ? "wait" : "pointer"),
              fontFamily: "inherit",
            }}
          >
            {sharedCohort ? "✓ Shared with cohort" : (sharingCohort ? "Sharing…" : "👥 Share with cohort")}
          </button>
        </div>
      </div>

      <RadialMap map={map} mastered={mastered} onPick={onPick} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 28 }}>
        {map.concepts.map((c, i) => {
          const done = mastered.has(c.id);
          const score = masteryByConcept[c.id] ?? 0;
          const hasScore = score > 0;
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
                {hasScore ? (
                  <MasteryRing score={score} size={36} />
                ) : (
                  <span
                    style={{
                      width: 28, height: 28, borderRadius: 999,
                      background: done ? "#22C55E" : `${ACCENT}22`,
                      color: done ? "#fff" : ACCENT_DARK,
                      fontSize: 12, fontWeight: 900,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                )}
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ws-text, #0F172A)" }}>{c.title}</div>
              </div>
              <div style={{ color: "var(--ws-text-muted, #475569)", fontSize: 13, lineHeight: 1.55 }}>{c.summary}</div>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--ws-text-faint, #64748B)", fontSize: 12, lineHeight: 1.6 }}>
                {c.keyPoints.slice(0, 3).map((kp, k) => <li key={k}>{kp}</li>)}
              </ul>
              <div style={{ marginTop: 10, color: ACCENT_DARK, fontSize: 12, fontWeight: 800 }}>
                {hasScore
                  ? score >= 80 ? `Mastered · ${score}% — review?` : score >= 50 ? `${score}% — keep going →` : `${score}% — try again →`
                  : done ? "Practice again →" : "Start this concept →"}
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
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>
          {concept.title}
        </h2>
        <p style={{ color: "var(--ws-text-muted, #334155)", fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{concept.summary}</p>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {concept.keyPoints.slice(0, 4).map((kp, i) => (
            <span
              key={i}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--ws-canvas, #fff)",
                border: "1px solid var(--ws-border, #CBD5E1)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ws-text-muted, #475569)",
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
          background: "var(--ws-canvas, #fff)",
          border: "1px solid var(--ws-border, #E2E8F0)",
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
                    border: "1px solid var(--ws-border, #E2E8F0)",
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.55,
                    background: listening ? "#FFF7ED" : "#F8FAFC",
                    color: "var(--ws-text, #0F172A)",
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
            background: "var(--ws-chip, #F8FAFC)",
            border: "1px solid var(--ws-border, #E2E8F0)",
            padding: "12px 14px",
            borderRadius: 14,
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--ws-text, #0F172A)",
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
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text, #0F172A)" }}>{firstName}</div>
      <div
        style={{
          background: `${ACCENT}14`,
          border: `1px solid ${ACCENT}33`,
          padding: "12px 14px",
          borderRadius: 14,
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ws-text, #0F172A)",
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
      <div style={{ color: "var(--ws-text, #0F172A)", fontSize: 14, lineHeight: 1.6 }}>{grade.explanation}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          onClick={onNext}
          style={{
            padding: "10px 18px",
            background: "var(--ws-canvas, #fff)",
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
      <span style={{ fontSize: 13, color: "var(--ws-text-faint, #64748B)" }}>CIOS is preparing your question…</span>
    </div>
  );
}

function CelebratePhase({ map, mastered, onRestart }: { map: KnowledgeMap; mastered: Set<string>; onRestart: () => void }) {
  return (
    <div style={{ maxWidth: 620, margin: "40px auto 0", textAlign: "center", animation: "sbPop .5s ease both" }}>
      <div style={{ fontSize: 72, marginBottom: 6 }}>🎊</div>
      <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>
        Session complete
      </h2>
      <p style={{ color: "var(--ws-text-muted, #475569)", fontSize: 15, marginTop: 8 }}>
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
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ws-text, #0F172A)", fontSize: 14, lineHeight: 1.7 }}>
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
            background: "var(--ws-chip, #F1F5F9)",
            color: "var(--ws-text, #0F172A)",
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

/* ─────────── Phase 2 · Learning modes ─────────── */

function ModePickerPhase({
  concept, language, onBack, onPick, loading,
}: {
  concept: Concept;
  language: string;
  onBack: () => void;
  onPick: (mode: ModeId) => void;
  loading: boolean;
}) {
  void language;
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.5 }}>HOW DO YOU WANT TO LEARN IT?</div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>
          {concept.title}
        </h2>
        <p style={{ color: "var(--ws-text-faint, #64748B)", fontSize: 14, maxWidth: 560, margin: "0 auto", lineHeight: 1.55 }}>
          Same concept, nine different lenses. Pick whichever fits your mood — or switch after.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 12,
      }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => !loading && m.available && onPick(m.id)}
            disabled={loading || !m.available}
            style={{
              padding: 16, borderRadius: 16, textAlign: "left",
              background: "var(--ws-canvas, #fff)",
              border: "1.5px solid var(--ws-border, #E2E8F0)",
              cursor: loading || !m.available ? "not-allowed" : "pointer",
              opacity: !m.available ? 0.55 : 1,
              fontFamily: "inherit",
              transition: "border-color .15s, transform .1s",
              position: "relative",
            }}
            onMouseEnter={(e) => { if (m.available && !loading) e.currentTarget.style.borderColor = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ws-border, #E2E8F0)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{m.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>{m.label}</span>
              {!m.available && (
                <span style={{ marginLeft: "auto", fontSize: 9, padding: "2px 8px", borderRadius: 999, background: `${ACCENT}22`, color: ACCENT_DARK, fontWeight: 900, letterSpacing: 0.4 }}>
                  COMING SOON
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--ws-text-muted, #475569)", lineHeight: 1.5, marginBottom: 8 }}>
              {m.blurb}
            </div>
            <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", fontStyle: "italic" }}>
              Best for: {m.bestFor}
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10 }}>
        <button onClick={onBack} disabled={loading} style={{
          padding: "10px 20px", borderRadius: 10,
          background: "var(--ws-chip, #F1F5F9)",
          color: "var(--ws-text-muted, #475569)",
          border: "1px solid var(--ws-border, #E2E8F0)",
          fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
        }}>← Back to map</button>
        {loading && (
          <div style={{ padding: "10px 16px", fontSize: 13, color: ACCENT_DARK, fontWeight: 700 }}>
            Preparing your lesson…
          </div>
        )}
      </div>
    </div>
  );
}

function ModeSession({
  mode, concept, ctx, sessionId,
  explainData, storyData, podcastData, flashData, quizData, debateData, simData, videoData,
  onVideoUpdate,
  onBackToMap, onPickAnother, onConceptMastered,
}: {
  mode: ModeId;
  concept: Concept;
  ctx: StudyContext;
  sessionId: string;
  explainData: ExplainOutput | null;
  storyData: StoryOutput | null;
  podcastData: PodcastOutput | null;
  flashData: FlashcardsOutput | null;
  quizData: QuizOutput | null;
  debateData: DebateOutput | null;
  simData: SimulationOutput | null;
  videoData: VideoOutput | null;
  onVideoUpdate: (v: VideoOutput) => void;
  onBackToMap: () => void;
  onPickAnother: () => void;
  onConceptMastered: () => void;
}) {
  const activeMode = MODES.find((m) => m.id === mode);
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={onBackToMap} style={{
          padding: "7px 12px", borderRadius: 8,
          background: "var(--ws-chip, #F1F5F9)",
          color: "var(--ws-text-muted, #475569)",
          border: "1px solid var(--ws-border, #E2E8F0)",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>← Map</button>
        <button onClick={onPickAnother} style={{
          padding: "7px 12px", borderRadius: 8,
          background: "var(--ws-canvas, #fff)",
          color: ACCENT_DARK,
          border: `1.5px solid ${ACCENT}`,
          fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>Switch mode</button>
        <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: "var(--ws-text-muted, #475569)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{activeMode?.emoji}</span>
          <span>{activeMode?.label} · {concept.title}</span>
        </div>
      </div>

      {mode === "explain"    && explainData  && <ExplainView data={explainData} language={ctx.language} />}
      {mode === "story"      && storyData    && <StoryView data={storyData} language={ctx.language} />}
      {mode === "podcast"    && podcastData  && <PodcastView data={podcastData} language={ctx.language} />}
      {mode === "flashcards" && flashData    && <FlashcardView data={flashData} sessionId={sessionId} concept={concept} onDone={onConceptMastered} />}
      {mode === "quiz"       && quizData     && <QuizView data={quizData} sessionId={sessionId} concept={concept} onDone={onConceptMastered} />}
      {mode === "debate"     && debateData   && <DebateView data={debateData} ctx={ctx} concept={concept} onDone={onConceptMastered} />}
      {mode === "simulation" && simData      && <SimulationView data={simData} ctx={ctx} concept={concept} onDone={onConceptMastered} />}
      {mode === "video"      && videoData    && <VideoView data={videoData} sessionId={sessionId} concept={concept} onUpdate={onVideoUpdate} onDone={onConceptMastered} />}
    </div>
  );
}

function speakBrowser(text: string, langHint: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langHint || "en-US";
  u.rate = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
function stopSpeak() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
function langToBcp47(lang: string): string {
  const l = lang.toLowerCase();
  if (l.includes("yoruba"))  return "yo-NG";
  if (l.includes("igbo"))    return "ig-NG";
  if (l.includes("hausa"))   return "ha-NG";
  if (l.includes("swahili")) return "sw-KE";
  if (l.includes("french"))  return "fr-FR";
  if (l.includes("spanish")) return "es-ES";
  if (l.includes("german"))  return "de-DE";
  if (l.includes("arabic"))  return "ar-SA";
  if (l.includes("portuguese")) return "pt-BR";
  if (l.includes("mandarin") || l.includes("chinese")) return "zh-CN";
  return "en-US";
}

/* ─── Read-style views (Explain, Story, Podcast) ─── */

function ExplainView({ data, language }: { data: ExplainOutput; language: string }) {
  const [playing, setPlaying] = useState(false);
  const fullText = [data.intro, ...data.sections.map((s) => `${s.heading}. ${s.body}`), `Key takeaway: ${data.takeaway}`].join(". ");
  const onPlay = () => {
    if (playing) { stopSpeak(); setPlaying(false); return; }
    speakBrowser(fullText, langToBcp47(language));
    setPlaying(true);
  };
  return (
    <ReadCard>
      <ReadHeader title={data.title} onPlay={onPlay} playing={playing} />
      <p style={readIntro}>{data.intro}</p>
      {data.sections.map((s, i) => (
        <div key={i} style={{ marginTop: 18 }}>
          <h4 style={readSectionH}>{s.heading}</h4>
          <p style={readBody}>{s.body}</p>
        </div>
      ))}
      <div style={{ marginTop: 22, padding: 14, background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`, borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.4 }}>KEY TAKEAWAY</div>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ws-text, #0F172A)", lineHeight: 1.6 }}>{data.takeaway}</p>
      </div>
    </ReadCard>
  );
}

function StoryView({ data, language }: { data: StoryOutput; language: string }) {
  const [playing, setPlaying] = useState(false);
  const fullText = `${data.setting}. ${data.story}. Moral: ${data.moral}`;
  const onPlay = () => {
    if (playing) { stopSpeak(); setPlaying(false); return; }
    speakBrowser(fullText, langToBcp47(language));
    setPlaying(true);
  };
  return (
    <ReadCard>
      <ReadHeader title={data.title} onPlay={onPlay} playing={playing} />
      <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", fontStyle: "italic", marginBottom: 12 }}>
        📍 {data.setting}
      </div>
      {data.story.split(/\n\n+/).map((para, i) => (
        <p key={i} style={readBody}>{para}</p>
      ))}
      <div style={{ marginTop: 22, padding: 14, background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`, borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.4 }}>THE MORAL</div>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ws-text, #0F172A)", lineHeight: 1.6 }}>{data.moral}</p>
      </div>
    </ReadCard>
  );
}

function PodcastView({ data, language }: { data: PodcastOutput; language: string }) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playAll = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Speech not supported in this browser");
      return;
    }
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); setCurrentIdx(-1); return; }

    setPlaying(true);
    let i = 0;
    const bcp = langToBcp47(language);

    const playNext = () => {
      if (i >= data.turns.length) { setPlaying(false); setCurrentIdx(-1); return; }
      const turn = data.turns[i];
      setCurrentIdx(i);
      const u = new SpeechSynthesisUtterance(turn.text);
      u.lang = bcp;
      u.rate = 1.02;
      // Slightly different pitches for the two hosts so they sound distinct
      u.pitch = turn.speaker === "A" ? 0.95 : 1.15;
      u.onend = () => { i += 1; playNext(); };
      u.onerror = () => { i += 1; playNext(); };
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    };
    playNext();
  };

  return (
    <ReadCard>
      <ReadHeader title={data.title} onPlay={playAll} playing={playing} playLabel={playing ? "⏸ Pause episode" : "▶ Play episode"} />
      <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginBottom: 12 }}>
        🎙 {data.hostA} × {data.hostB} · ~{Math.round((data.estReadSec || 180) / 60)} min
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {data.turns.map((t, i) => {
          const isA = t.speaker === "A";
          const active = currentIdx === i;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: active ? `${ACCENT}14` : "var(--ws-chip, #F8FAFC)",
              border: `1px solid ${active ? ACCENT : "var(--ws-border, #E2E8F0)"}`,
              transition: "background .15s, border-color .15s",
            }}>
              <div style={{
                minWidth: 32, height: 32, borderRadius: 16,
                background: isA ? "#3B82F6" : "#EC4899",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
              }}>{isA ? data.hostA[0] : data.hostB[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text-muted, #475569)", marginBottom: 2 }}>
                  {isA ? data.hostA : data.hostB}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ws-text, #0F172A)" }}>
                  {t.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 14, fontSize: 11, color: "var(--ws-text-faint, #64748B)" }}>
        Audio uses your browser&apos;s speech engine. Native African-language voices arrive at launch with ElevenLabs.
      </p>
    </ReadCard>
  );
}

/* ─── Flashcard mode ─── */

function FlashcardView({ data, sessionId, concept, onDone }: { data: FlashcardsOutput; sessionId: string; concept: Concept; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, 1 | 3 | 5>>({});

  const card = data.cards[idx];
  const done = idx >= data.cards.length;

  const rate = (q: 1 | 3 | 5) => {
    if (!card) return;
    setRatings((r) => ({ ...r, [card.id]: q }));
    // Fire-and-forget — we don't block the UI
    void rateFlashcard(sessionId, concept.id, concept.title, q);
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  if (done) {
    const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(ratings).length);
    return (
      <ReadCard>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>Deck complete 🎉</h3>
        <p style={{ fontSize: 14, color: "var(--ws-text-muted, #475569)", marginTop: 8, lineHeight: 1.55 }}>
          You rated {Object.keys(ratings).length} cards. Avg confidence: <strong>{avg.toFixed(1)} / 5</strong>.
          We&apos;ll resurface the hard ones first next time.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={() => { setIdx(0); setRatings({}); setFlipped(false); }} style={secondaryBtnStyle}>Redo deck</button>
          <button onClick={onDone} style={primaryBtnStyle}>✓ Mark concept reviewed</button>
        </div>
      </ReadCard>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", textAlign: "center", marginBottom: 10 }}>
        Card {idx + 1} of {data.cards.length}
      </div>
      <div
        onClick={() => setFlipped((v) => !v)}
        style={{
          minHeight: 260,
          padding: 28,
          borderRadius: 18,
          background: "var(--ws-canvas, #fff)",
          border: `1.5px solid ${flipped ? ACCENT : "var(--ws-border, #E2E8F0)"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center",
          transition: "border-color .2s, transform .15s",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: flipped ? ACCENT_DARK : "var(--ws-text-faint, #64748B)", letterSpacing: 0.5, marginBottom: 12 }}>
          {flipped ? "ANSWER" : "QUESTION"}
        </div>
        <div style={{ fontSize: 18, fontWeight: flipped ? 500 : 700, color: "var(--ws-text, #0F172A)", lineHeight: 1.5, maxWidth: 560 }}>
          {flipped ? card.back : card.front}
        </div>
        {!flipped && card.hint && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--ws-text-faint, #64748B)", fontStyle: "italic" }}>
            Hint: {card.hint}
          </div>
        )}
        <div style={{ marginTop: 18, fontSize: 11, color: "var(--ws-text-faint, #94A3B8)" }}>
          Click card to {flipped ? "flip back" : "reveal"}
        </div>
      </div>

      {flipped && (
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => rate(1)} style={{ ...rateBtn, background: "#FEE2E2", color: "#991B1B", borderColor: "#FECACA" }}>😓 Hard</button>
          <button onClick={() => rate(3)} style={{ ...rateBtn, background: "#FEF3C7", color: "#92400E", borderColor: "#FDE68A" }}>🤔 Okay</button>
          <button onClick={() => rate(5)} style={{ ...rateBtn, background: "#D1FAE5", color: "#065F46", borderColor: "#A7F3D0" }}>✨ Easy</button>
        </div>
      )}
    </div>
  );
}

/* ─── Quiz mode ─── */

function QuizView({ data, sessionId, concept, onDone }: { data: QuizOutput; sessionId: string; concept: Concept; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, { mcqIndex?: number; shortText?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; perfect: boolean; perQuestion: Array<{ id: string; correct: boolean; explanation: string }>; xpAwarded: number } | null>(null);

  const allAnswered = data.questions.every((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === "mcq") return typeof a.mcqIndex === "number";
    return (a.shortText || "").trim().length > 0;
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = data.questions.map((q) => ({ questionId: q.id, ...(answers[q.id] || {}) }));
      const r = await gradeQuiz(sessionId, concept, data, payload);
      if (!r.ok) { toast.error(r.error); return; }
      setResult(r.data!);
      if (r.data!.perfect) toast.success(`Perfect! +${r.data!.xpAwarded} XP ⭐`);
      else if (r.data!.passed) toast.success(`Passed · ${r.data!.score}/${r.data!.total} · +${r.data!.xpAwarded} XP`);
      else toast.error(`Not quite — ${r.data!.score}/${r.data!.total}. Review and retry.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <ReadCard>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: result.passed ? "#065F46" : "#991B1B" }}>
          {result.perfect ? "Perfect round 🎯" : result.passed ? "Nice work ✓" : "Not quite — try again"}
        </h3>
        <p style={{ fontSize: 14, color: "var(--ws-text-muted, #475569)", marginTop: 6 }}>
          Score: <strong>{result.score} / {result.total}</strong>
          {result.xpAwarded > 0 && <> · <span style={{ color: ACCENT_DARK }}>+{result.xpAwarded} XP</span></>}
        </p>
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {data.questions.map((q) => {
            const pq = result.perQuestion.find((p) => p.id === q.id);
            const ok = pq?.correct;
            return (
              <div key={q.id} style={{
                padding: 12, borderRadius: 10,
                background: ok ? "#D1FAE522" : "#FEE2E222",
                border: `1px solid ${ok ? "#A7F3D0" : "#FECACA"}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ws-text, #0F172A)", marginBottom: 4 }}>
                  {ok ? "✓" : "✗"} {q.question}
                </div>
                <div style={{ fontSize: 12, color: "var(--ws-text-muted, #475569)", lineHeight: 1.5 }}>{pq?.explanation}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={() => { setAnswers({}); setResult(null); }} style={secondaryBtnStyle}>Retry quiz</button>
          {result.passed && <button onClick={onDone} style={primaryBtnStyle}>✓ Mark concept mastered</button>}
        </div>
      </ReadCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{
        padding: 14, borderRadius: 12,
        background: `${ACCENT}0A`,
        border: `1px solid ${ACCENT}33`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.4 }}>{data.title}</div>
        <div style={{ fontSize: 12, color: "var(--ws-text-muted, #475569)", marginTop: 4 }}>
          Pass mark: {data.passingScore} / {data.questions.length}. Perfect score unlocks bonus XP.
        </div>
      </div>
      {data.questions.map((q, i) => (
        <div key={q.id} style={{
          padding: 16, borderRadius: 14,
          background: "var(--ws-canvas, #fff)",
          border: "1px solid var(--ws-border, #E2E8F0)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text-faint, #64748B)", marginBottom: 6 }}>
            Q{i + 1} · {q.type === "mcq" ? "Choose one" : "Short answer"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ws-text, #0F172A)", marginBottom: 10, lineHeight: 1.5 }}>
            {q.question}
          </div>
          {q.type === "mcq" ? (
            <div style={{ display: "grid", gap: 6 }}>
              {q.options.map((opt, idx) => {
                const selected = answers[q.id]?.mcqIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: { mcqIndex: idx } }))}
                    style={{
                      padding: "10px 12px", borderRadius: 10, textAlign: "left",
                      background: selected ? `${ACCENT}14` : "var(--ws-chip, #F8FAFC)",
                      border: `1.5px solid ${selected ? ACCENT : "var(--ws-border, #E2E8F0)"}`,
                      color: "var(--ws-text, #0F172A)",
                      fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontWeight: 800, marginRight: 8, color: selected ? ACCENT_DARK : "var(--ws-text-faint, #64748B)" }}>
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[q.id]?.shortText || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: { shortText: e.target.value } }))}
              rows={3}
              placeholder="Type your answer…"
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid var(--ws-border, #E2E8F0)",
                borderRadius: 10,
                background: "var(--ws-chip, #F8FAFC)",
                color: "var(--ws-text, #0F172A)",
                fontSize: 13, lineHeight: 1.5, fontFamily: "inherit",
                outline: "none", resize: "vertical", boxSizing: "border-box",
              }}
            />
          )}
        </div>
      ))}
      <button
        onClick={submit}
        disabled={!allAnswered || submitting}
        style={{
          ...primaryBtnStyle,
          opacity: allAnswered && !submitting ? 1 : 0.55,
          cursor: allAnswered && !submitting ? "pointer" : "not-allowed",
        }}
      >
        {submitting ? "Grading…" : allAnswered ? "Submit quiz" : `Answer all ${data.questions.length} questions`}
      </button>
    </div>
  );
}

/* ─── Chat-style views (Debate, Simulation) ─── */

function DebateView({ data, ctx, concept, onDone }: { data: DebateOutput; ctx: StudyContext; concept: Concept; onDone: () => void }) {
  const [history, setHistory] = useState<Array<{ role: "user" | "ai"; content: string }>>([
    { role: "ai", content: data.openingMove },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [closed, setClosed] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || closed) return;
    const next = [...history, { role: "user" as const, content: text }];
    setHistory(next);
    setDraft("");
    setSending(true);
    try {
      const r = await debateTurn(ctx, concept, data.stance, history, text);
      if (!r.ok) { toast.error(r.error); return; }
      const t = r.data! as DebateTurnOutput;
      setHistory((h) => [...h, { role: "ai", content: t.reply }]);
      if (typeof t.argumentScore === "number") setScores((s) => [...s, t.argumentScore!]);
      if (t.isClosing) setClosed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{
        padding: 14, borderRadius: 14,
        background: `${ACCENT}0A`, border: `1px solid ${ACCENT}33`,
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.4 }}>DEFEND THE CLAIM</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ws-text, #0F172A)", marginTop: 4, lineHeight: 1.5 }}>
          {data.prompt}
        </div>
      </div>

      <ChatTranscript history={history} leftLabel="AI" rightLabel="You" />

      {!closed && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Your rebuttal…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={chatInputStyle}
          />
          <button onClick={send} disabled={!draft.trim() || sending} style={{ ...primaryBtnStyle, minWidth: 90 }}>
            {sending ? "…" : "Send"}
          </button>
        </div>
      )}

      {closed && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 12,
          background: "#D1FAE522", border: "1px solid #A7F3D0",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#065F46" }}>Round complete</div>
          <div style={{ fontSize: 13, color: "var(--ws-text-muted, #475569)", marginTop: 4 }}>
            Avg argument score: <strong>{(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)).toFixed(1)} / 10</strong>
          </div>
          <button onClick={onDone} style={{ ...primaryBtnStyle, marginTop: 10 }}>
            ✓ Mark concept reviewed
          </button>
        </div>
      )}
    </div>
  );
}

function SimulationView({ data, ctx, concept, onDone }: { data: SimulationOutput; ctx: StudyContext; concept: Concept; onDone: () => void }) {
  const [history, setHistory] = useState<Array<{ role: "user" | "character"; content: string }>>([
    { role: "character", content: data.openingLine },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || closed) return;
    const next = [...history, { role: "user" as const, content: text }];
    setHistory(next);
    setDraft("");
    setSending(true);
    try {
      const r = await simulationTurn(ctx, concept, data, history, text);
      if (!r.ok) { toast.error(r.error); return; }
      const t = r.data! as SimulationTurnOutput;
      setHistory((h) => [...h, { role: "character", content: t.reply }]);
      if (t.tip) setTips((ts) => [...ts, t.tip!]);
      if (t.isClosing) setClosed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{
        padding: 14, borderRadius: 14,
        background: `${ACCENT}0A`, border: `1px solid ${ACCENT}33`,
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.4 }}>
          SCENARIO · {data.characterName.toUpperCase()} · {data.characterRole.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, color: "var(--ws-text, #0F172A)", marginTop: 4, lineHeight: 1.55 }}>
          {data.scenario}
        </div>
      </div>

      <ChatTranscript history={history.map((h) => ({ role: h.role === "user" ? "user" : "ai", content: h.content }))} leftLabel={data.characterName} rightLabel="You" />

      {!closed && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={`Reply to ${data.characterName}…`}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={chatInputStyle}
          />
          <button onClick={send} disabled={!draft.trim() || sending} style={{ ...primaryBtnStyle, minWidth: 90 }}>
            {sending ? "…" : "Send"}
          </button>
        </div>
      )}

      {tips.length > 0 && (
        <details style={{ marginTop: 14, fontSize: 12, color: "var(--ws-text-faint, #64748B)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Coach tips ({tips.length})</summary>
          <ul style={{ marginTop: 6 }}>
            {tips.map((t, i) => <li key={i} style={{ marginTop: 4 }}>{t}</li>)}
          </ul>
        </details>
      )}

      {closed && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#D1FAE522", border: "1px solid #A7F3D0" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#065F46" }}>Scene wrapped</div>
          <button onClick={onDone} style={{ ...primaryBtnStyle, marginTop: 10 }}>
            ✓ Mark concept reviewed
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Phase 5 · Video mode view ─── */

function VideoView({
  data, sessionId, concept, onUpdate, onDone,
}: {
  data: VideoOutput;
  sessionId: string;
  concept: Concept;
  onUpdate: (v: VideoOutput) => void;
  onDone: () => void;
}) {
  const [pollingStart, setPollingStart] = useState<number | null>(null);

  // Poll HeyGen every 5s while processing. Starts automatically when we enter
  // the view with status=processing and a videoId. Stops when status flips.
  useEffect(() => {
    if (data.status !== "processing" || !data.videoId) return;
    setPollingStart((s) => s ?? Date.now());

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const r = await pollVideo(sessionId, concept, data.videoId!);
      if (cancelled) return;
      if (!r.ok) { toast.error(r.error); return; }
      onUpdate(r.data!);
    };
    const id = setInterval(tick, 5_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [data.status, data.videoId, sessionId, concept, onUpdate]);

  const elapsedSec = pollingStart ? Math.round((Date.now() - pollingStart) / 1000) : 0;

  // State 1 · Ready — play the video
  if (data.status === "ready" && data.videoUrl) {
    return (
      <ReadCard>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.2 }}>{data.title}</h3>
        <div style={{ marginTop: 14, borderRadius: 14, overflow: "hidden", background: "#000" }}>
          <video
            src={data.videoUrl}
            controls
            autoPlay
            playsInline
            style={{ width: "100%", display: "block", borderRadius: 14 }}
          >
            Your browser doesn&apos;t support video playback.
          </video>
        </div>
        <details style={{ marginTop: 14, fontSize: 13, color: "var(--ws-text-muted, #475569)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>📜 Read the script</summary>
          <p style={{ marginTop: 8, lineHeight: 1.65 }}>{data.script}</p>
        </details>
        <button onClick={onDone} style={{ ...primaryBtnStyle, marginTop: 16 }}>
          ✓ Mark concept reviewed
        </button>
      </ReadCard>
    );
  }

  // State 2 · Processing — polling HeyGen
  if (data.status === "processing") {
    return (
      <ReadCard>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.2 }}>{data.title}</h3>
        <div style={{
          marginTop: 16, padding: 28, borderRadius: 14,
          background: "linear-gradient(135deg, #1E293B, #0F172A)",
          color: "#E2E8F0",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            border: "4px solid rgba(96,165,250,0.25)",
            borderTopColor: ACCENT,
            margin: "0 auto 14px",
            animation: "sbSpin 1s linear infinite",
          }} />
          <div style={{ fontSize: 15, fontWeight: 800 }}>Your avatar is recording the lecture…</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, fontFamily: "monospace" }}>
            Elapsed: {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")} · polling every 5s
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8, maxWidth: 360, marginInline: "auto", lineHeight: 1.5 }}>
            HeyGen avatars usually render in 30-90 seconds. Feel free to switch modes in another tab — your video keeps cooking.
          </div>
        </div>
        <details style={{ marginTop: 14, fontSize: 13, color: "var(--ws-text-muted, #475569)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>📜 Read the script while you wait</summary>
          <p style={{ marginTop: 8, lineHeight: 1.65 }}>{data.script}</p>
        </details>
      </ReadCard>
    );
  }

  // State 3 · Requires launch provider — polished "Ships at launch" state.
  // Still useful because the script IS generated — users can read the lecture.
  return (
    <ReadCard>
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.2 }}>
        {data.title}
      </h3>

      <div style={{
        marginTop: 14, padding: 24, borderRadius: 16,
        background: `linear-gradient(135deg, ${ACCENT}14, #8B5CF614)`,
        border: `1.5px dashed ${ACCENT}`,
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div aria-hidden style={{
          position: "absolute", top: -20, right: -20, fontSize: 110, opacity: 0.08,
          animation: "sbSpin 22s linear infinite",
        }}>🎬</div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--ws-text, #0F172A)", marginBottom: 6 }}>
          Avatar video ships when your admin enables it
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ws-text-muted, #475569)", lineHeight: 1.6, maxWidth: 480, marginInline: "auto" }}>
          {data.note || "A super-admin needs to configure the HeyGen API key in Platform Settings. In the meantime your lecture script is ready below — read it, or listen to it via the Podcast mode."}
        </p>
      </div>

      {/* The script is always shown — it's the real content. Video is the delivery. */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.4, color: ACCENT_DARK, marginBottom: 6 }}>
          LECTURE SCRIPT · ~{data.estDurationSec ?? 60}s
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ws-text, #0F172A)", margin: 0 }}>
          {data.script}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={onDone} style={primaryBtnStyle}>✓ Mark concept reviewed</button>
      </div>
    </ReadCard>
  );
}

/* ─── Shared UI building blocks ─── */

function ReadCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "28px 32px", borderRadius: 20,
      background: "var(--ws-canvas, #fff)",
      border: "1px solid var(--ws-border, #E2E8F0)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    }}>
      {children}
    </div>
  );
}

function ReadHeader({ title, onPlay, playing, playLabel }: { title: string; onPlay: () => void; playing: boolean; playLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.2 }}>{title}</h3>
      <button onClick={onPlay} style={{
        padding: "8px 14px", borderRadius: 10,
        background: playing ? ACCENT : "var(--ws-canvas, #fff)",
        color: playing ? "#fff" : ACCENT_DARK,
        border: `1.5px solid ${ACCENT}`,
        fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}>
        {playLabel || (playing ? "⏸ Stop" : "▶ Listen")}
      </button>
    </div>
  );
}

function ChatTranscript({ history, leftLabel, rightLabel }: { history: Array<{ role: "user" | "ai"; content: string }>; leftLabel: string; rightLabel: string }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {history.map((h, i) => {
        const isUser = h.role === "user";
        return (
          <div key={i} style={{
            padding: "10px 14px", borderRadius: 14,
            background: isUser ? `${ACCENT}14` : "var(--ws-chip, #F8FAFC)",
            border: `1px solid ${isUser ? ACCENT + "44" : "var(--ws-border, #E2E8F0)"}`,
            marginLeft: isUser ? 40 : 0,
            marginRight: isUser ? 0 : 40,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ws-text-faint, #64748B)", letterSpacing: 0.3, marginBottom: 3 }}>
              {isUser ? rightLabel : leftLabel}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ws-text, #0F172A)" }}>{h.content}</div>
          </div>
        );
      })}
    </div>
  );
}

const readIntro: React.CSSProperties = { fontSize: 15, lineHeight: 1.65, color: "var(--ws-text-muted, #475569)", margin: 0, fontStyle: "italic" };
const readSectionH: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ws-text, #0F172A)" };
const readBody: React.CSSProperties = { margin: "6px 0 0", fontSize: 14, lineHeight: 1.65, color: "var(--ws-text, #0F172A)" };

const primaryBtnStyle: React.CSSProperties = {
  padding: "12px 22px", borderRadius: 12,
  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
  color: "#fff", border: "none", fontSize: 13, fontWeight: 800,
  cursor: "pointer", fontFamily: "inherit",
  boxShadow: `0 10px 22px ${ACCENT}33`,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 12,
  background: "var(--ws-chip, #F1F5F9)",
  color: "var(--ws-text-muted, #475569)",
  border: "1px solid var(--ws-border, #E2E8F0)",
  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

const rateBtn: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 10, border: "1px solid",
  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

const chatInputStyle: React.CSSProperties = {
  flex: 1, padding: "10px 12px",
  border: "1px solid var(--ws-border, #E2E8F0)",
  borderRadius: 10,
  background: "var(--ws-chip, #F8FAFC)",
  color: "var(--ws-text, #0F172A)",
  fontSize: 13, lineHeight: 1.5, fontFamily: "inherit",
  outline: "none", resize: "vertical", boxSizing: "border-box",
};

/* ─────────── small helpers ─────────── */

const bigInput: React.CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  border: "2px solid var(--ws-border, #E2E8F0)",
  borderRadius: 16,
  fontSize: 16,
  color: "var(--ws-text, #0F172A)",
  background: "var(--ws-canvas, #fff)",
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
    border: "1px solid var(--ws-border, #E2E8F0)",
    background: "var(--ws-canvas, #fff)",
    color: "var(--ws-text-muted, #334155)",
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
        border: "1px solid var(--ws-border, #E2E8F0)",
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

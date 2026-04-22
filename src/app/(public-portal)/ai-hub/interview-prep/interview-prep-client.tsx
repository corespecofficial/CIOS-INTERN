"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  extractCvSummary,
  generateInterviewOpener,
  respondToInterviewAnswer,
  debriefInterview,
  type InterviewContext,
  type InterviewTurn,
} from "@/app/actions/ai-interview";

const CIOS_LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const ACCENT = "#8B5CF6";
const ACCENT_DARK = "#7C3AED";

const INTERVIEW_TYPES = [
  { id: "behavioural",      label: "Behavioural interview" },
  { id: "case",             label: "Case interview" },
  { id: "stress",           label: "Stress interview" },
  { id: "competency_based", label: "Competency-based interview" },
  { id: "panel",            label: "Panel interview" },
  { id: "group",            label: "Group interview" },
  { id: "formal",           label: "Formal interview" },
] as const;

const INTERVIEW_STAGES = [
  { id: "first_round",  label: "First round interview" },
  { id: "second_round", label: "Second round interview" },
] as const;

const INTERVIEWERS = [
  { id: "hr",              label: "HR" },
  { id: "hiring_manager",  label: "Hiring manager" },
] as const;

const LANGUAGES = [
  "English",
  "Mandarin Chinese",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Portuguese",
  "Russian",
  "Japanese",
  "Korean",
  "Hindi",
  "Italian",
  "Swahili",
  "Yoruba",
] as const;

const FREE_QUESTION_CAP = 12;

type Phase = "cv" | "setup" | "briefing" | "live" | "debrief";

interface Debrief {
  overallScore: number;
  strengths: string;
  improvements: string;
  nextSteps: string;
}

export function InterviewPrepClient({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<Phase>("cv");

  // CV
  const [cvText, setCvText] = useState("");
  const [cvSummary, setCvSummary] = useState("");
  const [cvPending, startCv] = useTransition();

  // Setup
  const [interviewType, setInterviewType] = useState<string>("");
  const [interviewStage, setInterviewStage] = useState<string>("");
  const [interviewerType, setInterviewerType] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState<number>(20);
  const [setupPending, startSetup] = useTransition();

  // Live interview
  const [ctx, setCtx] = useState<InterviewContext | null>(null);
  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Debrief
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefPending, setDebriefPending] = useState(false);

  const questionsAsked = useMemo(
    () => history.filter((t) => t.role === "interviewer").length,
    [history],
  );
  const creditsLeft = Math.max(0, FREE_QUESTION_CAP - questionsAsked);

  /* ───────── CV extraction ───────── */

  const submitCv = () => {
    if (cvText.trim().length < 60) {
      toast.error("Paste at least a few paragraphs of your CV so we can extract it");
      return;
    }
    startCv(async () => {
      const res = await extractCvSummary(cvText);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCvSummary(res.data!.summary);
      setPhase("setup");
    });
  };

  const skipCv = () => {
    setCvSummary("(no CV provided)");
    setPhase("setup");
  };

  /* ───────── Setup → start live ───────── */

  const startLive = () => {
    if (!interviewType || !interviewStage || !interviewerType || !language) {
      toast.error("Fill every dropdown before continuing");
      return;
    }
    if (jobDescription.trim().length < 30) {
      toast.error("Paste the job description (at least 30 characters)");
      return;
    }
    if (!lengthMinutes || lengthMinutes < 5) {
      toast.error("Interview length must be at least 5 minutes");
      return;
    }

    const nextCtx: InterviewContext = {
      interviewType,
      interviewStage,
      interviewerType,
      language,
      jobDescription,
      lengthMinutes,
      cvSummary,
    };
    setCtx(nextCtx);
    setPhase("briefing");

    startSetup(async () => {
      const res = await generateInterviewOpener(nextCtx);
      if (!res.ok) {
        toast.error(res.error);
        setPhase("setup");
        return;
      }
      setHistory([{ role: "interviewer", content: res.data!.opener }]);
    });
  };

  const clearSetup = () => {
    setInterviewType("");
    setInterviewStage("");
    setInterviewerType("");
    setLanguage("");
    setJobDescription("");
    setLengthMinutes(20);
  };

  /* ───────── Briefing → Live ───────── */

  const acceptBriefing = () => {
    setPhase("live");
  };

  /* ───────── Live camera + speech ───────── */

  useEffect(() => {
    if (phase !== "live") return;
    let cancelled = false;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: cameraOn, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        // camera denied or unavailable — show fallback placeholder
      }
    };
    if (cameraOn) startCam();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cameraOn]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, aiThinking]);

  const toggleMic = () => {
    if (!micOn) {
      const Ctor =
        (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
      if (!Ctor) {
        toast.error("Voice input isn't supported in this browser. Use text instead.");
        return;
      }
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = mapToBcp47(ctx?.language || "English");
      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let finalText = "";
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (finalText) setDraft((d) => (d ? d + " " : "") + finalText.trim());
        else if (interim) setDraft((d) => d); // keep typed draft stable; interim ignored
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      try { rec.start(); setListening(true); } catch { /* ignore */ }
      setMicOn(true);
    } else {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setListening(false);
      setMicOn(false);
    }
  };

  const endResponse = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error("Speak or type a reply first");
      return;
    }
    if (!ctx) return;
    setSending(true);
    setAiThinking(true);
    const nextHistory: InterviewTurn[] = [...history, { role: "candidate", content: text }];
    setHistory(nextHistory);
    setDraft("");
    try {
      const res = await respondToInterviewAnswer(ctx, nextHistory, text);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const aiTurn: InterviewTurn = { role: "interviewer", content: res.data!.reply };
      const updated = [...nextHistory, aiTurn];
      setHistory(updated);
      if (res.data!.done) {
        await runDebrief(updated);
      }
    } finally {
      setSending(false);
      setAiThinking(false);
    }
  };

  const finishEarly = async () => {
    if (!ctx) return;
    if (history.length < 2) {
      toast("Answer at least one question first");
      return;
    }
    await runDebrief(history);
  };

  const runDebrief = async (finalHistory: InterviewTurn[]) => {
    if (!ctx) return;
    setDebriefPending(true);
    setPhase("debrief");
    try {
      const res = await debriefInterview(ctx, finalHistory);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDebrief(res.data!);
    } finally {
      setDebriefPending(false);
    }
  };

  const restart = () => {
    setPhase("cv");
    setCvText("");
    setCvSummary("");
    clearSetup();
    setCtx(null);
    setHistory([]);
    setDraft("");
    setDebrief(null);
  };

  /* ───────── Render ───────── */

  return (
    <div
      data-workspace="interview-prep"
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
          borderBottom: "1px solid var(--ws-border, #F0EDE5)",
          background: "var(--ws-canvas, #fff)",
        }}
      >
        <Link href="/ai-hub" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src={CIOS_LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--ws-text, #1F2430)" }}>CIOS AI Interview</div>
            <div style={{ fontSize: 11, color: "var(--ws-text-faint, #8F8B80)" }}>Live practice · real-time feedback</div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: `${ACCENT}14`,
              color: ACCENT_DARK,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.3,
              border: `1px solid ${ACCENT}33`,
            }}
          >
            AI INTERVIEW CREDITS LEFT: {creditsLeft}
          </div>
          <ThemeToggle compact />
          <Link
            href="/ai-hub"
            style={{
              padding: "8px 16px",
              background: "var(--ws-chip, #F2F1ED)",
              color: "var(--ws-text, #1F2430)",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← AI Hub
          </Link>
        </div>
      </div>

      {/* Stepper */}
      {(phase === "cv" || phase === "setup") && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "18px 20px 0" }}>
          <Step n={1} label="Upload CV"       active={phase === "cv"} done={phase !== "cv"} />
          <Step n={2} label="Configure"       active={phase === "setup"} done={false} />
          <Step n={3} label="Live interview"  active={false} done={false} />
        </div>
      )}

      {/* Phase body */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px 20px" }}>
        {phase === "cv" && (
          <CvPhase
            firstName={firstName}
            cvText={cvText}
            onChange={setCvText}
            onSubmit={submitCv}
            onSkip={skipCv}
            pending={cvPending}
          />
        )}

        {phase === "setup" && (
          <SetupPhase
            interviewType={interviewType} setInterviewType={setInterviewType}
            interviewStage={interviewStage} setInterviewStage={setInterviewStage}
            interviewerType={interviewerType} setInterviewerType={setInterviewerType}
            language={language} setLanguage={setLanguage}
            jobDescription={jobDescription} setJobDescription={setJobDescription}
            lengthMinutes={lengthMinutes} setLengthMinutes={setLengthMinutes}
            onGenerate={startLive}
            onClear={clearSetup}
            pending={setupPending}
          />
        )}

        {phase === "briefing" && (
          <BriefingModal
            loading={history.length === 0}
            onReady={acceptBriefing}
            language={language}
            interviewType={INTERVIEW_TYPES.find((t) => t.id === interviewType)?.label || ""}
          />
        )}

        {phase === "live" && (
          <LivePhase
            videoRef={videoRef}
            cameraOn={cameraOn}
            onToggleCamera={() => setCameraOn((v) => !v)}
            micOn={micOn}
            listening={listening}
            onToggleMic={toggleMic}
            history={history}
            draft={draft}
            onDraftChange={setDraft}
            onEndResponse={endResponse}
            onFinishEarly={finishEarly}
            sending={sending}
            aiThinking={aiThinking}
            firstName={firstName}
            interviewLabel={INTERVIEW_TYPES.find((t) => t.id === interviewType)?.label || "Interview"}
            transcriptBottomRef={transcriptBottomRef}
          />
        )}

        {phase === "debrief" && (
          <DebriefPhase
            debrief={debrief}
            loading={debriefPending}
            onRestart={restart}
          />
        )}
      </div>

      <style>{`
        @keyframes ciosPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50%      { transform: scale(1.12); opacity: 1; }
        }
        @keyframes ciosDots {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1;    transform: translateY(-3px); }
        }
        @keyframes ciosRecordPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
      `}</style>
    </div>
  );
}

/* ─────────── Phase components ─────────── */

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  const color = done ? "#2E7D32" : active ? ACCENT : "#8F8B80";
  const bg = done ? "#E8F5E9" : active ? `${ACCENT}14` : "#F2F1ED";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: bg, color, fontSize: 12, fontWeight: 800, border: `1px solid ${done ? "#B5DCBB" : active ? `${ACCENT}33` : "transparent"}` }}>
      <span style={{ width: 20, height: 20, borderRadius: 999, background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
        {done ? "✓" : n}
      </span>
      <span>{label}</span>
    </div>
  );
}

function CvPhase({
  firstName, cvText, onChange, onSubmit, onSkip, pending,
}: {
  firstName: string;
  cvText: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  pending: boolean;
}) {
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(txt|md|rtf|json|csv)$/i.test(f.name) && f.type !== "text/plain") {
      toast("Tip: .txt/.md files work best. For PDFs, copy-paste the text.");
    }
    try {
      const text = await f.text();
      onChange(text);
      toast.success("CV loaded — review and continue");
    } catch {
      toast.error("Couldn't read file. Try pasting instead.");
    }
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img
          src={CIOS_LOGO}
          alt="CIOS"
          width={48}
          height={48}
          style={{
            display: "block",
            margin: "0 auto 12px",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        />
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>
          Let&apos;s set you up, {firstName}
        </h1>
        <p style={{ color: "var(--ws-text-muted, #55524A)", fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>
          Paste your CV so CIOS can ground questions in your real experience. We extract it once and keep it only for this session.
        </p>
      </div>

      <div
        style={{
          background: "var(--ws-canvas, #fff)",
          border: "1px solid var(--ws-border, #EAE7DF)",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: "var(--ws-text, #1F2430)" }}>Paste your CV</label>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--ws-border, #E6E3DA)",
              background: "var(--ws-chip, #FBFAF6)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ws-text-muted, #55524A)",
            }}
          >
            📎 Upload .txt
            <input type="file" accept=".txt,.md,.rtf,text/plain" onChange={onFile} style={{ display: "none" }} />
          </label>
        </div>
        <textarea
          value={cvText}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          placeholder="Paste your full CV here — experience, education, skills…"
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "1px solid var(--ws-border, #E6E3DA)",
            borderRadius: 14,
            fontSize: 14,
            lineHeight: 1.55,
            background: "var(--ws-chip, #FBFAF6)",
            color: "var(--ws-text, #1F2430)",
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 12, color: "var(--ws-text-faint, #8F8B80)", marginTop: 8 }}>{cvText.length.toLocaleString()} characters</div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={onSkip}
          style={{
            padding: "12px 20px",
            background: "transparent",
            color: "var(--ws-text-muted, #55524A)",
            border: "1px solid var(--ws-border, #E6E3DA)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Skip for now
        </button>
        <button
          onClick={onSubmit}
          disabled={pending}
          style={{
            padding: "12px 22px",
            background: pending ? "#E6DCFF" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: pending ? ACCENT : "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: pending ? "wait" : "pointer",
            boxShadow: pending ? "none" : `0 8px 20px ${ACCENT}33`,
            fontFamily: "inherit",
          }}
        >
          {pending ? "Reading your CV…" : "Extract & continue →"}
        </button>
      </div>
    </div>
  );
}

function SetupPhase(props: {
  interviewType: string; setInterviewType: (v: string) => void;
  interviewStage: string; setInterviewStage: (v: string) => void;
  interviewerType: string; setInterviewerType: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  jobDescription: string; setJobDescription: (v: string) => void;
  lengthMinutes: number; setLengthMinutes: (v: number) => void;
  onGenerate: () => void;
  onClear: () => void;
  pending: boolean;
}) {
  const {
    interviewType, setInterviewType, interviewStage, setInterviewStage,
    interviewerType, setInterviewerType, language, setLanguage,
    jobDescription, setJobDescription, lengthMinutes, setLengthMinutes,
    onGenerate, onClear, pending,
  } = props;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>
          Practice sample interview questions
        </h1>
        <p style={{ color: "var(--ws-text-muted, #55524A)", fontSize: 14, marginTop: 6 }}>
          Configure the interview exactly like the real one.
        </p>
      </div>

      <div
        style={{
          background: "var(--ws-canvas, #fff)",
          border: "1px solid var(--ws-border, #EAE7DF)",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          display: "grid",
          gap: 18,
        }}
      >
        <Select label="Pick an interview type *" value={interviewType} onChange={setInterviewType} placeholder="Select…"
          options={INTERVIEW_TYPES.map((t) => ({ value: t.id, label: t.label }))}
        />

        <Select label="Pick an interview stage *" value={interviewStage} onChange={setInterviewStage} placeholder="Select…"
          options={INTERVIEW_STAGES.map((s) => ({ value: s.id, label: s.label }))}
        />

        <Select label="Who are you having interview with? *" value={interviewerType} onChange={setInterviewerType} placeholder="Select…"
          options={INTERVIEWERS.map((i) => ({ value: i.id, label: i.label }))}
        />

        <Select label="Interview language *" value={language} onChange={setLanguage} placeholder="Select…"
          options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        />

        <div>
          <Label>Paste the job description below *</Label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            placeholder="Job Description Here"
            style={{
              width: "100%",
              padding: "14px 16px",
              border: "1px solid var(--ws-border, #E6E3DA)",
              borderRadius: 14,
              fontSize: 14,
              lineHeight: 1.55,
              background: "var(--ws-chip, #FBFAF6)",
              color: "var(--ws-text, #1F2430)",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <Label>How long is the interview (in minutes)? *</Label>
          <input
            type="number"
            min={5}
            max={120}
            value={lengthMinutes}
            onChange={(e) => setLengthMinutes(Number(e.target.value) || 0)}
            placeholder="Interview Length"
            style={{
              width: 200,
              padding: "12px 14px",
              border: "1px solid var(--ws-border, #E6E3DA)",
              borderRadius: 12,
              fontSize: 14,
              background: "var(--ws-canvas, #fff)",
              color: "var(--ws-text, #1F2430)",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            onClick={onGenerate}
            disabled={pending}
            style={{
              flex: 1,
              padding: "13px 18px",
              background: pending ? "#E6DCFF" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              color: pending ? ACCENT : "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              cursor: pending ? "wait" : "pointer",
              boxShadow: pending ? "none" : `0 8px 20px ${ACCENT}33`,
              fontFamily: "inherit",
            }}
          >
            {pending ? "Preparing interview…" : "🎤 Generate"}
          </button>
          <button
            onClick={onClear}
            style={{
              padding: "13px 22px",
              background: "var(--ws-chip, #F2F1ED)",
              color: "var(--ws-text-muted, #55524A)",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefingModal({
  loading, onReady, language, interviewType,
}: {
  loading: boolean;
  onReady: () => void;
  language: string;
  interviewType: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(20,16,35,0.65)",
        backdropFilter: "blur(6px)",
        padding: 20,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: "100%",
          background: "var(--ws-canvas, #fff)",
          borderRadius: 20,
          padding: "28px 32px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <img
            src={CIOS_LOGO}
            alt="CIOS"
            width={36}
            height={36}
            style={{
              borderRadius: 10,
              animation: "ciosPulse 1.4s ease-in-out infinite",
              boxShadow: `0 0 0 6px ${ACCENT}22`,
            }}
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, letterSpacing: 0.5 }}>
              {interviewType || "AI INTERVIEW"} · {language || "English"}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.2 }}>
              Your interview starts soon.
            </h2>
          </div>
        </div>
        <p style={{ fontSize: 14, color: "var(--ws-text-muted, #55524A)", lineHeight: 1.55, marginTop: 4 }}>
          Keep the following in mind:
        </p>
        <ul style={{ margin: "8px 0 18px", paddingLeft: 20, color: "var(--ws-text, #1F2430)", fontSize: 14, lineHeight: 1.75 }}>
          <li>CIOS will ask the first question.</li>
          <li>Type your answer, or press 🎤 to speak and CIOS will transcribe it.</li>
          <li>When you&apos;re done, press <strong>End response</strong> to send it.</li>
          <li>Free tier users can answer up to <strong>{FREE_QUESTION_CAP} questions</strong> per session.</li>
          <li>You can end the interview early at any time.</li>
          <li>Last but not least — <strong>have fun.</strong></li>
        </ul>

        <button
          onClick={onReady}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 18px",
            background: loading ? "#E6DCFF" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: loading ? ACCENT : "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
            boxShadow: loading ? "none" : `0 10px 24px ${ACCENT}44`,
          }}
        >
          {loading ? "Getting CIOS ready…" : "I'm ready — start the interview →"}
        </button>
      </div>
    </div>
  );
}

function LivePhase(props: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  onToggleCamera: () => void;
  micOn: boolean;
  listening: boolean;
  onToggleMic: () => void;
  history: InterviewTurn[];
  draft: string;
  onDraftChange: (v: string) => void;
  onEndResponse: () => void;
  onFinishEarly: () => void;
  sending: boolean;
  aiThinking: boolean;
  firstName: string;
  interviewLabel: string;
  transcriptBottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    videoRef, cameraOn, onToggleCamera, micOn, listening, onToggleMic,
    history, draft, onDraftChange, onEndResponse, onFinishEarly,
    sending, aiThinking, firstName, interviewLabel, transcriptBottomRef,
  } = props;

  return (
    <div
      className="ip-live-grid"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr",
        gap: 18,
        minHeight: "calc(100vh - 180px)",
      }}
    >
      {/* LEFT — video + composer */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            position: "relative",
            background: "#111827",
            borderRadius: 20,
            overflow: "hidden",
            aspectRatio: "16 / 10",
            boxShadow: "0 10px 30px rgba(16,16,16,0.18)",
          }}
        >
          {cameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover", background: "#111827" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8B8FA3", fontSize: 13 }}>
              Camera off
            </div>
          )}

          {/* PiP: CIOS interviewer */}
          <div
            style={{
              position: "absolute",
              right: 14,
              top: 14,
              width: 110,
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
            }}
          >
            <img
              src={CIOS_LOGO}
              alt="CIOS"
              width={44}
              height={44}
              style={{
                borderRadius: 10,
                animation: aiThinking ? "ciosPulse 1.2s ease-in-out infinite" : undefined,
                boxShadow: aiThinking ? `0 0 0 4px ${ACCENT}33` : "none",
              }}
            />
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text, #1F2430)" }}>CIOS</div>
            <div style={{ fontSize: 10, color: aiThinking ? ACCENT_DARK : "#8F8B80" }}>
              {aiThinking ? "Thinking…" : "Listening"}
            </div>
          </div>

          {/* Footer strip */}
          <div
            style={{
              position: "absolute",
              left: 14,
              bottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#EF4444", animation: "ciosRecordPulse 1.4s ease-in-out infinite" }} />
            {firstName} · {interviewLabel}
          </div>
        </div>

        {/* Composer */}
        <div
          style={{
            background: "var(--ws-canvas, #fff)",
            border: "1px solid var(--ws-border, #EAE7DF)",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={listening ? "Listening… speak naturally." : "Type your answer — or press 🎤 to speak."}
            rows={3}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid var(--ws-border, #E6E3DA)",
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.55,
              background: listening ? "#FFF7ED" : "#FBFAF6",
              color: "var(--ws-text, #1F2430)",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <IconToggle
                on={cameraOn}
                onClick={onToggleCamera}
                label={cameraOn ? "Turn camera off" : "Turn camera on"}
              >
                {cameraOn ? "📹" : "📷"}
              </IconToggle>
              <IconToggle
                on={micOn}
                onClick={onToggleMic}
                label={micOn ? "Stop mic" : "Start mic (voice to text)"}
                activeBg="#FEE2E2"
                activeColor="#991B1B"
              >
                {micOn ? "🔴" : "🎤"}
              </IconToggle>
              <button
                onClick={onFinishEarly}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--ws-border, #E6E3DA)",
                  background: "var(--ws-canvas, #fff)",
                  color: "var(--ws-text-muted, #55524A)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                End interview
              </button>
            </div>
            <button
              onClick={onEndResponse}
              disabled={sending || !draft.trim()}
              style={{
                padding: "10px 18px",
                background: sending || !draft.trim() ? "#ECE9E1" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                color: sending || !draft.trim() ? "#A8A59A" : "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: sending || !draft.trim() ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {sending ? "Sending…" : "End response →"}
            </button>
          </div>
        </div>
      </section>

      {/* RIGHT — live transcript */}
      <aside
        style={{
          background: "var(--ws-chip, #FBFAF6)",
          border: "1px solid var(--ws-border, #EAE7DF)",
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ws-border, #EAE7DF)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 900, color: "var(--ws-text, #1F2430)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#EF4444", animation: "ciosRecordPulse 1.4s ease-in-out infinite" }} />
            Live transcript
          </div>
          <span style={{ fontSize: 11, color: "var(--ws-text-faint, #8F8B80)", fontWeight: 700 }}>
            {history.filter((t) => t.role === "interviewer").length} Q · {history.filter((t) => t.role === "candidate").length} A
          </span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "14px 18px", display: "grid", gap: 14 }}>
          {history.map((t, i) => (
            <TurnBubble key={i} turn={t} firstName={firstName} />
          ))}
          {aiThinking && <ThinkingBubble />}
          <div ref={transcriptBottomRef} />
        </div>
      </aside>
    </div>
  );
}

function TurnBubble({ turn, firstName }: { turn: InterviewTurn; firstName: string }) {
  if (turn.role === "interviewer") {
    return (
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.3 }}>CIOS</div>
        <div
          style={{
            background: "var(--ws-canvas, #fff)",
            border: "1px solid var(--ws-border, #EAE7DF)",
            padding: "12px 14px",
            borderRadius: 14,
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--ws-text, #1F2430)",
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
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text, #1F2430)" }}>{firstName}</div>
      <div
        style={{
          background: `${ACCENT}14`,
          border: `1px solid ${ACCENT}33`,
          padding: "12px 14px",
          borderRadius: 14,
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ws-text, #1F2430)",
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

function ThinkingBubble() {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.3 }}>CIOS</div>
      <div style={{ display: "inline-flex", gap: 6, padding: "10px 14px", borderRadius: 14, background: "var(--ws-canvas, #fff)", border: "1px solid var(--ws-border, #EAE7DF)", width: "fit-content" }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#9E9A8E",
              animation: `ciosDots 1.2s ${i * 0.15}s ease-in-out infinite`,
              display: "inline-block",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DebriefPhase({ debrief, loading, onRestart }: { debrief: Debrief | null; loading: boolean; onRestart: () => void }) {
  if (loading || !debrief) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <img src={CIOS_LOGO} alt="" width={48} height={48} style={{ borderRadius: 12, animation: "ciosPulse 1.2s ease-in-out infinite" }} />
        <div style={{ fontSize: 15, color: "var(--ws-text-muted, #55524A)", marginTop: 14, fontWeight: 700 }}>Writing your debrief…</div>
      </div>
    );
  }

  const scoreColor = debrief.overallScore >= 8 ? "#2E7D32" : debrief.overallScore >= 6 ? "#B7791F" : "#C62828";

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", display: "grid", gap: 16 }}>
      <div
        style={{
          textAlign: "center",
          padding: 32,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${ACCENT}12, #FBFAF6)`,
          border: `1px solid ${ACCENT}33`,
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
          {debrief.overallScore}
        </div>
        <div style={{ fontSize: 14, color: "var(--ws-text-muted, #55524A)", marginTop: 6 }}>out of 10</div>
        <div style={{ fontSize: 15, color: "var(--ws-text, #1F2430)", fontWeight: 800, marginTop: 14 }}>
          {debrief.overallScore >= 8 ? "Excellent! You're interview-ready. 🌟"
            : debrief.overallScore >= 6 ? "Solid. A few sharp tweaks and you'll nail it."
            : "Keep practicing — review the notes below."}
        </div>
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: "#F1FBF3", border: "1px solid #C6E7CB" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#2E7D32", letterSpacing: 0.5, marginBottom: 6 }}>✓ STRENGTHS</div>
        <div style={{ fontSize: 14, color: "var(--ws-text, #1F2430)", lineHeight: 1.6 }}>{debrief.strengths}</div>
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: "#FFF7E0", border: "1px solid #F4E3A8" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#B7791F", letterSpacing: 0.5, marginBottom: 6 }}>↑ IMPROVE</div>
        <div style={{ fontSize: 14, color: "var(--ws-text, #1F2430)", lineHeight: 1.6 }}>{debrief.improvements}</div>
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: `${ACCENT}0D`, border: `1px solid ${ACCENT}33` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_DARK, letterSpacing: 0.5, marginBottom: 6 }}>→ NEXT STEPS</div>
        <div style={{ fontSize: 14, color: "var(--ws-text, #1F2430)", lineHeight: 1.6 }}>{debrief.nextSteps}</div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
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
          Practice again
        </button>
        <Link
          href="/ai-hub"
          style={{
            padding: "12px 22px",
            background: "var(--ws-chip, #F2F1ED)",
            color: "var(--ws-text, #1F2430)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to AI Hub
        </Link>
      </div>
    </div>
  );
}

/* ─────────── small helpers ─────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "var(--ws-text, #1F2430)", marginBottom: 6 }}>
      {children}
    </label>
  );
}

function Select({
  label, value, onChange, options, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: `1px solid ${value ? ACCENT : "#E6E3DA"}`,
          borderRadius: 12,
          background: "var(--ws-canvas, #fff)",
          color: value ? "#1F2430" : "#8F8B80",
          fontSize: 14,
          outline: "none",
          fontFamily: "inherit",
          appearance: "none",
          WebkitAppearance: "none",
          boxSizing: "border-box",
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%238F8B80\' d=\'M6 8L0 0h12z\'/></svg>")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: 36,
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
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
        border: "1px solid var(--ws-border, #E6E3DA)",
        background: on ? (activeBg || "#EDEAE0") : "#fff",
        color: on ? (activeColor || "#1F2430") : "#55524A",
        fontSize: 16,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

/* ─────────── Web Speech API types (minimal) ─────────── */

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


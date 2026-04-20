"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  summariseDocument,
  translateDocument,
} from "@/app/actions/doc-tools";
import { generateCV } from "@/app/actions/documents";
import {
  STATUS_LABEL,
  STATUS_COLOR,
  type DocTool,
} from "@/lib/document-tools";
import { ThemeToggle } from "@/components/theme-toggle";

const CIOS_LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const PAGE_BG = "#070B14";
const A1 = "#EC4899";

const LANGUAGES = [
  "English", "Mandarin Chinese", "Spanish", "French", "German", "Arabic", "Portuguese",
  "Russian", "Japanese", "Korean", "Hindi", "Italian", "Swahili", "Yoruba",
] as const;

type Phase = "intake" | "configure" | "processing" | "result";

export function ToolShell({ tool, firstName }: { tool: DocTool; firstName: string }) {
  // Each tool uses the same 3-step skeleton. Tool-specific state lives here and
  // the child renderer decides what to show per phase.
  const [phase, setPhase] = useState<Phase>("intake");

  // Intake — pasted text OR uploaded file(s)
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Configure — shared option state
  const [summariseStyle, setSummariseStyle] = useState<"executive" | "bullets" | "tldr">("executive");
  const [targetLanguage, setTargetLanguage] = useState<string>("English");
  const [preserveFormatting, setPreserveFormatting] = useState(true);

  // Result state
  const [result, setResult] = useState<ToolResult | null>(null);
  const [pending, start] = useTransition();

  const isAi = tool.category === "ai-create" || tool.category === "intelligence";
  const isLive = tool.status === "live";

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    setFiles((prev) => [...prev, ...incoming]);
    // For text-based tools, auto-extract text from .txt so the flow feels magical
    const textFile = incoming.find((f) => /\.(txt|md|rtf)$/i.test(f.name) || f.type === "text/plain");
    if (textFile) {
      try {
        const t = await textFile.text();
        setText((prev) => (prev ? prev + "\n\n" : "") + t);
        toast.success(`Loaded ${textFile.name}`);
      } catch { /* ignore */ }
    }
  };

  const readyForConfigure =
    tool.id === "cv" || tool.id === "cover-letter" || tool.id === "linkedin-optimizer" || tool.id === "portfolio" || tool.id === "pitch-deck" || tool.id === "business-plan" || tool.id === "sop"
      ? true // AI generators pull from your CIOS profile — no intake needed
      : text.trim().length >= 40 || files.length > 0;

  const advanceToProcessing = () => {
    setPhase("processing");
    start(async () => {
      const res = await runTool();
      setResult(res);
      setPhase("result");
    });
  };

  const runTool = async (): Promise<ToolResult> => {
    try {
      // Intelligence: live
      if (tool.id === "summarize") {
        const r = await summariseDocument({ text, style: summariseStyle });
        if (!r.ok) return { kind: "error", message: r.error };
        return {
          kind: "text-blocks",
          blocks: [
            { label: "Summary",  body: r.data!.summary },
            { label: "Key points", body: r.data!.bullets.map((b) => `• ${b}`).join("\n") },
          ],
        };
      }
      if (tool.id === "translate") {
        const r = await translateDocument({ text, targetLanguage, preserveFormatting });
        if (!r.ok) return { kind: "error", message: r.error };
        return {
          kind: "text-blocks",
          blocks: [{ label: `${targetLanguage} translation`, body: r.data!.translated }],
        };
      }

      // AI-create: CV is wired to the existing generator. Others fall through
      // to a friendly "coming into this flow soon — use legacy for now" state
      // so we don't silently break established routes.
      if (tool.id === "cv") {
        const r = await generateCV();
        if (!r.ok) return { kind: "error", message: r.error };
        return {
          kind: "text-blocks",
          blocks: [{ label: "Generated CV", body: r.data!.content }],
          savedDocId: r.data!.id,
        };
      }
      if (isAi) {
        return {
          kind: "notice",
          title: `${tool.name} generator`,
          body: `${tool.name} generation is available in your CIOS library with a dedicated form. We're folding it into this shell in the next release — in the meantime open My library to continue.`,
          href: "/documents/app/library",
          hrefLabel: "Open My library",
        };
      }

      // PDF tools in beta — full onboarding runs, processing pending server rollout
      if (tool.status === "beta") {
        return {
          kind: "notice",
          title: "Queued for processing",
          body: `Your ${tool.name.toLowerCase()} job is queued. Server-side PDF processing rolls out in the next release — we'll email you when it completes. Zero files leave your device right now.`,
          href: "/documents/app",
          hrefLabel: "Back to tools",
        };
      }

      return { kind: "notice", title: "Coming soon", body: `${tool.name} is on the roadmap.` };
    } catch (e) {
      return { kind: "error", message: e instanceof Error ? e.message : String(e) };
    }
  };

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", color: "#F8FAFC", fontFamily: "'Nunito', sans-serif" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/documents/app" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src={CIOS_LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#F8FAFC" }}>CIOS Documents</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Tool · {tool.name}</div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: STATUS_COLOR[tool.status] + "1A",
              color: STATUS_COLOR[tool.status],
              fontSize: 11,
              fontWeight: 800,
              border: `1px solid ${STATUS_COLOR[tool.status]}33`,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {STATUS_LABEL[tool.status]}
          </span>
          <ThemeToggle compact />
          <Link href="/documents/app" style={ghostLink}>← Tools</Link>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Tool header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: 18,
              background: tool.accent + "22", border: `1px solid ${tool.accent}44`,
              fontSize: 30, marginBottom: 12,
            }}
          >
            {tool.emoji}
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#F8FAFC", letterSpacing: -0.3 }}>
            {tool.name}
          </h1>
          <p style={{ color: "#94A3B8", fontSize: 14, marginTop: 8, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            {tool.blurb}
          </p>
        </div>

        {/* Stepper */}
        <Stepper phase={phase} accent={tool.accent} />

        {/* Phase content */}
        <div style={{ marginTop: 24 }}>
          {phase === "intake" && (
            <IntakePhase
              tool={tool}
              firstName={firstName}
              text={text}
              onTextChange={setText}
              files={files}
              onFiles={onFiles}
              onClearFile={(idx) => setFiles((f) => f.filter((_, i) => i !== idx))}
              onContinue={() => setPhase("configure")}
              canContinue={readyForConfigure}
            />
          )}
          {phase === "configure" && (
            <ConfigurePhase
              tool={tool}
              summariseStyle={summariseStyle} setSummariseStyle={setSummariseStyle}
              targetLanguage={targetLanguage} setTargetLanguage={setTargetLanguage}
              preserveFormatting={preserveFormatting} setPreserveFormatting={setPreserveFormatting}
              onBack={() => setPhase("intake")}
              onStart={advanceToProcessing}
              isLive={isLive}
            />
          )}
          {phase === "processing" && <ProcessingView accent={tool.accent} label={`Running ${tool.name.toLowerCase()}…`} />}
          {phase === "result" && result && (
            <ResultPhase
              result={result}
              toolName={tool.name}
              accent={tool.accent}
              onRestart={() => {
                setText("");
                setFiles([]);
                setResult(null);
                setPhase("intake");
              }}
            />
          )}
        </div>

        {pending && null /* transition indicator handled by ProcessingView */}
      </div>

      <style>{`
        @keyframes docPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─────────── phases ─────────── */

function Stepper({ phase, accent }: { phase: Phase; accent: string }) {
  const steps: Array<{ id: Phase; label: string }> = [
    { id: "intake",     label: "Upload / Input" },
    { id: "configure",  label: "Configure" },
    { id: "processing", label: "Process" },
  ];
  const order: Phase[] = ["intake", "configure", "processing", "result"];
  const idx = order.indexOf(phase);
  const pct = phase === "result" ? 100 : ((idx + 1) / 3) * 100;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%", borderRadius: 999,
              background: `linear-gradient(90deg, ${accent}, #8B5CF6)`,
              width: `${pct}%`, transition: "width .3s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 800 }}>
          {phase === "result" ? "Done" : `${idx + 1} / 3`}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#94A3B8", fontSize: 11, letterSpacing: 0.5, fontWeight: 700 }}>
        {steps.map((s, i) => (
          <span key={s.id} style={{ color: i === idx ? accent : i < idx || phase === "result" ? "#10B981" : "#94A3B8" }}>
            {i < idx || phase === "result" ? "✓ " : `${i + 1}. `}{s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function IntakePhase({
  tool, firstName, text, onTextChange, files, onFiles, onClearFile, onContinue, canContinue,
}: {
  tool: DocTool;
  firstName: string;
  text: string;
  onTextChange: (v: string) => void;
  files: File[];
  onFiles: (fl: FileList | null) => void;
  onClearFile: (idx: number) => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const isAiGenerator = tool.category === "ai-create";

  if (isAiGenerator) {
    return (
      <div style={cardStyle}>
        <h2 style={sectionH}>Hi {firstName} 👋</h2>
        <p style={bodyText}>
          {tool.name} pulls from your CIOS profile automatically — your experience, education, skills and achievements.
          No upload needed.
        </p>
        <p style={{ ...bodyText, marginTop: 8 }}>
          In the next step you can tweak tone, target role, or which sections to emphasise.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button onClick={onContinue} style={primaryBtn(tool.accent)}>Continue →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionH}>Give {tool.name.toLowerCase()} something to work with</h2>
      <p style={bodyText}>Paste text directly, upload a file, or combine both.</p>

      {/* Dropzone */}
      <label
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
        style={{
          display: "block", marginTop: 16, padding: "24px 18px",
          border: "2px dashed rgba(255,255,255,0.14)", borderRadius: 16,
          background: "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "center",
          transition: "border-color .15s, background .15s",
        }}
      >
        <input type="file" multiple accept=".txt,.md,.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,text/plain" style={{ display: "none" }}
          onChange={(e) => onFiles(e.target.files)}
        />
        <div style={{ fontSize: 32 }}>📎</div>
        <div style={{ fontWeight: 800, color: "#F8FAFC", marginTop: 6 }}>
          Drag & drop or click to upload
        </div>
        <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
          .txt / .md / .pdf / .docx / .pptx / .xlsx / .jpg / .png
        </div>
      </label>

      {files.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
              fontSize: 13, color: "#F8FAFC",
            }}>
              <span>📄 {f.name} <span style={{ color: "#64748B" }}>· {formatBytes(f.size)}</span></span>
              <button onClick={() => onClearFile(i)} style={iconBtn}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Paste box */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700, marginBottom: 6 }}>
          Or paste text
        </div>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={10}
          placeholder="Paste your text, article, report or notes here…"
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
            color: "#F8FAFC", fontSize: 14, lineHeight: 1.55,
            outline: "none", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical",
          }}
        />
        <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>{text.length.toLocaleString()} characters</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          style={canContinue ? primaryBtn(tool.accent) : disabledBtn}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function ConfigurePhase({
  tool, summariseStyle, setSummariseStyle, targetLanguage, setTargetLanguage,
  preserveFormatting, setPreserveFormatting, onBack, onStart, isLive,
}: {
  tool: DocTool;
  summariseStyle: "executive" | "bullets" | "tldr";
  setSummariseStyle: (v: "executive" | "bullets" | "tldr") => void;
  targetLanguage: string;
  setTargetLanguage: (v: string) => void;
  preserveFormatting: boolean;
  setPreserveFormatting: (v: boolean) => void;
  onBack: () => void;
  onStart: () => void;
  isLive: boolean;
}) {
  return (
    <div style={cardStyle}>
      <h2 style={sectionH}>Configure</h2>

      {tool.id === "summarize" && (
        <div>
          <Label>Summary style</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <OptionCard emoji="🧾" title="Executive" blurb="3-4 polished sentences" active={summariseStyle === "executive"} onClick={() => setSummariseStyle("executive")} accent={tool.accent} />
            <OptionCard emoji="•••" title="Bullets"  blurb="5-bullet key points"    active={summariseStyle === "bullets"}   onClick={() => setSummariseStyle("bullets")}   accent={tool.accent} />
            <OptionCard emoji="⚡" title="TL;DR"    blurb="Two punchy sentences"    active={summariseStyle === "tldr"}      onClick={() => setSummariseStyle("tldr")}      accent={tool.accent} />
          </div>
        </div>
      )}

      {tool.id === "translate" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <Label>Target language</Label>
            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} style={selectStyle}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#F8FAFC", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={preserveFormatting}
              onChange={(e) => setPreserveFormatting(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: tool.accent }}
            />
            Preserve original formatting (paragraphs, bullets, headings)
          </label>
        </div>
      )}

      {tool.category === "ai-create" && (
        <div>
          <p style={bodyText}>We&apos;ll use your profile as the source of truth. In the next release you&apos;ll be able to tweak tone (formal / warm / bold), target role, and highlighted sections right here.</p>
        </div>
      )}

      {tool.category !== "ai-create" && tool.id !== "summarize" && tool.id !== "translate" && (
        <div>
          <p style={bodyText}>
            {tool.status === "beta"
              ? "Server-side processing rolls out in the next release. Your files never leave your browser today — tap Start to reserve your spot in the queue."
              : "This tool is still in planning. Thanks for your interest — we&apos;ll notify you when it opens."}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "space-between" }}>
        <button onClick={onBack} style={ghostBtn}>← Back</button>
        <button onClick={onStart} style={primaryBtn(tool.accent)}>
          {isLive ? "Start →" : "Reserve →"}
        </button>
      </div>
    </div>
  );
}

function ProcessingView({ accent, label }: { accent: string; label: string }) {
  return (
    <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
      <img
        src={CIOS_LOGO}
        alt=""
        width={56}
        height={56}
        style={{
          display: "block", margin: "0 auto 14px", borderRadius: 12,
          animation: "docPulse 1.2s ease-in-out infinite",
          boxShadow: `0 0 0 8px ${accent}22`,
        }}
      />
      <div style={{ fontSize: 15, fontWeight: 800, color: "#F8FAFC" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>CIOS is on it — this usually takes a few seconds.</div>
    </div>
  );
}

type ToolResult =
  | { kind: "text-blocks"; blocks: { label: string; body: string }[]; savedDocId?: string }
  | { kind: "notice"; title: string; body: string; href?: string; hrefLabel?: string }
  | { kind: "error"; message: string };

function ResultPhase({
  result, toolName, accent, onRestart,
}: {
  result: ToolResult;
  toolName: string;
  accent: string;
  onRestart: () => void;
}) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };
  const download = (name: string, body: string) => {
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  if (result.kind === "error") {
    return (
      <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#FCA5A5" }}>Something went wrong</div>
        <div style={{ color: "#F1F5F9", fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{result.message}</div>
        <button onClick={onRestart} style={{ ...primaryBtn(accent), marginTop: 14 }}>Try again</button>
      </div>
    );
  }
  if (result.kind === "notice") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 800, color: accent, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Status
        </div>
        <h2 style={{ margin: "6px 0 10px", fontSize: 22, fontWeight: 900, color: "#F8FAFC" }}>{result.title}</h2>
        <p style={bodyText}>{result.body}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {result.href && (
            <Link href={result.href} style={{ ...primaryBtn(accent), textDecoration: "none", display: "inline-block" }}>
              {result.hrefLabel || "Continue →"}
            </Link>
          )}
          <button onClick={onRestart} style={ghostBtn}>Start over</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {result.blocks.map((b, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {b.label}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => copy(b.body)} style={iconBtn}>⧉ Copy</button>
              <button onClick={() => download(`${toolName.toLowerCase()}-${i + 1}.txt`, b.body)} style={iconBtn}>⬇︎ .txt</button>
            </div>
          </div>
          <div style={{ whiteSpace: "pre-wrap", color: "#F1F5F9", fontSize: 14, lineHeight: 1.65 }}>
            {b.body}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={onRestart} style={primaryBtn(accent)}>Run again</button>
        <Link href="/documents/app" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Back to tools
        </Link>
      </div>
    </div>
  );
}

/* ─────────── small UI primitives ─────────── */

function OptionCard({
  emoji, title, blurb, active, onClick, accent,
}: {
  emoji: string; title: string; blurb: string; active: boolean; onClick: () => void; accent: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 16, borderRadius: 14, textAlign: "left", cursor: "pointer",
        background: active ? accent + "1A" : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${active ? accent + "88" : "rgba(255,255,255,0.08)"}`,
        color: "#F8FAFC", fontFamily: "inherit",
        transition: "border-color .15s, background .15s",
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
      <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 3 }}>{blurb}</div>
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 22, borderRadius: 18,
  background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
};

const sectionH: React.CSSProperties = {
  margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#F8FAFC", letterSpacing: -0.2,
};

const bodyText: React.CSSProperties = {
  margin: 0, fontSize: 14, color: "#94A3B8", lineHeight: 1.65,
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
  color: "#F8FAFC", fontSize: 14, outline: "none", fontFamily: "inherit",
  appearance: "none", WebkitAppearance: "none",
  backgroundImage:
    'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%2394A3B8\' d=\'M6 8L0 0h12z\'/></svg>")',
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 36,
  boxSizing: "border-box",
};

function primaryBtn(accent: string): React.CSSProperties {
  return {
    padding: "12px 22px", borderRadius: 12,
    background: `linear-gradient(135deg, ${accent}, #7C3AED)`,
    color: "#fff", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer",
    boxShadow: `0 10px 24px -8px ${accent}B3`, fontFamily: "inherit",
  };
}

const ghostBtn: React.CSSProperties = {
  padding: "12px 18px", borderRadius: 12,
  background: "rgba(255,255,255,0.04)", color: "#F8FAFC",
  border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};

const disabledBtn: React.CSSProperties = {
  padding: "12px 22px", borderRadius: 12,
  background: "rgba(255,255,255,0.04)", color: "#64748B",
  border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700,
  cursor: "not-allowed", fontFamily: "inherit",
};

const ghostLink: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)", color: "#F8FAFC",
  border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, fontWeight: 700,
  textDecoration: "none",
};

const iconBtn: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 8,
  background: "transparent", color: "#94A3B8",
  border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* Note: `A1` is reserved for future per-phase tints; keep the export so future
 * callers can import the Documents accent from this module. */
export const DOCUMENTS_ACCENT = A1;

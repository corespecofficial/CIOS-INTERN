"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sendChat, type ChatMessage } from "@/app/actions/ai-chat";
import {
  ACCENT,
  readRecents,
  writeRecents,
  type Recent,
} from "../_components/workspace-shell";

const CIOS_LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

type QuickAction = { label: string; emoji: string; prompt: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Create",     emoji: "✨", prompt: "Help me create " },
  { label: "Code",       emoji: "💻", prompt: "Write code that " },
  { label: "Strategise", emoji: "🧠", prompt: "Build me a strategy for " },
  { label: "Write",      emoji: "✍️", prompt: "Draft a " },
  { label: "Learn",      emoji: "🎓", prompt: "Explain " },
];

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function ChatClient({ firstName }: { firstName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatTitle, setChatTitle] = useState("New chat");
  const [chatId, setChatId] = useState<string>(() => `c_${Date.now()}`);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isEmpty = messages.length === 0;
  const greeting = useMemo(() => greetingFor(), []);

  useEffect(() => {
    try {
      const activeId = localStorage.getItem("cios-ai-hub-active-chat");
      if (!activeId) return;
      localStorage.removeItem("cios-ai-hub-active-chat");
      const r = readRecents().find((x) => x.id === activeId);
      if (r) {
        setChatId(r.id);
        setChatTitle(r.title);
        setMessages(r.messages as ChatMessage[]);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const persistRecent = (nextMessages: ChatMessage[], title: string) => {
    const rec: Recent = { id: chatId, title, messages: nextMessages, updatedAt: Date.now() };
    const others = readRecents().filter((r) => r.id !== chatId);
    writeRecents([rec, ...others]);
  };

  const submit = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    const derivedTitle = messages.length === 0
      ? (text.length > 40 ? text.slice(0, 40) + "…" : text)
      : chatTitle;
    if (messages.length === 0) setChatTitle(derivedTitle);

    try {
      const res = await sendChat({
        toolId: "chat",
        messages: nextMessages,
        system:
          "You are CIOS AI Hub, an assistant for CIOS members (interns, founders, recruiters, investors). Be concise, practical and warm. Use markdown where helpful.",
      });
      const reply: ChatMessage = {
        role: "assistant",
        content: res.ok && res.data ? res.data.reply : `Sorry — I couldn't respond: ${res.ok ? "unknown error" : res.error}`,
      };
      const updated = [...nextMessages, reply];
      setMessages(updated);
      persistRecent(updated, derivedTitle);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const regenerate = async () => {
    const withoutLastAssistant = [...messages];
    while (
      withoutLastAssistant.length > 0 &&
      withoutLastAssistant[withoutLastAssistant.length - 1].role === "assistant"
    ) withoutLastAssistant.pop();
    const lastUser = [...withoutLastAssistant].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages(withoutLastAssistant);
    setSending(true);
    try {
      const res = await sendChat({
        toolId: "chat",
        messages: withoutLastAssistant,
        system: "You are CIOS AI Hub. Be concise, practical and warm. Use markdown.",
      });
      const reply: ChatMessage = {
        role: "assistant",
        content: res.ok && res.data ? res.data.reply : "Sorry — I couldn't respond.",
      };
      const updated = [...withoutLastAssistant, reply];
      setMessages(updated);
      persistRecent(updated, chatTitle);
    } finally {
      setSending(false);
    }
  };

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1400);
    } catch { /* ignore */ }
  };

  return (
    <>
      {!isEmpty && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid #F0EDE5",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14, color: "#1F2430" }}>
            <span style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {chatTitle}
            </span>
            <span style={{ color: "#9E9A8E", fontSize: 12 }}>▾</span>
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: "#F7F6F3",
              fontSize: 12,
              fontWeight: 700,
              color: "#55524A",
              border: "1px solid #EAE7DF",
            }}
          >
            CIOS Opus · Adaptive
          </div>
        </div>
      )}

      {isEmpty ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <img
              src={CIOS_LOGO}
              alt="CIOS"
              width={56}
              height={56}
              style={{
                borderRadius: 14,
                animation: sending ? "ciosPulse 1.2s ease-in-out infinite" : undefined,
                boxShadow: sending ? `0 0 0 8px ${ACCENT}22` : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            />
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 30, color: "#1F2430", letterSpacing: -0.3, textAlign: "center" }}>
              {greeting}, {firstName}
            </h1>
          </div>

          <div style={{ width: "100%", maxWidth: 760 }}>
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => submit()}
              disabled={sending}
              inputRef={inputRef}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => {
                  setInput(qa.prompt);
                  setTimeout(() => inputRef.current?.focus(), 20);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid #EAE7DF",
                  background: "#fff",
                  color: "#55524A",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>{qa.emoji}</span> {qa.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflow: "auto", padding: "24px 20px" }}>
            <div style={{ maxWidth: 780, margin: "0 auto", display: "grid", gap: 22 }}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  copied={copiedIdx === i}
                  onCopy={() => copy(m.content, i)}
                  onRegenerate={
                    m.role === "assistant" && i === messages.length - 1 && !sending ? regenerate : undefined
                  }
                />
              ))}
              {sending && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          </div>
          <div style={{ borderTop: "1px solid #F0EDE5", padding: "16px 20px 24px", background: "#fff" }}>
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => submit()}
              disabled={sending}
              inputRef={inputRef}
            />
          </div>
        </>
      )}
    </>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          padding: "10px 12px 10px 16px",
          borderRadius: 20,
          background: "#fff",
          border: "1px solid #E6E3DA",
          boxShadow: "0 6px 24px rgba(16,16,16,0.06)",
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          placeholder="How can I help you today?"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={1}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
            fontSize: 15,
            color: "#1F2430",
            background: "transparent",
            padding: "8px 0",
            lineHeight: 1.4,
            maxHeight: 200,
          }}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          title="Send"
          style={{
            border: "none",
            width: 36,
            height: 36,
            borderRadius: 999,
            background:
              disabled || !value.trim()
                ? "#ECE9E1"
                : `linear-gradient(135deg, ${ACCENT}, #7C3AED)`,
            color: disabled || !value.trim() ? "#A8A59A" : "#fff",
            fontWeight: 900,
            fontSize: 16,
            cursor: disabled || !value.trim() ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          ↑
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: "#9E9A8E", marginTop: 8 }}>
        CIOS can make mistakes. Verify important information.
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  copied,
  onCopy,
  onRegenerate,
}: {
  message: ChatMessage;
  copied: boolean;
  onCopy: () => void;
  onRegenerate?: () => void;
}) {
  if (message.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            background: "#F2F1ED",
            color: "#1F2430",
            padding: "12px 16px",
            borderRadius: 18,
            maxWidth: "78%",
            fontSize: 15,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <img src={CIOS_LOGO} alt="" width={28} height={28} style={{ borderRadius: 6, marginTop: 2, flex: "0 0 auto" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#1F2430",
            fontSize: 15,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {renderMarkdown(message.content)}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <IconBtn label={copied ? "Copied" : "Copy"} onClick={onCopy}>{copied ? "✓" : "⧉"}</IconBtn>
          <IconBtn label="Good response">👍</IconBtn>
          <IconBtn label="Bad response">👎</IconBtn>
          {onRegenerate && <IconBtn label="Regenerate" onClick={onRegenerate}>↻</IconBtn>}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: "6px 8px",
        borderRadius: 6,
        cursor: onClick ? "pointer" : "default",
        color: "#8F8B80",
        fontSize: 14,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F1ED"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <img
        src={CIOS_LOGO}
        alt=""
        width={28}
        height={28}
        style={{
          borderRadius: 6,
          animation: "ciosPulse 1.2s ease-in-out infinite",
          boxShadow: `0 0 0 4px ${ACCENT}22`,
        }}
      />
      <div style={{ display: "flex", gap: 4 }}>
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

function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    const fence = block.match(/^```(\w+)?\n([\s\S]*?)```$/);
    if (fence) {
      return (
        <pre
          key={bi}
          style={{
            background: "#F7F6F3",
            border: "1px solid #EAE7DF",
            borderRadius: 12,
            padding: 14,
            overflow: "auto",
            fontFamily: "ui-monospace,Menlo,Monaco,monospace",
            fontSize: 13,
            lineHeight: 1.55,
            color: "#1F2430",
            margin: "6px 0",
          }}
        >
          <code>{fence[2]}</code>
        </pre>
      );
    }
    const h = block.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = [22, 18, 16];
      return (
        <div
          key={bi}
          style={{
            fontSize: sizes[level - 1],
            fontWeight: 800,
            margin: "10px 0 4px",
            color: "#1F2430",
          }}
        >
          {inline(h[2])}
        </div>
      );
    }
    if (/^(\s*[-*]\s+)/.test(block)) {
      const items = block.split(/\n/).filter((l) => /^\s*[-*]\s+/.test(l));
      return (
        <ul key={bi} style={{ paddingLeft: 22, margin: "6px 0" }}>
          {items.map((li, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{inline(li.replace(/^\s*[-*]\s+/, ""))}</li>
          ))}
        </ul>
      );
    }
    if (/^(\s*\d+\.\s+)/.test(block)) {
      const items = block.split(/\n/).filter((l) => /^\s*\d+\.\s+/.test(l));
      return (
        <ol key={bi} style={{ paddingLeft: 22, margin: "6px 0" }}>
          {items.map((li, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{inline(li.replace(/^\s*\d+\.\s+/, ""))}</li>
          ))}
        </ol>
      );
    }
    return (
      <p key={bi} style={{ margin: "6px 0" }}>
        {inline(block)}
      </p>
    );
  });
}

function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={idx++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      parts.push(<em key={idx++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("`")) {
      parts.push(
        <code
          key={idx++}
          style={{
            background: "#F2F1ED",
            padding: "1px 6px",
            borderRadius: 4,
            fontFamily: "ui-monospace,Menlo,Monaco,monospace",
            fontSize: 13,
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

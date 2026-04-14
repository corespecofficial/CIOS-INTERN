"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { sendChat, type ChatMessage } from "@/app/actions/ai-chat";
import {
  ConversationStore, MemoryStore, newId, autoTitle, conversationToMarkdown,
  type Conversation,
} from "@/lib/ai-hub-store";

const TOOLS = [
  { id: "chat", label: "💬 Chat", system: "You are a helpful CIOS assistant. Be concise and practical." },
  { id: "content_generator", label: "✍️ Content", system: "You help generate marketing copy, posts, captions, and emails. Punchy and clear." },
  { id: "resume_builder", label: "📄 Resume", system: "You write strong resume bullet points with metrics and action verbs." },
  { id: "marketing", label: "📣 Marketing", system: "You are a senior marketing strategist. Give structured plans with examples." },
  { id: "coding", label: "💻 Coding", system: "You are a senior engineer. Prefer idiomatic examples; explain clearly." },
  { id: "analytics", label: "📊 Analytics", system: "You explain performance data in plain English with actionable next steps." },
  { id: "prompt_builder", label: "🧠 Prompts", system: "You craft improved prompts with clear constraints, tone, and examples." },
] as const;

type Tool = (typeof TOOLS)[number];

export default function AIHubClient() {
  const [tool, setTool] = useState<Tool>(TOOLS[0]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [meta, setMeta] = useState<{ model: string; provider: string; latencyMs: number } | null>(null);
  const [temporary, setTemporary] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memory, setMemory] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Default sidebar closed on mobile — open on desktop
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setSidebarOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Auto-grow the textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  // Initial hydration from localStorage
  useEffect(() => {
    setConvos(ConversationStore.list());
    setMemory(MemoryStore.read());
    const lastId = ConversationStore.getLast();
    if (lastId) {
      const c = ConversationStore.get(lastId);
      if (c) { loadConversation(c); return; }
    }
  }, []); // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending]);

  const loadConversation = (c: Conversation) => {
    setActiveId(c.id);
    setMessages(c.messages);
    const t = TOOLS.find((x) => x.id === c.toolId) || TOOLS[0];
    setTool(t);
    setMeta(null);
    setTemporary(false);
    ConversationStore.setLast(c.id);
    // Auto-close sidebar on mobile so the chat takes focus
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setMeta(null);
  };

  const switchTool = (t: Tool) => {
    if (tool.id === t.id) return;
    if (messages.length > 0 && !confirm("Start a new conversation with this tool?")) return;
    setTool(t);
    newChat();
  };

  const composeSystem = (): string => {
    const base = tool.system;
    if (!memory.trim()) return base;
    return `${base}\n\n=== User memory (persistent context) ===\n${memory.trim()}\n=== End memory ===`;
  };

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    start(async () => {
      const res = await sendChat({
        toolId: tool.id as "chat",
        system: composeSystem(),
        messages: next,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setMeta({ model: res.data!.model, provider: res.data!.provider, latencyMs: res.data!.latencyMs });
      const full: ChatMessage[] = [...next, { role: "assistant", content: res.data!.reply }];
      setMessages(full);
      if (!temporary) persist(full);
    });
  };

  const persist = (msgs: ChatMessage[]) => {
    const firstUser = msgs.find((m) => m.role === "user");
    const title = activeId ? (convos.find((c) => c.id === activeId)?.title || autoTitle(firstUser?.content || "")) : autoTitle(firstUser?.content || "");
    const id = activeId || newId();
    const now = new Date().toISOString();
    const existing = ConversationStore.get(id);
    const c: Conversation = {
      id, title,
      toolId: tool.id,
      messages: msgs,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      pinned: existing?.pinned,
    };
    ConversationStore.save(c);
    ConversationStore.setLast(id);
    setActiveId(id);
    setConvos(ConversationStore.list());
  };

  const onRename = (id: string) => {
    const c = convos.find((x) => x.id === id);
    if (!c) return;
    const next = prompt("Rename chat", c.title);
    if (!next || next.trim() === c.title) return;
    ConversationStore.rename(id, next.trim());
    setConvos(ConversationStore.list());
  };
  const onDelete = (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    ConversationStore.remove(id);
    if (activeId === id) newChat();
    setConvos(ConversationStore.list());
  };
  const onPin = (id: string) => { ConversationStore.togglePin(id); setConvos(ConversationStore.list()); };

  const onExport = (c: Conversation) => {
    const md = conversationToMarkdown(c);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${c.title.replace(/[^\w\s-]/g, "").slice(0, 60)}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const saveMemory = () => {
    MemoryStore.write(memory);
    toast.success("Memory saved");
    setMemoryOpen(false);
  };
  const downloadMemory = () => {
    const blob = new Blob([memory || "# My AI Memory\n\n(empty)"], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cios-ai-memory.md"; a.click();
    URL.revokeObjectURL(url);
  };
  const uploadMemory = (file: File) => {
    const r = new FileReader();
    r.onload = () => { setMemory(String(r.result || "")); toast.success("Memory loaded — save to apply"); };
    r.readAsText(file);
  };

  const pinned = useMemo(() => convos.filter((c) => c.pinned), [convos]);
  const recent = useMemo(() => convos.filter((c) => !c.pinned), [convos]);

  return (
    <>
      <style>{`
        .cios-aih-root {
          max-width: 1200px; margin: 0 auto; font-family: 'Nunito', sans-serif;
          height: calc(100dvh - 140px); min-height: 560px;
          display: flex; gap: 14px; position: relative;
        }
        .cios-aih-sidebar {
          width: 260px; flex-shrink: 0;
          background: #111827; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          display: flex; flex-direction: column; overflow: hidden;
          transition: width .25s ease, opacity .2s ease, transform .25s ease;
        }
        .cios-aih-sidebar.is-collapsed { width: 0; opacity: 0; pointer-events: none; border: none; }
        .cios-aih-chat {
          flex: 1 1 0; min-width: 0; min-height: 0;
          background: #111827; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .cios-aih-chat > div:first-child { flex-shrink: 0; }
        .cios-aih-messages { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 18px; }
        .cios-aih-input-wrap { position: relative; padding: 12px; border-top: 1px solid rgba(255,255,255,0.05); background: #111827; flex-shrink: 0; }
        .cios-aih-input {
          width: 100%; box-sizing: border-box; resize: none;
          padding: 12px 52px 12px 16px;
          background: #0A0E1A; color: #E8EDF5;
          border: 1px solid rgba(255,255,255,0.12); border-radius: 14px;
          font-size: 14px; line-height: 1.45; font-family: inherit; outline: none;
          min-height: 46px; max-height: 200px;
          display: block;
        }
        .cios-aih-input:focus { border-color: rgba(171,71,188,0.4); }
        .cios-aih-send {
          position: absolute; right: 22px; bottom: 22px;
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #AB47BC, #8E24AA);
          color: #fff; border: none; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: transform .1s;
        }
        .cios-aih-send:disabled { opacity: 0.35; cursor: not-allowed; }
        .cios-aih-send:hover:not(:disabled) { transform: scale(1.06); }
        .cios-aih-toggle {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px;
          background: transparent; border: 1px solid rgba(255,255,255,0.08);
          color: #E8EDF5; cursor: pointer; padding: 0; flex-shrink: 0;
        }
        .cios-aih-toggle:hover { background: rgba(255,255,255,0.04); }
        .cios-aih-backdrop { display: none; }

        @media (max-width: 768px) {
          /* Root stays in normal flow — no position:fixed or transform that
             would create a new stacking context and trap the sidebar's z-index. */
          .cios-aih-root {
            display: block;
            max-width: none;
            margin: -12px -12px -80px -12px;
            height: calc(100dvh - 56px - 64px);
            min-height: 0;
            gap: 0;
          }
          .cios-aih-chat {
            border-radius: 0;
            border: none;
            height: 100%;
          }
          /* Sidebar is position: fixed at the viewport level — creates its own
             stacking context scoped to root ONLY IF root also had one. Because
             root is plain block now, sidebar's z:9999 wins globally. */
          .cios-aih-sidebar {
            position: fixed !important;
            top: 56px !important;
            bottom: 64px !important;
            left: 0 !important;
            width: min(320px, 88vw) !important;
            max-width: none !important;
            z-index: 9999 !important;
            border-radius: 0 !important;
            border: none !important;
            border-right: 1px solid rgba(255,255,255,0.07) !important;
          }
          .cios-aih-sidebar.is-collapsed {
            transform: translateX(-110%) !important;
            width: min(320px, 88vw) !important;
            opacity: 1 !important;
            pointer-events: none !important;
          }
          .cios-aih-backdrop {
            display: block;
            position: fixed;
            top: 56px; bottom: 64px; left: 0; right: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9000;
          }
          .cios-aih-backdrop.is-hidden { display: none; }
        }
      `}</style>

      {/* Mobile backdrop — outside the grid so it never steals a layout slot */}
      <div className={`cios-aih-backdrop ${sidebarOpen ? "" : "is-hidden"}`} onClick={() => setSidebarOpen(false)} />

      <div className="cios-aih-root">
      {/* Sidebar */}
      <aside className={`cios-aih-sidebar ${sidebarOpen ? "" : "is-collapsed"}`}>
        <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={newChat} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New chat</button>
        </div>

        {/* Tool rail */}
        <div style={{ padding: 8 }}>
          <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, padding: "6px 6px" }}>Tools</div>
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => switchTool(t)} style={{
              width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: tool.id === t.id ? "rgba(171,71,188,0.15)" : "transparent",
              color: tool.id === t.id ? "#AB47BC" : "#E8EDF5",
              border: "none", marginBottom: 2,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: "auto", padding: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {pinned.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#FFC107", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, padding: "6px 6px" }}>📌 Pinned</div>
              {pinned.map((c) => <ConvoItem key={c.id} c={c} active={activeId === c.id} onOpen={loadConversation} onRename={onRename} onDelete={onDelete} onPin={onPin} onExport={onExport} />)}
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 6px 6px 6px" }}>
            <span style={{ fontSize: 10, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>Recent ({recent.length})</span>
            {recent.length > 0 && (
              <button
                onClick={() => {
                  if (!confirm(`Clear all ${recent.length} recent chat${recent.length === 1 ? "" : "s"}? Pinned chats are kept.`)) return;
                  // Keep pinned, remove the rest
                  for (const c of recent) ConversationStore.remove(c.id);
                  setConvos(ConversationStore.list());
                  if (activeId && recent.some((c) => c.id === activeId)) newChat();
                  toast.success(`Cleared ${recent.length} chat${recent.length === 1 ? "" : "s"}`);
                }}
                style={{ background: "transparent", border: "none", color: "#EF5350", fontSize: 10, fontWeight: 700, cursor: "pointer", padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5 }}
                title="Clear all unpinned chats"
              >
                🗑 Clear all
              </button>
            )}
          </div>
          {recent.length === 0 && <div style={{ fontSize: 11, color: "#5A6478", padding: 8 }}>No saved chats yet</div>}
          {recent.map((c) => <ConvoItem key={c.id} c={c} active={activeId === c.id} onOpen={loadConversation} onRename={onRename} onDelete={onDelete} onPin={onPin} onExport={onExport} />)}
        </div>

        {/* Memory + footer */}
        <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setMemoryOpen(true)} style={btnFooter}>
            🧠 Memory {memory.trim() ? `(${memory.split("\n").length} lines)` : "(empty)"}
          </button>
          <label style={{ ...btnFooter, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", justifyContent: "space-between" }}>
            <span>🕶️ Temporary chat</span>
            <input type="checkbox" checked={temporary} onChange={(e) => setTemporary(e.target.checked)} />
          </label>
        </div>
      </aside>

      {/* Chat panel */}
      <section className="cios-aih-chat" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <button className="cios-aih-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              {sidebarOpen
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tool.label}
                {temporary && <span style={{ marginLeft: 10, fontSize: 9, padding: "2px 7px", borderRadius: 99, background: "rgba(255,193,7,0.15)", color: "#FFC107", fontWeight: 700 }}>TEMPORARY</span>}
              </div>
              <div style={{ fontSize: 10, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {meta ? `${meta.provider} · ${meta.model} · ${meta.latencyMs}ms` : "Chats stored locally in your browser"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {activeId && <button onClick={() => { const c = convos.find((x) => x.id === activeId); if (c) onExport(c); }} style={btnChip}>⬇</button>}
            <span style={{ fontSize: 10, color: "#66BB6A", padding: "3px 8px", borderRadius: 99, background: "rgba(102,187,106,0.12)", border: "1px solid rgba(102,187,106,0.3)", fontWeight: 700 }}>● LIVE</span>
          </div>
        </div>

        <div className="cios-aih-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#5A6478", marginTop: 60 }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{tool.label.split(" ")[0]}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#E8EDF5" }}>Start a conversation</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{temporary ? "This chat will not be saved." : "Chats save to this browser automatically."}</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "78%", padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap",
                background: m.role === "user" ? "linear-gradient(135deg, #1E88E5, #1565C0)" : "#0A0E1A",
                border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.07)",
                color: "#E8EDF5",
                borderBottomRightRadius: m.role === "user" ? 4 : 14,
                borderBottomLeftRadius: m.role === "user" ? 14 : 4,
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
              <div style={{ padding: "10px 14px", borderRadius: 14, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", color: "#8892A4", fontSize: 14 }}>● ● ●</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="cios-aih-input-wrap">
          <textarea
            ref={inputRef}
            className="cios-aih-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={temporary ? "Temporary chat — Enter to send" : "Ask anything…  (Enter to send, Shift+Enter for newline)"}
            rows={1}
          />
          <button className="cios-aih-send" onClick={send} disabled={pending || !input.trim()} aria-label="Send message">
            {pending
              ? <span style={{ fontSize: 14 }}>…</span>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
          </button>
        </div>
      </section>

      </div>{/* /cios-aih-root */}

      {/* Memory modal */}
      {memoryOpen && (
        <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && setMemoryOpen(false)}>
          <div style={modalPanel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>🧠 Persistent memory</h2>
                <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0" }}>
                  Markdown notes the assistant gets every conversation. Stored only on this device.
                </p>
              </div>
              <button onClick={() => setMemoryOpen(false)} style={btnClose}>✕</button>
            </div>
            <textarea
              value={memory} onChange={(e) => setMemory(e.target.value)}
              rows={18}
              placeholder="# About me&#10;- Role:&#10;- Goals:&#10;- Preferences:&#10;&#10;# Active projects&#10;- "
              style={{ width: "100%", padding: 12, background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.55, boxSizing: "border-box", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <label style={btnGhost}>
                ⬆ Import .md
                <input type="file" accept=".md,text/markdown,text/plain" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMemory(f); e.currentTarget.value = ""; }} />
              </label>
              <button onClick={downloadMemory} style={btnGhost}>⬇ Download .md</button>
              <button onClick={() => { if (confirm("Clear all memory?")) { setMemory(""); MemoryStore.clear(); } }} style={btnGhost}>🗑 Clear</button>
              <div style={{ flex: 1 }} />
              <button onClick={saveMemory} style={btnPrimary}>💾 Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ConvoItem({ c, active, onOpen, onRename, onDelete, onPin, onExport }: {
  c: Conversation; active: boolean;
  onOpen: (c: Conversation) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onExport: (c: Conversation) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", padding: "7px 10px", borderRadius: 8, marginBottom: 2, cursor: "pointer",
        background: active ? "rgba(30,136,229,0.12)" : hover ? "rgba(255,255,255,0.03)" : "transparent",
        border: active ? "1px solid rgba(30,136,229,0.3)" : "1px solid transparent",
      }}
      onClick={() => onOpen(c)}>
      <div style={{ fontSize: 12, color: active ? "#1E88E5" : "#E8EDF5", fontWeight: active ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
      <div style={{ fontSize: 10, color: "#5A6478", marginTop: 1 }}>{new Date(c.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {c.messages.length} msgs</div>
      {hover && (
        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 2, background: "#0A0E1A", borderRadius: 6, padding: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={(e) => { e.stopPropagation(); onPin(c.id); }} title={c.pinned ? "Unpin" : "Pin"} style={btnIcon}>{c.pinned ? "📌" : "📍"}</button>
          <button onClick={(e) => { e.stopPropagation(); onRename(c.id); }} title="Rename" style={btnIcon}>✎</button>
          <button onClick={(e) => { e.stopPropagation(); onExport(c); }} title="Export" style={btnIcon}>⬇</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} title="Delete" style={btnIcon}>✕</button>
        </div>
      )}
    </div>
  );
}

const btnFooter: React.CSSProperties = { padding: "8px 10px", fontSize: 11, color: "#E8EDF5", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", textAlign: "left" };
const btnChip: React.CSSProperties = { padding: "4px 10px", fontSize: 10, color: "#8892A4", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer", fontWeight: 700 };
const btnIcon: React.CSSProperties = { padding: "3px 6px", fontSize: 10, color: "#8892A4", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-block" };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 600, maxWidth: "96vw" };

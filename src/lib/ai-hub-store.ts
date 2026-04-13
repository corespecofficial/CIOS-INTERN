"use client";

import type { ChatMessage } from "@/app/actions/ai-chat";

export interface Conversation {
  id: string;
  title: string;
  toolId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

const STORE_KEY = "cios.ai.conversations.v1";
const MEM_KEY = "cios.ai.memory.md";
const LAST_KEY = "cios.ai.last-conversation";

function read(): Conversation[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; }
}
function write(list: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export const ConversationStore = {
  list(): Conversation[] { return read().sort((a, b) => (Number(b.pinned || 0) - Number(a.pinned || 0)) || b.updatedAt.localeCompare(a.updatedAt)); },
  get(id: string): Conversation | null { return read().find((c) => c.id === id) || null; },
  save(c: Conversation) {
    const all = read();
    const i = all.findIndex((x) => x.id === c.id);
    if (i >= 0) all[i] = c; else all.push(c);
    write(all);
  },
  remove(id: string) { write(read().filter((c) => c.id !== id)); },
  clear() { write([]); },
  togglePin(id: string) {
    const all = read();
    const i = all.findIndex((c) => c.id === id);
    if (i >= 0) { all[i].pinned = !all[i].pinned; write(all); }
  },
  rename(id: string, title: string) {
    const all = read();
    const i = all.findIndex((c) => c.id === id);
    if (i >= 0) { all[i].title = title; all[i].updatedAt = new Date().toISOString(); write(all); }
  },
  setLast(id: string) { try { localStorage.setItem(LAST_KEY, id); } catch {} },
  getLast(): string | null { try { return localStorage.getItem(LAST_KEY); } catch { return null; } },
};

export const MemoryStore = {
  read(): string {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(MEM_KEY) || ""; } catch { return ""; }
  },
  write(md: string) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(MEM_KEY, md); } catch {}
  },
  clear() {
    if (typeof window === "undefined") return;
    try { localStorage.removeItem(MEM_KEY); } catch {}
  },
};

export function newId(): string {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function autoTitle(firstUserMessage: string): string {
  const t = firstUserMessage.trim().replace(/\s+/g, " ").slice(0, 56);
  return t || "Untitled chat";
}

/** Serialize a conversation as a Markdown export. */
export function conversationToMarkdown(c: Conversation): string {
  const lines: string[] = [];
  lines.push(`# ${c.title}`);
  lines.push(`_${c.toolId} · ${new Date(c.createdAt).toLocaleString()}_`);
  lines.push("");
  for (const m of c.messages) {
    lines.push(`## ${m.role === "user" ? "You" : "Assistant"}`);
    lines.push("");
    lines.push(m.content);
    lines.push("");
  }
  return lines.join("\n");
}

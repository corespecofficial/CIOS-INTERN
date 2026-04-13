"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface DbNote {
  id: string;
  user_id: string;
  title: string;
  html: string;
  icon: string;
  cover_url: string | null;
  folder: string | null;
  tags: string[];
  status: "draft" | "final" | "shared" | "private";
  starred: boolean;
  pinned: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
}

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

/** List my notes (excluding trashed by default). */
export async function listMyNotes(includeTrashed = false): Promise<R<DbNote[]>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    let q = sb.from("notes").select("*").eq("user_id", me.id).order("updated_at", { ascending: false }).limit(500);
    if (!includeTrashed) q = q.is("trashed_at", null);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data || []) as DbNote[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Upsert (create or update) a note. Returns the row. */
export async function saveNote(note: Partial<DbNote> & { id?: string; title: string; html: string }): Promise<R<DbNote>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const payload = {
      ...note,
      user_id: me.id,
      updated_at: new Date().toISOString(),
    };
    if (!note.id) {
      const { data, error } = await sb.from("notes").insert({ ...payload, created_at: new Date().toISOString() }).select("*").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: data as DbNote };
    } else {
      const { data, error } = await sb.from("notes").update(payload).eq("id", note.id).eq("user_id", me.id).select("*").single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: data as DbNote };
    }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function trashNote(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("notes").update({ trashed_at: new Date().toISOString() }).eq("id", id).eq("user_id", me.id);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function restoreNote(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("notes").update({ trashed_at: null }).eq("id", id).eq("user_id", me.id);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteNoteForever(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("notes").delete().eq("id", id).eq("user_id", me.id);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ────────────────────────────────────────
   AI ACTIONS — all permission-gated
   ──────────────────────────────────────── */

type AiOp = "summarize" | "rewrite" | "grammar" | "expand" | "bullets" | "translate";

const PROMPTS: Record<AiOp, (text: string, target?: string) => string> = {
  summarize: (t) => `Summarize the following note in 3-5 concise bullet points. Keep it useful and faithful — no fluff. Output ONLY the bullets, no preface.\n\n---\n${t}`,
  rewrite: (t) => `Rewrite the following text in a more polished, professional tone. Keep the meaning. Output ONLY the rewritten text.\n\n---\n${t}`,
  grammar: (t) => `Fix grammar, spelling and punctuation in the following text. Keep voice and meaning. Output ONLY the corrected text.\n\n---\n${t}`,
  expand: (t) => `Expand the following note with more detail, examples and structure. Keep tone. Output ONLY the expanded text.\n\n---\n${t}`,
  bullets: (t) => `Convert the following text into a clear bulleted list. Output ONLY the bullets.\n\n---\n${t}`,
  translate: (t, target = "English") => `Translate the following text to ${target}. Output ONLY the translation.\n\n---\n${t}`,
};

export async function aiNoteAssist(op: AiOp, text: string, target?: string): Promise<R<{ output: string }>> {
  try {
    await requireMe();
    if (!text || text.trim().length < 5) return { ok: false, error: "Need more text to work with" };
    const prompt = PROMPTS[op](text.trim().slice(0, 8000), target);
    const result = await callLLM(prompt, {
      system: "You are a writing assistant for the CIOS notes editor. Output ONLY the requested transformation. No preface, no commentary.",
      maxTokens: 1500,
      temperature: 0.4,
    });
    return { ok: true, data: { output: result.text.trim() } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

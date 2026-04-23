"use server";

/* Study Buddy v2 — server actions for Phase 1 (multi-ingest + session persistence).
 *
 * These are ADDITIVE. The existing actions in ./study-buddy.ts (buildKnowledgeMap,
 * askStudyQuestion, gradeStudyAnswer, sendBuddyMessage, etc.) keep powering the
 * Socratic wizard and course-chat widget. This file just adds the ingest +
 * session layer the wizard will consume in Phases 2–5.
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { checkAIAccess } from "@/lib/ai-access";
import { ingestSources, chunksToPrompt, type SourceInput, type ExtractedChunk } from "@/lib/study-buddy/ingest";
import { buildKnowledgeMap, type KnowledgeMap } from "@/app/actions/study-buddy";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface CreateSessionInput {
  topic: string;
  language?: string;
  level?: "beginner" | "intermediate" | "advanced";
  style?: "visual" | "auditory" | "reading" | "mixed";
}

export interface StudySession {
  id: string;
  topic: string;
  language: string;
  level: string;
  style: string;
  sources: Array<{ kind: string; ref: string; label?: string }>;
  map: unknown;
  phase: string;
  created_at: string;
  updated_at: string;
}

/** Create a session. Called once the user finishes onboarding (topic, level,
 *  style, language) and before they add sources. */
export async function createStudySession(input: CreateSessionInput): Promise<R<{ sessionId: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!input.topic?.trim()) return { ok: false, error: "Topic is required" };

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("study_sessions")
      .insert({
        user_id: me.id,
        topic: input.topic.trim(),
        language: input.language || "English",
        level: input.level || "beginner",
        style: input.style || "mixed",
      })
      .select("id")
      .single();

    if (error || !data) return { ok: false, error: error?.message || "Could not create session" };
    return { ok: true, data: { sessionId: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Wire source(s) into a session. Each source is extracted + chunked + persisted.
 *  Returns the full chunk list so the caller can immediately feed `buildKnowledgeMap`.
 *
 *  IMPORTANT: buffers are base64-encoded on the client and decoded here. For
 *  large files (>5MB) we'll switch to Supabase Storage + signed URL in a later
 *  phase; for Phase-1 the inline path keeps things simple and avoids storage setup. */
export async function addSessionSources(
  sessionId: string,
  sources: Array<Omit<SourceInput, "buffer"> & { bufferBase64?: string }>,
): Promise<R<{ addedChunks: number; warnings: string[]; chunks: ExtractedChunk[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    // Verify ownership
    const sb = supabaseAdmin();
    const { data: session } = await sb
      .from("study_sessions")
      .select("id, user_id, sources")
      .eq("id", sessionId)
      .maybeSingle();
    const s = session as { id: string; user_id: string; sources: unknown[] } | null;
    if (!s || s.user_id !== me.id) return { ok: false, error: "Session not found" };

    // Decode client-provided base64 buffers
    const prepared: SourceInput[] = sources.map((src) => ({
      kind: src.kind,
      ref: src.ref,
      label: src.label,
      body: src.body,
      mime: src.mime,
      buffer: src.bufferBase64 ? Buffer.from(src.bufferBase64, "base64") : undefined,
    }));

    const { chunks, warnings } = await ingestSources(prepared);

    if (chunks.length > 0) {
      const rows = chunks.map((c) => ({
        session_id: sessionId,
        kind: c.kind,
        ref: c.ref,
        label: c.label || null,
        text: c.text,
        page_or_timestamp: c.pageOrTimestamp || null,
        chunk_index: c.chunkIndex,
      }));
      const { error: insErr } = await sb.from("study_source_chunks").insert(rows);
      if (insErr) return { ok: false, error: `Chunk insert failed: ${insErr.message}` };

      // Append the new source manifest entries to study_sessions.sources
      const manifest = (s.sources || []).concat(
        prepared.map((p) => ({ kind: p.kind, ref: p.ref, label: p.label || null })),
      );
      await sb
        .from("study_sessions")
        .update({ sources: manifest, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return { ok: true, data: { addedChunks: chunks.length, warnings, chunks } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Fetch a session + its chunks. Used by the wizard to resume. */
export async function getStudySession(sessionId: string): Promise<R<{ session: StudySession; chunks: ExtractedChunk[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const sb = supabaseAdmin();
    const [{ data: session }, { data: chunks }] = await Promise.all([
      sb.from("study_sessions").select("*").eq("id", sessionId).eq("user_id", me.id).maybeSingle(),
      sb.from("study_source_chunks").select("*").eq("session_id", sessionId).order("chunk_index"),
    ]);

    if (!session) return { ok: false, error: "Session not found" };

    const mapped: ExtractedChunk[] = ((chunks as unknown as Array<{
      kind: string; ref: string; label: string | null; text: string; page_or_timestamp: string | null; chunk_index: number;
    }>) || []).map((c) => ({
      kind: c.kind as ExtractedChunk["kind"],
      ref: c.ref,
      label: c.label || undefined,
      text: c.text,
      pageOrTimestamp: c.page_or_timestamp || undefined,
      chunkIndex: c.chunk_index,
    }));

    return { ok: true, data: { session: session as unknown as StudySession, chunks: mapped } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Save the knowledge map onto a session after buildKnowledgeMap succeeds. */
export async function saveSessionMap(sessionId: string, map: unknown): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("study_sessions")
      .update({ map, phase: "map", updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Update the session phase (source → map → session → celebrate). */
export async function updateSessionPhase(sessionId: string, phase: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb
      .from("study_sessions")
      .update({ phase, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", me.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** List recent sessions for the user — used by the new "Cohort / Recent" tab
 *  in SourcePhase so users can pick up where they left off. */
export async function listRecentStudySessions(limit = 10): Promise<R<StudySession[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("study_sessions")
      .select("*")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    return { ok: true, data: (data || []) as unknown as StudySession[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** One-shot: create session → ingest sources → build knowledge map → persist map.
 *  This is the happy-path server action the new SourcePhase calls when the user
 *  clicks "Build knowledge map". Returns everything the UI needs to enter the
 *  map phase. */
export async function ingestAndBuildMap(
  input: CreateSessionInput,
  sources: Array<Omit<SourceInput, "buffer"> & { bufferBase64?: string }>,
): Promise<R<{ sessionId: string; map: KnowledgeMap; warnings: string[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!sources.length) return { ok: false, error: "Add at least one source" };

    // 1) Create session
    const created = await createStudySession(input);
    if (!created.ok) return created;
    const sessionId = created.data!.sessionId;

    // 2) Ingest
    const ingested = await addSessionSources(sessionId, sources);
    if (!ingested.ok) return ingested;
    if (ingested.data!.chunks.length === 0) {
      return { ok: false, error: ingested.data!.warnings[0] || "No content could be extracted from your sources" };
    }

    // 3) Build map using the existing action (which handles usage logging + access check)
    const combined = chunksToPrompt(ingested.data!.chunks);
    const mapResult = await buildKnowledgeMap(combined, input.topic);
    if (!mapResult.ok) return mapResult;

    // 4) Persist map onto the session
    await saveSessionMap(sessionId, mapResult.data!);

    return {
      ok: true,
      data: { sessionId, map: mapResult.data!, warnings: ingested.data!.warnings },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── Phase 3 · mastery + offline ─────────── */

export interface MasteryRow {
  conceptId: string;
  conceptTitle: string | null;
  ease: number;
  intervalDays: number;
  repetitions: number;
  lastScore: number;
  dueAt: string | null;
  lastReviewedAt: string | null;
  sessionId: string | null;
  sessionTopic?: string | null;
}

/** Return the mastery rows for a specific session (one per concept). Used by
 *  the map to render mastery rings and by the Quiz mode for difficulty ramp. */
export async function getSessionMastery(sessionId: string): Promise<R<MasteryRow[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("study_mastery")
      .select("concept_id, concept_title, ease, interval_days, repetitions, last_score, due_at, last_reviewed_at, session_id")
      .eq("user_id", me.id)
      .eq("session_id", sessionId);

    const rows: MasteryRow[] = ((data as Array<{
      concept_id: string; concept_title: string | null; ease: number; interval_days: number;
      repetitions: number; last_score: number; due_at: string | null; last_reviewed_at: string | null;
      session_id: string | null;
    }>) || []).map((r) => ({
      conceptId: r.concept_id, conceptTitle: r.concept_title,
      ease: r.ease, intervalDays: r.interval_days, repetitions: r.repetitions,
      lastScore: r.last_score, dueAt: r.due_at, lastReviewedAt: r.last_reviewed_at,
      sessionId: r.session_id,
    }));
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** List concepts due for review across all the user's sessions. Default: due
 *  now (or overdue), ordered by oldest due_at first. */
export async function listDueReviews(limit = 20): Promise<R<MasteryRow[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const now = new Date().toISOString();
    // Join sessions so we can show the topic on each due card
    const { data } = await sb
      .from("study_mastery")
      .select(`
        concept_id, concept_title, ease, interval_days, repetitions,
        last_score, due_at, last_reviewed_at, session_id,
        study_sessions!inner ( topic )
      `)
      .eq("user_id", me.id)
      .lte("due_at", now)
      .order("due_at", { ascending: true })
      .limit(limit);

    const rows: MasteryRow[] = ((data as Array<{
      concept_id: string; concept_title: string | null; ease: number; interval_days: number;
      repetitions: number; last_score: number; due_at: string | null; last_reviewed_at: string | null;
      session_id: string; study_sessions?: { topic?: string };
    }>) || []).map((r) => ({
      conceptId: r.concept_id, conceptTitle: r.concept_title,
      ease: r.ease, intervalDays: r.interval_days, repetitions: r.repetitions,
      lastScore: r.last_score, dueAt: r.due_at, lastReviewedAt: r.last_reviewed_at,
      sessionId: r.session_id, sessionTopic: r.study_sessions?.topic || null,
    }));
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Snapshot a session into an offline-friendly JSON bundle. The client saves
 *  this blob to IndexedDB / localStorage so the user can review without a
 *  network connection (Lagos-traffic-jam mode).
 *
 *  Bundle includes: session meta, chunks (for citation), the map, and any
 *  previously-generated mode outputs (explain / story / flashcards / quiz) so
 *  passive review works fully offline. Chat-style modes are excluded because
 *  they need live LLM calls. */
export interface OfflinePack {
  version: 1;
  savedAt: string;
  session: StudySession;
  chunks: ExtractedChunk[];
  mastery: MasteryRow[];
  modeRuns: Array<{ concept_id: string; mode: string; output: unknown }>;
}

export async function getOfflinePack(sessionId: string): Promise<R<OfflinePack>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const [sessionRes, chunksRes, masteryRes, runsRes] = await Promise.all([
      sb.from("study_sessions").select("*").eq("id", sessionId).eq("user_id", me.id).maybeSingle(),
      sb.from("study_source_chunks").select("*").eq("session_id", sessionId).order("chunk_index"),
      sb.from("study_mastery").select("concept_id, concept_title, ease, interval_days, repetitions, last_score, due_at, last_reviewed_at, session_id").eq("user_id", me.id).eq("session_id", sessionId),
      sb.from("study_mode_runs").select("concept_id, mode, output").eq("user_id", me.id).eq("session_id", sessionId),
    ]);

    if (!sessionRes.data) return { ok: false, error: "Session not found" };

    const chunks: ExtractedChunk[] = ((chunksRes.data as Array<{
      kind: string; ref: string; label: string | null; text: string; page_or_timestamp: string | null; chunk_index: number;
    }>) || []).map((c) => ({
      kind: c.kind as ExtractedChunk["kind"], ref: c.ref, label: c.label || undefined,
      text: c.text, pageOrTimestamp: c.page_or_timestamp || undefined, chunkIndex: c.chunk_index,
    }));

    const mastery: MasteryRow[] = ((masteryRes.data as Array<{
      concept_id: string; concept_title: string | null; ease: number; interval_days: number;
      repetitions: number; last_score: number; due_at: string | null; last_reviewed_at: string | null; session_id: string | null;
    }>) || []).map((r) => ({
      conceptId: r.concept_id, conceptTitle: r.concept_title,
      ease: r.ease, intervalDays: r.interval_days, repetitions: r.repetitions,
      lastScore: r.last_score, dueAt: r.due_at, lastReviewedAt: r.last_reviewed_at,
      sessionId: r.session_id,
    }));

    return {
      ok: true,
      data: {
        version: 1,
        savedAt: new Date().toISOString(),
        session: sessionRes.data as unknown as StudySession,
        chunks,
        mastery,
        modeRuns: (runsRes.data as Array<{ concept_id: string; mode: string; output: unknown }>) || [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Pull the content of one of the caller's OWN past sessions as a single
 *  text source — so a user can reuse what they already studied last week as
 *  input to a fresh session. Mirrors `chunksFromCohortShare` but for self. */
export async function chunksFromOwnSession(sessionId: string): Promise<R<{
  title: string;
  sessionTopic: string;
  chunks: Array<{ kind: "text"; ref: string; label: string; body: string }>;
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const sb = supabaseAdmin();
    const [{ data: session }, { data: chunks }] = await Promise.all([
      sb.from("study_sessions").select("topic, user_id").eq("id", sessionId).maybeSingle(),
      sb.from("study_source_chunks").select("kind, ref, label, text").eq("session_id", sessionId).order("chunk_index"),
    ]);

    const s = session as { topic: string; user_id: string } | null;
    if (!s) return { ok: false, error: "Session not found" };
    if (s.user_id !== me.id) return { ok: false, error: "That's not one of your sessions" };

    const text = ((chunks as Array<{ kind: string; ref: string; label: string | null; text: string }> | null) || [])
      .map((c) => c.text)
      .join("\n\n");

    if (!text.trim()) return { ok: false, error: "That session has no extractable content" };

    return {
      ok: true,
      data: {
        title: s.topic,
        sessionTopic: s.topic,
        chunks: [{
          kind: "text",
          ref: `own:${sessionId}`,
          label: `🗂 Your past session: ${s.topic}`,
          body: text,
        }],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Access-check wrapper: the wizard calls this once before ingest to confirm
 *  the user has AI access enabled in the platform settings. */
export async function checkStudyBuddyAccess(): Promise<R<{ allowed: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: true, data: { allowed: false } };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    return { ok: true, data: { allowed: !!access.allowed } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

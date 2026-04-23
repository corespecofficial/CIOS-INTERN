"use server";

/* Study Buddy v2 — Phase 4 cohort sharing + audio transcription.
 *
 * Cohorts here = users.cohort_number (already populated during onboarding).
 * No separate cohorts table — an intern's cohort is whichever integer they
 * were assigned to in user signup. Sharing = inserting a row into
 * study_cohort_shares with that number so everyone else in the cohort sees it.
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { stt } from "@/lib/study-buddy/providers";
import { ingestSources } from "@/lib/study-buddy/ingest";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/* ─────────── Cohort shares ─────────── */

export interface CohortShare {
  id: string;
  sessionId: string;
  cohortNumber: number;
  sharedByUserId: string;
  sharedByName: string | null;
  title: string | null;
  note: string | null;
  createdAt: string;
  // denormalized — from the underlying study_sessions row
  sessionTopic: string;
  sessionLanguage: string;
  sourceCount: number;
}

/** Publish a session to the signed-in user's cohort shelf. No-op if already shared.
 *  Requires cohort_number on the user — returns a clear error otherwise. */
export async function shareSessionToCohort(
  sessionId: string,
  title?: string,
  note?: string,
): Promise<R<{ shareId: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (typeof me.cohort_number !== "number") {
      return { ok: false, error: "You're not assigned to a cohort yet. Contact your CIOS lead." };
    }

    const sb = supabaseAdmin();

    // Verify ownership of the session
    const { data: session } = await sb
      .from("study_sessions")
      .select("id, user_id, topic")
      .eq("id", sessionId)
      .maybeSingle();
    const s = session as { id: string; user_id: string; topic: string } | null;
    if (!s || s.user_id !== me.id) return { ok: false, error: "You can only share your own sessions" };

    const { data, error } = await sb
      .from("study_cohort_shares")
      .upsert(
        {
          session_id: sessionId,
          cohort_number: me.cohort_number,
          shared_by_user_id: me.id,
          title: title || s.topic,
          note: note || null,
        },
        { onConflict: "session_id,cohort_number" },
      )
      .select("id")
      .single();

    if (error || !data) return { ok: false, error: error?.message || "Could not share" };
    return { ok: true, data: { shareId: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Unshare — removes the row. */
export async function unshareSessionFromCohort(sessionId: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb
      .from("study_cohort_shares")
      .delete()
      .eq("session_id", sessionId)
      .eq("shared_by_user_id", me.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** List everything on this user's cohort shelf — excludes the user's own shares. */
export async function listCohortShelf(limit = 30): Promise<R<CohortShare[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (typeof me.cohort_number !== "number") return { ok: true, data: [] };

    const sb = supabaseAdmin();
    // We pull ids + join study_sessions for denormalized fields. The uploader's
    // display name is a second lookup so this keeps well clear of RLS edge
    // cases (cohort_shares policy enforces cohort visibility).
    const { data } = await sb
      .from("study_cohort_shares")
      .select(`
        id, session_id, cohort_number, shared_by_user_id, title, note, created_at,
        study_sessions!inner ( topic, language, sources )
      `)
      .eq("cohort_number", me.cohort_number)
      .neq("shared_by_user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = (data || []) as Array<{
      id: string; session_id: string; cohort_number: number; shared_by_user_id: string;
      title: string | null; note: string | null; created_at: string;
      study_sessions?: { topic: string; language: string; sources: unknown[] };
    }>;

    if (rows.length === 0) return { ok: true, data: [] };

    // Batch-fetch the sharers' display names
    const sharerIds = Array.from(new Set(rows.map((r) => r.shared_by_user_id)));
    const { data: users } = await sb
      .from("users")
      .select("id, name")
      .in("id", sharerIds);
    const nameById = new Map((users as Array<{ id: string; name: string | null }> | null || []).map((u) => [u.id, u.name]));

    const shares: CohortShare[] = rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      cohortNumber: r.cohort_number,
      sharedByUserId: r.shared_by_user_id,
      sharedByName: nameById.get(r.shared_by_user_id) ?? null,
      title: r.title,
      note: r.note,
      createdAt: r.created_at,
      sessionTopic: r.study_sessions?.topic || "Untitled",
      sessionLanguage: r.study_sessions?.language || "English",
      sourceCount: Array.isArray(r.study_sessions?.sources) ? r.study_sessions!.sources.length : 0,
    }));

    return { ok: true, data: shares };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Pull a cohort share's chunks as pending sources for the caller's new
 *  session. We DON'T fork the session row — we copy the extracted text
 *  chunks into new text sources so the caller's map reflects their own
 *  context + level + language. */
export async function chunksFromCohortShare(shareId: string): Promise<R<{
  title: string;
  note: string | null;
  sessionTopic: string;
  chunks: Array<{ kind: "text"; ref: string; label: string; body: string }>;
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const sb = supabaseAdmin();

    // Verify this share exists in my cohort (RLS will also enforce, but this
    // makes the error message cleaner).
    const { data: share } = await sb
      .from("study_cohort_shares")
      .select("id, session_id, cohort_number, title, note")
      .eq("id", shareId)
      .maybeSingle();
    const s = share as { id: string; session_id: string; cohort_number: number; title: string | null; note: string | null } | null;
    if (!s) return { ok: false, error: "Share not found" };
    if (s.cohort_number !== me.cohort_number) return { ok: false, error: "That share isn't in your cohort" };

    const [{ data: session }, { data: chunks }] = await Promise.all([
      sb.from("study_sessions").select("topic").eq("id", s.session_id).maybeSingle(),
      sb.from("study_source_chunks").select("kind, ref, label, text").eq("session_id", s.session_id).order("chunk_index"),
    ]);

    const topic = (session as { topic: string } | null)?.topic || "Shared session";

    const text = ((chunks as Array<{ kind: string; ref: string; label: string | null; text: string }> | null) || [])
      .map((c) => c.text)
      .join("\n\n");

    if (!text.trim()) return { ok: false, error: "That share has no extractable content" };

    return {
      ok: true,
      data: {
        title: s.title || topic,
        note: s.note,
        sessionTopic: topic,
        chunks: [{
          kind: "text",
          ref: `cohort:${shareId}`,
          label: `📚 Cohort: ${s.title || topic}`,
          body: text,
        }],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── Audio transcription ─────────── */

/** Server-side audio transcription via the current STT provider.
 *  - In dev (STT_PROVIDER=browser) returns a placeholder with a clear note
 *    so the UI can show "Transcription pending — configure Groq at launch".
 *  - At launch (STT_PROVIDER=groq) runs real Whisper transcription.
 *
 *  The audio blob arrives base64-encoded from the client. */
export async function transcribeAudio(
  base64: string,
  mime: string,
  language?: string,
): Promise<R<{ text: string; providerId: string; placeholder: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!base64) return { ok: false, error: "No audio data" };

    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mime || "audio/webm" });

    const result = await stt.transcribe({ blob, language });
    const text = (result.text || "").trim();
    const placeholder = stt.id === "browser" || /transcription requires launch-day/i.test(text);

    return { ok: true, data: { text, providerId: stt.id, placeholder } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── Cohort leaderboard (Phase 5) ─────────── */

export interface CohortLeaderRow {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  avgMastery: number;       // 0-100, average last_score across all reviewed concepts
  conceptsMastered: number; // count where last_score >= 80
  totalReviewed: number;
  isMe: boolean;
}

/** Return the top interns in this user's cohort by average mastery.
 *  Public users with no cohort_number get an empty array — nothing to rank. */
export async function listCohortLeaderboard(limit = 10): Promise<R<{
  cohortNumber: number | null;
  rows: CohortLeaderRow[];
}>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (typeof me.cohort_number !== "number") {
      return { ok: true, data: { cohortNumber: null, rows: [] } };
    }

    const sb = supabaseAdmin();

    // 1) All user_ids in this cohort
    const { data: cohortUsers } = await sb
      .from("users")
      .select("id, name, avatar_url")
      .eq("cohort_number", me.cohort_number);
    const users = (cohortUsers as Array<{ id: string; name: string | null; avatar_url: string | null }> | null) || [];
    if (users.length === 0) return { ok: true, data: { cohortNumber: me.cohort_number, rows: [] } };

    const userIds = users.map((u) => u.id);

    // 2) Mastery rows for everyone in the cohort (RLS bypass via service role)
    const { data: masteryRows } = await sb
      .from("study_mastery")
      .select("user_id, last_score")
      .in("user_id", userIds);

    // 3) Aggregate
    type Agg = { sum: number; count: number; mastered: number };
    const agg = new Map<string, Agg>();
    for (const r of ((masteryRows as Array<{ user_id: string; last_score: number }> | null) || [])) {
      const a = agg.get(r.user_id) || { sum: 0, count: 0, mastered: 0 };
      a.sum += r.last_score;
      a.count += 1;
      if (r.last_score >= 80) a.mastered += 1;
      agg.set(r.user_id, a);
    }

    const rows: CohortLeaderRow[] = users
      .map((u) => {
        const a = agg.get(u.id) || { sum: 0, count: 0, mastered: 0 };
        return {
          userId: u.id,
          name: u.name,
          avatarUrl: u.avatar_url,
          avgMastery: a.count > 0 ? Math.round(a.sum / a.count) : 0,
          conceptsMastered: a.mastered,
          totalReviewed: a.count,
          isMe: u.id === me.id,
        };
      })
      // Surface only users who have actually studied — zeros at the bottom are noise
      .filter((r) => r.totalReviewed > 0 || r.isMe)
      .sort((a, b) => {
        // Primary: higher avg mastery. Tie-breaker: more concepts reviewed.
        if (b.avgMastery !== a.avgMastery) return b.avgMastery - a.avgMastery;
        return b.totalReviewed - a.totalReviewed;
      })
      .slice(0, limit);

    return { ok: true, data: { cohortNumber: me.cohort_number, rows } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Convenience wrapper: pipes a transcribed audio file through the normal
 *  ingest pipeline so the caller can pretend the text came from any source.
 *  (Currently just used for server-side parity — clients typically inline the
 *  transcribe+ingest flow themselves.) */
export async function transcribeAndIngest(
  base64: string,
  mime: string,
  language?: string,
): Promise<R<{ text: string; ingestedChunks: number; placeholder: boolean }>> {
  const tr = await transcribeAudio(base64, mime, language);
  if (!tr.ok) return tr;
  const ingested = await ingestSources([{ kind: "text", ref: "recorded-audio", label: "Recorded lecture", body: tr.data!.text }]);
  return { ok: true, data: { text: tr.data!.text, ingestedChunks: ingested.chunks.length, placeholder: tr.data!.placeholder } };
}

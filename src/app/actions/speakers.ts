"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Speaker {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  expertise_tags: string[];
  sponsored: boolean;
  fee_ngn: number;
  status: "draft" | "published" | "archived";
}

export interface SpeakerSession {
  id: string;
  speaker_id: string;
  title: string;
  description: string | null;
  topic_tags: string[];
  scheduled_at: string;
  duration_min: number;
  mode: "live" | "recorded" | "hybrid";
  meeting_url: string | null;
  recording_url: string | null;
  capacity: number | null;
  rsvp_count: number;
  status: "scheduled" | "live" | "ended" | "cancelled";
  featured: boolean;
  speaker?: Speaker;
}

export async function listUpcomingSessions(): Promise<R<SpeakerSession[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("speaker_sessions")
      .select("*, speaker:speakers(*)")
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order("featured", { ascending: false })
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as SpeakerSession[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listPastSessions(limit = 20): Promise<R<SpeakerSession[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("speaker_sessions")
      .select("*, speaker:speakers(*)")
      .eq("status", "ended")
      .order("scheduled_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { ok: true, data: (data ?? []) as SpeakerSession[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listSpeakers(): Promise<R<Speaker[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("speakers")
      .select("*")
      .eq("status", "published")
      .order("sponsored", { ascending: false })
      .order("full_name", { ascending: true });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as Speaker[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function rsvpToSession(sessionId: string): Promise<R<{ already: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("speaker_rsvps").select("id").eq("session_id", sessionId).eq("user_id", me.id).maybeSingle();
    if (existing) return { ok: true, data: { already: true } };

    await sb.from("speaker_rsvps").insert({ session_id: sessionId, user_id: me.id });
    const { data: cur } = await sb.from("speaker_sessions").select("rsvp_count").eq("id", sessionId).maybeSingle();
    if (cur) {
      await sb.from("speaker_sessions").update({ rsvp_count: Number((cur as { rsvp_count: number }).rsvp_count ?? 0) + 1 }).eq("id", sessionId);
    }
    revalidatePath("/speakers");
    return { ok: true, data: { already: false } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getMyRsvps(): Promise<R<string[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: true, data: [] };
    const sb = supabaseAdmin();
    const { data } = await sb.from("speaker_rsvps").select("session_id").eq("user_id", me.id);
    return { ok: true, data: ((data ?? []) as Array<{ session_id: string }>).map((r) => r.session_id) };
  } catch {
    return { ok: true, data: [] };
  }
}

// ── Admin: create speaker + session ─────────────────────────────────────────
export async function adminCreateSpeaker(input: {
  full_name: string;
  title?: string;
  company?: string;
  bio?: string;
  photo_url?: string;
  linkedin_url?: string;
  expertise_tags?: string[];
  sponsored?: boolean;
}): Promise<R<Speaker>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("speakers")
      .insert({
        full_name: input.full_name,
        title: input.title ?? null,
        company: input.company ?? null,
        bio: input.bio ?? null,
        photo_url: input.photo_url ?? null,
        linkedin_url: input.linkedin_url ?? null,
        expertise_tags: input.expertise_tags ?? [],
        sponsored: input.sponsored ?? false,
        status: "published",
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/speakers");
    return { ok: true, data: data as Speaker };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function adminScheduleSession(input: {
  speaker_id: string;
  title: string;
  description?: string;
  topic_tags?: string[];
  scheduled_at: string;
  duration_min?: number;
  mode?: "live" | "recorded" | "hybrid";
  meeting_url?: string;
  capacity?: number;
  featured?: boolean;
}): Promise<R<SpeakerSession>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("speaker_sessions")
      .insert({
        speaker_id: input.speaker_id,
        title: input.title,
        description: input.description ?? null,
        topic_tags: input.topic_tags ?? [],
        scheduled_at: input.scheduled_at,
        duration_min: input.duration_min ?? 60,
        mode: input.mode ?? "live",
        meeting_url: input.meeting_url ?? null,
        capacity: input.capacity ?? null,
        featured: input.featured ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/speakers");
    return { ok: true, data: data as SpeakerSession };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

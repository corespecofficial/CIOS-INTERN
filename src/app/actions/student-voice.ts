"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { awardXP } from "@/lib/gamification";

type R<T = void> = { ok: true; data: T } | { ok: false; error: string };

function currentWeekOf(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + daysToMon);
  return mon.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINCIPLE OF THE WEEK
// ─────────────────────────────────────────────────────────────────────────────

export interface PrincipleSubmission {
  id: string;
  userId: string;
  userName: string;
  track: string | null;
  weekOf: string;
  principle: string;
  story: string | null;
  source: string | null;
  status: "pending" | "selected" | "archived" | "declined";
  createdAt: string;
}

export async function submitPrincipleOfWeek(input: {
  principle: string;
  story?: string;
  source?: string;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!input.principle?.trim()) return { ok: false, error: "Principle cannot be empty" };
    if (input.principle.trim().length > 500) return { ok: false, error: "Keep it under 500 characters" };

    const weekOf = currentWeekOf();
    const sb = supabaseAdmin();

    // Upsert — allow editing before review
    const { data, error } = await sb
      .from("principle_submissions")
      .upsert({
        user_id: me.id,
        week_of: weekOf,
        principle: input.principle.trim(),
        story: input.story?.trim() || null,
        source: input.source?.trim() || null,
        status: "pending",
        created_at: new Date().toISOString(),
      }, { onConflict: "user_id,week_of" })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getMyPrincipleSubmission(): Promise<PrincipleSubmission | null> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return null;

    const weekOf = currentWeekOf();
    const { data } = await supabaseAdmin()
      .from("principle_submissions")
      .select("*, user:users(name, track)")
      .eq("user_id", me.id)
      .eq("week_of", weekOf)
      .maybeSingle();

    if (!data) return null;
    const u = (data as { user?: { name?: string; track?: string | null } }).user;
    return {
      id: data.id as string,
      userId: me.id,
      userName: u?.name ?? me.name ?? "You",
      track: u?.track ?? null,
      weekOf: data.week_of as string,
      principle: data.principle as string,
      story: data.story as string | null,
      source: data.source as string | null,
      status: data.status as "pending" | "selected" | "archived" | "declined",
      createdAt: data.created_at as string,
    };
  } catch {
    return null;
  }
}

// Admin: get all submissions for the current week for review
export async function getPrincipleSubmissionsForReview(weekOf?: string): Promise<PrincipleSubmission[]> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return [];

    const week = weekOf ?? currentWeekOf();
    const { data } = await supabaseAdmin()
      .from("principle_submissions")
      .select("*, user:users(name, track)")
      .eq("week_of", week)
      .order("created_at", { ascending: false });

    return (data ?? []).map((d) => {
      const u = (d as { user?: { name?: string; track?: string | null } }).user;
      return {
        id: d.id as string,
        userId: d.user_id as string,
        userName: u?.name ?? "Unknown",
        track: u?.track ?? null,
        weekOf: d.week_of as string,
        principle: d.principle as string,
        story: d.story as string | null,
        source: d.source as string | null,
        status: d.status as "pending" | "selected" | "archived" | "declined",
        createdAt: d.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

// Admin: select a principle as Principle of the Week, archive it, notify intern
export async function selectPrincipleOfWeek(submissionId: string): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admins only" };
    }

    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    const { data: sub } = await sb
      .from("principle_submissions")
      .select("*, user:users(name, track)")
      .eq("id", submissionId)
      .single();

    if (!sub) return { ok: false, error: "Submission not found" };

    const weekOf = sub.week_of as string;
    const u = (sub as { user?: { name?: string; track?: string | null } }).user;

    // Decline all other submissions for this week
    await sb
      .from("principle_submissions")
      .update({ status: "declined", reviewed_by: me.id, reviewed_at: now })
      .eq("week_of", weekOf)
      .neq("id", submissionId);

    // Mark this one as selected
    await sb
      .from("principle_submissions")
      .update({ status: "selected", reviewed_by: me.id, reviewed_at: now, featured_at: now })
      .eq("id", submissionId);

    // Archive it publicly
    const { data: archived } = await sb
      .from("principle_archive")
      .upsert({
        submission_id: submissionId,
        week_of: weekOf,
        principle: sub.principle as string,
        story: sub.story as string | null,
        source: sub.source as string | null,
        author_name: u?.name ?? "Anonymous",
        author_track: u?.track ?? null,
        archived_at: now,
      }, { onConflict: "week_of" })
      .select("id")
      .single();

    // Award XP to the intern
    await awardXP(sub.user_id as string, "consistency_bonus", {
      refType: "principle_of_week",
      refId: submissionId,
    });

    revalidatePath("/community");
    return { ok: true, data: { id: (archived as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Public: get principle archive (recent weeks)
export interface PrincipleArchiveEntry {
  id: string;
  weekOf: string;
  principle: string;
  story: string | null;
  source: string | null;
  authorName: string;
  authorTrack: string | null;
}

export async function getPrincipleArchive(limit = 12): Promise<PrincipleArchiveEntry[]> {
  try {
    const { data } = await supabaseAdmin()
      .from("principle_archive")
      .select("id, week_of, principle, story, source, author_name, author_track")
      .order("week_of", { ascending: false })
      .limit(limit);

    return (data ?? []).map((d) => ({
      id: d.id as string,
      weekOf: d.week_of as string,
      principle: d.principle as string,
      story: d.story as string | null,
      source: d.source as string | null,
      authorName: d.author_name as string,
      authorTrack: d.author_track as string | null,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANONYMOUS FEEDBACK CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

export type FeedbackCategory = "curriculum" | "coaching" | "culture" | "logistics" | "general" | "idea";

export async function submitAnonymousFeedback(input: {
  feedback: string;
  category?: FeedbackCategory;
}): Promise<R<{ id: string }>> {
  try {
    // Still require login (to ensure intern, not bot) but don't store user_id
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "You must be logged in to submit feedback" };
    if (!input.feedback?.trim()) return { ok: false, error: "Feedback cannot be empty" };
    if (input.feedback.trim().length > 2000) return { ok: false, error: "Keep feedback under 2000 characters" };

    const weekOf = currentWeekOf();
    const { data, error } = await supabaseAdmin()
      .from("anonymous_feedback")
      .insert({
        week_of: weekOf,
        category: input.category ?? "general",
        feedback: input.feedback.trim(),
        is_actioned: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface FeedbackItem {
  id: string;
  weekOf: string;
  category: FeedbackCategory;
  feedback: string;
  isActioned: boolean;
  coachResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
}

// Admin: get all feedback for review (private — admin only)
export async function getAnonymousFeedbackForAdmin(weekOf?: string): Promise<FeedbackItem[]> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return [];

    let query = supabaseAdmin()
      .from("anonymous_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (weekOf) query = query.eq("week_of", weekOf);

    const { data } = await query;
    return (data ?? []).map((d) => ({
      id: d.id as string,
      weekOf: d.week_of as string,
      category: d.category as FeedbackCategory,
      feedback: d.feedback as string,
      isActioned: d.is_actioned as boolean,
      coachResponse: d.coach_response as string | null,
      respondedAt: d.responded_at as string | null,
      createdAt: d.created_at as string,
    }));
  } catch {
    return [];
  }
}

// Admin: post a public coach response to a feedback item
export async function respondToFeedback(
  feedbackId: string,
  response: string
): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admins only" };
    }

    const { error } = await supabaseAdmin()
      .from("anonymous_feedback")
      .update({
        coach_response: response.trim(),
        is_actioned: true,
        responded_at: new Date().toISOString(),
        responded_by: me.id,
      })
      .eq("id", feedbackId);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/feedback");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Public: get responded feedback (public summaries — coach responses only, no raw feedback shown publicly)
export async function getPublicFeedbackResponses(limit = 10): Promise<
  Array<{ id: string; category: FeedbackCategory; coachResponse: string; respondedAt: string; weekOf: string }>
> {
  try {
    const { data } = await supabaseAdmin()
      .from("anonymous_feedback")
      .select("id, category, coach_response, responded_at, week_of")
      .eq("is_actioned", true)
      .not("coach_response", "is", null)
      .order("responded_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((d) => ({
      id: d.id as string,
      category: d.category as FeedbackCategory,
      coachResponse: d.coach_response as string,
      respondedAt: d.responded_at as string,
      weekOf: d.week_of as string,
    }));
  } catch {
    return [];
  }
}

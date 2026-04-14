"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { awardXP } from "@/lib/gamification";
import { pushNotification } from "@/app/actions/notifications";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface PeerReviewRow {
  id: string;
  submission_id: string;
  status: "pending" | "submitted" | "skipped";
  assigned_at: string;
  submitted_at: string | null;
  submitter_name: string | null;
  submitter_avatar: string | null;
  submission_content: string;
  submission_file_url: string | null;
  lesson_title: string | null;
  assignment_prompt: string | null;
  my_scores: { clarity?: number; effort?: number; insight?: number } | null;
  my_feedback: string | null;
}

/** Returns review tasks assigned to the current user, newest first. */
export async function getMyPeerReviews(): Promise<R<PeerReviewRow[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.peerReview) return { ok: true, data: [] };

    const sb = supabaseAdmin();
    const { data } = await sb.from("assignment_peer_reviews")
      .select(`
        id, submission_id, status, assigned_at, submitted_at,
        score_clarity, score_effort, score_insight, feedback,
        submitter:submitter_id(name, avatar_url),
        submission:submission_id(content, file_url, module:module_id(title, assignment_prompt))
      `)
      .eq("reviewer_id", me.id)
      .order("assigned_at", { ascending: false })
      .limit(50);

    const rows = (data || []) as Array<{
      id: string; submission_id: string; status: PeerReviewRow["status"]; assigned_at: string; submitted_at: string | null;
      score_clarity: number | null; score_effort: number | null; score_insight: number | null; feedback: string | null;
      submitter?: { name: string | null; avatar_url: string | null } | Array<{ name: string | null; avatar_url: string | null }> | null;
      submission?: { content: string; file_url: string | null; module?: { title: string; assignment_prompt: string | null } | Array<{ title: string; assignment_prompt: string | null }> | null } | null;
    }>;

    const out: PeerReviewRow[] = rows.map((r) => {
      const s = Array.isArray(r.submitter) ? r.submitter[0] : r.submitter;
      const m = r.submission?.module;
      const mod = Array.isArray(m) ? m[0] : m;
      return {
        id: r.id, submission_id: r.submission_id, status: r.status,
        assigned_at: r.assigned_at, submitted_at: r.submitted_at,
        submitter_name: s?.name || null, submitter_avatar: s?.avatar_url || null,
        submission_content: r.submission?.content || "", submission_file_url: r.submission?.file_url || null,
        lesson_title: mod?.title || null, assignment_prompt: mod?.assignment_prompt || null,
        my_scores: r.score_clarity != null ? { clarity: r.score_clarity, effort: r.score_effort || undefined, insight: r.score_insight || undefined } : null,
        my_feedback: r.feedback,
      };
    });
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export interface SubmitReviewInput {
  reviewId: string;
  clarity: number; effort: number; insight: number;
  feedback: string;
}

export async function submitPeerReview(input: SubmitReviewInput): Promise<R<{ xp: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.peerReview) return { ok: false, error: "Peer review disabled" };

    if ([input.clarity, input.effort, input.insight].some((n) => n < 1 || n > 5)) {
      return { ok: false, error: "Scores must be 1–5" };
    }
    if (!input.feedback.trim() || input.feedback.trim().length < 20) {
      return { ok: false, error: "Feedback must be at least 20 characters" };
    }

    const sb = supabaseAdmin();
    const { data: row } = await sb.from("assignment_peer_reviews")
      .select("id, status, submitter_id, submission_id")
      .eq("id", input.reviewId).eq("reviewer_id", me.id).maybeSingle();
    if (!row) return { ok: false, error: "Review not found" };
    const r = row as { id: string; status: string; submitter_id: string; submission_id: string };
    if (r.status === "submitted") return { ok: false, error: "Already submitted" };

    const { error } = await sb.from("assignment_peer_reviews").update({
      status: "submitted",
      score_clarity: input.clarity, score_effort: input.effort, score_insight: input.insight,
      feedback: input.feedback.trim(), submitted_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return { ok: false, error: error.message };

    const xp = features.reviewXpReward || 40;
    const { data: u } = await sb.from("users").select("xp").eq("id", me.id).maybeSingle();
    await sb.from("users").update({ xp: ((u?.xp as number) || 0) + xp }).eq("id", me.id);
    awardXP(me.id, "helpful_comment", { refType: "peer_review", refId: r.id, force: true }).catch(() => {});

    pushNotification({
      userId: r.submitter_id,
      kind: "info",
      title: "📝 You got peer feedback",
      body: `A peer just reviewed your submission for "${input.feedback.slice(0, 80)}…"`,
      url: "/classroom/submissions",
    }).catch(() => {});

    revalidatePath("/peer-review");
    return { ok: true, data: { xp } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Returns reviews received by the current user on their own submissions. */
export async function getReviewsOnMe(): Promise<R<Array<{
  id: string; status: string; submitted_at: string | null;
  scores: { clarity: number | null; effort: number | null; insight: number | null };
  feedback: string | null;
  reviewer_name: string | null; reviewer_avatar: string | null;
  lesson_title: string | null;
}>>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("assignment_peer_reviews")
      .select(`
        id, status, submitted_at, score_clarity, score_effort, score_insight, feedback,
        reviewer:reviewer_id(name, avatar_url),
        submission:submission_id(module:module_id(title))
      `)
      .eq("submitter_id", me.id).eq("status", "submitted")
      .order("submitted_at", { ascending: false }).limit(30);

    const rows = (data || []) as Array<{
      id: string; status: string; submitted_at: string | null;
      score_clarity: number | null; score_effort: number | null; score_insight: number | null; feedback: string | null;
      reviewer?: { name: string | null; avatar_url: string | null } | Array<{ name: string | null; avatar_url: string | null }> | null;
      submission?: { module?: { title: string } | Array<{ title: string }> | null } | null;
    }>;
    const out = rows.map((r) => {
      const rv = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer;
      const m = r.submission?.module;
      const mod = Array.isArray(m) ? m[0] : m;
      return {
        id: r.id, status: r.status, submitted_at: r.submitted_at,
        scores: { clarity: r.score_clarity, effort: r.score_effort, insight: r.score_insight },
        feedback: r.feedback,
        reviewer_name: rv?.name || null, reviewer_avatar: rv?.avatar_url || null,
        lesson_title: mod?.title || null,
      };
    });
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

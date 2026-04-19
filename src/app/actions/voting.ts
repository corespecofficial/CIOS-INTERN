"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface VotingRound {
  id: string;
  week_start: string;
  week_end: string;
  theme: string | null;
  status: "open" | "voting" | "closed";
  winner_id: string | null;
  winning_submission_id: string | null;
}

export interface VotingSubmission {
  id: string;
  round_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  title: string;
  description: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  artifact_url: string | null;
  vote_count: number;
  created_at: string;
  voted_by_me: boolean;
}

function weekStart(d: Date = new Date()): Date {
  const out = new Date(d);
  const dow = out.getDay();
  out.setDate(out.getDate() - ((dow + 6) % 7));
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function getCurrentRound(): Promise<R<{ round: VotingRound; submissions: VotingSubmission[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const ws = weekStart();
    const weekStartStr = ws.toISOString().slice(0, 10);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);

    let round: VotingRound | null = null;
    const { data: existing } = await sb.from("voting_rounds").select("*").eq("week_start", weekStartStr).maybeSingle();
    if (existing) {
      round = existing as VotingRound;
    } else {
      const { data: created } = await sb
        .from("voting_rounds")
        .insert({
          week_start: weekStartStr,
          week_end: we.toISOString().slice(0, 10),
          status: "open",
        })
        .select("*")
        .single();
      round = created as VotingRound;
    }

    if (!round) return { ok: false, error: "No round" };

    const { data: subs } = await sb
      .from("voting_submissions")
      .select("*, user:users!voting_submissions_user_id_fkey(name, avatar_url)")
      .eq("round_id", round.id)
      .order("vote_count", { ascending: false });

    const subIds = ((subs ?? []) as Array<{ id: string }>).map((s) => s.id);
    const myVotes = new Set<string>();
    if (subIds.length > 0) {
      const { data: mine } = await sb.from("votes").select("submission_id").eq("voter_id", me.id).in("submission_id", subIds);
      for (const v of (mine ?? []) as Array<{ submission_id: string }>) myVotes.add(v.submission_id);
    }

    type Row = Omit<VotingSubmission, "user_name" | "user_avatar" | "voted_by_me"> & { user: { name: string | null; avatar_url: string | null } | null };
    const submissions: VotingSubmission[] = ((subs ?? []) as Row[]).map((s) => ({
      ...s,
      user_name: s.user?.name ?? "Anonymous",
      user_avatar: s.user?.avatar_url ?? null,
      voted_by_me: myVotes.has(s.id),
    }));

    return { ok: true, data: { round, submissions } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function submitToRound(input: {
  round_id: string;
  title: string;
  description?: string;
  media_url?: string;
  thumbnail_url?: string;
  category?: string;
  artifact_url?: string;
}): Promise<R<VotingSubmission>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const sb = supabaseAdmin();

    const { data: existing } = await sb.from("voting_submissions").select("id").eq("round_id", input.round_id).eq("user_id", me.id).maybeSingle();
    if (existing) return { ok: false, error: "You already submitted this week" };

    const { data, error } = await sb
      .from("voting_submissions")
      .insert({
        round_id: input.round_id,
        user_id: me.id,
        title: input.title,
        description: input.description ?? null,
        media_url: input.media_url ?? null,
        thumbnail_url: input.thumbnail_url ?? input.media_url ?? null,
        category: input.category ?? null,
        artifact_url: input.artifact_url ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/voting");
    return {
      ok: true,
      data: {
        ...(data as Omit<VotingSubmission, "user_name" | "user_avatar" | "voted_by_me">),
        user_name: me.name || "You",
        user_avatar: me.avatar_url,
        voted_by_me: false,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function castVote(submissionId: string): Promise<R<{ voted: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: existing } = await sb.from("votes").select("id").eq("submission_id", submissionId).eq("voter_id", me.id).maybeSingle();
    if (existing) {
      await sb.from("votes").delete().eq("id", (existing as { id: string }).id);
      const { data: cur } = await sb.from("voting_submissions").select("vote_count").eq("id", submissionId).maybeSingle();
      if (cur) await sb.from("voting_submissions").update({ vote_count: Math.max(0, Number((cur as { vote_count: number }).vote_count ?? 0) - 1) }).eq("id", submissionId);
      return { ok: true, data: { voted: false } };
    }
    await sb.from("votes").insert({ submission_id: submissionId, voter_id: me.id });
    const { data: cur } = await sb.from("voting_submissions").select("vote_count").eq("id", submissionId).maybeSingle();
    if (cur) await sb.from("voting_submissions").update({ vote_count: Number((cur as { vote_count: number }).vote_count ?? 0) + 1 }).eq("id", submissionId);
    revalidatePath("/voting");
    return { ok: true, data: { voted: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

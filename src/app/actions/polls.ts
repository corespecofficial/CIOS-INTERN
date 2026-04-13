"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export interface PollOption { id: string; text: string; }
export interface PollRecord {
  id: string;
  chat_room_id: string;
  message_id: string | null;
  created_by: string;
  creator_name: string | null;
  question: string;
  options: PollOption[];
  multi_select: boolean;
  is_anonymous: boolean;
  closed_at: string | null;
  created_at: string;
  totals: Record<string, number>;
  myVotes: string[];
  totalVoters: number;
}

/** Create a poll + its message in one atomic flow. */
export async function createPoll(input: {
  roomId: string;
  question: string;
  options: string[];
  multiSelect: boolean;
  anonymous: boolean;
}): Promise<Result<{ pollId: string; messageId: string }>> {
  try {
    const me = await requireMe();
    const q = input.question.trim();
    if (!q) return { ok: false, error: "Question required" };
    const cleanOpts = input.options.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) return { ok: false, error: "At least 2 options required" };
    if (cleanOpts.length > 10) return { ok: false, error: "Max 10 options" };

    const sb = supabaseAdmin();

    // Ensure member
    const { data: mem } = await sb.from("chat_room_members")
      .select("id").eq("chat_room_id", input.roomId).eq("user_id", me.id).maybeSingle();
    if (!mem) return { ok: false, error: "Not a member of this room" };

    const options: PollOption[] = cleanOpts.map((text, i) => ({ id: `o${i + 1}`, text }));

    // Insert poll
    const { data: poll, error: pErr } = await sb.from("polls").insert({
      chat_room_id: input.roomId,
      created_by: me.id,
      question: q,
      options,
      multi_select: input.multiSelect,
      is_anonymous: input.anonymous,
    }).select("id, created_at").single();
    if (pErr || !poll) return { ok: false, error: pErr?.message || "Poll insert failed" };

    // Insert message that references the poll via attachment_url
    const { data: msg, error: mErr } = await sb.from("messages").insert({
      chat_room_id: input.roomId,
      sender_id: me.id,
      content: q,
      message_type: "file",
      attachment_url: `poll://${poll.id}`,
    }).select("id, created_at").single();
    if (mErr || !msg) return { ok: false, error: mErr?.message || "Message insert failed" };

    // Link back
    await sb.from("polls").update({ message_id: msg.id }).eq("id", poll.id);
    await sb.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", input.roomId);

    revalidatePath("/messages");
    return { ok: true, data: { pollId: poll.id, messageId: msg.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function votePoll(pollId: string, optionIds: string[]): Promise<Result<{ myVotes: string[]; totals: Record<string, number> }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();

    const { data: poll, error: pErr } = await sb.from("polls")
      .select("id, options, multi_select, closed_at, chat_room_id").eq("id", pollId).single();
    if (pErr || !poll) return { ok: false, error: "Poll not found" };
    if (poll.closed_at) return { ok: false, error: "Poll is closed" };

    const validIds = new Set((poll.options as PollOption[]).map((o) => o.id));
    const filtered = optionIds.filter((id) => validIds.has(id));
    if (!poll.multi_select && filtered.length > 1) {
      return { ok: false, error: "This poll is single-select" };
    }

    // Clear my existing votes, re-insert new set (allows toggle/change)
    await sb.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", me.id);
    if (filtered.length > 0) {
      const rows = filtered.map((oid) => ({ poll_id: pollId, user_id: me.id, option_id: oid }));
      const { error: vErr } = await sb.from("poll_votes").insert(rows);
      if (vErr) return { ok: false, error: vErr.message };
    }

    // Recompute totals
    const { data: votes } = await sb.from("poll_votes").select("option_id").eq("poll_id", pollId);
    const totals: Record<string, number> = {};
    for (const o of poll.options as PollOption[]) totals[o.id] = 0;
    for (const v of (votes || []) as { option_id: string }[]) {
      totals[v.option_id] = (totals[v.option_id] || 0) + 1;
    }
    return { ok: true, data: { myVotes: filtered, totals } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function closePoll(pollId: string): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: poll } = await sb.from("polls").select("created_by").eq("id", pollId).single();
    if (!poll) return { ok: false, error: "Poll not found" };
    if (poll.created_by !== me.id) return { ok: false, error: "Only the creator can close" };
    const { error } = await sb.from("polls").update({ closed_at: new Date().toISOString() }).eq("id", pollId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getPoll(pollId: string): Promise<Result<PollRecord>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("polls")
      .select("id, chat_room_id, message_id, created_by, question, options, multi_select, is_anonymous, closed_at, created_at, creator:users!polls_created_by_fkey(name)")
      .eq("id", pollId).single();
    if (error || !data) return { ok: false, error: "Poll not found" };

    const { data: votes } = await sb.from("poll_votes").select("user_id, option_id").eq("poll_id", pollId);
    const totals: Record<string, number> = {};
    for (const o of data.options as PollOption[]) totals[o.id] = 0;
    const myVotes: string[] = [];
    const voterSet = new Set<string>();
    for (const v of (votes || []) as { user_id: string; option_id: string }[]) {
      totals[v.option_id] = (totals[v.option_id] || 0) + 1;
      voterSet.add(v.user_id);
      if (v.user_id === me.id) myVotes.push(v.option_id);
    }
    const creator = Array.isArray(data.creator) ? data.creator[0] : data.creator;
    return {
      ok: true,
      data: {
        id: data.id,
        chat_room_id: data.chat_room_id,
        message_id: data.message_id,
        created_by: data.created_by,
        creator_name: creator?.name || null,
        question: data.question,
        options: data.options as PollOption[],
        multi_select: data.multi_select,
        is_anonymous: data.is_anonymous,
        closed_at: data.closed_at,
        created_at: data.created_at,
        totals,
        myVotes,
        totalVoters: voterSet.size,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

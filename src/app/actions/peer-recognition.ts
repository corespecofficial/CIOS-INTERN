"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";
import { checkLimit } from "@/lib/rate-limit";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

/* ── Kudos (one-tap appreciation) ── */

export async function toggleKudos(receiverId: string): Promise<R<{ given: boolean; total: number }>> {
  try {
    const me = await requireMe();
    if (me.id === receiverId) return { ok: false, error: "Can't kudos yourself" };
    const limit = checkLimit(me.id, "kudos");
    if (!limit.ok) return { ok: false, error: limit.error };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("peer_kudos")
      .select("id").eq("giver_id", me.id).eq("receiver_id", receiverId).maybeSingle();
    if (existing) {
      await sb.from("peer_kudos").delete().eq("id", existing.id);
    } else {
      await sb.from("peer_kudos").insert({ giver_id: me.id, receiver_id: receiverId });
      pushNotification({
        userId: receiverId,
        title: `${me.name} gave you kudos 👏`,
        message: "One more reason to keep showing up.",
        type: "achievement",
        actionUrl: `/community/profile/${receiverId}`,
      }).catch(() => {});
    }
    const { count } = await sb.from("peer_kudos").select("*", { count: "exact", head: true }).eq("receiver_id", receiverId);
    revalidatePath(`/community/profile/${receiverId}`);
    return { ok: true, data: { given: !existing, total: count || 0 } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getKudosState(receiverId: string): Promise<R<{ given: boolean; total: number }>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { count } = await sb.from("peer_kudos").select("*", { count: "exact", head: true }).eq("receiver_id", receiverId);
    let given = false;
    if (me) {
      const { data } = await sb.from("peer_kudos").select("id").eq("giver_id", me.id).eq("receiver_id", receiverId).maybeSingle();
      given = !!data;
    }
    return { ok: true, data: { given, total: count || 0 } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Testimonials ── */

export interface Testimonial {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_role: string | null;
  body: string;
  created_at: string;
}

export async function writeTestimonial(subjectId: string, body: string): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (me.id === subjectId) return { ok: false, error: "Can't testify about yourself" };
    if (body.trim().length < 20) return { ok: false, error: "Too short — write a real recommendation (≥20 chars)" };
    if (body.length > 800) return { ok: false, error: "Too long — keep it under 800 characters" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("peer_testimonials")
      .upsert({ author_id: me.id, subject_id: subjectId, body: body.trim() }, { onConflict: "author_id,subject_id" })
      .select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    pushNotification({
      userId: subjectId,
      title: `${me.name} wrote you a testimonial ✍️`,
      message: body.trim().slice(0, 120),
      type: "achievement",
      actionUrl: `/community/profile/${subjectId}`,
    }).catch(() => {});
    revalidatePath(`/community/profile/${subjectId}`);
    return { ok: true, data: { id: data.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listTestimonials(subjectId: string): Promise<R<Testimonial[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("peer_testimonials")
      .select("id, author_id, body, created_at, author:users!peer_testimonials_author_id_fkey(name, avatar_url, role)")
      .eq("subject_id", subjectId).eq("status", "approved")
      .order("created_at", { ascending: false }).limit(30);
    type Row = { id: string; author_id: string; body: string; created_at: string; author?: { name?: string; avatar_url?: string | null; role?: string } | { name?: string; avatar_url?: string | null; role?: string }[] | null };
    const out: Testimonial[] = ((data || []) as Row[]).map((r) => {
      const a = Array.isArray(r.author) ? r.author[0] : r.author;
      return { id: r.id, author_id: r.author_id, body: r.body, created_at: r.created_at,
        author_name: a?.name || null, author_avatar: a?.avatar_url || null, author_role: a?.role || null };
    });
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

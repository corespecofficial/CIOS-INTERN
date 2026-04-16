"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/* ── Types ── */

export interface AlumniMember {
  id: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  graduated_at: string;
  cohort_number: number | null;
  xp: number;
  performance: number;
}

export interface AlumniStory {
  id: string;
  user_id: string;
  title: string;
  body: string;
  company: string | null;
  role: string | null;
  cover_image: string | null;
  status: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
}

/* ── Directory ── */

export async function listAlumni(limit = 60): Promise<R<AlumniMember[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("users")
      .select("id, name, avatar_url, role, graduated_at, cohort_number, xp, performance")
      .not("graduated_at", "is", null)
      .order("graduated_at", { ascending: false })
      .limit(limit);
    return { ok: true, data: (data || []) as AlumniMember[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function countAlumni(): Promise<number> {
  try {
    const sb = supabaseAdmin();
    const { count } = await sb.from("users").select("id", { count: "exact", head: true }).not("graduated_at", "is", null);
    return count || 0;
  } catch { return 0; }
}

/* ── Stories ── */

export async function listAlumniStories(limit = 20): Promise<R<AlumniStory[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("alumni_stories")
      .select("id, user_id, title, body, company, role, cover_image, status, created_at, author:users!alumni_stories_user_id_fkey(name,avatar_url)")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(limit);
    type Row = { id: string; user_id: string; title: string; body: string; company: string | null; role: string | null; cover_image: string | null; status: string; created_at: string; author?: { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null };
    const out: AlumniStory[] = ((data || []) as Row[]).map((r) => {
      const a = Array.isArray(r.author) ? r.author[0] : r.author;
      return { id: r.id, user_id: r.user_id, title: r.title, body: r.body, company: r.company, role: r.role, cover_image: r.cover_image, status: r.status, created_at: r.created_at, author_name: a?.name || null, author_avatar: a?.avatar_url || null };
    });
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function submitAlumniStory(input: { title: string; body: string; company?: string; role?: string; coverImage?: string }): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!me.graduated_at) return { ok: false, error: "Only alumni can submit stories" };
    if (input.title.trim().length < 5) return { ok: false, error: "Title too short" };
    if (input.body.trim().length < 100) return { ok: false, error: "Story must be at least 100 characters" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("alumni_stories").insert({
      user_id: me.id,
      title: input.title.trim(),
      body: input.body.trim(),
      company: input.company || null,
      role: input.role || null,
      cover_image: input.coverImage || null,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    revalidatePath("/alumni");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Admin: graduate an intern ── */

export async function graduateIntern(internId: string, cohortNumber?: number): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const update: Record<string, unknown> = {
      graduated_at: new Date().toISOString(),
      role: "alumni",
    };
    if (cohortNumber) update.cohort_number = cohortNumber;
    await sb.from("users").update(update).eq("id", internId);
    pushNotification({
      userId: internId,
      title: "Congratulations, Graduate! 🎓",
      message: "You have officially graduated from the CIOS internship program. Welcome to the alumni community!",
      type: "achievement",
      actionUrl: "/alumni",
    }).catch(() => {});
    revalidatePath("/admin/alumni");
    revalidatePath("/alumni");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Admin: approve/reject story ── */

export async function reviewAlumniStory(storyId: string, approve: boolean): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const update = approve
      ? { status: "approved", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: "rejected", updated_at: new Date().toISOString() };
    const { data: story } = await sb.from("alumni_stories").select("user_id, title").eq("id", storyId).maybeSingle();
    await sb.from("alumni_stories").update(update).eq("id", storyId);
    if (approve && story) {
      const s = story as { user_id: string; title: string };
      pushNotification({ userId: s.user_id, title: "Your story was published! 🎉", message: `"${s.title}" is now live in the alumni success stories.`, type: "achievement", actionUrl: "/alumni" }).catch(() => {});
    }
    revalidatePath("/admin/alumni");
    revalidatePath("/alumni");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { CreativeSpace } from "./creative-spaces-types";

export type { CreativeSpace } from "./creative-spaces-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };
type OwnerJoin = { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null;
type SpaceRow = Record<string, unknown> & { owner?: OwnerJoin };

function mapSpace(r: SpaceRow): CreativeSpace {
  const o = Array.isArray(r.owner) ? r.owner[0] : r.owner;
  return { ...r, owner_name: o?.name || null, owner_avatar: o?.avatar_url || null } as CreativeSpace;
}

export async function listApprovedSpaces(opts?: { category?: string; limit?: number }): Promise<R<CreativeSpace[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb.from("creative_spaces")
      .select("*, owner:users!creative_spaces_owner_id_fkey(name,avatar_url)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 50);
    if (opts?.category) q = q.eq("category", opts.category);
    const { data } = await q;
    return { ok: true, data: ((data || []) as SpaceRow[]).map(mapSpace) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getSpace(id: string): Promise<R<CreativeSpace>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_spaces")
      .select("*, owner:users!creative_spaces_owner_id_fkey(name,avatar_url)")
      .eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Space not found" };
    return { ok: true, data: mapSpace(data as SpaceRow) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function applyForSpace(input: {
  title: string; description: string; category: string; format: string;
  price_per_student: number; capacity: number; tags?: string[]; schedule?: string; duration_weeks?: number;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.title.trim().length < 5) return { ok: false, error: "Title too short (min 5 chars)" };
    if (input.description.trim().length < 30) return { ok: false, error: "Description too short (min 30 chars)" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("creative_spaces").insert({
      owner_id: me.id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      format: input.format,
      price_per_student: input.price_per_student,
      capacity: input.capacity,
      tags: input.tags || [],
      schedule: input.schedule || null,
      duration_weeks: input.duration_weeks || 4,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to submit" };
    revalidatePath("/creative-space");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function enrollInSpace(spaceId: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: space } = await sb.from("creative_spaces").select("status,capacity,enrollment_count,owner_id").eq("id", spaceId).maybeSingle();
    if (!space) return { ok: false, error: "Space not found" };
    const s = space as { status: string; capacity: number; enrollment_count: number; owner_id: string };
    if (s.status !== "approved") return { ok: false, error: "Space not open for enrollment" };
    if (s.owner_id === me.id) return { ok: false, error: "Cannot enroll in your own space" };
    if (s.enrollment_count >= s.capacity) return { ok: false, error: "Space is full" };
    const { error } = await sb.from("creative_enrollments").insert({ space_id: spaceId, student_id: me.id });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Already enrolled" };
      return { ok: false, error: error.message };
    }
    await sb.from("creative_spaces").update({ enrollment_count: s.enrollment_count + 1, updated_at: new Date().toISOString() }).eq("id", spaceId);
    revalidatePath("/creative-space");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMySpaces(): Promise<R<CreativeSpace[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_spaces")
      .select("*, owner:users!creative_spaces_owner_id_fkey(name,avatar_url)")
      .eq("owner_id", me.id).order("created_at", { ascending: false });
    return { ok: true, data: ((data || []) as SpaceRow[]).map(mapSpace) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyEnrollments(): Promise<R<CreativeSpace[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_enrollments")
      .select("space:creative_spaces!creative_enrollments_space_id_fkey(*, owner:users!creative_spaces_owner_id_fkey(name,avatar_url))")
      .eq("student_id", me.id);
    type ERow = { space?: SpaceRow | SpaceRow[] | null };
    const rows: CreativeSpace[] = ((data || []) as ERow[]).flatMap((r) => {
      const sp = Array.isArray(r.space) ? r.space[0] : r.space;
      return sp ? [mapSpace(sp)] : [];
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function adminListSpaces(status?: string): Promise<R<CreativeSpace[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    let q = sb.from("creative_spaces")
      .select("*, owner:users!creative_spaces_owner_id_fkey(name,avatar_url)")
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data } = await q;
    return { ok: true, data: ((data || []) as SpaceRow[]).map(mapSpace) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function reviewSpace(spaceId: string, decision: "approved" | "rejected"): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    await sb.from("creative_spaces").update({ status: decision, updated_at: new Date().toISOString() }).eq("id", spaceId);
    revalidatePath("/admin/creative-spaces");
    revalidatePath("/creative-space");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

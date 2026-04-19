"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface UserCareerPath {
  user_id: string;
  track_slug: string;
  target_role: string | null;
  target_by: string | null;
  completed_milestones: string[];
  updated_at: string;
}

export async function getMyCareerPath(): Promise<R<UserCareerPath | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("user_career_paths").select("*").eq("user_id", me.id).maybeSingle();
    return { ok: true, data: (data ?? null) as UserCareerPath | null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function setMyTrack(trackSlug: string, targetRole?: string, targetBy?: string): Promise<R<UserCareerPath>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("user_career_paths")
      .upsert(
        {
          user_id: me.id,
          track_slug: trackSlug,
          target_role: targetRole ?? null,
          target_by: targetBy ?? null,
          completed_milestones: [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/career-path");
    return { ok: true, data: data as UserCareerPath };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function toggleMilestone(milestoneId: string): Promise<R<string[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data: cur } = await sb
      .from("user_career_paths")
      .select("completed_milestones")
      .eq("user_id", me.id)
      .maybeSingle();
    if (!cur) return { ok: false, error: "Pick a track first" };
    const list = ((cur as { completed_milestones: string[] }).completed_milestones ?? []).slice();
    const i = list.indexOf(milestoneId);
    if (i === -1) list.push(milestoneId);
    else list.splice(i, 1);

    await sb
      .from("user_career_paths")
      .update({ completed_milestones: list, updated_at: new Date().toISOString() })
      .eq("user_id", me.id);
    revalidatePath("/career-path");
    return { ok: true, data: list };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

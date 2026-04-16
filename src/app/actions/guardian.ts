"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { GuardianInvite, InternSummary } from "./guardian-types";

export type { GuardianInvite, InternSummary } from "./guardian-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function getOrCreateGuardianInvite(): Promise<R<GuardianInvite>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("guardian_invites").select("*").eq("intern_id", me.id).eq("is_active", true).maybeSingle();
    if (existing) return { ok: true, data: existing as GuardianInvite };
    const { data, error } = await sb.from("guardian_invites").insert({ intern_id: me.id }).select("*").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to create invite" };
    return { ok: true, data: data as GuardianInvite };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function revokeGuardianInvite(): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb.from("guardian_invites").update({ is_active: false }).eq("intern_id", me.id);
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getInternSummaryByToken(token: string): Promise<R<{ intern: InternSummary; invite: GuardianInvite }>> {
  try {
    const sb = supabaseAdmin();
    const { data: invite } = await sb.from("guardian_invites").select("*").eq("token", token).eq("is_active", true).maybeSingle();
    if (!invite) return { ok: false, error: "This link is invalid or has been revoked." };
    const inv = invite as GuardianInvite;

    // Update last viewed
    await sb.from("guardian_invites").update({ last_viewed_at: new Date().toISOString() }).eq("id", inv.id);

    // Get intern data
    const { data: user, error: userError } = await sb.from("users")
      .select("id, name, avatar_url, xp, level, performance, streak, last_seen, role")
      .eq("id", inv.intern_id).maybeSingle();
    if (!user) return { ok: false, error: userError?.message || "Intern not found" };
    const u = user as Record<string, unknown>;

    // Get task stats
    const { count: tasksTotal } = await sb.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", inv.intern_id);
    const { count: tasksDone } = await sb.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", inv.intern_id).eq("status", "done");

    const intern: InternSummary = {
      id: u.id as string,
      name: u.name as string | null,
      avatar_url: u.avatar_url as string | null,
      xp: (u.xp as number) || 0,
      level: (u.level as number) || 1,
      performance: (u.performance as number) || 0,
      streak: (u.streak as number) || 0,
      tasks_completed: tasksDone || 0,
      tasks_total: tasksTotal || 0,
      last_seen: u.last_seen as string | null,
      role: u.role as string,
    };

    return { ok: true, data: { intern, invite: inv } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface AlertFilters {
  track?: string;          // e.g. "design", "development", "marketing"
  min_score?: number;      // 0-100 performance score
  min_level?: number;      // 1-50
  skills?: string[];       // skill tags to match
  remote_only?: boolean;
}

export interface TalentAlert {
  id: string;
  label: string;
  filters: AlertFilters;
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
}

async function requireRecruiter() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  if (!["recruiter", "admin", "super_admin"].includes(me.role)) throw new Error("Recruiter access required");
  return me;
}

export async function listTalentAlerts(): Promise<R<TalentAlert[]>> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    const { data } = await sb.from("talent_alerts")
      .select("id, label, filters, is_active, last_notified_at, created_at")
      .eq("recruiter_id", me.id)
      .order("created_at", { ascending: false });
    return { ok: true, data: (data || []) as TalentAlert[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function createTalentAlert(label: string, filters: AlertFilters): Promise<R<{ id: string }>> {
  try {
    const me = await requireRecruiter();
    if (!label.trim()) return { ok: false, error: "Label is required" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("talent_alerts")
      .insert({ recruiter_id: me.id, label: label.trim(), filters })
      .select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to create alert" };
    revalidatePath("/recruiter/talent-pool");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateTalentAlert(id: string, patch: Partial<Pick<TalentAlert, "label" | "filters" | "is_active">>): Promise<R> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    const { error } = await sb.from("talent_alerts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id).eq("recruiter_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/recruiter/talent-pool");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteTalentAlert(id: string): Promise<R> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    await sb.from("talent_alerts").delete().eq("id", id).eq("recruiter_id", me.id);
    revalidatePath("/recruiter/talent-pool");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/**
 * Called after a user's profile changes (level up, performance update).
 * Checks all active alerts and notifies any recruiter whose filters now match.
 */
export async function checkAlertsForUser(userId: string): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data: user } = await sb.from("users")
      .select("id, name, performance, level, role")
      .eq("id", userId).maybeSingle();
    if (!user) return;
    const u = user as { id: string; name: string | null; performance: number; level: number; role: string };
    if (u.role !== "intern") return;

    const { data: alerts } = await sb.from("talent_alerts")
      .select("id, recruiter_id, label, filters, last_notified_at")
      .eq("is_active", true);
    if (!alerts?.length) return;

    for (const alert of (alerts as Array<{ id: string; recruiter_id: string; label: string; filters: AlertFilters; last_notified_at: string | null }>)) {
      const f = alert.filters;
      if (f.min_score && u.performance < f.min_score) continue;
      if (f.min_level && u.level < f.min_level) continue;
      // Throttle: don't notify same alert more than once every 24h
      if (alert.last_notified_at) {
        const ago = Date.now() - new Date(alert.last_notified_at).getTime();
        if (ago < 24 * 60 * 60 * 1000) continue;
      }

      pushNotification({
        userId: alert.recruiter_id,
        title: `Talent Alert: ${alert.label}`,
        message: `${u.name || "An intern"} matches your criteria (Level ${u.level}, Score ${u.performance}%). View their profile now.`,
        type: "achievement",
        actionUrl: `/recruiter/talent/${u.id}`,
      }).catch(() => {});

      await sb.from("talent_alerts")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", alert.id);
    }
  } catch { /* non-fatal */ }
}

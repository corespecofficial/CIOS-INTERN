"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { RANKS, rankFromLevel } from "@/lib/gamification-shared";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface PromotionRecommendation {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  from_role: string;
  from_rank: string;
  to_rank: string;
  readiness_score: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

/* ───────────────────────────────────────
   READINESS ENGINE
   ─────────────────────────────────────── */

interface UserRow {
  id: string; name: string | null; role: string;
  level: number; xp: number; streak: number; performance: number; reputation: number;
  avatar_url: string | null;
}

const ROLE_LADDER = ["intern", "senior_intern", "team_lead", "department_lead", "trainer", "manager"] as const;

function nextRoleFor(role: string): string | null {
  const i = ROLE_LADDER.findIndex((r) => r === role);
  if (i === -1 || i === ROLE_LADDER.length - 1) return null;
  return ROLE_LADDER[i + 1];
}

/**
 * Compute a 0-100 "promotion readiness" score from real metrics.
 * Above 75 → eligible recommendation. Above 90 → strong recommendation.
 */
function computeReadiness(u: UserRow, completedTasks: number, attendancePct: number): { score: number; reason: string } {
  const factors: Array<{ label: string; weight: number; pct: number }> = [
    { label: "Performance",  weight: 30, pct: Math.min(100, u.performance) },
    { label: "Attendance",   weight: 20, pct: attendancePct },
    { label: "Streak",       weight: 15, pct: Math.min(100, u.streak * 4) },     // 25-day streak = full marks
    { label: "Tasks done",   weight: 15, pct: Math.min(100, completedTasks * 2) }, // 50 tasks = full marks
    { label: "Reputation",   weight: 10, pct: Math.min(100, u.reputation) },
    { label: "Level",        weight: 10, pct: Math.min(100, u.level * 4) },        // L25 = full marks
  ];
  const score = Math.round(factors.reduce((s, f) => s + (f.pct * f.weight) / 100, 0));
  const top = [...factors].sort((a, b) => b.pct - a.pct).slice(0, 2).map((f) => `${f.label} ${f.pct}%`).join(", ");
  return { score, reason: `Strongest signals: ${top}` };
}

/* ───────────────────────────────────────
   AUTOMATED SCAN — call from cron
   ─────────────────────────────────────── */

export async function scanForPromotions(): Promise<R<{ created: number; scanned: number }>> {
  try {
    const sb = supabaseAdmin();
    const { data: users } = await sb.from("users")
      .select("id, name, role, level, xp, streak, performance, reputation, avatar_url")
      .in("role", ROLE_LADDER as unknown as string[]);
    if (!users) return { ok: true, data: { created: 0, scanned: 0 } };

    let created = 0;
    for (const u of users as UserRow[]) {
      const next = nextRoleFor(u.role);
      if (!next) continue;
      // Skip if there's already a pending recommendation for this user
      const { data: existing } = await sb.from("promotion_recommendations")
        .select("id").eq("user_id", u.id).eq("status", "pending").maybeSingle();
      if (existing) continue;

      const [{ count: tasksDone }] = await Promise.all([
        sb.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", u.id).eq("status", "completed"),
      ]);
      // We don't have an attendance table baseline — use perf as a proxy for now
      const attendancePct = Math.min(100, Math.max(0, u.performance));

      const { score, reason } = computeReadiness(u, tasksDone || 0, attendancePct);
      if (score < 75) continue;

      await sb.from("promotion_recommendations").insert({
        user_id: u.id,
        from_role: u.role,
        from_rank: rankFromLevel(u.level || 1).title,
        to_role: next,
        to_rank: rankFromLevel(Math.max((u.level || 1) + 1, 3)).title,
        readiness_score: score,
        reason,
        status: "pending",
      });
      created++;
    }
    return { ok: true, data: { created, scanned: users.length } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   ADMIN UI ACTIONS
   ─────────────────────────────────────── */

async function requireAdmin() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "admin" && me.role !== "super_admin") throw new Error("Admin only");
  return me;
}

export async function listPendingPromotions(): Promise<R<PromotionRecommendation[]>> {
  try {
    await requireAdmin();
    const sb = supabaseAdmin();
    const { data } = await sb.from("promotion_recommendations")
      .select("*, user:user_id(name, avatar_url)")
      .eq("status", "pending")
      .order("readiness_score", { ascending: false });
    const rows = ((data || []) as Array<PromotionRecommendation & { user?: { name?: string; avatar_url?: string | null } | { name?: string; avatar_url?: string | null }[] | null }>).map((r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      return { ...r, user_name: u?.name || null, user_avatar: u?.avatar_url || null };
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function approvePromotion(id: string): Promise<R> {
  try {
    const me = await requireAdmin();
    const sb = supabaseAdmin();
    const { data: rec } = await sb.from("promotion_recommendations")
      .select("user_id, to_role, to_rank")
      .eq("id", id).eq("status", "pending").maybeSingle();
    if (!rec) return { ok: false, error: "Recommendation not found" };
    const r = rec as { user_id: string; to_role: string; to_rank: string };
    await sb.from("users").update({ role: r.to_role }).eq("id", r.user_id);
    await sb.from("promotion_recommendations").update({
      status: "approved", reviewed_by: me.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    pushNotification({
      userId: r.user_id,
      kind: "achievement",
      title: `🎉 You've been promoted to ${r.to_rank}!`,
      body: `Approved by ${me.name}. New role: ${r.to_role.replace(/_/g, " ")}.`,
      url: "/gamification",
    }).catch(() => {});
    revalidatePath("/admin/promotions");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function rejectPromotion(id: string, note?: string): Promise<R> {
  try {
    const me = await requireAdmin();
    await supabaseAdmin().from("promotion_recommendations").update({
      status: "rejected", reviewed_by: me.id, reviewed_at: new Date().toISOString(), reject_reason: note || null,
    }).eq("id", id);
    revalidatePath("/admin/promotions");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ───────────────────────────────────────
   USER-SIDE — used on dashboard ladder
   ─────────────────────────────────────── */

export async function getMyPromotionStatus(): Promise<R<{ readiness: number; reason: string; nextRole: string | null; nextRank: string; pending: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const next = nextRoleFor(me.role);
    const [{ count: tasksDone }, { data: pending }] = await Promise.all([
      sb.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", me.id).eq("status", "completed"),
      sb.from("promotion_recommendations").select("id").eq("user_id", me.id).eq("status", "pending").maybeSingle(),
    ]);
    const u: UserRow = {
      id: me.id, name: me.name, role: me.role,
      level: me.level || 1, xp: me.xp || 0, streak: me.streak || 0,
      performance: me.performance || 0, reputation: me.reputation || 0,
      avatar_url: me.avatar_url,
    };
    const { score, reason } = computeReadiness(u, tasksDone || 0, Math.min(100, u.performance));
    return {
      ok: true,
      data: {
        readiness: score,
        reason,
        nextRole: next,
        nextRank: rankFromLevel(Math.max((u.level || 1) + 1, 3)).title,
        pending: !!pending,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

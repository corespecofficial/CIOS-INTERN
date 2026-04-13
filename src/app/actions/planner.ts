"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { awardXP } from "@/lib/gamification";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export interface PlanInput {
  title: string;
  description?: string;
  category?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  status?: "not_started" | "in_progress" | "waiting" | "completed" | "cancelled";
  dueAt?: string | null;
  estimateMinutes?: number | null;
  tags?: string[];
  visibility?: "private" | "team" | "public";
  color?: string;
  icon?: string;
}

async function logActivity(planId: string, actorId: string, kind: string, detail?: string) {
  try {
    await supabaseAdmin().from("plan_activity").insert({ plan_id: planId, actor_id: actorId, kind, detail: detail || null });
  } catch {/* ignore */}
}

async function assertOwner(planId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().from("plans").select("owner_id").eq("id", planId).maybeSingle();
  return !!data && data.owner_id === userId;
}

export async function createPlan(input: PlanInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.title?.trim()) return { ok: false, error: "Title required" };
    const sb = supabaseAdmin();
    // Next sort_order = max + 1
    const { data: maxRow } = await sb.from("plans").select("sort_order").eq("owner_id", me.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const nextOrder = ((maxRow?.sort_order as number) || 0) + 1;
    const { data, error } = await sb.from("plans").insert({
      owner_id: me.id,
      title: input.title.trim(),
      description: input.description || "",
      category: input.category || "general",
      priority: input.priority || "normal",
      status: input.status || "not_started",
      due_at: input.dueAt || null,
      estimate_minutes: input.estimateMinutes || null,
      tags: input.tags || [],
      visibility: input.visibility || "private",
      color: input.color || "#1E88E5",
      icon: input.icon || "📋",
      sort_order: nextOrder,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    const id = (data as { id: string }).id;
    await logActivity(id, me.id, "created", input.title);
    await awardXP(me.id, "task_completed", { refType: "plan_created", refId: id });
    revalidatePath("/planner");
    return { ok: true, data: { id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updatePlan(id: string, patch: Partial<PlanInput>): Promise<R> {
  try {
    const me = await requireMe();
    if (!(await assertOwner(id, me.id))) return { ok: false, error: "Not your plan" };
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.category !== undefined) row.category = patch.category;
    if (patch.priority !== undefined) row.priority = patch.priority;
    if (patch.status !== undefined) {
      row.status = patch.status;
      if (patch.status === "completed") row.completed_at = new Date().toISOString();
      else row.completed_at = null;
    }
    if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
    if (patch.estimateMinutes !== undefined) row.estimate_minutes = patch.estimateMinutes;
    if (patch.tags !== undefined) row.tags = patch.tags;
    if (patch.visibility !== undefined) row.visibility = patch.visibility;
    if (patch.color !== undefined) row.color = patch.color;
    if (patch.icon !== undefined) row.icon = patch.icon;
    const { error } = await supabaseAdmin().from("plans").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    if (patch.status === "completed") {
      await logActivity(id, me.id, "completed");
      await awardXP(me.id, "task_completed", { refType: "plan_completed", refId: id });
    }
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deletePlan(id: string): Promise<R> {
  try {
    const me = await requireMe();
    if (!(await assertOwner(id, me.id))) return { ok: false, error: "Not your plan" };
    await supabaseAdmin().from("plans").delete().eq("id", id);
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function reorderPlans(orderedIds: string[]): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    // Update in a single pass with per-row updates (Postgres doesn't support bulk update-with-position easily without CTE)
    for (let i = 0; i < orderedIds.length; i++) {
      await sb.from("plans").update({ sort_order: i + 1 }).eq("id", orderedIds[i]).eq("owner_id", me.id);
    }
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────── ITEMS ─────── */

export async function addItem(planId: string, content: string): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!(await assertOwner(planId, me.id))) return { ok: false, error: "Not your plan" };
    if (!content.trim()) return { ok: false, error: "Content required" };
    const sb = supabaseAdmin();
    const { data: maxRow } = await sb.from("plan_items").select("sort_order").eq("plan_id", planId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const next = ((maxRow?.sort_order as number) || 0) + 1;
    const { data, error } = await sb.from("plan_items").insert({ plan_id: planId, content: content.trim(), sort_order: next }).select("id").single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/planner");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function toggleItem(itemId: string, done: boolean): Promise<R> {
  try {
    const me = await requireMe();
    const { data: item } = await supabaseAdmin().from("plan_items").select("id, plan_id").eq("id", itemId).maybeSingle();
    if (!item) return { ok: false, error: "Item missing" };
    if (!(await assertOwner(item.plan_id, me.id))) return { ok: false, error: "Not your plan" };
    await supabaseAdmin().from("plan_items").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", itemId);
    // If all items done, auto-mark plan completed
    if (done) {
      const { data: items } = await supabaseAdmin().from("plan_items").select("done").eq("plan_id", item.plan_id);
      const all = (items || []) as { done: boolean }[];
      if (all.length > 0 && all.every((i) => i.done)) {
        await supabaseAdmin().from("plans").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", item.plan_id);
        await awardXP(me.id, "task_completed", { refType: "plan_auto_completed", refId: item.plan_id });
        await logActivity(item.plan_id, me.id, "completed", "All items done");
      }
    }
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateItemContent(itemId: string, content: string): Promise<R> {
  try {
    const me = await requireMe();
    const { data: item } = await supabaseAdmin().from("plan_items").select("plan_id").eq("id", itemId).maybeSingle();
    if (!item) return { ok: false, error: "Item missing" };
    if (!(await assertOwner(item.plan_id, me.id))) return { ok: false, error: "Not your plan" };
    await supabaseAdmin().from("plan_items").update({ content }).eq("id", itemId);
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteItem(itemId: string): Promise<R> {
  try {
    const me = await requireMe();
    const { data: item } = await supabaseAdmin().from("plan_items").select("plan_id").eq("id", itemId).maybeSingle();
    if (!item) return { ok: false, error: "Item missing" };
    if (!(await assertOwner(item.plan_id, me.id))) return { ok: false, error: "Not your plan" };
    await supabaseAdmin().from("plan_items").delete().eq("id", itemId);
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function reorderItems(planId: string, orderedIds: string[]): Promise<R> {
  try {
    const me = await requireMe();
    if (!(await assertOwner(planId, me.id))) return { ok: false, error: "Not your plan" };
    const sb = supabaseAdmin();
    for (let i = 0; i < orderedIds.length; i++) {
      await sb.from("plan_items").update({ sort_order: i + 1 }).eq("id", orderedIds[i]).eq("plan_id", planId);
    }
    revalidatePath("/planner");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────── COMMENTS + DETAIL ─────── */

export async function addComment(planId: string, body: string): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!body.trim()) return { ok: false, error: "Comment empty" };
    const { data, error } = await supabaseAdmin().from("plan_comments").insert({ plan_id: planId, author_id: me.id, body: body.trim() }).select("id").single();
    if (error) return { ok: false, error: error.message };
    await logActivity(planId, me.id, "commented");
    revalidatePath("/planner");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getPlanDetail(planId: string): Promise<R<{ plan: Record<string, unknown>; items: Array<Record<string, unknown>>; comments: Array<Record<string, unknown>>; activity: Array<Record<string, unknown>> }>> {
  try {
    await requireMe();
    const sb = supabaseAdmin();
    const [planRes, itemsRes, commentsRes, activityRes] = await Promise.all([
      sb.from("plans").select("*").eq("id", planId).maybeSingle(),
      sb.from("plan_items").select("*").eq("plan_id", planId).order("sort_order"),
      sb.from("plan_comments").select("id, body, created_at, author_id, users:author_id(name, avatar_url)").eq("plan_id", planId).order("created_at"),
      sb.from("plan_activity").select("id, kind, detail, created_at, actor_id, users:actor_id(name)").eq("plan_id", planId).order("created_at", { ascending: false }).limit(30),
    ]);
    if (!planRes.data) return { ok: false, error: "Plan not found" };
    return {
      ok: true,
      data: {
        plan: planRes.data as Record<string, unknown>,
        items: (itemsRes.data || []) as Array<Record<string, unknown>>,
        comments: (commentsRes.data || []) as Array<Record<string, unknown>>,
        activity: (activityRes.data || []) as Array<Record<string, unknown>>,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

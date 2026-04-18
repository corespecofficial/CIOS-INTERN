"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { awardXP } from "@/lib/gamification";
import { pushNotification } from "@/app/actions/notifications";
import { revalidatePath } from "next/cache";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  parent_id: string | null;
  title: string;
  notes: string | null;
  sort_order: number;
  is_critical: boolean;
  deadline: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  blocked: boolean;
  blocked_reason: string | null;
  proof_url: string | null;
  depends_on: string | null;
  subtasks?: ChecklistItem[];
}

export interface Checklist {
  id: string;
  creator_id: string;
  creator_name?: string;
  assigned_to: string | null;
  assigned_name?: string;
  title: string;
  description: string | null;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  status: "active" | "completed" | "archived" | "cancelled";
  completion_pct: number;
  signature_required: boolean;
  reminders_enabled: boolean;
  is_template: boolean;
  xp_reward: number;
  items?: ChecklistItem[];
  created_at: string;
  updated_at: string;
  overdue_count?: number;
  total_items?: number;
  completed_items?: number;
  signed?: boolean;
}

// ── READ ──────────────────────────────────────────────────────────────────────

export async function getMyChecklists(): Promise<R<Checklist[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("checklists")
      .select("*, creator:users!creator_id(full_name), assigned:users!assigned_to(full_name), items:checklist_items(id,completed,deadline,is_critical,parent_id)")
      .or(`assigned_to.eq.${me.id},creator_id.eq.${me.id}`)
      .eq("is_template", false)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      data: (data ?? []).map((row: Record<string, unknown>) => {
        const creator = row.creator as { full_name?: string } | null;
        const assigned = row.assigned as { full_name?: string } | null;
        const items = (row.items as ChecklistItem[] | null) ?? [];
        const topItems = items.filter((i) => !i.parent_id);
        const completedItems = topItems.filter((i) => i.completed).length;
        const overdue = topItems.filter((i) => !i.completed && i.deadline && new Date(i.deadline) < new Date()).length;
        return {
          ...(row as Checklist),
          creator_name: creator?.full_name ?? "—",
          assigned_name: assigned?.full_name ?? "—",
          total_items: topItems.length,
          completed_items: completedItems,
          overdue_count: overdue,
          items: undefined,
        };
      }),
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getChecklist(id: string): Promise<R<Checklist>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("checklists")
      .select("*, creator:users!creator_id(full_name), assigned:users!assigned_to(full_name), items:checklist_items(*)")
      .eq("id", id)
      .single();

    if (error || !data) return { ok: false, error: "Checklist not found." };

    const creator = (data as Record<string, unknown>).creator as { full_name?: string } | null;
    const assigned = (data as Record<string, unknown>).assigned as { full_name?: string } | null;
    const allItems = ((data as Record<string, unknown>).items as ChecklistItem[] | null) ?? [];

    // Build tree
    const itemMap = new Map<string, ChecklistItem>();
    allItems.forEach((i) => { itemMap.set(i.id, { ...i, subtasks: [] }); });
    const roots: ChecklistItem[] = [];
    allItems.forEach((i) => {
      if (i.parent_id && itemMap.has(i.parent_id)) {
        itemMap.get(i.parent_id)!.subtasks!.push(itemMap.get(i.id)!);
      } else {
        roots.push(itemMap.get(i.id)!);
      }
    });
    roots.sort((a, b) => a.sort_order - b.sort_order);

    // Check if signed
    const { data: sig } = await sb
      .from("checklist_signatures")
      .select("id")
      .eq("checklist_id", id)
      .eq("user_id", me.id)
      .maybeSingle();

    const topItems = roots;
    const completedItems = topItems.filter((i) => i.completed).length;
    const overdue = topItems.filter((i) => !i.completed && i.deadline && new Date(i.deadline) < new Date()).length;

    return {
      ok: true,
      data: {
        ...(data as Checklist),
        creator_name: creator?.full_name ?? "—",
        assigned_name: assigned?.full_name ?? "—",
        items: roots,
        total_items: topItems.length,
        completed_items: completedItems,
        overdue_count: overdue,
        signed: !!sig,
      },
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getChecklistTemplates(): Promise<R<Checklist[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("checklists")
      .select("*, creator:users!creator_id(full_name), items:checklist_items(id)")
      .eq("is_template", true)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((row: Record<string, unknown>) => {
        const creator = row.creator as { full_name?: string } | null;
        const items = (row.items as { id: string }[] | null) ?? [];
        return { ...(row as Checklist), creator_name: creator?.full_name ?? "—", total_items: items.length };
      }),
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

// ── WRITE ─────────────────────────────────────────────────────────────────────

export async function createChecklist(input: {
  title: string; description?: string; category?: string;
  priority?: string; due_date?: string; assigned_to?: string;
  signature_required?: boolean; xp_reward?: number;
  items?: Array<{ title: string; notes?: string; is_critical?: boolean; deadline?: string }>;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("checklists")
      .insert({
        creator_id: me.id,
        assigned_to: input.assigned_to ?? me.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? "general",
        priority: input.priority ?? "medium",
        due_date: input.due_date ?? null,
        signature_required: input.signature_required ?? false,
        xp_reward: input.xp_reward ?? 50,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    if (input.items && input.items.length > 0) {
      await sb.from("checklist_items").insert(
        input.items.map((item, idx) => ({
          checklist_id: data.id,
          title: item.title,
          notes: item.notes ?? null,
          is_critical: item.is_critical ?? false,
          deadline: item.deadline ?? null,
          sort_order: idx,
        }))
      );
    }

    await sb.from("checklist_logs").insert({
      checklist_id: data.id, user_id: me.id, action: "created",
    });

    revalidatePath("/checklist");
    return { ok: true, data: { id: data.id } };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function createChecklistFromTemplate(templateId: string): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: tmpl } = await sb
      .from("checklists")
      .select("*, items:checklist_items(*)")
      .eq("id", templateId)
      .single();
    if (!tmpl) return { ok: false, error: "Template not found." };

    const { data, error } = await sb.from("checklists").insert({
      creator_id: me.id, assigned_to: me.id,
      title: (tmpl as Record<string, unknown>).title,
      description: (tmpl as Record<string, unknown>).description ?? null,
      category: (tmpl as Record<string, unknown>).category,
      priority: (tmpl as Record<string, unknown>).priority,
      signature_required: (tmpl as Record<string, unknown>).signature_required,
      xp_reward: (tmpl as Record<string, unknown>).xp_reward,
      template_id: templateId,
    }).select("id").single();

    if (error) return { ok: false, error: error.message };

    const templateItems = ((tmpl as Record<string, unknown>).items as ChecklistItem[]) ?? [];
    if (templateItems.length > 0) {
      await sb.from("checklist_items").insert(
        templateItems.map((item) => ({
          checklist_id: data.id, title: item.title,
          notes: item.notes ?? null, is_critical: item.is_critical,
          sort_order: item.sort_order,
        }))
      );
    }

    revalidatePath("/checklist");
    return { ok: true, data: { id: data.id } };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function toggleChecklistItem(
  checklistId: string, itemId: string, completed: boolean, proofUrl?: string
): Promise<R<{ completion_pct: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    await sb.from("checklist_items").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? me.id : null,
      proof_url: proofUrl ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId);

    await sb.from("checklist_logs").insert({
      checklist_id: checklistId, item_id: itemId, user_id: me.id,
      action: completed ? "item_checked" : "item_unchecked",
    });

    // Recalculate completion %
    const { data: items } = await sb
      .from("checklist_items")
      .select("completed, parent_id")
      .eq("checklist_id", checklistId);

    const topItems = (items ?? []).filter((i: { parent_id: string | null }) => !i.parent_id);
    const pct = topItems.length > 0
      ? Math.round(topItems.filter((i: { completed: boolean }) => i.completed).length / topItems.length * 100)
      : 0;

    await sb.from("checklists").update({
      completion_pct: pct,
      status: pct === 100 ? "completed" : "active",
      updated_at: new Date().toISOString(),
    }).eq("id", checklistId);

    // Award XP + notify on full completion
    if (pct === 100) {
      const { data: cl } = await sb.from("checklists").select("xp_reward, title, assigned_to").eq("id", checklistId).single();
      if (cl) {
        const userId = (cl as Record<string, unknown>).assigned_to as string ?? me.id;
        await awardXP(userId, "task_completed").catch(() => {});
        await pushNotification({
          userId,
          title: "Checklist Complete! 🎉",
          message: `You completed "${(cl as Record<string, unknown>).title}". +${(cl as Record<string, unknown>).xp_reward} XP awarded!`,
          type: "success",
          actionUrl: `/checklist/${checklistId}`,
        }).catch(() => {});
      }
    }

    revalidatePath(`/checklist/${checklistId}`);
    return { ok: true, data: { completion_pct: pct } };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function blockChecklistItem(itemId: string, reason: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: item } = await sb.from("checklist_items").select("checklist_id").eq("id", itemId).single();
    await sb.from("checklist_items").update({ blocked: true, blocked_reason: reason }).eq("id", itemId);
    if (item) {
      await sb.from("checklist_logs").insert({
        checklist_id: (item as { checklist_id: string }).checklist_id, item_id: itemId,
        user_id: me.id, action: "item_blocked", meta: { reason },
      });
    }
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function signChecklist(checklistId: string, typedName: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    await sb.from("checklist_signatures").upsert({
      checklist_id: checklistId, user_id: me.id, typed_name: typedName,
    }, { onConflict: "checklist_id,user_id" });

    await sb.from("checklist_logs").insert({
      checklist_id: checklistId, user_id: me.id, action: "signed",
    });

    revalidatePath(`/checklist/${checklistId}`);
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function addChecklistItem(checklistId: string, input: {
  title: string; notes?: string; is_critical?: boolean; deadline?: string; parent_id?: string;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: existing } = await sb.from("checklist_items").select("id").eq("checklist_id", checklistId).order("sort_order", { ascending: false }).limit(1);
    const nextOrder = existing && existing.length > 0 ? ((existing[0] as { sort_order?: number }).sort_order ?? 0) + 1 : 0;

    const { data, error } = await sb.from("checklist_items").insert({
      checklist_id: checklistId,
      title: input.title, notes: input.notes ?? null,
      is_critical: input.is_critical ?? false, deadline: input.deadline ?? null,
      parent_id: input.parent_id ?? null, sort_order: nextOrder,
    }).select("id").single();

    if (error) return { ok: false, error: error.message };
    revalidatePath(`/checklist/${checklistId}`);
    return { ok: true, data: { id: data.id } };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteChecklist(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb.from("checklists").update({ status: "archived" }).eq("id", id);
    revalidatePath("/checklist");
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getAdminChecklists(): Promise<R<Checklist[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admin only." };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("checklists")
      .select("*, creator:users!creator_id(full_name), assigned:users!assigned_to(full_name), items:checklist_items(id,completed,is_critical,parent_id,deadline)")
      .eq("is_template", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      data: (data ?? []).map((row: Record<string, unknown>) => {
        const creator = row.creator as { full_name?: string } | null;
        const assigned = row.assigned as { full_name?: string } | null;
        const items = (row.items as ChecklistItem[] | null) ?? [];
        const topItems = items.filter((i) => !i.parent_id);
        return {
          ...(row as Checklist),
          creator_name: creator?.full_name ?? "—",
          assigned_name: assigned?.full_name ?? "—",
          total_items: topItems.length,
          completed_items: topItems.filter((i) => i.completed).length,
          overdue_count: topItems.filter((i) => !i.completed && i.deadline && new Date(i.deadline) < new Date()).length,
          items: undefined,
        };
      }),
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

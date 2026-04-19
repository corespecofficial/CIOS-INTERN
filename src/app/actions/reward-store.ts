"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface RewardItem {
  id: string;
  title: string;
  description: string | null;
  category: "cash" | "merch" | "course" | "mentor" | "perk";
  image_url: string | null;
  price_points: number;
  cash_value_ngn: number | null;
  stock: number | null;
  unlimited: boolean;
  min_level: number;
  status: "active" | "draft" | "sold_out" | "archived";
  redemption_count: number;
}

export interface Redemption {
  id: string;
  item_id: string;
  item_title: string;
  points_spent: number;
  status: "pending" | "approved" | "shipped" | "delivered" | "rejected" | "cancelled";
  redeemed_at: string;
  admin_note: string | null;
}

export async function listStoreItems(): Promise<R<RewardItem[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("reward_items")
      .select("*")
      .eq("status", "active")
      .order("price_points", { ascending: true });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as RewardItem[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getMyRedemptions(): Promise<R<Redemption[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("reward_redemptions")
      .select("id, item_id, points_spent, status, redeemed_at, admin_note, item:reward_items(title)")
      .eq("user_id", me.id)
      .order("redeemed_at", { ascending: false });
    if (error) throw error;
    type Row = { id: string; item_id: string; points_spent: number; status: Redemption["status"]; redeemed_at: string; admin_note: string | null; item: { title: string } | null };
    return {
      ok: true,
      data: ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        item_id: r.item_id,
        item_title: r.item?.title ?? "Reward",
        points_spent: r.points_spent,
        status: r.status,
        redeemed_at: r.redeemed_at,
        admin_note: r.admin_note,
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function redeemItem(itemId: string): Promise<R<{ newBalance: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();

    const { data: item } = await sb.from("reward_items").select("*").eq("id", itemId).maybeSingle();
    if (!item) return { ok: false, error: "Item not found" };
    const it = item as RewardItem;
    if (it.status !== "active") return { ok: false, error: "Item is not available" };
    const userPoints = Number(me.xp ?? 0);
    if (userPoints < it.price_points) return { ok: false, error: `Need ${it.price_points - userPoints} more points` };
    if (!it.unlimited && (it.stock ?? 0) <= 0) return { ok: false, error: "Out of stock" };

    await sb.from("reward_redemptions").insert({
      user_id: me.id,
      item_id: itemId,
      points_spent: it.price_points,
      status: "pending",
    });

    const newBalance = userPoints - it.price_points;
    await sb.from("users").update({ xp: newBalance } as Record<string, unknown>).eq("id", me.id);

    const updates: Record<string, unknown> = { redemption_count: it.redemption_count + 1 };
    if (!it.unlimited && it.stock !== null) {
      const newStock = it.stock - 1;
      updates.stock = newStock;
      if (newStock <= 0) updates.status = "sold_out";
    }
    await sb.from("reward_items").update(updates).eq("id", itemId);

    revalidatePath("/rewards-store");
    return { ok: true, data: { newBalance } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Admin: create item ──────────────────────────────────────────────────────
export async function adminCreateRewardItem(input: {
  title: string;
  description?: string;
  category: "cash" | "merch" | "course" | "mentor" | "perk";
  price_points: number;
  cash_value_ngn?: number;
  stock?: number;
  unlimited?: boolean;
  image_url?: string;
  min_level?: number;
}): Promise<R<RewardItem>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("reward_items")
      .insert({
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        price_points: input.price_points,
        cash_value_ngn: input.cash_value_ngn ?? null,
        stock: input.stock ?? null,
        unlimited: input.unlimited ?? false,
        image_url: input.image_url ?? null,
        min_level: input.min_level ?? 1,
        status: "active",
        created_by: me.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/rewards-store");
    return { ok: true, data: data as RewardItem };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

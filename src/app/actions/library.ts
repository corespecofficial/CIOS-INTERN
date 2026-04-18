"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface LibraryCategory {
  id: string; name: string; slug: string; icon: string;
  description: string | null; sort_order: number;
}

export interface LibraryItem {
  id: string;
  uploader_id: string;
  uploader_name?: string;
  uploader_avatar?: string;
  title: string;
  description: string | null;
  category_slug: string;
  category_name?: string;
  category_icon?: string;
  tags: string[];
  resource_type: string;
  access_type: "free" | "paid" | "subscription" | "role_restricted" | "reward_unlocked";
  price: number;
  currency: string;
  allowed_roles: string[];
  file_url: string | null;
  external_link: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  duration_minutes: number | null;
  file_size_bytes: number | null;
  file_mime_type: string | null;
  download_allowed: boolean;
  status: string;
  featured: boolean;
  drip_release_at: string | null;
  view_count: number;
  download_count: number;
  purchase_count: number;
  avg_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  // computed
  has_access?: boolean;
  purchased?: boolean;
}

export interface LibraryReview {
  id: string;
  item_id: string;
  user_id: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
  rating: number;
  body: string | null;
  created_at: string;
}

// ── PUBLIC / INTERN ───────────────────────────────────────────────────────────

export async function getLibraryCategories(): Promise<R<LibraryCategory[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("library_categories")
      .select("*")
      .order("sort_order");
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as LibraryCategory[] };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getLibraryItems(opts: {
  category?: string;
  search?: string;
  access_type?: string;
  resource_type?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<R<LibraryItem[]>> {
  try {
    const me = await getCurrentDbUser().catch(() => null);
    const sb = supabaseAdmin();

    let q = sb
      .from("library_items")
      .select("*, uploader:users!uploader_id(full_name, avatar_url), category:library_categories!category_slug(name,icon)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 40)
      .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 40) - 1);

    if (opts.category) q = q.eq("category_slug", opts.category);
    if (opts.access_type) q = q.eq("access_type", opts.access_type);
    if (opts.resource_type) q = q.eq("resource_type", opts.resource_type);
    if (opts.featured) q = q.eq("featured", true);
    if (opts.search) q = q.ilike("title", `%${opts.search}%`);

    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };

    // Get user's purchases
    let purchasedIds = new Set<string>();
    if (me) {
      const { data: purchases } = await sb
        .from("library_purchases")
        .select("item_id")
        .eq("user_id", me.id);
      purchasedIds = new Set((purchases ?? []).map((p: { item_id: string }) => p.item_id));
    }

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const uploader = row.uploader as { full_name?: string; avatar_url?: string } | null;
      const cat = row.category as { name?: string; icon?: string } | null;
      const purchased = purchasedIds.has(row.id as string);
      const hasAccess =
        row.access_type === "free" ||
        purchased ||
        (me && ["admin", "super_admin"].includes(me.role));
      return {
        ...(row as LibraryItem),
        uploader_name: uploader?.full_name ?? "Instructor",
        uploader_avatar: uploader?.avatar_url ?? null,
        category_name: cat?.name ?? "",
        category_icon: cat?.icon ?? "📚",
        has_access: hasAccess,
        purchased,
      };
    });

    return { ok: true, data: items as LibraryItem[] };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getLibraryItem(id: string): Promise<R<LibraryItem>> {
  try {
    const me = await getCurrentDbUser().catch(() => null);
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("library_items")
      .select("*, uploader:users!uploader_id(full_name, avatar_url), category:library_categories!category_slug(name,icon)")
      .eq("id", id)
      .single();

    if (error || !data) return { ok: false, error: "Resource not found." };

    let purchased = false;
    if (me) {
      const { data: p } = await sb
        .from("library_purchases")
        .select("id")
        .eq("user_id", me.id)
        .eq("item_id", id)
        .maybeSingle();
      purchased = !!p;
    }
    const uploader = (data as Record<string, unknown>).uploader as { full_name?: string; avatar_url?: string } | null;
    const cat = (data as Record<string, unknown>).category as { name?: string; icon?: string } | null;
    const hasAccess =
      data.access_type === "free" ||
      purchased ||
      (me && ["admin", "super_admin"].includes(me.role));

    // Log view
    if (me) {
      await sb.from("library_access_logs").insert({ user_id: me.id, item_id: id, action: "view" }).then(() => {}).catch(() => {});
      await sb.from("library_items").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", id).then(() => {}).catch(() => {});
    }

    return {
      ok: true,
      data: {
        ...(data as LibraryItem),
        uploader_name: uploader?.full_name ?? "Instructor",
        uploader_avatar: uploader?.avatar_url ?? null,
        category_name: cat?.name ?? "",
        category_icon: cat?.icon ?? "📚",
        has_access: hasAccess,
        purchased,
      },
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getMyLibraryPurchases(): Promise<R<LibraryItem[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("library_purchases")
      .select("item_id, purchased_at, library_items!inner(*, uploader:users!uploader_id(full_name, avatar_url), category:library_categories!category_slug(name,icon))")
      .eq("user_id", me.id)
      .order("purchased_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const item = row.library_items as Record<string, unknown>;
      const uploader = item?.uploader as { full_name?: string; avatar_url?: string } | null;
      const cat = item?.category as { name?: string; icon?: string } | null;
      return {
        ...(item as LibraryItem),
        uploader_name: uploader?.full_name ?? "Instructor",
        uploader_avatar: uploader?.avatar_url ?? null,
        category_name: cat?.name ?? "",
        category_icon: cat?.icon ?? "📚",
        has_access: true,
        purchased: true,
      };
    });

    return { ok: true, data: items as LibraryItem[] };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getLibraryReviews(itemId: string): Promise<R<LibraryReview[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("library_reviews")
      .select("*, reviewer:users!user_id(full_name, avatar_url)")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      data: (data ?? []).map((r: Record<string, unknown>) => {
        const reviewer = r.reviewer as { full_name?: string; avatar_url?: string } | null;
        return {
          ...(r as LibraryReview),
          reviewer_name: reviewer?.full_name ?? "User",
          reviewer_avatar: reviewer?.avatar_url ?? null,
        };
      }),
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function submitLibraryReview(itemId: string, rating: number, body: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    await sb.from("library_reviews").upsert({
      item_id: itemId, user_id: me.id, rating, body, updated_at: new Date().toISOString(),
    }, { onConflict: "item_id,user_id" });

    // Update avg_rating
    const { data: reviews } = await sb.from("library_reviews").select("rating").eq("item_id", itemId);
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length;
      await sb.from("library_items").update({ avg_rating: avg, review_count: reviews.length }).eq("id", itemId);
    }

    revalidatePath(`/library/${itemId}`);
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function logLibraryDownload(itemId: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    await sb.from("library_access_logs").insert({ user_id: me.id, item_id: itemId, action: "download" });
    const { data: item } = await sb.from("library_items").select("download_count").eq("id", itemId).single();
    if (item) await sb.from("library_items").update({ download_count: ((item as { download_count?: number }).download_count ?? 0) + 1 }).eq("id", itemId).then(() => {}).catch(() => {});
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

// ── ADMIN / INSTRUCTOR ────────────────────────────────────────────────────────

export async function uploadLibraryItem(input: {
  title: string; description?: string; category_slug: string; tags: string[];
  resource_type: string; access_type: string; price: number; currency: string;
  allowed_roles: string[]; file_url?: string; external_link?: string;
  thumbnail_url?: string; preview_url?: string; duration_minutes?: number;
  download_allowed: boolean; featured: boolean; drip_release_at?: string;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "instructor"].includes(me.role)) {
      return { ok: false, error: "Instructor or admin access required." };
    }
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("library_items")
      .insert({
        ...input,
        uploader_id: me.id,
        status: ["admin", "super_admin"].includes(me.role) ? "published" : "draft",
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/library");
    revalidatePath("/library/admin");
    return { ok: true, data: { id: data.id } };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function updateLibraryItem(id: string, input: Partial<{
  title: string; description: string; category_slug: string; tags: string[];
  access_type: string; price: number; thumbnail_url: string; featured: boolean;
  status: string; download_allowed: boolean; drip_release_at: string | null;
}>): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin", "instructor"].includes(me.role)) {
      return { ok: false, error: "Access denied." };
    }
    const sb = supabaseAdmin();
    const { error } = await sb.from("library_items").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/library");
    revalidatePath(`/library/${id}`);
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function deleteLibraryItem(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admin only." };
    const sb = supabaseAdmin();
    const { error } = await sb.from("library_items").update({ status: "archived" }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/library");
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function getAdminLibraryItems(): Promise<R<(LibraryItem & { uploader_name: string })[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const isAdmin = ["admin", "super_admin"].includes(me.role);
    const sb = supabaseAdmin();

    let q = sb
      .from("library_items")
      .select("*, uploader:users!uploader_id(full_name), category:library_categories!category_slug(name,icon)")
      .order("created_at", { ascending: false });

    if (!isAdmin) q = q.eq("uploader_id", me.id);

    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      data: (data ?? []).map((r: Record<string, unknown>) => {
        const up = r.uploader as { full_name?: string } | null;
        const cat = r.category as { name?: string; icon?: string } | null;
        return { ...(r as LibraryItem), uploader_name: up?.full_name ?? "—", category_name: cat?.name ?? "", category_icon: cat?.icon ?? "📚" };
      }),
    };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

export async function recordLibraryPurchase(itemId: string, paymentRef: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: item } = await sb.from("library_items").select("price, currency, title").eq("id", itemId).single();
    if (!item) return { ok: false, error: "Item not found." };

    await sb.from("library_purchases").upsert({
      user_id: me.id, item_id: itemId,
      amount_paid: item.price, currency: item.currency,
      payment_ref: paymentRef, payment_method: "paystack",
    }, { onConflict: "user_id,item_id" });

    await sb.from("library_items").update({ purchase_count: ((item as Record<string, unknown>).purchase_count as number ?? 0) + 1 }).eq("id", itemId).then(() => {}).catch(() => {});

    revalidatePath("/library/my-purchases");
    return { ok: true, data: undefined };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}

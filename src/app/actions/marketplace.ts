"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Product, Purchase } from "./marketplace-types";

// Re-export types only (type-only exports are fine in "use server" files)
export type { Product, Purchase } from "./marketplace-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

type SellerJoin = { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null;
type ProductRow = Record<string, unknown> & { seller?: SellerJoin };

function mapProduct(r: ProductRow): Product {
  const s = Array.isArray(r.seller) ? r.seller[0] : r.seller;
  return { ...r, seller_name: s?.name || null, seller_avatar: s?.avatar_url || null } as Product;
}

export async function listProducts(opts?: { category?: string; limit?: number }): Promise<R<Product[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 60);
    if (opts?.category) q = q.eq("category", opts.category);
    const { data } = await q;
    return { ok: true, data: ((data || []) as ProductRow[]).map(mapProduct) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getProduct(id: string): Promise<R<Product>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url)")
      .eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Product not found" };
    return { ok: true, data: mapProduct(data as ProductRow) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function createProduct(input: {
  title: string; description: string; category: string;
  price_ngn: number; price_usd?: number; tags?: string[];
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.title.trim().length < 3) return { ok: false, error: "Title too short" };
    if (input.description.trim().length < 20) return { ok: false, error: "Description too short (min 20 chars)" };
    if (input.price_ngn < 0) return { ok: false, error: "Price cannot be negative" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("marketplace_products").insert({
      seller_id: me.id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      price_ngn: input.price_ngn,
      price_usd: input.price_usd || null,
      tags: input.tags || [],
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to create product" };
    revalidatePath("/marketplace");
    revalidatePath("/marketplace/sell");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateProduct(id: string, patch: {
  title?: string; description?: string; category?: string;
  price_ngn?: number; price_usd?: number | null; tags?: string[]; status?: string;
}): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("marketplace_products").select("seller_id").eq("id", id).maybeSingle();
    if (!existing) return { ok: false, error: "Not found" };
    if ((existing as { seller_id: string }).seller_id !== me.id && !["admin", "super_admin"].includes(me.role))
      return { ok: false, error: "Not your product" };
    await sb.from("marketplace_products").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/marketplace");
    revalidatePath("/marketplace/sell");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteProduct(id: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("marketplace_products").select("seller_id").eq("id", id).maybeSingle();
    if (!existing) return { ok: false, error: "Not found" };
    if ((existing as { seller_id: string }).seller_id !== me.id && !["admin", "super_admin"].includes(me.role))
      return { ok: false, error: "Not your product" };
    await sb.from("marketplace_products").delete().eq("id", id);
    revalidatePath("/marketplace");
    revalidatePath("/marketplace/sell");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function recordPurchase(productId: string): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: product } = await sb.from("marketplace_products").select("price_ngn,seller_id,status").eq("id", productId).maybeSingle();
    if (!product) return { ok: false, error: "Product not found" };
    const p = product as { price_ngn: number; seller_id: string; status: string };
    if (p.status !== "active") return { ok: false, error: "Product is not available" };
    if (p.seller_id === me.id) return { ok: false, error: "Cannot purchase your own product" };
    const { data, error } = await sb.from("marketplace_purchases")
      .insert({ buyer_id: me.id, product_id: productId, amount_paid: p.price_ngn, currency: "NGN" })
      .select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Purchase failed" };
    const { count } = await sb.from("marketplace_purchases").select("id", { count: "exact", head: true }).eq("product_id", productId);
    await sb.from("marketplace_products").update({ sales_count: count || 1, updated_at: new Date().toISOString() }).eq("id", productId);
    revalidatePath("/marketplace");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyProducts(): Promise<R<Product[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url)")
      .eq("seller_id", me.id)
      .order("created_at", { ascending: false });
    return { ok: true, data: ((data || []) as ProductRow[]).map(mapProduct) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyPurchases(): Promise<R<Purchase[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("marketplace_purchases")
      .select("id, product_id, amount_paid, currency, purchased_at, product:marketplace_products!marketplace_purchases_product_id_fkey(title)")
      .eq("buyer_id", me.id)
      .order("purchased_at", { ascending: false });
    type PRow = { id: string; product_id: string; amount_paid: number; currency: string; purchased_at: string; product?: { title?: string } | Array<{ title?: string }> | null };
    return {
      ok: true,
      data: ((data || []) as PRow[]).map((r) => {
        const pr = Array.isArray(r.product) ? r.product[0] : r.product;
        return { id: r.id, product_id: r.product_id, product_title: pr?.title || "Unknown", amount_paid: r.amount_paid, currency: r.currency, purchased_at: r.purchased_at };
      }),
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

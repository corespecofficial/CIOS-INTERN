"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Product, Purchase } from "./marketplace-types";
import { atomicWalletDebit, atomicWalletCredit } from "@/app/actions/payments/wallet-debit";

// Re-export types only (type-only exports are fine in "use server" files)
export type { Product, Purchase } from "./marketplace-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

type SellerJoin =
  | { name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }
  | Array<{ name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }>
  | null;

type ProductRow = Record<string, unknown> & { seller?: SellerJoin };

// Percentile is derived from XP position across all intern-like accounts.
// We cache it in-memory per request via a lazy total-count helper so the
// list endpoint doesn't issue N queries.
interface PercentileCache {
  /** Total ranked intern-like accounts, null if not yet computed. */
  total: number | null;
}

async function fetchPercentileTotal(): Promise<number> {
  try {
    const sb = supabaseAdmin();
    const { count } = await sb
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", ["intern", "team_lead", "alumni", "mentor"]);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function rankFor(xp: number, total: number): Promise<number | null> {
  if (!total || xp <= 0) return null;
  try {
    const sb = supabaseAdmin();
    const { count } = await sb
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", ["intern", "team_lead", "alumni", "mentor"])
      .gt("xp", xp);
    // count here = users strictly ABOVE this seller. Their percentile = (count+1)/total.
    const above = count ?? 0;
    const pct = Math.max(1, Math.round(((above + 1) / total) * 100));
    return pct;
  } catch {
    return null;
  }
}

function mapBase(r: ProductRow): Omit<Product, "seller_percentile"> & { _seller_xp: number } {
  const s = Array.isArray(r.seller) ? r.seller[0] : r.seller;
  const xp = Number(s?.xp ?? 0);
  return {
    id: String(r.id),
    seller_id: String(r.seller_id),
    seller_name: s?.name ?? null,
    seller_avatar: s?.avatar_url ?? null,
    seller_xp: xp,
    seller_level: Number(s?.level ?? 1),
    seller_role: String(s?.role ?? "intern"),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    category: String(r.category ?? "other"),
    price_ngn: Number(r.price_ngn ?? 0),
    price_usd: r.price_usd == null ? null : Number(r.price_usd),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    status: String(r.status ?? "active"),
    sales_count: Number(r.sales_count ?? 0),
    rating: Number(r.rating ?? 0),
    created_at: String(r.created_at ?? new Date().toISOString()),
    cover_image_url: (r.cover_image_url as string | null) ?? null,
    pay_min_ngn: r.pay_min_ngn == null ? null : Number(r.pay_min_ngn),
    is_verified: Boolean(r.is_verified ?? false),
    is_featured: Boolean(r.is_featured ?? false),
    built_at_cios: Boolean(r.built_at_cios ?? true),
    slug: (r.slug as string | null) ?? null,
    _seller_xp: xp,
  };
}

async function enrich(rows: ProductRow[]): Promise<Product[]> {
  const total = await fetchPercentileTotal();
  const bases = rows.map(mapBase);
  const uniqueXps = Array.from(new Set(bases.map((b) => b._seller_xp)));
  const pctByXp = new Map<number, number | null>();
  await Promise.all(uniqueXps.map(async (xp) => pctByXp.set(xp, await rankFor(xp, total))));
  return bases.map(({ _seller_xp, ...rest }) => ({
    ...rest,
    seller_percentile: pctByXp.get(_seller_xp) ?? null,
  }));
}

async function enrichOne(r: ProductRow): Promise<Product> {
  const total = await fetchPercentileTotal();
  const b = mapBase(r);
  const { _seller_xp, ...rest } = b;
  return { ...rest, seller_percentile: await rankFor(_seller_xp, total) };
}

export async function listProducts(opts?: { category?: string; limit?: number }): Promise<R<Product[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url,xp,level,role)")
      .eq("status", "active")
      // Featured products surface first; then newest. Matches Creative Market pattern.
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 60);
    if (opts?.category) q = q.eq("category", opts.category);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: await enrich((data || []) as ProductRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getProduct(id: string): Promise<R<Product>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url,xp,level,role)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { ok: false, error: "Product not found" };
    return { ok: true, data: await enrichOne(data as ProductRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listProductsBySeller(sellerId: string): Promise<R<Product[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url,xp,level,role)")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    return { ok: true, data: await enrich((data || []) as ProductRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createProduct(input: {
  title: string; description: string; category: string;
  price_ngn: number; price_usd?: number; tags?: string[];
  cover_image_url?: string; pay_min_ngn?: number | null;
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.title.trim().length < 3) return { ok: false, error: "Title too short" };
    if (input.description.trim().length < 20) return { ok: false, error: "Description too short (min 20 chars)" };
    if (input.price_ngn < 0) return { ok: false, error: "Price cannot be negative" };
    if (input.pay_min_ngn != null && input.pay_min_ngn < 0) return { ok: false, error: "Minimum pay cannot be negative" };
    if (input.pay_min_ngn != null && input.pay_min_ngn > input.price_ngn) return { ok: false, error: "Minimum pay cannot exceed suggested price" };

    const sb = supabaseAdmin();
    const slug = slugify(input.title);
    const { data, error } = await sb.from("marketplace_products").insert({
      seller_id: me.id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      price_ngn: input.price_ngn,
      price_usd: input.price_usd || null,
      tags: input.tags || [],
      cover_image_url: input.cover_image_url || null,
      pay_min_ngn: input.pay_min_ngn ?? null,
      slug,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to create product" };
    revalidatePath("/marketplace");
    revalidatePath("/marketplace/sell");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateProduct(id: string, patch: {
  title?: string; description?: string; category?: string;
  price_ngn?: number; price_usd?: number | null; tags?: string[]; status?: string;
  cover_image_url?: string | null; pay_min_ngn?: number | null;
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
    revalidatePath(`/marketplace/${id}`);
    revalidatePath("/marketplace/sell");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface RecordPurchaseInput {
  productId: string;
  /** Override amount for pay-what-you-want products. If unset, uses product.price_ngn. */
  amount?: number;
}

/**
 * Record a purchase. Supports pay-what-you-want: when `amount` is passed it
 * overrides the listed price, subject to the product's pay_min_ngn floor.
 * The 15% platform / 85% seller split applies to whatever amount was paid.
 */
export async function recordPurchase(input: string | RecordPurchaseInput): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const productId = typeof input === "string" ? input : input.productId;
    const amountOverride = typeof input === "string" ? undefined : input.amount;

    const sb = supabaseAdmin();
    const { data: product } = await sb
      .from("marketplace_products")
      .select("price_ngn, pay_min_ngn, seller_id, status, title")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { ok: false, error: "Product not found" };
    const p = product as { price_ngn: number; pay_min_ngn: number | null; seller_id: string; status: string; title: string };
    if (p.status !== "active") return { ok: false, error: "Product is not available" };
    if (p.seller_id === me.id) return { ok: false, error: "Cannot purchase your own product" };

    const listed = Number(p.price_ngn);
    const isPwyw = p.pay_min_ngn != null && amountOverride != null;
    let amountPaid = listed;
    if (isPwyw) {
      const floor = Number(p.pay_min_ngn);
      if (amountOverride! < floor) return { ok: false, error: `Minimum is ₦${floor.toLocaleString()}` };
      amountPaid = amountOverride!;
    }

    const platformCut = Math.round(amountPaid * 0.15); // 15% platform fee
    const sellerPayout = amountPaid - platformCut;
    const tip = Math.max(0, amountPaid - listed);

    // Debit buyer's wallet
    if (amountPaid > 0) {
      const debit = await atomicWalletDebit({
        userId: me.id,
        amount: amountPaid,
        type: "payment",
        description: `Purchase: ${p.title}`,
        idempotencyKey: `marketplace-buy-${me.id}-${productId}-${Date.now()}`,
        gateway: "internal",
        metadata: { product_id: productId, pwyw: isPwyw, tip },
      });
      if (!debit.ok) return { ok: false, error: debit.error };
    }

    // Credit seller (85% of amountPaid)
    if (sellerPayout > 0) {
      await atomicWalletCredit({
        userId: p.seller_id,
        amount: sellerPayout,
        type: "credit",
        description: `Sale: ${p.title} (after 15% platform fee)`,
        idempotencyKey: `marketplace-sell-${p.seller_id}-${productId}-${Date.now()}`,
        gateway: "internal",
        metadata: { product_id: productId, buyer_id: me.id, pwyw: isPwyw, tip },
      });
    }

    const { data, error } = await sb.from("marketplace_purchases")
      .insert({ buyer_id: me.id, product_id: productId, amount_paid: amountPaid, currency: "NGN", tip_ngn: tip, is_pwyw: isPwyw })
      .select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Purchase record failed" };

    const { count } = await sb.from("marketplace_purchases")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    await sb.from("marketplace_products")
      .update({ sales_count: count || 1, updated_at: new Date().toISOString() })
      .eq("id", productId);

    revalidatePath("/marketplace");
    revalidatePath(`/marketplace/${productId}`);
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getMyProducts(): Promise<R<Product[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("marketplace_products")
      .select("*, seller:users!marketplace_products_seller_id_fkey(name,avatar_url,xp,level,role)")
      .eq("seller_id", me.id)
      .order("created_at", { ascending: false });
    return { ok: true, data: await enrich((data || []) as ProductRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);
}

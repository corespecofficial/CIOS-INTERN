"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { CreativeSpace, SyllabusSection, SpaceReview } from "./creative-spaces-types";
import { atomicWalletDebit, atomicWalletCredit } from "@/app/actions/payments/wallet-debit";

export type { CreativeSpace, SyllabusSection, SpaceReview } from "./creative-spaces-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

type OwnerJoin =
  | { name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }
  | Array<{ name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }>
  | null;

type SpaceRow = Record<string, unknown> & { owner?: OwnerJoin };

async function fetchPercentileTotal(): Promise<number> {
  try {
    const sb = supabaseAdmin();
    const { count } = await sb
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", ["intern", "team_lead", "alumni", "mentor", "instructor"]);
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
      .in("role", ["intern", "team_lead", "alumni", "mentor", "instructor"])
      .gt("xp", xp);
    const above = count ?? 0;
    return Math.max(1, Math.round(((above + 1) / total) * 100));
  } catch {
    return null;
  }
}

function mapBase(r: SpaceRow): Omit<CreativeSpace, "owner_percentile"> & { _owner_xp: number } {
  const o = Array.isArray(r.owner) ? r.owner[0] : r.owner;
  const xp = Number(o?.xp ?? 0);
  const syllabusRaw = r.syllabus;
  let syllabus: SyllabusSection[] = [];
  if (Array.isArray(syllabusRaw)) syllabus = syllabusRaw as SyllabusSection[];
  else if (typeof syllabusRaw === "string") {
    try { syllabus = JSON.parse(syllabusRaw) as SyllabusSection[]; } catch { syllabus = []; }
  }
  return {
    id: String(r.id),
    owner_id: String(r.owner_id),
    owner_name: o?.name ?? null,
    owner_avatar: o?.avatar_url ?? null,
    owner_xp: xp,
    owner_level: Number(o?.level ?? 1),
    owner_role: String(o?.role ?? "instructor"),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    category: String(r.category ?? "Other"),
    format: String(r.format ?? "live"),
    price_per_student: Number(r.price_per_student ?? 0),
    capacity: Number(r.capacity ?? 0),
    status: String(r.status ?? "pending"),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    schedule: (r.schedule as string | null) ?? null,
    duration_weeks: r.duration_weeks == null ? null : Number(r.duration_weeks),
    enrollment_count: Number(r.enrollment_count ?? 0),
    meeting_link: (r.meeting_link as string | null) ?? null,
    is_live: Boolean(r.is_live ?? false),
    created_at: String(r.created_at ?? new Date().toISOString()),
    updated_at: String(r.updated_at ?? new Date().toISOString()),
    cover_image_url: (r.cover_image_url as string | null) ?? null,
    intro_video_url: (r.intro_video_url as string | null) ?? null,
    outcomes: Array.isArray(r.outcomes) ? (r.outcomes as string[]) : [],
    syllabus,
    rating: Number(r.rating ?? 0),
    review_count: Number(r.review_count ?? 0),
    is_featured: Boolean(r.is_featured ?? false),
    slug: (r.slug as string | null) ?? null,
    _owner_xp: xp,
  };
}

async function enrich(rows: SpaceRow[]): Promise<CreativeSpace[]> {
  const total = await fetchPercentileTotal();
  const bases = rows.map(mapBase);
  const uniqueXps = Array.from(new Set(bases.map((b) => b._owner_xp)));
  const pctByXp = new Map<number, number | null>();
  await Promise.all(uniqueXps.map(async (xp) => pctByXp.set(xp, await rankFor(xp, total))));
  return bases.map(({ _owner_xp, ...rest }) => ({
    ...rest,
    owner_percentile: pctByXp.get(_owner_xp) ?? null,
  }));
}

async function enrichOne(r: SpaceRow): Promise<CreativeSpace> {
  const total = await fetchPercentileTotal();
  const b = mapBase(r);
  const { _owner_xp, ...rest } = b;
  return { ...rest, owner_percentile: await rankFor(_owner_xp, total) };
}

const SELECT = "*, owner:users!creative_spaces_owner_id_fkey(name,avatar_url,xp,level,role)";

export async function listApprovedSpaces(opts?: { category?: string; format?: string; limit?: number }): Promise<R<CreativeSpace[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb.from("creative_spaces")
      .select(SELECT)
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(opts?.limit || 60);
    if (opts?.category) q = q.eq("category", opts.category);
    if (opts?.format) q = q.eq("format", opts.format);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: await enrich((data || []) as SpaceRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getSpace(id: string): Promise<R<CreativeSpace>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_spaces").select(SELECT).eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Space not found" };
    return { ok: true, data: await enrichOne(data as SpaceRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listSpacesByOwner(ownerId: string): Promise<R<CreativeSpace[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_spaces")
      .select(SELECT)
      .eq("owner_id", ownerId)
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    return { ok: true, data: await enrich((data || []) as SpaceRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getSpaceReviews(spaceId: string, limit = 20): Promise<R<SpaceReview[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("creative_space_reviews")
      .select("id, space_id, reviewer_id, rating, body, created_at, reviewer:users!creative_space_reviews_reviewer_id_fkey(name, avatar_url)")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
    type Rev = {
      id: string; space_id: string; reviewer_id: string; rating: number; body: string | null; created_at: string;
      reviewer?: { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null;
    };
    const rows = ((data || []) as Rev[]).map((r) => {
      const rv = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer;
      return {
        id: r.id,
        space_id: r.space_id,
        reviewer_id: r.reviewer_id,
        reviewer_name: rv?.name ?? null,
        reviewer_avatar: rv?.avatar_url ?? null,
        rating: r.rating,
        body: r.body,
        created_at: r.created_at,
      } as SpaceReview;
    });
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ApplySpaceInput {
  title: string;
  description: string;
  category: string;
  format: string;
  price_per_student: number;
  capacity: number;
  tags?: string[];
  schedule?: string;
  duration_weeks?: number;
  // Phase 2
  cover_image_url?: string;
  intro_video_url?: string;
  outcomes?: string[];
  syllabus?: SyllabusSection[];
}

export async function applyForSpace(input: ApplySpaceInput): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.title.trim().length < 5) return { ok: false, error: "Title too short (min 5 chars)" };
    if (input.description.trim().length < 30) return { ok: false, error: "Description too short (min 30 chars)" };

    const sb = supabaseAdmin();
    const slug = slugify(input.title);
    const { data, error } = await sb.from("creative_spaces").insert({
      owner_id: me.id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      format: input.format,
      price_per_student: input.price_per_student,
      capacity: input.capacity,
      tags: input.tags || [],
      schedule: input.schedule || null,
      duration_weeks: input.duration_weeks || 4,
      cover_image_url: input.cover_image_url || null,
      intro_video_url: input.intro_video_url || null,
      outcomes: input.outcomes || [],
      syllabus: input.syllabus || [],
      slug,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to submit" };
    revalidatePath("/creative-space");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Enrol in a space. Handles free + paid in one action:
 *   - Free spaces: instant enrolment, payment_status='free'.
 *   - Paid spaces: debits buyer's wallet, credits instructor (85%), 15% to CIOS pool.
 *     The Paystack top-up is a separate flow; if wallet is insufficient the
 *     caller surfaces a "Top up your wallet" CTA.
 */
export async function enrollInSpace(spaceId: string): Promise<R<{ paid: boolean; amount: number }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();

    const { data: space } = await sb.from("creative_spaces")
      .select("status, capacity, enrollment_count, owner_id, price_per_student, title")
      .eq("id", spaceId)
      .maybeSingle();
    if (!space) return { ok: false, error: "Space not found" };
    const s = space as { status: string; capacity: number; enrollment_count: number; owner_id: string; price_per_student: number; title: string };
    if (s.status !== "approved") return { ok: false, error: "Space not open for enrollment" };
    if (s.owner_id === me.id) return { ok: false, error: "Cannot enroll in your own space" };
    if (s.enrollment_count >= s.capacity) return { ok: false, error: "Space is full" };

    const { data: existing } = await sb.from("creative_enrollments")
      .select("id").eq("space_id", spaceId).eq("student_id", me.id).maybeSingle();
    if (existing) return { ok: false, error: "Already enrolled" };

    const price = Number(s.price_per_student ?? 0);
    let paymentStatus: "free" | "paid" = "free";

    if (price > 0) {
      const platformCut = Math.round(price * 0.15);
      const instructorPayout = price - platformCut;

      const debit = await atomicWalletDebit({
        userId: me.id,
        amount: price,
        type: "payment",
        description: `Creative Space enrolment: ${s.title}`,
        idempotencyKey: `cs-enrol-${me.id}-${spaceId}-${Date.now()}`,
        gateway: "internal",
        metadata: { space_id: spaceId, instructor_id: s.owner_id },
      });
      if (!debit.ok) {
        return {
          ok: false,
          error: debit.error.toLowerCase().includes("insufficient")
            ? "Wallet balance too low — top up your wallet to enrol."
            : debit.error,
        };
      }

      await atomicWalletCredit({
        userId: s.owner_id,
        amount: instructorPayout,
        type: "credit",
        description: `Creative Space payout: ${s.title} (after 15% platform fee)`,
        idempotencyKey: `cs-payout-${s.owner_id}-${spaceId}-${Date.now()}`,
        gateway: "internal",
        metadata: { space_id: spaceId, student_id: me.id },
      });

      paymentStatus = "paid";
    }

    const { error: insertErr } = await sb.from("creative_enrollments").insert({
      space_id: spaceId,
      student_id: me.id,
      amount_paid_ngn: price,
      payment_status: paymentStatus,
    });
    if (insertErr) {
      if (insertErr.code === "23505") return { ok: false, error: "Already enrolled" };
      return { ok: false, error: insertErr.message };
    }

    await sb.from("creative_spaces")
      .update({ enrollment_count: s.enrollment_count + 1, updated_at: new Date().toISOString() })
      .eq("id", spaceId);

    revalidatePath("/creative-space");
    revalidatePath(`/creative-space/${spaceId}`);
    return { ok: true, data: { paid: paymentStatus === "paid", amount: price } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function submitSpaceReview(input: { spaceId: string; rating: number; body?: string }): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.rating < 1 || input.rating > 5) return { ok: false, error: "Rating must be 1-5" };
    const sb = supabaseAdmin();

    // Only enrolled learners can review.
    const { data: enrolment } = await sb
      .from("creative_enrollments")
      .select("id")
      .eq("space_id", input.spaceId)
      .eq("student_id", me.id)
      .maybeSingle();
    if (!enrolment) return { ok: false, error: "Enrol in this space before reviewing it" };

    const { error } = await sb.from("creative_space_reviews").upsert({
      space_id: input.spaceId,
      reviewer_id: me.id,
      rating: input.rating,
      body: input.body?.trim() || null,
    }, { onConflict: "space_id,reviewer_id" });
    if (error) return { ok: false, error: error.message };

    // Recompute aggregate rating + count.
    const { data: agg } = await sb
      .from("creative_space_reviews")
      .select("rating")
      .eq("space_id", input.spaceId);
    const rows = (agg || []) as Array<{ rating: number }>;
    const count = rows.length;
    const avg = count === 0 ? 0 : rows.reduce((a, r) => a + r.rating, 0) / count;
    await sb.from("creative_spaces")
      .update({ rating: Number(avg.toFixed(2)), review_count: count, updated_at: new Date().toISOString() })
      .eq("id", input.spaceId);

    revalidatePath(`/creative-space/${input.spaceId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getMySpaces(): Promise<R<CreativeSpace[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_spaces")
      .select(SELECT)
      .eq("owner_id", me.id)
      .order("created_at", { ascending: false });
    return { ok: true, data: await enrich((data || []) as SpaceRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getMyEnrollments(): Promise<R<CreativeSpace[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("creative_enrollments")
      .select(`space:creative_spaces!creative_enrollments_space_id_fkey(${SELECT})`)
      .eq("student_id", me.id);
    type ERow = { space?: SpaceRow | SpaceRow[] | null };
    const raw = ((data || []) as ERow[])
      .flatMap((r) => {
        const sp = Array.isArray(r.space) ? r.space[0] : r.space;
        return sp ? [sp] : [];
      });
    return { ok: true, data: await enrich(raw) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function adminListSpaces(status?: string): Promise<R<CreativeSpace[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    let q = sb.from("creative_spaces").select(SELECT).order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data } = await q;
    return { ok: true, data: await enrich((data || []) as SpaceRow[]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateSpaceMeetingLink(spaceId: string, meetingLink: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: space } = await sb.from("creative_spaces").select("owner_id").eq("id", spaceId).maybeSingle();
    if (!space || (space as { owner_id: string }).owner_id !== me.id) return { ok: false, error: "Not your space" };
    await sb.from("creative_spaces").update({ meeting_link: meetingLink.trim() || null, updated_at: new Date().toISOString() }).eq("id", spaceId);
    revalidatePath("/creative-space/manage");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleSpaceLive(spaceId: string, isLive: boolean): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: space } = await sb.from("creative_spaces").select("owner_id, title, meeting_link").eq("id", spaceId).maybeSingle();
    if (!space) return { ok: false, error: "Space not found" };
    const s = space as { owner_id: string; title: string; meeting_link: string | null };
    if (s.owner_id !== me.id) return { ok: false, error: "Not your space" };
    await sb.from("creative_spaces").update({ is_live: isLive, updated_at: new Date().toISOString() }).eq("id", spaceId);

    if (isLive) {
      const { data: enrollments } = await sb.from("creative_enrollments").select("student_id").eq("space_id", spaceId);
      if (enrollments && enrollments.length > 0) {
        const notifications = (enrollments as { student_id: string }[]).map((e) => ({
          user_id: e.student_id,
          title: "🔴 Space is Live Now!",
          message: `"${s.title}" has just started${s.meeting_link ? ` — join at ${s.meeting_link}` : ""}.`,
          type: "info",
          action_url: `/creative-space/${spaceId}`,
          is_read: false,
        }));
        await sb.from("notifications").insert(notifications);
      }
    }

    revalidatePath("/creative-space/manage");
    revalidatePath(`/creative-space/${spaceId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function reviewSpace(spaceId: string, decision: "approved" | "rejected"): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    await sb.from("creative_spaces").update({ status: decision, updated_at: new Date().toISOString() }).eq("id", spaceId);
    revalidatePath("/admin/creative-spaces");
    revalidatePath("/creative-space");
    return { ok: true };
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

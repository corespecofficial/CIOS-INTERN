"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { CreativeSpace, SyllabusSection, SpaceReview } from "./creative-spaces-types";
import { atomicWalletDebit, atomicWalletCredit } from "@/app/actions/payments/wallet-debit";
import { slugifyOrgName, isReservedSlug, invalidateMembership } from "@/lib/active-org";
import { clerkClient } from "@clerk/nextjs/server";
import { logOrgAudit } from "@/lib/org-audit";
import { cached, TTL } from "@/lib/cache";

export type { CreativeSpace, SyllabusSection, SpaceReview } from "./creative-spaces-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

type OwnerJoin =
  | { name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }
  | Array<{ name?: string | null; avatar_url?: string | null; xp?: number | null; level?: number | null; role?: string | null }>
  | null;

type SpaceRow = Record<string, unknown> & { owner?: OwnerJoin };

/**
 * Total count of users in the "ranked roles" — used as the denominator
 * for owner_percentile. This is a full-table COUNT(*) on users; at any
 * non-trivial scale (10k+ users) it dominates the cost of every list
 * query that calls enrich(). Cached at TTL.medium (5 min) — the value
 * drifts very slowly compared to how often spaces are listed.
 */
async function fetchPercentileTotal(): Promise<number> {
  return cached("creative_spaces:percentile_total", TTL.medium, async () => {
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
  });
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
    org_id: (r.org_id as string | null) ?? null,
    org_slug: null,           // filled in by enrich() via a single org join
    org_member_count: null,   // ditto
    _owner_xp: xp,
  };
}

async function enrich(rows: SpaceRow[]): Promise<CreativeSpace[]> {
  const total = await fetchPercentileTotal();
  const bases = rows.map(mapBase);
  const uniqueXps = Array.from(new Set(bases.map((b) => b._owner_xp)));
  const pctByXp = new Map<number, number | null>();
  await Promise.all(uniqueXps.map(async (xp) => pctByXp.set(xp, await rankFor(xp, total))));

  // Single batched lookup for the orgs that have been provisioned for these
  // spaces (only approved spaces have org_id set; pending rows are noop).
  const orgIds = bases.map((b) => b.org_id).filter((x): x is string => !!x);
  const orgBySlug = new Map<string, { slug: string; member_count: number }>();
  if (orgIds.length > 0) {
    try {
      const { data } = await supabaseAdmin()
        .from("creative_orgs")
        .select("id, slug, member_count")
        .in("id", orgIds);
      for (const o of (data || []) as { id: string; slug: string; member_count: number }[]) {
        orgBySlug.set(o.id, { slug: o.slug, member_count: o.member_count });
      }
    } catch {/* table may not yet exist on a fresh deploy — leave fields null */}
  }

  return bases.map(({ _owner_xp, ...rest }) => {
    const org = rest.org_id ? orgBySlug.get(rest.org_id) : null;
    return {
      ...rest,
      org_slug: org?.slug ?? null,
      org_member_count: org?.member_count ?? null,
      owner_percentile: pctByXp.get(_owner_xp) ?? null,
    };
  });
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

/**
 * Fetch a space by id OR slug.
 *
 * Most public-portal links use the slug (it's pretty + SEO-friendly:
 * /creative-space/perfect-charisma-me5cf), but a few legacy paths still
 * pass the UUID. We sniff the param shape to avoid an OR on the
 * Postgres side: a UUID is exactly 36 chars with the canonical 8-4-4-
 * 4-12 hex layout, anything else is a slug. The slug column has its
 * own UNIQUE index (creative_spaces_slug_unique from p382) so the
 * lookup is single-row + fast either way.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSpace(idOrSlug: string): Promise<R<CreativeSpace>> {
  try {
    const sb = supabaseAdmin();
    const lookupColumn = UUID_RE.test(idOrSlug) ? "id" : "slug";
    const { data } = await sb.from("creative_spaces").select(SELECT).eq(lookupColumn, idOrSlug).maybeSingle();
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
    const newSpaceId = (data as { id: string }).id;

    // Provision the host's tenant org IMMEDIATELY on creation, not on
    // approval. Two reasons:
    //   1. The creator gets their host portal day-one — they can build
    //      lessons, configure channels, set settings, draft
    //      announcements while super-admin reviews. Without this the
    //      space is "dormant" with nothing real attached, just a
    //      pending row.
    //   2. Public marketplace visibility (creative_spaces.status =
    //      'approved') is now decoupled from org existence. Approval
    //      just flips the storefront switch; the org has been real
    //      since the moment the space was submitted.
    // Failures here are non-fatal: the space row is in, the user can
    // resubmit / the admin can re-trigger via reviewSpace which still
    // calls this idempotently.
    try {
      const provision = await provisionOrgFromSpace(newSpaceId);
      if (!provision.ok) {
        console.warn(`[applyForSpace] provisioning deferred for space ${newSpaceId}: ${provision.error}`);
      }
    } catch (e) {
      console.warn("[applyForSpace] provisionOrgFromSpace threw:", e);
    }

    revalidatePath("/creative-space");
    return { ok: true, data: { id: newSpaceId } };
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
      .select("status, capacity, enrollment_count, owner_id, price_per_student, title, org_id")
      .eq("id", spaceId)
      .maybeSingle();
    if (!space) return { ok: false, error: "Space not found" };
    const s = space as { status: string; capacity: number; enrollment_count: number; owner_id: string; price_per_student: number; title: string; org_id: string | null };
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

    // Org-membership sync: marketplace enrollment ALSO makes you an
    // active student in that space's tenant org. Without this, the
    // /s/<slug> portal — lessons, chat, files, assignments — was
    // unreachable to anyone who joined via the public listing
    // (only invite/code redemption added them to org_members).
    // The Supabase upsert is idempotent on (org_id, user_id) so a
    // student-then-removed-then-rejoin lands cleanly.
    if (s.org_id) {
      try {
        await sb.from("org_members").upsert(
          { org_id: s.org_id, user_id: me.id, role: "student", status: "active" },
          { onConflict: "org_id,user_id" },
        );
        // Drift-proof recount via the p393 helper (counts active
        // members from the source-of-truth table, race-safe under
        // concurrent enrolments).
        await sb.rpc("recount_org_members", { p_org_id: s.org_id });
        // Bust the per-user-per-slug membership cache so the edge
        // tenant guard sees the new role on the next request.
        const { data: orgRow } = await sb.from("creative_orgs").select("slug").eq("id", s.org_id).maybeSingle();
        const slug = (orgRow as { slug?: string } | null)?.slug;
        if (slug && me.clerk_id) {
          await invalidateMembership(me.clerk_id, slug);
        }
      } catch (e) {
        // Non-fatal: the creative_enrollments row is in, so the
        // marketplace listing reflects the enrolment. Org-membership
        // sync can be re-run via the backfill route if it ever drifts.
        console.warn(`[enrollInSpace] org_members sync deferred for space ${spaceId}:`, e);
      }
    }

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

export async function reviewSpace(
  spaceId: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<R<{ provisionWarning?: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();

    // Pull the applicant + space metadata BEFORE the status flip so the
    // notification copy is well-formed even if a downstream read fails.
    const { data: spaceRow } = await sb
      .from("creative_spaces")
      .select("owner_id, title, slug")
      .eq("id", spaceId)
      .maybeSingle();
    const space = spaceRow as { owner_id: string; title: string; slug: string | null } | null;

    await sb.from("creative_spaces").update({ status: decision, updated_at: new Date().toISOString() }).eq("id", spaceId);

    let provisionWarning: string | undefined;
    if (decision === "approved") {
      // Spawn the host's tenant org. Idempotent on creative_orgs.space_id
      // UNIQUE, so the admin can re-click Approve to retry a partial
      // provision (e.g. if Clerk was rate-limiting the role promotion).
      const r = await provisionOrgFromSpace(spaceId);
      if (!r.ok) {
        // Don't roll back the status flip — that would block the admin
        // from approving entirely. Instead surface the failure so the UI
        // can show "Approved, but provisioning needs retry: <reason>"
        // and the admin can re-click after fixing the underlying issue.
        console.warn("[reviewSpace] provisionOrgFromSpace failed:", r.error);
        provisionWarning = `Provisioning failed: ${r.error}. Click Approve again to retry.`;
      }
    } else if (decision === "rejected" && space) {
      // Tell the applicant the news. Without this they'd watch their
      // pending application disappear from /visitor/applications with no
      // explanation — a worse experience than receiving "your space was
      // not approved this time" with the reviewer's reason. The
      // approval path already notifies via provisionOrgFromSpace.
      try {
        await sb.from("notifications").insert({
          user_id: space.owner_id,
          title: "Your Creative Space wasn't approved this time",
          message: reason
            ? `Reviewer note: ${reason.slice(0, 240)}`
            : `Your application for "${space.title}" was not approved. You can refine it and submit again, or reach out for guidance.`,
          type: "warning",
          action_url: "/creative-space/manage",
          is_read: false,
        });
      } catch (e) {
        console.warn("[reviewSpace] reject notification failed (non-fatal):", e);
      }
    }

    revalidatePath("/admin/creative-spaces");
    revalidatePath("/creative-space");
    return { ok: true, data: provisionWarning ? { provisionWarning } : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Spawn the per-host org tenant from an approved creative_space. Idempotent:
 *   - re-running does nothing if `creative_orgs.space_id` already exists
 *   - safe to call from the admin approval path, the backfill route, or
 *     a manual super-admin "re-provision" button later
 *
 * Steps:
 *   1. Insert creative_orgs (slug from space.slug, owner = space.owner_id)
 *   2. Backlink: creative_spaces.org_id = <new org>
 *   3. Insert org_members(owner)
 *   4. Seed defaults: org_channels (general, announcements) + welcome announcement
 *   5. Backfill existing creative_enrollments → org_members(student)
 *   6. Promote owner Clerk role to "creative_host" iff they're currently
 *      intern/public_user (don't downgrade higher-privileged users)
 *   7. Send in-app notification with org_id set
 */
export async function provisionOrgFromSpace(spaceId: string): Promise<R<{ orgId: string; created: boolean }>> {
  try {
    const sb = supabaseAdmin();

    // Idempotency check first — single point of "already provisioned".
    {
      const { data: existing } = await sb
        .from("creative_orgs")
        .select("id")
        .eq("space_id", spaceId)
        .maybeSingle();
      if (existing) return { ok: true, data: { orgId: (existing as { id: string }).id, created: false } };
    }

    const { data: spaceRow } = await sb
      .from("creative_spaces")
      .select("id, owner_id, title, slug, status")
      .eq("id", spaceId)
      .maybeSingle();
    if (!spaceRow) return { ok: false, error: "Space not found" };
    const space = spaceRow as { id: string; owner_id: string; title: string; slug: string | null; status: string };
    // No status gate — the org is real the moment the space is
    // submitted. creative_spaces.status governs marketplace visibility
    // ('pending' = invisible, 'approved' = listed). Org existence is
    // separate so creators can build their portal while reviewing.
    // Rejected spaces still get a real (un-listed) org so reviewers
    // can preview content and the creator can revise.

    // Slug — try the space's existing slug first; fall back to a fresh one
    // on collision. Two retries is enough; the random suffix in slugifyOrgName
    // makes a third collision astronomically unlikely.
    //
    // Reserved-slug guard: if the marketplace slug happens to collide
    // with a platform path ('admin', 'api', 'settings', etc.), bypass it
    // and generate a safe one. Without this, /o/admin would shadow the
    // admin route or just fail unique-conflict against future data.
    let slug = (space.slug && !isReservedSlug(space.slug))
      ? space.slug
      : slugifyOrgName(space.title);
    let orgId: string | null = null;
    for (let attempt = 0; attempt < 3 && !orgId; attempt++) {
      const { data, error } = await sb
        .from("creative_orgs")
        .insert({
          space_id: space.id,
          slug,
          name: space.title,
          owner_user_id: space.owner_id,
          status: "active",
          plan: "free",
          // storage_prefix can't be filled with the org id until we have it;
          // use a temp value derived from space_id, then update post-insert.
          // (Avoids a schema-level "DEFAULT" that would couple us to id format.)
          storage_prefix: `orgs/space-${space.id}/`,
        })
        .select("id")
        .single();
      if (!error && data) {
        orgId = (data as { id: string }).id;
        break;
      }
      const msg = error?.message || "";
      if (/duplicate key/i.test(msg) && /slug/i.test(msg)) {
        slug = slugifyOrgName(space.title);
        continue;
      }
      return { ok: false, error: msg || "Failed to create org" };
    }
    if (!orgId) return { ok: false, error: "Slug collisions exhausted" };

    // Lock storage prefix to the canonical org-id form now that we have it.
    await sb.from("creative_orgs")
      .update({ storage_prefix: `orgs/${orgId}/` })
      .eq("id", orgId);

    // Backlink the marketplace listing to the new tenant.
    await sb.from("creative_spaces").update({ org_id: orgId }).eq("id", space.id);

    // Owner membership — first member of the org, by definition.
    await sb.from("org_members").insert({
      org_id: orgId,
      user_id: space.owner_id,
      role: "owner",
      status: "active",
    });

    // Default channels.
    await sb.from("org_channels").insert([
      { org_id: orgId, name: "general", kind: "general" },
      { org_id: orgId, name: "announcements", kind: "announcements" },
    ]);

    // Welcome announcement — visible to everyone the moment they join.
    await sb.from("org_announcements").insert({
      org_id: orgId,
      author_id: space.owner_id,
      title: `Welcome to ${space.title}`,
      body: "Your space is live. Add your first lesson to get students started.",
      pinned: true,
    });

    // Backfill existing public-marketplace enrollees as org students.
    const { data: enrollRows } = await sb
      .from("creative_enrollments")
      .select("student_id")
      .eq("space_id", space.id);
    const enrollees = (enrollRows as { student_id: string }[] | null) ?? [];
    if (enrollees.length > 0) {
      const memberRows = enrollees.map((e) => ({
        org_id: orgId!,
        user_id: e.student_id,
        role: "student" as const,
        status: "active" as const,
      }));
      // ON CONFLICT (org_id, user_id) handled by ignoring duplicates.
      await sb.from("org_members").upsert(memberRows, { onConflict: "org_id,user_id", ignoreDuplicates: true });
    }
    // Drift-proof recount instead of trusting upsert duplicate-ignore
    // arithmetic. Was: const totalMembers = 1 + enrollees.length —
    // wrong if any enrollee was already deduped or the owner happened
    // to also be in creative_enrollments.
    await sb.rpc("recount_org_members", { p_org_id: orgId });

    // Promote Clerk role — only for low-privilege roles. Higher roles
    // keep their existing access; we never downgrade. Failures here
    // would leave Supabase saying creative_host but Clerk still saying
    // intern/public_user — the host couldn't enter their own portal
    // because middleware reads Clerk. Surface as a warning on the
    // returned data so the admin UI can show "org created but role
    // promotion needs retry" instead of a silent green toast.
    let clerkPromotionWarning: string | null = null;
    try {
      const { data: ownerRow } = await sb
        .from("users")
        .select("clerk_id, role")
        .eq("id", space.owner_id)
        .maybeSingle();
      const owner = ownerRow as { clerk_id: string | null; role: string } | null;
      if (owner?.clerk_id && (owner.role === "intern" || owner.role === "public_user")) {
        const client = await clerkClient();
        await client.users.updateUserMetadata(owner.clerk_id, {
          publicMetadata: { role: "creative_host" },
        });
        await sb.from("users").update({ role: "creative_host" }).eq("id", space.owner_id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[provisionOrgFromSpace] clerk role promotion failed:", msg);
      clerkPromotionWarning = `Owner role promotion failed: ${msg}`;
    }

    // Notify the owner — first thing they'll see in the bell.
    await sb.from("notifications").insert({
      user_id: space.owner_id,
      org_id: orgId,
      title: "🏫 Your Creative Space is live",
      message: `"${space.title}" is approved. Your portal is at /o/${slug}.`,
      type: "success",
      action_url: `/o/${slug}`,
      is_read: false,
    });

    // Audit: org creation is the most important event in the system —
    // log who triggered it (the reviewing admin) along with the source
    // space + final slug, so super-admin can trace any org back to the
    // approval action.
    const reviewer = await getCurrentDbUser();
    await logOrgAudit({
      orgId, actorId: reviewer?.id ?? null, action: "org.created",
      target: `space:${space.id}`,
      meta: {
        slug, owner_user_id: space.owner_id,
        title: space.title,
        backfilled_enrollees: enrollees.length,
        clerk_promotion_warning: clerkPromotionWarning,
      },
    });

    return {
      ok: true,
      data: { orgId, created: true, ...(clerkPromotionWarning ? { warning: clerkPromotionWarning } : {}) } as { orgId: string; created: boolean },
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

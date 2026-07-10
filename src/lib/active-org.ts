/**
 * Active-org context helpers for the per-host tenant portal.
 *
 * Resolves `[orgSlug]` → org row + caller's per-org role, with cheap
 * server-side caching via React `cache()` (per-request) and Upstash
 * (60s, cross-request — keeps the edge tenant guard off Postgres).
 *
 * Anything reading these helpers should be SERVER-ONLY.
 */

import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { supabaseAdmin, getCurrentDbUser, type DbUser } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel, orgCacheKey, TTL } from "@/lib/cache";

export type OrgMemberRole =
  | "owner"
  | "org_admin"
  | "instructor"
  | "student"
  | "moderator"
  | "finance"
  | "support"
  | "mentor";

export interface CreativeOrg {
  id: string;
  space_id: string;
  slug: string;
  name: string;
  owner_user_id: string;
  status: "active" | "suspended" | "archived";
  plan: string;
  storage_prefix: string;
  member_count: number;
  org_type?: string;
  brand_logo_url?: string | null;
  brand_color?: string | null;
  active_intern_count?: number;
  staff_count?: number;
  intern_limit?: number;
  module_flags?: Record<string, unknown>;
  last_activity_at?: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActiveOrgContext {
  org: CreativeOrg;
  me: DbUser;
  /** caller's per-org role, or null if not a member */
  memberRole: OrgMemberRole | null;
  /** super_admin sees every org regardless of membership */
  isSuperAdmin: boolean;
}

/**
 * Why an attempt to enter an org failed. Returned by getOrgEntryFailure
 * when getActiveOrg returns null, so layouts can render the right
 * message instead of always 404'ing. We deliberately don't distinguish
 * "no such slug" from "you're not a member" — both leak existence.
 */
export type OrgEntryFailure =
  | { kind: "not_found" }      // doesn't exist OR caller isn't a member
  | { kind: "signed_out" }     // no auth user
  | { kind: "suspended"; org: { name: string; slug: string } }
  | { kind: "archived"; org: { name: string; slug: string } };

/**
 * Slugs that must never resolve to a tenant — they collide with platform
 * routes or expose obvious phishing targets. Compared case-insensitively
 * (slug column is CITEXT). Keep in sync with Phase 1 migration.
 */
export const RESERVED_SLUGS = new Set<string>([
  "admin", "api", "auth", "settings", "profile", "notifications",
  "o", "s", "super-admin", "dashboard", "marketplace", "creative-space",
  "investor", "recruiter", "team-lead", "instructor", "support", "finance",
  "moderator", "mentor", "alumni", "sign-in", "sign-up", "post-auth",
  "onboarding", "compliance", "appeals", "suspended", "wallet",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/* ───────────── Resolution ───────────── */

/**
 * Per-request memoized lookup of the active org for a given slug.
 * Returns null if the slug is reserved, the org doesn't exist, OR the
 * caller is not a member AND not super_admin (404 — don't leak existence).
 */
export const getActiveOrg = cache(async (slug: string): Promise<ActiveOrgContext | null> => {
  if (!slug || isReservedSlug(slug)) return null;
  const me = await getCurrentDbUser();
  if (!me) return null;

  const sb = supabaseAdmin();
  const { data: orgRow } = await sb
    .from("creative_orgs")
    .select("id, space_id, slug, name, owner_user_id, status, plan, storage_prefix, member_count, org_type, brand_logo_url, brand_color, active_intern_count, staff_count, intern_limit, module_flags, last_activity_at, settings, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!orgRow) return null;
  const org = orgRow as CreativeOrg;

  const isSuperAdmin = me.role === "super_admin";

  // Org-status gate: members must NOT be able to enter a suspended or
  // archived org. Super-admin still can (so ops can investigate why an
  // org was suspended). Without this check, super-admin's "Suspend"
  // button is cosmetic — affected members keep accessing the portal
  // until the row is deleted. This is the canonical place to enforce
  // the gate because every host-portal and student-portal layout
  // funnels through getActiveOrg.
  if (org.status !== "active" && !isSuperAdmin) return null;

  const { data: memberRow } = await sb
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", me.id)
    .eq("status", "active")
    .maybeSingle();
  const memberRole = (memberRow as { role: OrgMemberRole } | null)?.role ?? null;

  if (!memberRole && !isSuperAdmin) return null;

  return { org, me, memberRole, isSuperAdmin };
});

/**
 * Like getActiveOrg but returns the failure REASON so layouts can render
 * explanatory pages (especially "your org is suspended"). For privacy
 * we still return `not_found` for both "doesn't exist" and "you're not
 * a member" — leaking which would let strangers enumerate org slugs.
 *
 * Suspended/archived statuses ARE returned with the org name, but only
 * for users who are actual members of that org. Non-members of a
 * suspended org get `not_found` like before.
 */
export const getOrgEntryStatus = cache(async (slug: string): Promise<
  | { ok: true; ctx: ActiveOrgContext }
  | { ok: false; failure: OrgEntryFailure }
> => {
  if (!slug || isReservedSlug(slug)) return { ok: false, failure: { kind: "not_found" } };
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, failure: { kind: "signed_out" } };

  const sb = supabaseAdmin();
  const { data: orgRow } = await sb
    .from("creative_orgs")
    .select("id, space_id, slug, name, owner_user_id, status, plan, storage_prefix, member_count, org_type, brand_logo_url, brand_color, active_intern_count, staff_count, intern_limit, module_flags, last_activity_at, settings, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!orgRow) return { ok: false, failure: { kind: "not_found" } };
  const org = orgRow as CreativeOrg;

  const isSuperAdmin = me.role === "super_admin";

  const { data: memberRow } = await sb
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", me.id)
    .eq("status", "active")
    .maybeSingle();
  const memberRole = (memberRow as { role: OrgMemberRole } | null)?.role ?? null;

  // Privacy: non-members get the same not_found regardless of status.
  if (!memberRole && !isSuperAdmin) return { ok: false, failure: { kind: "not_found" } };

  // Members of a non-active org get an explanation. Super-admins still
  // get full access (they need it to investigate).
  if (org.status !== "active" && !isSuperAdmin) {
    if (org.status === "suspended") {
      return { ok: false, failure: { kind: "suspended", org: { name: org.name, slug: org.slug } } };
    }
    if (org.status === "archived") {
      return { ok: false, failure: { kind: "archived", org: { name: org.name, slug: org.slug } } };
    }
    return { ok: false, failure: { kind: "not_found" } };
  }

  return { ok: true, ctx: { org, me, memberRole, isSuperAdmin } };
});

/**
 * Edge-safe membership check used by the middleware tenant guard. Cached
 * in Upstash for 60s — at scale this is the single hottest query in the
 * platform; it MUST NOT hit Postgres on every request.
 *
 * Returns null on cache miss + DB miss (callers should 404). On cache
 * hit returns the user's per-org role for the slug.
 */
export async function getCachedMembership(
  userId: string,
  slug: string,
): Promise<{ orgId: string; role: OrgMemberRole } | null> {
  if (isReservedSlug(slug)) return null;
  const key = orgCacheKey.membership(userId, slug);

  const hit = await cacheGet<{ orgId: string; role: OrgMemberRole } | null>(key);
  if (hit !== null) return hit;

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_members")
    .select("org_id, role, creative_orgs!inner(slug, status)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("creative_orgs.slug", slug)
    .maybeSingle();

  type Row = { org_id: string; role: OrgMemberRole; creative_orgs: { slug: string; status: string } };
  const row = data as Row | null;
  if (!row || row.creative_orgs.status !== "active") {
    // Cache the miss briefly to absorb stampedes from drive-by attempts.
    await cacheSet(key, null, 60);
    return null;
  }

  const value = { orgId: row.org_id, role: row.role };
  await cacheSet(key, value, TTL.short);
  return value;
}

/** Invalidate after any org_members mutation. Pass slug if known to skip a lookup. */
export async function invalidateMembership(userId: string, slug: string): Promise<void> {
  await cacheDel(orgCacheKey.membership(userId, slug));
}

/* ───────────── Server-action wrapper ───────────── */

/**
 * Set the per-request `request.org_id` GUC so RLS predicates resolve to
 * the right tenant. Phase 4+ will route org-scoped writes through this;
 * for now we still rely on `supabaseAdmin()` (service-role bypass) but
 * threading the GUC anyway means turning RLS on later is a no-op.
 *
 * Implementation: we run a `set_config(...)` SQL call before the work.
 * Using `is_local := true` (third argument) would only scope it to the
 * surrounding transaction; we pass `false` because supabase-js opens
 * a fresh connection per call and we want the setting visible to the
 * rest of *this* request's queries. Always reset on the way out.
 */
export async function withOrg<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  const sb = supabaseAdmin();
  try {
    // @ts-expect-error rpc call; set_config is a pg builtin available on supabase
    await sb.rpc("set_config", { setting_name: "request.org_id", new_value: orgId, is_local: false });
  } catch {/* set_config helper may not be exposed; safe to skip — service role bypasses RLS */}
  try {
    return await fn();
  } finally {
    try {
      // @ts-expect-error rpc call
      await sb.rpc("set_config", { setting_name: "request.org_id", new_value: "", is_local: false });
    } catch {/* ignore */}
  }
}

export async function getOrgContextOr404(slug: string): Promise<ActiveOrgContext> {
  const ctx = await getActiveOrg(slug);
  if (!ctx) notFound();
  return ctx;
}

export function hasOrgRole(
  ctx: ActiveOrgContext,
  allowedRoles: ReadonlyArray<OrgMemberRole>,
): boolean {
  return ctx.isSuperAdmin || Boolean(ctx.memberRole && allowedRoles.includes(ctx.memberRole));
}

export function requireOrgRole(
  ctx: ActiveOrgContext,
  allowedRoles: ReadonlyArray<OrgMemberRole>,
): void {
  if (!hasOrgRole(ctx, allowedRoles)) notFound();
}

export async function getOrgMembershipForUser(
  orgId: string,
  userId: string,
): Promise<OrgMemberRole | null> {
  const { data } = await supabaseAdmin()
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (data as { role?: OrgMemberRole } | null)?.role ?? null;
}

/* ───────────── Slug helpers ───────────── */

const SLUG_RANDOM_LEN = 5;

/** Slugify a title; collision is handled by the unique index — caller retries. */
export function slugifyOrgName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "")
    || "org";
  // Reserved-slug collision protection — prefix with "x-" if the bare slug is reserved.
  const safe = isReservedSlug(base) ? `x-${base}` : base;
  return `${safe}-${Math.random().toString(36).slice(2, 2 + SLUG_RANDOM_LEN)}`;
}

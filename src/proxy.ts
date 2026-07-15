import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cacheGet, cacheSet, orgCacheKey, TTL } from '@/lib/cache';

type Role =
  | "intern" | "team_lead" | "admin" | "super_admin"
  | "instructor" | "moderator" | "finance" | "support" | "recruiter"
  | "mentor" | "alumni"
  // Public-portal roles (Phase 0)
  | "public_user" | "investor" | "startup_founder" | "partner_org"
  // Creative-space host portal (per-org tenant owner)
  | "creative_host";

const VALID_ROLES: Role[] = [
  "intern", "team_lead", "admin", "super_admin",
  "instructor", "moderator", "finance", "support", "recruiter",
  "mentor", "alumni",
  "public_user", "investor", "startup_founder", "partner_org",
  "creative_host",
];

// Role → home path
const ROLE_HOME: Record<Role, string> = {
  intern: "/dashboard",
  team_lead: "/team-lead",
  admin: "/admin",
  super_admin: "/super-admin",
  instructor: "/instructor",
  moderator: "/moderator",
  finance: "/finance",
  support: "/support",
  recruiter: "/recruiter",
  mentor: "/mentor",
  alumni: "/alumni",
  // Public-portal roles land users directly in their branded portal.
  // public_user → /visitor (their dedicated portal). DO NOT change this
  // back to /marketplace — that's a public surface, not their home; sending
  // them there triggers the post-auth ⇄ marketplace loop via the
  // "My portal →" button.
  public_user: "/visitor",
  investor: "/investor/dashboard",
  startup_founder: "/startup",
  partner_org: "/partner-portal",
  // Per-host org owner. /o (no slug) redirects to their last-used org.
  creative_host: "/o",
};

// Shared routes everyone can access
// Signed-in users may reach the tenant selectors. Concrete /o/<slug> and
// /s/<slug> paths are still authorized by the membership guard below.
const SHARED_ROUTES = ["/profile", "/settings", "/notifications", "/post-auth", "/onboarding", "/o", "/s"];

// Per-role allowed route prefixes
const ROLE_ACCESS: Record<Role, string[]> = {
  intern: ["/dashboard", "/classroom", "/courses", "/tasks", "/messages", "/community", "/wallet", "/gamification", "/notes", "/performance", "/calendar", "/ai-hub", "/documents", "/recruitment", "/productivity", "/certificates", "/my-analytics", "/announcements", "/mentorship", "/marketplace", "/creative-space", "/wellness", "/guardian", "/hackathons", "/startup", "/compliance", "/appeals", "/suspended", "/s"],
  team_lead: ["/team-lead", "/dashboard", "/classroom", "/courses", "/tasks", "/messages", "/community", "/wallet", "/gamification", "/notes", "/performance", "/calendar", "/ai-hub", "/documents", "/recruitment", "/productivity", "/certificates", "/my-analytics", "/announcements", "/mentorship", "/marketplace", "/creative-space", "/wellness", "/guardian", "/hackathons", "/startup", "/compliance", "/appeals", "/suspended", "/s"],
  admin: [
    "/admin", "/dashboard", "/analytics", "/status",
    "/community", "/team-lead", "/messages", "/tasks", "/classroom",
    "/courses", "/instructor", "/documents", "/productivity", "/certificates",
    "/ai-hub", "/notes", "/performance", "/calendar", "/recruitment",
    "/my-analytics", "/announcements", "/wallet", "/gamification",
    "/marketplace", "/creative-space", "/wellness", "/hackathons", "/startup",
    "/investors", "/mentorship", "/alumni", "/opportunities", "/talent",
    "/compliance", "/appeals", "/suspended", "/recruiter",
    "/moderator", "/finance", "/support", "/leaderboard",
    "/badges", "/missions", "/streaks", "/achievements", "/levels",
    "/live", "/teams", "/peer-review", "/study-buddy",
    "/planner", "/alarms", "/reminders", "/focus-mode",
    "/o", "/s",
  ],
  super_admin: [
    "/dashboard","/classroom","/courses","/tasks","/messages","/community","/wallet","/gamification","/notes","/performance","/calendar",
    "/admin","/super-admin","/team-lead","/instructor","/moderator","/finance","/support",
    "/analytics","/documents","/ai-hub","/recruitment","/status","/productivity",
    "/mentor","/mentorship","/alumni","/marketplace","/creative-space","/wellness","/guardian",
    "/hackathons","/startup","/compliance","/appeals","/suspended",
  ],
  instructor: ["/instructor", "/courses", "/messages", "/community", "/calendar", "/productivity", "/certificates", "/creative-space"],
  moderator: ["/moderator", "/community", "/messages"],
  finance: ["/finance", "/wallet"],
  support: ["/support", "/messages"],
  recruiter: ["/recruiter", "/opportunities", "/talent", "/messages", "/notifications", "/marketplace", "/creative-space", "/hackathons", "/investors", "/mentorship", "/alumni"],
  mentor: ["/mentor", "/mentorship", "/messages", "/community", "/notes", "/calendar", "/productivity", "/certificates", "/announcements", "/alumni", "/marketplace", "/creative-space", "/hackathons", "/compliance", "/appeals", "/suspended"],
  alumni: ["/alumni", "/community", "/opportunities", "/messages", "/notes", "/calendar", "/mentorship", "/announcements", "/marketplace", "/creative-space", "/hackathons", "/startup", "/compliance", "/appeals", "/suspended"],
  // Public-portal roles — see masterplan §2.2.
  // public_user is the baseline registered public ("visitor"): /visitor is
  // their dedicated portal home; the rest are public surfaces they can
  // freely browse. /applications + /onboarding let them track role
  // applications and re-enter the intent gate via "Switch intent".
  public_user: [
    "/visitor",
    "/marketplace", "/creative-space", "/opportunities",
    "/hackathons", "/study-buddy", "/ai-hub", "/documents", "/startups",
    "/mentorship", "/applications", "/onboarding",
    "/profile", "/settings", "/notifications",
  ],
  investor: ["/investor", "/startup", "/startups", "/profile", "/settings", "/notifications"],
  startup_founder: ["/startup", "/startups", "/investor", "/profile", "/settings", "/notifications"],
  partner_org: ["/partner-portal", "/institution", "/company-portal", "/gov-portal", "/partners", "/profile", "/settings", "/notifications"],
  // Creative-space host: their tenant portal at /o, plus /s if they're also
  // a student in someone else's org, plus the marketplace and the same
  // baseline surfaces an intern gets so creators can use the platform too.
  creative_host: [
    "/o", "/s",
    "/dashboard", "/marketplace", "/creative-space", "/messages", "/notifications",
    "/wallet", "/calendar", "/community", "/ai-hub", "/documents",
    "/profile", "/settings",
  ],
};

// Always-shared "in transit" routes — every signed-in user can reach the
// onboarding gate and the invite-redemption page regardless of role.
// Routes the onboarding gate must NOT redirect away from. The gate
// catches signed-in users with onboarding_completed_at = NULL and
// pushes them back to /onboarding/intent. The intern path
// (chooseIntern → /onboarding/enrollment) deliberately doesn't mark
// the user onboarded until they redeem a code, so without exempting
// /onboarding/enrollment here middleware would bounce them straight
// back to /onboarding/intent in an infinite loop.
//
// /onboarding/visitor-welcome is exempted for symmetry: chooseVisitor
// DOES mark onboarded so it's not a current loop, but if a future
// flow ever defers that mark we don't want this trap to reopen.
const ONBOARDING_ROUTES = [
  "/onboarding/intent",
  "/onboarding/enrollment",
  "/onboarding/organization-space",
  "/onboarding/visitor-welcome",
  "/join",
  "/post-auth",
];

const isProtectedRoute = createRouteMatcher([
  '/post-auth(.*)',
  '/dashboard(.*)', '/classroom(.*)', '/courses(.*)', '/tasks(.*)',
  '/messages(.*)', '/community(.*)', '/profile(.*)', '/wallet(.*)',
  '/gamification(.*)', '/performance(.*)', '/notes(.*)', '/calendar(.*)',
  '/notifications(.*)', '/settings(.*)', '/admin(.*)', '/super-admin(.*)',
  '/team-lead(.*)', '/instructor(.*)', '/moderator(.*)', '/finance(.*)', '/support(.*)',
  '/analytics(.*)', '/recruitment(.*)', '/status(.*)',
  // Phase 6: study-buddy, ai-hub, documents are now PUBLIC-first surfaces.
  // Anonymous visitors can browse the empty state + see the marketing copy.
  // Sending a message / generating a doc still requires auth — enforced in
  // the server actions, NOT at the route level.
  '/onboarding/intent(.*)', '/onboarding/organization-space(.*)', '/onboarding/visitor-welcome(.*)',
  '/productivity(.*)', '/certificates(.*)', '/my-analytics(.*)',
  '/recruiter', '/recruiter/(.*)', '/talent', '/talent/(.*)',
  // Opportunities: browse + detail + public recruiter profile are public (Phase 3).
  // Apply/saved/applications still require auth — handled in the server actions.
  '/announcements', '/announcements/(.*)',
  // Marketplace: public-first (Phase 1). Browse + detail + creator profile are
  // anonymous; /marketplace/sell still requires auth.
  '/marketplace/sell', '/marketplace/sell/(.*)',
  // Creative Spaces: public-first (Phase 2). Browse + detail + instructor profile
  // anonymous; apply + manage still auth-gated.
  '/creative-space/apply', '/creative-space/apply/(.*)',
  '/creative-space/manage', '/creative-space/manage/(.*)',
  '/wellness', '/wellness/(.*)',
  // Mentor portal requires auth (interactive dashboard); alumni + mentorship are public-browseable
  '/mentor', '/mentor/(.*)',
  // Guardian management page (intern only); /guardian/[token] is intentionally public
  '/guardian',
  // Hackathons: public-first (Phase 4). Browse + detail are anonymous;
  // team/submit/judge actions require auth via the server actions themselves.
  // Startups: public-first (Phase 5). /startup founder dashboard requires
  // auth; /startups/[id] is public.
  '/startup', '/startup/(.*)',
  '/investor', '/investor/(.*)',
  '/compliance', '/compliance/(.*)',
  '/appeals', '/appeals/(.*)',
  '/suspended',
  // Public-portal infrastructure (Phase 0) — portals still resolve to their
  // existing routes, but investor/partner-portal get dedicated new paths.
  '/investor', '/investor/(.*)',
  '/partner-portal', '/partner-portal/(.*)',
  '/startups', '/startups/(.*)',
  // Per-host org portal (Phase 3). /o = host view, /s = student-in-org view.
  '/o', '/o/(.*)',
  '/s', '/s/(.*)',
  // Visitor portal + onboarding gate + invite redemption (Phase 5/6).
  '/visitor', '/visitor/(.*)',
  '/onboarding/intent', '/onboarding/intent/(.*)',
  '/join/(.*)',
]);

const ORG_PATH_RE = /^\/(o|s)\/([^\/]+)/;
type OrgMemberRole =
  | "owner"
  | "org_admin"
  | "instructor"
  | "student"
  | "moderator"
  | "finance"
  | "support"
  | "mentor";
const HOST_ROLES: OrgMemberRole[] = ["owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"];
const STUDENT_ROLES: OrgMemberRole[] = ["student", "owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"];

let edgeSb: ReturnType<typeof createClient> | null = null;
function getEdgeSupabase() {
  if (edgeSb) return edgeSb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  edgeSb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return edgeSb;
}

/**
 * Has this Clerk user finished onboarding? Cached in Upstash — true is
 * sticky (onboarding doesn't reverse) so we cache true 10 min and false
 * 30s so a user who just completed the gate isn't stuck for long.
 *
 * Returns null if the lookup itself failed (treat as "let through" so a
 * Postgres outage doesn't lock everyone out).
 */
async function checkOnboardingCompleted(clerkUserId: string): Promise<boolean | null> {
  const key = `onboarded:${clerkUserId}`;
  const hit = await cacheGet<boolean | "no">(key);
  if (hit === true) return true;
  if (hit === "no") return false;

  const sb = getEdgeSupabase();
  if (!sb) return null;

  const { data } = await sb
    .from("users")
    .select("onboarding_completed_at")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();
  type Row = { onboarding_completed_at: string | null };
  const row = data as Row | null;
  if (!row) {
    // Webhook hasn't synced yet — treat as not-onboarded so the user lands
    // on /onboarding/intent which calls ensureCurrentDbUser anyway.
    await cacheSet(key, "no", 30);
    return false;
  }
  const completed = !!row.onboarding_completed_at;
  await cacheSet(key, completed ? true : "no", completed ? 600 : 30);
  return completed;
}

/**
 * Look up "is this Clerk user a member of this org slug, and what role?"
 * Cached in Upstash for 60s so the per-request edge call doesn't hit
 * Postgres at scale (this is the hottest line in the system).
 *
 * Returns null if the org doesn't exist, isn't active, or the user isn't
 * a member. Negative results are also cached briefly to absorb stampedes.
 */
async function lookupOrgMembership(
  clerkUserId: string,
  slug: string,
): Promise<{ orgId: string; role: OrgMemberRole } | null> {
  const key = orgCacheKey.membership(clerkUserId, slug);
  const sb = getEdgeSupabase();
  if (!sb) return null;

  // Resolve clerk_id → users.id, then look up the membership joined to slug.
  // Two queries because the edge supabase REST client doesn't compose joins
  // through a non-FK lookup cleanly. Both are indexed.
  const { data: u } = await sb.from("users").select("id, status").eq("clerk_id", clerkUserId).maybeSingle();
  const appUser = u as { id?: string; status?: string } | null;
  const userId = appUser?.id;
  if (!userId || appUser?.status !== "active") {
    await cacheDel(key);
    await cacheSet(key, null, 60);
    return null;
  }

  // Membership can be cached, account status cannot: suspension is an
  // immediate security boundary and must take effect on the next request.
  const hit = await cacheGet<{ orgId: string; role: OrgMemberRole } | null>(key);
  if (hit !== null) return hit;

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
    await cacheSet(key, null, 60);
    return null;
  }

  const value = { orgId: row.org_id, role: row.role };
  await cacheSet(key, value, TTL.short);
  return value;
}

function extractRole(source: unknown): Role | null {
  if (!source || typeof source !== "object") return null;
  const obj = source as Record<string, unknown>;
  const raw = obj.role;
  if (typeof raw === "string" && VALID_ROLES.includes(raw as Role)) return raw as Role;
  return null;
}

function matchPrefix(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}
function canAccess(role: Role, pathname: string): boolean {
  // Super admin has full access — they can preview every portal.
  if (role === "super_admin") return true;
  if (SHARED_ROUTES.some(r => matchPrefix(r, pathname))) return true;
  const allowed = ROLE_ACCESS[role] || [];
  return allowed.some(r => matchPrefix(r, pathname));
}

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return NextResponse.next();

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    await auth.protect();
    return NextResponse.next();
  }

  // Try sessionClaims first (fast) — check both publicMetadata AND direct metadata shortcut
  let role: Role | null =
    extractRole((sessionClaims as Record<string, unknown>)?.publicMetadata) ||
    extractRole((sessionClaims as Record<string, unknown>)?.metadata);

  // Fallback: fetch user directly from Clerk if session claims don't contain role
  if (!role) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      role = extractRole(user.publicMetadata) || "intern";
    } catch {
      role = "intern";
    }
  }

  const pathname = request.nextUrl.pathname;

  // Onboarding gate: every signed-in user must pass through
  // /onboarding/intent on first auth'd request unless they're already
  // grandfathered (onboarding_completed_at set). Existing users were
  // backfilled in p392 so they skip. Routes that are themselves part
  // of onboarding (the gate, invite redemption, post-auth) are exempt
  // so we don't infinite-loop. Super_admin also bypasses to avoid
  // locking ourselves out during ops.
  const isOnboardingRoute = ONBOARDING_ROUTES.some(r => matchPrefix(r, pathname)) || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  if (!isOnboardingRoute && role !== "super_admin") {
    const onboarded = await checkOnboardingCompleted(userId);
    if (onboarded === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding/intent";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Per-tenant guard: /o/<slug>/... and /s/<slug>/... — verify org
  // membership and the right per-org role for the portal kind. Super
  // admin bypasses entirely (they preview every org). The membership
  // lookup is Upstash-cached at 60s; see lookupOrgMembership above.
  let tenantAccessGranted = false;
  const tenantMatch = pathname.match(ORG_PATH_RE);
  if (tenantMatch && role === "super_admin") {
    tenantAccessGranted = true;
  }
  if (role !== "super_admin") {
    if (tenantMatch) {
      const portalKind = tenantMatch[1] as "o" | "s";
      const slug = tenantMatch[2];
      const membership = await lookupOrgMembership(userId, slug);
      const allowedRoles = portalKind === "o" ? HOST_ROLES : STUDENT_ROLES;
      if (!membership || !allowedRoles.includes(membership.role)) {
        // 404 (don't leak existence) by rewriting to the not-found page
        // rather than redirecting — preserves the user's URL.
        const url = request.nextUrl.clone();
        url.pathname = "/not-found";
        return NextResponse.rewrite(url);
      }
      tenantAccessGranted = true;
    }
  }

  if (!tenantAccessGranted && !canAccess(role, pathname)) {
    const home = ROLE_HOME[role] || "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.searchParams.set("denied", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};

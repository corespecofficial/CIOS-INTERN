"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PortalTileMetric {
  id: string;
  label: string;
  href: string;
  /** Core KPIs surfaced at a glance. Null = not yet instrumented for this phase. */
  publicUsers: number | null;
  signedUpThisWeek: number | null;
  activeThisWeek: number | null;
  revenueThisMonth: number | null;
  /** Optional label overrides — lets a tile reuse the 4 metric slots with
      domain-specific copy (e.g. Marketplace uses "Products" not "Users"). */
  metricLabels?: { primary?: string; active?: string; signup?: string; revenue?: string };
  notes?: string;
}

export interface PublicPortalsOverview {
  totals: {
    publicUsers: number;
    investors: number;
    startupFounders: number;
    partnerOrgs: number;
    ephemeralUploads24h: number;
  };
  tiles: PortalTileMetric[];
}

/**
 * Super-admin Public Portals overview.
 *
 * Phase 0 surfaces a skeleton dashboard: accurate user-count totals
 * (public_user, investor, etc.) and ephemeral upload count, plus placeholder
 * tiles for each portal. Each portal's tile becomes "real" as that portal
 * migrates — see masterplan phases 1-7.
 */
export async function getPublicPortalsOverview(): Promise<R<PublicPortalsOverview>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Not signed in" };
  if (me.role !== "super_admin") return { ok: false, error: "Super-admin only" };

  const sb = supabaseAdmin();

  const countRole = async (role: string): Promise<number> => {
    const { count } = await sb.from("users").select("id", { count: "exact", head: true }).eq("role", role);
    return count ?? 0;
  };

  const [publicUsers, investors, startupFounders, partnerOrgs] = await Promise.all([
    countRole("public_user"),
    countRole("investor"),
    countRole("startup_founder"),
    countRole("partner_org"),
  ]);

  // Ephemeral uploads currently within their 24h window
  const { count: ephemeralCount } = await sb
    .from("ephemeral_uploads")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString());

  // ── Phase 1: real marketplace metrics ─────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [mkProductsCount, mkSalesWeek, mkRevenueMonth] = await Promise.all([
    sb.from("marketplace_products").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("marketplace_purchases").select("id", { count: "exact", head: true }).gt("purchased_at", weekAgo),
    sb.from("marketplace_purchases").select("amount_paid").gt("purchased_at", monthStart),
  ]);
  const marketplaceRevenue = ((mkRevenueMonth.data || []) as Array<{ amount_paid: number }>)
    .reduce((a, r) => a + Number(r.amount_paid || 0), 0);

  const tiles: PortalTileMetric[] = [
    {
      id: "marketplace",
      label: "Marketplace",
      href: "/marketplace",
      publicUsers: mkProductsCount.count ?? 0,
      signedUpThisWeek: null,
      activeThisWeek: mkSalesWeek.count ?? 0,
      revenueThisMonth: Math.round(marketplaceRevenue),
      metricLabels: { primary: "Products", active: "Sales/wk", signup: "—", revenue: "Rev /mo \u20a6" },
      notes: "LIVE",
    },
    await buildCreativeSpacesTile(sb, monthStart, weekAgo),
    await buildOpportunitiesTile(sb, monthStart, weekAgo),
    await buildHackathonsTile(sb, weekAgo),
    await buildInvestorsTile(sb, weekAgo),
    await buildStudyBuddyTile(sb, weekAgo),
    await buildAiHubTile(sb, weekAgo),
    await buildDocumentsTile(sb, monthStart, weekAgo),
    { id: "partner", label: "Partner Portals", href: "/partner-portal", publicUsers: null, signedUpThisWeek: null, activeThisWeek: null, revenueThisMonth: null, notes: "Phase 7" },
  ];

  return {
    ok: true,
    data: {
      totals: {
        publicUsers,
        investors,
        startupFounders,
        partnerOrgs,
        ephemeralUploads24h: ephemeralCount ?? 0,
      },
      tiles,
    },
  };
}

// ── Creative Spaces tile (Phase 2) ───────────────────────────────────────
// Pulled out because the revenue math needs a second query (enrollments
// joined by time) and the inline block was getting unreadable.

type Sb = ReturnType<typeof supabaseAdmin>;

async function buildCreativeSpacesTile(
  sb: Sb,
  monthStart: string,
  weekAgo: string
): Promise<PortalTileMetric> {
  const [activeCount, enrolsWeek, revenueMonth] = await Promise.all([
    sb.from("creative_spaces").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("creative_enrollments").select("id", { count: "exact", head: true }).gt("enrolled_at", weekAgo),
    sb.from("creative_enrollments").select("amount_paid_ngn").eq("payment_status", "paid").gt("enrolled_at", monthStart),
  ]);
  const revenue = ((revenueMonth.data || []) as Array<{ amount_paid_ngn: number }>)
    .reduce((a, r) => a + Number(r.amount_paid_ngn || 0), 0);

  return {
    id: "creative-space",
    label: "Creative Spaces",
    href: "/creative-space",
    publicUsers: activeCount.count ?? 0,
    signedUpThisWeek: null,
    activeThisWeek: enrolsWeek.count ?? 0,
    revenueThisMonth: Math.round(revenue),
    metricLabels: { primary: "Spaces", active: "Enrols/wk", signup: "—", revenue: "Rev /mo \u20a6" },
    notes: "LIVE",
  };
}

// ── Opportunities + Recruiter tile (Phase 3) ─────────────────────────────
// Listings + paid-recruiter count + applications this week + placement fee
// revenue this month (5% of hires' monthly salaries).

// ── Hackathons tile (Phase 4) ────────────────────────────────────────────
// Active+upcoming hackathons + teams formed this week + total submissions
// (revenue stays null — hackathons aren't a paid surface; sponsorship lives
// outside the platform).

// ── Investors + Startups tile (Phase 5) ──────────────────────────────────
// Counts investors registered, public pitches, watchlist activity. No
// platform-side revenue here yet (CIOS isn't taking carry).

async function buildInvestorsTile(sb: Sb, weekAgo: string): Promise<PortalTileMetric> {
  const [investorCount, pitchCount, interestsWeek, watchedWeek] = await Promise.all([
    sb.from("investor_profiles").select("user_id", { count: "exact", head: true }).eq("approval_status", "approved"),
    sb.from("startup_pitches").select("id", { count: "exact", head: true }).eq("is_public", true).eq("status", "active"),
    sb.from("startup_interests").select("id", { count: "exact", head: true }).gt("created_at", weekAgo),
    sb.from("investor_watchlist").select("pitch_id", { count: "exact", head: true }).gt("added_at", weekAgo),
  ]);
  return {
    id: "investors",
    label: "Investors + Startups",
    href: "/investors",
    publicUsers: investorCount.count ?? 0,
    signedUpThisWeek: pitchCount.count ?? 0,
    activeThisWeek: (interestsWeek.count ?? 0) + (watchedWeek.count ?? 0),
    revenueThisMonth: null,
    metricLabels: { primary: "Investors", signup: "Live pitches", active: "Signals/wk", revenue: "—" },
    notes: "LIVE",
  };
}

async function buildHackathonsTile(sb: Sb, weekAgo: string): Promise<PortalTileMetric> {
  const [activeCount, teamsWeek, submissions] = await Promise.all([
    sb.from("hackathons").select("id", { count: "exact", head: true }).in("status", ["upcoming", "active", "judging"]),
    sb.from("hackathon_teams").select("id", { count: "exact", head: true }).gt("created_at", weekAgo),
    sb.from("hackathon_submissions").select("id", { count: "exact", head: true }),
  ]);
  return {
    id: "hackathons",
    label: "Hackathons",
    href: "/hackathons",
    publicUsers: activeCount.count ?? 0,
    signedUpThisWeek: teamsWeek.count ?? 0,
    activeThisWeek: submissions.count ?? 0,
    revenueThisMonth: null,
    metricLabels: { primary: "Active events", signup: "Teams /wk", active: "Submissions", revenue: "—" },
    notes: "LIVE",
  };
}

async function buildOpportunitiesTile(
  sb: Sb,
  monthStart: string,
  weekAgo: string
): Promise<PortalTileMetric> {
  const [openCount, paidRecruiters, appsWeek, placementsMonth] = await Promise.all([
    sb.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "open"),
    sb.from("recruiter_profiles").select("user_id", { count: "exact", head: true }).in("plan_tier", ["growth", "pro", "enterprise"]),
    sb.from("opportunity_applications").select("id", { count: "exact", head: true }).gt("created_at", weekAgo),
    sb.from("placements").select("placement_fee").gt("hire_confirmed_at", monthStart),
  ]);
  const revenue = ((placementsMonth.data || []) as Array<{ placement_fee: number }>)
    .reduce((a, r) => a + Number(r.placement_fee || 0), 0);

  return {
    id: "opportunities",
    label: "Opportunities + Recruiters",
    href: "/opportunities",
    publicUsers: openCount.count ?? 0,
    signedUpThisWeek: paidRecruiters.count ?? 0,
    activeThisWeek: appsWeek.count ?? 0,
    revenueThisMonth: Math.round(revenue),
    metricLabels: { primary: "Open roles", signup: "Paid recruiters", active: "Applications/wk", revenue: "Placement fees /mo \u20a6" },
    notes: "LIVE",
  };
}

// ── Public Tools Trilogy tiles (Phase 6) ─────────────────────────────────

async function buildStudyBuddyTile(sb: Sb, weekAgo: string): Promise<PortalTileMetric> {
  // study_buddy_threads/messages from p318. Counts are best-effort and
  // tolerant to a missing table (in case the migration hasn't run on a fresh
  // env yet).
  let threads = 0;
  let messagesWeek = 0;
  try {
    const tRes = await sb.from("study_buddy_threads").select("id", { count: "exact", head: true });
    threads = tRes.count ?? 0;
    const mRes = await sb.from("study_buddy_messages").select("id", { count: "exact", head: true }).gt("created_at", weekAgo);
    messagesWeek = mRes.count ?? 0;
  } catch { /* table may be missing in some envs — keep zeros */ }
  return {
    id: "study-buddy",
    label: "Study Buddy",
    href: "/study-buddy",
    publicUsers: threads,
    signedUpThisWeek: null,
    activeThisWeek: messagesWeek,
    revenueThisMonth: null,
    metricLabels: { primary: "Threads", signup: "—", active: "Messages/wk", revenue: "—" },
    notes: "LIVE",
  };
}

async function buildAiHubTile(sb: Sb, weekAgo: string): Promise<PortalTileMetric> {
  // ai_usage_logs is the source of truth for AI Hub activity (per Phase 0
  // ecosystem schema). Falls back to zero if missing.
  let usageWeek = 0;
  let convCount = 0;
  try {
    const uRes = await sb.from("ai_usage_logs").select("id", { count: "exact", head: true }).gt("created_at", weekAgo);
    usageWeek = uRes.count ?? 0;
    const cRes = await sb.from("ai_hub_conversations").select("id", { count: "exact", head: true });
    convCount = cRes.count ?? 0;
  } catch { /* tables may be missing — keep zeros */ }
  return {
    id: "ai-hub",
    label: "AI Hub",
    href: "/ai-hub",
    publicUsers: convCount,
    signedUpThisWeek: null,
    activeThisWeek: usageWeek,
    revenueThisMonth: null,
    metricLabels: { primary: "Conversations", signup: "—", active: "AI calls/wk", revenue: "—" },
    notes: "LIVE",
  };
}

async function buildDocumentsTile(sb: Sb, monthStart: string, weekAgo: string): Promise<PortalTileMetric> {
  let docCount = 0;
  let genWeek = 0;
  let revenueMonth = 0;
  let proUsers = 0;
  try {
    const dRes = await sb.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null);
    docCount = dRes.count ?? 0;
    const gRes = await sb.from("document_generations").select("id", { count: "exact", head: true }).gt("created_at", weekAgo);
    genWeek = gRes.count ?? 0;
    const rRes = await sb.from("document_generations").select("charged_ngn").gt("created_at", monthStart);
    revenueMonth = ((rRes.data || []) as Array<{ charged_ngn: number }>).reduce((a, r) => a + Number(r.charged_ngn || 0), 0);
    const pRes = await sb.from("users").select("id", { count: "exact", head: true }).in("doc_plan_tier", ["pro", "pro_plus"]);
    proUsers = pRes.count ?? 0;
  } catch { /* fall through with zeros */ }
  return {
    id: "documents",
    label: "Documents",
    href: "/documents",
    publicUsers: docCount,
    signedUpThisWeek: proUsers,
    activeThisWeek: genWeek,
    revenueThisMonth: Math.round(revenueMonth),
    metricLabels: { primary: "Total docs", signup: "Pro users", active: "Generations/wk", revenue: "Revenue /mo \u20a6" },
    notes: "LIVE",
  };
}

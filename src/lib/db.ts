/**
 * Typed Supabase data access layer for CIOS.
 * Use these helpers from server components and server actions.
 */

import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Public client — honors RLS. Use for reads. */
export function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin client — bypasses RLS. Use ONLY server-side for privileged writes. */
export function supabaseAdmin() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* ───────────── Types ───────────── */

export type Role =
  | "intern" | "team_lead" | "admin" | "super_admin"
  | "instructor" | "moderator" | "finance" | "support"
  | "recruiter" | "mentor" | "alumni" | "premium"
  // Public-portal roles (Phase 0 masterplan §2.2)
  | "public_user" | "investor" | "startup_founder" | "partner_org"
  // Creative-space host portal (per-org tenant owner)
  | "creative_host";

export interface DbUser {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: Role;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak: number;
  performance: number;
  wallet_balance: number;
  status: string;
  last_seen: string | null;
  reputation: number;
  bio: string | null;
  headline: string | null;
  skills: string[];
  interests: string[];
  goals: string | null;
  location: string | null;
  social_links: Record<string, string>;
  cover_url: string | null;
  privacy: Record<string, unknown>;
  preferences: Record<string, unknown>;
  intern_id: string | null;
  created_at: string;
  updated_at: string;
  // p331 — referral system
  referral_code: string | null;
  // p334 — alumni
  graduated_at: string | null;
  cohort_number: number | null;
}

function roleFromUnknown(source: unknown): Role | null {
  if (!source || typeof source !== "object") return null;
  const raw = (source as Record<string, unknown>).role;
  return typeof raw === "string" ? raw as Role : null;
}

export async function getCurrentAuthRole(): Promise<Role | null> {
  const { sessionClaims } = await auth();
  const claims = sessionClaims as Record<string, unknown> | null;
  return roleFromUnknown(claims?.publicMetadata) || roleFromUnknown(claims?.metadata);
}

/* ───────────── User helpers ───────────── */

/** Get current signed-in Clerk user's Supabase row. */
export async function getCurrentDbUser(): Promise<DbUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  // Use admin client so RLS never blocks reading the current user's own row
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("*")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (error) {
    // Supabase errors sometimes come back as thin objects with only nested
    // fields, which print as "{}" in consoles. Stringify so the real cause
    // (code / message / details / hint) is visible.
    try {
      console.error("[db] getCurrentDbUser:", JSON.stringify(error, null, 2));
    } catch {
      console.error("[db] getCurrentDbUser:", error);
    }
    return null;
  }
  const user = data as DbUser | null;
  // Clerk session revocation can take a moment to propagate. The database
  // status is the immediate server-side kill switch for every protected read
  // and action that resolves the current application user.
  if (!user || user.status !== "active") return null;
  return user;
}

/** Ensure the current Clerk user has a matching Supabase row.
 *
 * Returns true on success, false if the upsert failed. Returning a
 * status (instead of swallowing) is what lets the auto-heal path in
 * /onboarding/intent and /visitor distinguish "row exists" from
 * "tried to recreate but failed silently and now we'll loop forever".
 */
export async function ensureDbUser(
  clerkId: string,
  email: string,
  name: string,
  role: Role = "public_user",
  avatarUrl?: string | null
): Promise<boolean> {
  const sb = supabaseAdmin();
  const payload = {
    clerk_id: clerkId,
    email,
    name,
    role,
    avatar_url: avatarUrl || null,
    status: "active",
  } as const;

  const logErr = (label: string, error: unknown) => {
    // Supabase PostgrestError fields are non-enumerable → plain
    // console.error logs "{}". Pull them explicitly so operators see
    // what actually failed (NOT NULL, enum mismatch, FK, etc.).
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    console.error(`[db] ${label}:`, JSON.stringify({
      message: e?.message ?? null,
      code: e?.code ?? null,
      details: e?.details ?? null,
      hint: e?.hint ?? null,
      input: { clerkId, email, name, role },
    }));
  };

  // Primary path: upsert on clerk_id. Insert if new, update if existing.
  const { error } = await sb.from("users").upsert(payload, { onConflict: "clerk_id" });
  if (!error) return true;

  const code = (error as { code?: string }).code || "";
  const msg = (error as { message?: string }).message || "";

  // Recovery path #1: enum value not yet present in the DB.
  // Postgres returns code 22P02 ("invalid input value for enum") when
  // the role string isn't in the user_role enum. This happens when
  // shipped code references roles (public_user, creative_host, mentor,
  // alumni, …) before migration p392a_user_role_enum.sql has been run.
  // Fall back to a role that's been in the enum since day one ("intern")
  // so the user can at least sign in. The middleware reconcile path
  // will heal Supabase to match Clerk on next request once the
  // migration is run.
  const isBadEnum = code === "22P02" || /invalid input value for enum user_role/i.test(msg);
  if (isBadEnum) {
    console.error(
      `[db] ensureDbUser: role "${role}" is not in the Supabase user_role enum.\n` +
      `   → Run migration src/db/migrations/p392a_user_role_enum.sql on your Supabase DB.\n` +
      `   → Falling back to role="intern" so the user can sign in.`,
    );
    const { error: fbErr } = await sb
      .from("users")
      .upsert({ ...payload, role: "intern" as Role }, { onConflict: "clerk_id" });
    if (!fbErr) return true;
    logErr("ensureDbUser fallback-to-intern also failed", fbErr);
    return false;
  }

  // Recovery path #2: orphan row with the same email blocking the
  // UNIQUE constraint. The most common shape after a hard-delete +
  // re-signup with the same address. Re-point the existing row to the
  // new clerk_id instead of failing.
  const isUniqueEmail = code === "23505" || /duplicate key.*email/i.test(msg);
  if (isUniqueEmail && email) {
    const { error: updErr } = await sb
      .from("users")
      .update({ clerk_id: clerkId, name, role, avatar_url: avatarUrl || null, status: "active" })
      .eq("email", email);
    if (!updErr) {
      console.info(`[db] ensureDbUser: rebound existing row for ${email} to new clerk_id ${clerkId}`);
      return true;
    }
    logErr("ensureDbUser email-rebind failed", updErr);
    return false;
  }

  logErr("ensureDbUser failed", error);
  return false;
}

/** Update arbitrary user fields (admin privileges required). */
export async function updateDbUser(clerkId: string, patch: Partial<DbUser>) {
  const { error } = await supabaseAdmin()
    .from("users")
    .update(patch)
    .eq("clerk_id", clerkId);
  if (error) console.error("[db] updateDbUser:", error);
}

/* ───────────── Tasks ───────────── */

export interface DbTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "submitted" | "under_review" | "approved" | "rejected" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string;
  xp_reward: number;
  submission_url: string | null;
  feedback: string | null;
  created_at: string;
}

/** Tasks assigned to the current Clerk user. Returns [] if none / on error. */
export async function getCurrentUserTasks(): Promise<DbTask[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const { data, error } = await supabase()
    .from("tasks")
    .select("id,title,description,status,priority,due_date,xp_reward,submission_url,feedback,created_at")
    .eq("assigned_to", me.id)
    .order("due_date", { ascending: true });
  if (error) {
    console.error("[db] getCurrentUserTasks:", error);
    return [];
  }
  return (data || []) as DbTask[];
}

/* ───────────── Analytics helpers (aggregate data) ───────────── */

export async function countUsers(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("users")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count || 0;
}

export async function countActiveUsers(sinceDays: number = 1): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase()
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("last_seen", since);
  if (error) return 0;
  return count || 0;
}

export async function countUsersByRole(): Promise<Record<string, number>> {
  const { data, error } = await supabase().from("users").select("role");
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) counts[row.role] = (counts[row.role] || 0) + 1;
  return counts;
}

/* ───────────── Admin helpers ───────────── */

export interface AdminUserRow {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  performance: number;
  xp: number;
  avatar_url: string | null;
  last_seen: string | null;
}

export async function listUsersForAdmin(limit = 50): Promise<AdminUserRow[]> {
  const { data, error } = await supabase()
    .from("users")
    .select("id, clerk_id, name, email, role, status, performance, xp, avatar_url, last_seen")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("[db] listUsersForAdmin:", error); return []; }
  return (data || []) as AdminUserRow[];
}

export async function countActive24h(): Promise<number> {
  return countActiveUsers(1);
}

export async function countPendingFines(): Promise<number> {
  const { count, error } = await supabase()
    .from("fines")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count || 0;
}

export async function sumRevenue(): Promise<number> {
  const { data, error } = await supabase()
    .from("transactions")
    .select("amount, type")
    .in("type", ["payment", "fine"]);
  if (error || !data) return 0;
  return data.reduce((s, r: { amount: number | string }) => s + Number(r.amount), 0);
}

export interface AuditRow { id: string; action: string; entity_type: string; created_at: string; actor_name: string | null; }

export async function recentAuditLogs(limit = 6): Promise<AuditRow[]> {
  const { data, error } = await supabase()
    .from("audit_logs")
    .select("id, action, entity_type, created_at, actor:users!audit_logs_actor_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{ id: string; action: string; entity_type: string; created_at: string; actor?: { name?: string } | { name?: string }[] | null }>).map((r) => {
    const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
    return {
      id: r.id, action: r.action, entity_type: r.entity_type, created_at: r.created_at,
      actor_name: actor?.name || null,
    };
  });
}

/* ───────────── Instructor helpers ───────────── */

export interface DbCourse {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  total_enrolled: number;
  total_modules: number;
  thumbnail_url: string | null;
  status: string;
}

export async function getCoursesByInstructor(): Promise<DbCourse[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const { data, error } = await supabase()
    .from("courses")
    .select("id, title, category, difficulty, total_enrolled, total_modules, thumbnail_url, status")
    .eq("instructor_id", me.id)
    .order("created_at", { ascending: false });
  if (error) { console.error("[db] getCoursesByInstructor:", error); return []; }
  // total_enrolled may not be kept fresh — compute from enrollments
  const ids = (data || []).map((c) => c.id);
  if (ids.length > 0) {
    const { data: enrollCounts } = await supabase()
      .from("course_enrollments")
      .select("course_id")
      .in("course_id", ids);
    const counts: Record<string, number> = {};
    for (const r of enrollCounts || []) counts[r.course_id] = (counts[r.course_id] || 0) + 1;
    return (data || []).map((c) => ({ ...c, total_enrolled: counts[c.id] || 0 })) as DbCourse[];
  }
  return (data || []) as DbCourse[];
}

/* ───────────── Public profile view ───────────── */

export interface PublicProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  role: Role;
  bio: string;
  headline: string;
  skills: string[];
  interests: string[];
  goals: string;
  location: string;
  social_links: Record<string, string>;
  xp: number;
  streak: number;
  level: number;
  performance: number;
  reputation: number;
  joined: string;
  postsCount: number;
  commentsCount: number;
  coursesCompleted: number;
  certificates: number;
  isMe: boolean;
  privacy: Record<string, unknown>;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const me = await getCurrentDbUser();
  // Use admin client to bypass RLS — profile pages are intentionally public.
  // The anon-key client would be blocked by row-level security when one user
  // reads another user's row, causing spurious 404s on shared profile links.
  const admin = supabaseAdmin();
  const { data } = await admin.from("users").select("*").eq("id", userId).maybeSingle();
  if (!data) return null;
  const u = data as DbUser;
  const [postsRes, commentsRes, completionsRes, certsRes] = await Promise.all([
    admin.from("posts").select("*", { count: "exact", head: true }).eq("author_id", userId).eq("is_deleted", false),
    admin.from("comments").select("*", { count: "exact", head: true }).eq("author_id", userId).eq("is_deleted", false),
    admin.from("course_enrollments").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    admin.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    id: u.id,
    name: u.name || "Unnamed",
    avatar_url: u.avatar_url,
    cover_url: u.cover_url,
    role: u.role,
    bio: u.bio || "",
    headline: u.headline || "",
    skills: u.skills || [],
    interests: u.interests || [],
    goals: u.goals || "",
    location: u.location || "",
    social_links: u.social_links || {},
    xp: u.xp || 0,
    streak: u.streak || 0,
    level: u.level || 1,
    performance: u.performance || 0,
    reputation: u.reputation || 0,
    joined: u.created_at,
    postsCount: postsRes.count || 0,
    commentsCount: commentsRes.count || 0,
    coursesCompleted: completionsRes.count || 0,
    certificates: certsRes.count || 0,
    isMe: me?.id === u.id,
    privacy: u.privacy || {},
  };
}

/* ───────────── Community ───────────── */

export interface CommunityRow {
  id: string;
  name: string;
  description: string;
  member_count: number;
  is_private: boolean;
  tags: string[];
  created_by: string;
  joined: boolean;
  suspended_at?: string | null;
  suspend_reason?: string | null;
}

export interface FeedPost {
  id: string;
  community_id: string;
  community_name: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_reputation: number;
  title: string;
  content: string;
  type: string;
  image_url: string | null;
  link_url: string | null;
  video_url: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  is_pinned: boolean;
  is_question: boolean;
  solved_comment_id: string | null;
  tags: string[];
  created_at: string;
  my_vote: "up" | "down" | null;
  is_bookmarked: boolean;
  is_locked: boolean;
  is_nsfw: boolean;
  is_spoiler: boolean;
  crosspost_of: string | null;
  reactions: Record<string, number>;
  my_reactions: string[];
  awards: Record<string, number>;
}

type FeedSort = "for-you" | "new" | "trending" | "top-today" | "top-week" | "questions" | "following" | "bookmarks";

export async function listCommunities(orgId: string | null = null): Promise<CommunityRow[]> {
  const me = await getCurrentDbUser();
  // Use admin client so every signed-in user sees every group (public
  // directory). RLS on `communities` was hiding rows created by other users.
  const sb = supabaseAdmin();
  let communitiesQuery = sb
    .from("communities")
    .select("id, name, description, member_count, is_private, tags, created_by, suspended_at, suspend_reason")
    .order("member_count", { ascending: false });
  communitiesQuery = orgId ? communitiesQuery.eq("org_id", orgId) : communitiesQuery.is("org_id", null);
  const { data } = await communitiesQuery;
  if (!data) return [];
  const myMemberships = new Set<string>();
  if (me) {
    const { data: mems } = await sb.from("community_members").select("community_id").eq("user_id", me.id);
    for (const m of (mems || []) as { community_id: string }[]) myMemberships.add(m.community_id);
  }
  return (data as CommunityRow[]).map((r) => ({ ...r, joined: myMemberships.has(r.id) }));
}

export async function listFeedPosts(sort: FeedSort = "new", communityId?: string | null, orgId: string | null = null): Promise<FeedPost[]> {
  const me = await getCurrentDbUser();
  // Admin client — the feed is a shared public timeline; RLS was hiding
  // posts authored by other users from non-creators.
  const sb = supabaseAdmin();

  // Privacy filter — users only see posts from public + non-suspended groups,
  // unless they are a member of the private group. Admin client bypasses RLS
  // so we enforce this here.
  let visibleCommunityIds: string[] | null = null;
  {
    let visibleQuery = sb.from("communities").select("id, is_private, suspended_at");
    visibleQuery = orgId ? visibleQuery.eq("org_id", orgId) : visibleQuery.is("org_id", null);
    const { data: all } = await visibleQuery;
    const rows = (all || []) as { id: string; is_private: boolean; suspended_at: string | null }[];
    const memberships = new Set<string>();
    if (me) {
      const { data: m } = await sb.from("community_members").select("community_id").eq("user_id", me.id);
      for (const r of (m || []) as { community_id: string }[]) memberships.add(r.community_id);
    }
    visibleCommunityIds = rows
      .filter((r) => !r.suspended_at && (!r.is_private || memberships.has(r.id)))
      .map((r) => r.id);
  }

  let query = sb.from("posts")
    .select("id, community_id, author_id, title, content, type, image_url, link_url, video_url, upvotes, downvotes, score, comment_count, is_pinned, is_question, solved_comment_id, tags, created_at, is_deleted, is_locked, is_nsfw, is_spoiler, crosspost_of, author:users!posts_author_id_fkey(name, avatar_url, reputation), community:communities!posts_community_id_fkey(name)")
    .eq("is_deleted", false);

  if (visibleCommunityIds.length === 0) return [];
  query = query.in("community_id", visibleCommunityIds);

  if (communityId) query = query.eq("community_id", communityId);

  const nowMs = Date.now();
  if (sort === "top-today") {
    query = query.gte("created_at", new Date(nowMs - 86400000).toISOString()).order("score", { ascending: false });
  } else if (sort === "top-week") {
    query = query.gte("created_at", new Date(nowMs - 7 * 86400000).toISOString()).order("score", { ascending: false });
  } else if (sort === "trending") {
    // Approximation: high score + recent (last 48h)
    query = query.gte("created_at", new Date(nowMs - 2 * 86400000).toISOString()).order("score", { ascending: false });
  } else if (sort === "questions") {
    query = query.eq("is_question", true).order("created_at", { ascending: false });
  } else if (sort === "for-you") {
    // Simple blend: rank by (score * 0.6) + recency
    query = query.order("score", { ascending: false });
  } else if (sort === "following" && me) {
    // Posts from users I follow
    const { data: follows } = await sb.from("user_follows").select("followed_id").eq("follower_id", me.id);
    const ids = (follows || []).map((r: { followed_id: string }) => r.followed_id);
    if (ids.length === 0) return [];
    query = query.in("author_id", ids).order("created_at", { ascending: false });
  } else if (sort === "bookmarks" && me) {
    const { data: marks } = await sb.from("post_bookmarks").select("post_id").eq("user_id", me.id);
    const ids = (marks || []).map((r: { post_id: string }) => r.post_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids).order("created_at", { ascending: false });
  } else {
    query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data } = await query.limit(40);
  if (!data) return [];

  type R = { id: string; community_id: string; author_id: string; title: string; content: string; type: string; image_url: string | null; link_url: string | null; upvotes: number; downvotes: number; score: number; comment_count: number; is_pinned: boolean; is_question: boolean; is_locked?: boolean; is_nsfw?: boolean; is_spoiler?: boolean; crosspost_of?: string | null; solved_comment_id: string | null; tags: string[]; created_at: string; author?: { name?: string; avatar_url?: string | null; reputation?: number } | { name?: string; avatar_url?: string | null; reputation?: number }[] | null; community?: { name?: string } | { name?: string }[] | null };
  const rows = data as unknown as R[];
  const ids = rows.map((r) => r.id);

  const myVotes = new Map<string, "up" | "down">();
  const myBookmarks = new Set<string>();
  const reactionCounts = new Map<string, Record<string, number>>();
  const myReactions = new Map<string, string[]>();
  const awardCounts = new Map<string, Record<string, number>>();
  if (ids.length > 0) {
    const tasks: Promise<unknown>[] = [
      sb.from("post_reactions").select("post_id, emoji, user_id").in("post_id", ids),
      sb.from("community_awards").select("post_id, kind").in("post_id", ids),
    ];
    if (me) {
      tasks.push(
        sb.from("post_votes").select("post_id, vote_type").eq("user_id", me.id).in("post_id", ids),
        sb.from("post_bookmarks").select("post_id").eq("user_id", me.id).in("post_id", ids),
      );
    }
    const results = await Promise.all(tasks) as Array<{ data?: unknown[] | null }>;
    const reactions = (results[0]?.data || []) as { post_id: string; emoji: string; user_id: string }[];
    for (const r of reactions) {
      const m = reactionCounts.get(r.post_id) || {};
      m[r.emoji] = (m[r.emoji] || 0) + 1;
      reactionCounts.set(r.post_id, m);
      if (me && r.user_id === me.id) {
        const list = myReactions.get(r.post_id) || [];
        list.push(r.emoji);
        myReactions.set(r.post_id, list);
      }
    }
    const awards = (results[1]?.data || []) as { post_id: string; kind: string }[];
    for (const a of awards) {
      const m = awardCounts.get(a.post_id) || {};
      m[a.kind] = (m[a.kind] || 0) + 1;
      awardCounts.set(a.post_id, m);
    }
    if (me) {
      const votes = (results[2]?.data || []) as { post_id: string; vote_type: "up" | "down" }[];
      const marks = (results[3]?.data || []) as { post_id: string }[];
      for (const v of votes) myVotes.set(v.post_id, v.vote_type);
      for (const m of marks) myBookmarks.add(m.post_id);
    }
  }

  return rows.map((r) => {
    const a = Array.isArray(r.author) ? r.author[0] : r.author;
    const c = Array.isArray(r.community) ? r.community[0] : r.community;
    return {
      id: r.id, community_id: r.community_id, community_name: c?.name || null,
      author_id: r.author_id, author_name: a?.name || null, author_avatar: a?.avatar_url || null,
      author_reputation: a?.reputation || 0,
      title: r.title, content: r.content, type: r.type,
      image_url: r.image_url, link_url: r.link_url, video_url: (r as { video_url?: string | null }).video_url || null,
      upvotes: r.upvotes || 0, downvotes: r.downvotes || 0, score: r.score || 0,
      comment_count: r.comment_count || 0,
      is_pinned: r.is_pinned, is_question: r.is_question, solved_comment_id: r.solved_comment_id,
      tags: r.tags || [], created_at: r.created_at,
      my_vote: myVotes.get(r.id) || null,
      is_bookmarked: myBookmarks.has(r.id),
      is_locked: !!r.is_locked, is_nsfw: !!r.is_nsfw, is_spoiler: !!r.is_spoiler,
      crosspost_of: r.crosspost_of || null,
      reactions: reactionCounts.get(r.id) || {},
      my_reactions: myReactions.get(r.id) || [],
      awards: awardCounts.get(r.id) || {},
    };
  });
}

export interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_reputation: number;
  content: string;
  upvotes: number;
  downvotes: number;
  is_pinned: boolean;
  is_solution: boolean;
  brilliant_label: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  my_vote: "up" | "down" | null;
}

export async function getPostDetail(postId: string): Promise<{ post: FeedPost | null; comments: CommentRow[] }> {
  const me = await getCurrentDbUser();
  const sb = supabaseAdmin();
  const { data: p } = await sb.from("posts")
    .select("id, community_id, author_id, title, content, type, image_url, link_url, video_url, upvotes, downvotes, score, comment_count, is_pinned, is_question, solved_comment_id, tags, created_at, is_deleted, is_locked, is_nsfw, is_spoiler, crosspost_of, author:users!posts_author_id_fkey(name, avatar_url, reputation), community:communities!posts_community_id_fkey(name)")
    .eq("id", postId).maybeSingle();
  if (!p || (p as { is_deleted?: boolean }).is_deleted) return { post: null, comments: [] };

  // Enforce privacy + suspension at the post-detail level too
  const { data: comm } = await sb.from("communities")
    .select("is_private, suspended_at").eq("id", (p as { community_id: string }).community_id).maybeSingle();
  if (comm?.suspended_at) return { post: null, comments: [] };
  if (comm?.is_private) {
    if (!me) return { post: null, comments: [] };
    const { data: mem } = await sb.from("community_members").select("id").eq("community_id", (p as { community_id: string }).community_id).eq("user_id", me.id).maybeSingle();
    if (!mem && me.role !== "admin" && me.role !== "super_admin" && me.role !== "moderator") {
      return { post: null, comments: [] };
    }
  }

  type PR = { id: string; community_id: string; author_id: string; title: string; content: string; type: string; image_url: string | null; link_url: string | null; upvotes: number; downvotes: number; score: number; comment_count: number; is_pinned: boolean; is_question: boolean; is_locked?: boolean; is_nsfw?: boolean; is_spoiler?: boolean; crosspost_of?: string | null; solved_comment_id: string | null; tags: string[]; created_at: string; author?: { name?: string; avatar_url?: string | null; reputation?: number } | { name?: string; avatar_url?: string | null; reputation?: number }[] | null; community?: { name?: string } | { name?: string }[] | null };
  const r = p as unknown as PR;
  const a = Array.isArray(r.author) ? r.author[0] : r.author;
  const c = Array.isArray(r.community) ? r.community[0] : r.community;

  let myVote: "up" | "down" | null = null;
  let isBookmarked = false;
  const reactionCounts: Record<string, number> = {};
  const myReacts: string[] = [];
  {
    const tasks: Promise<unknown>[] = [
      sb.from("post_reactions").select("emoji, user_id").eq("post_id", postId),
    ];
    if (me) {
      tasks.push(
        sb.from("post_votes").select("vote_type").eq("user_id", me.id).eq("post_id", postId).maybeSingle(),
        sb.from("post_bookmarks").select("id").eq("user_id", me.id).eq("post_id", postId).maybeSingle(),
      );
    }
    const results = await Promise.all(tasks) as Array<{ data?: unknown }>;
    const reacts = (results[0]?.data || []) as { emoji: string; user_id: string }[];
    for (const rr of reacts) {
      reactionCounts[rr.emoji] = (reactionCounts[rr.emoji] || 0) + 1;
      if (me && rr.user_id === me.id) myReacts.push(rr.emoji);
    }
    if (me) {
      const v = results[1]?.data as { vote_type?: "up" | "down" } | null | undefined;
      const b = results[2]?.data as { id?: string } | null | undefined;
      myVote = (v?.vote_type as "up" | "down" | null) || null;
      isBookmarked = !!b;
    }
  }

  const post: FeedPost = {
    id: r.id, community_id: r.community_id, community_name: c?.name || null,
    author_id: r.author_id, author_name: a?.name || null, author_avatar: a?.avatar_url || null,
    author_reputation: a?.reputation || 0,
    title: r.title, content: r.content, type: r.type,
    image_url: r.image_url, link_url: r.link_url, video_url: (r as { video_url?: string | null }).video_url || null,
    upvotes: r.upvotes || 0, downvotes: r.downvotes || 0, score: r.score || 0,
    comment_count: r.comment_count || 0,
    is_pinned: r.is_pinned, is_question: r.is_question, solved_comment_id: r.solved_comment_id,
    tags: r.tags || [], created_at: r.created_at,
    my_vote: myVote, is_bookmarked: isBookmarked,
    is_locked: !!r.is_locked, is_nsfw: !!r.is_nsfw, is_spoiler: !!r.is_spoiler,
    crosspost_of: r.crosspost_of || null,
    reactions: reactionCounts, my_reactions: myReacts,
    awards: await (async () => {
      const { data: aw } = await sb.from("community_awards").select("kind").eq("post_id", postId);
      const m: Record<string, number> = {};
      for (const a of (aw || []) as { kind: string }[]) m[a.kind] = (m[a.kind] || 0) + 1;
      return m;
    })(),
  };

  const { data: cData } = await sb.from("comments")
    .select("id, post_id, parent_id, author_id, content, upvotes, downvotes, is_pinned, is_solution, brilliant_label, is_edited, is_deleted, created_at, author:users!comments_author_id_fkey(name, avatar_url, reputation)")
    .eq("post_id", postId)
    .order("is_pinned", { ascending: false })
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: true });

  type CR = { id: string; post_id: string; parent_id: string | null; author_id: string; content: string; upvotes: number; downvotes: number; is_pinned: boolean; is_solution: boolean; brilliant_label: string | null; is_edited: boolean; is_deleted: boolean; created_at: string; author?: { name?: string; avatar_url?: string | null; reputation?: number } | { name?: string; avatar_url?: string | null; reputation?: number }[] | null };
  const commentRows = (cData || []) as unknown as CR[];
  const commentIds = commentRows.map((x) => x.id);

  const myCommentVotes = new Map<string, "up" | "down">();
  if (me && commentIds.length > 0) {
    const { data: cv } = await sb.from("comment_votes").select("comment_id, vote_type").eq("user_id", me.id).in("comment_id", commentIds);
    for (const v of (cv || []) as { comment_id: string; vote_type: "up" | "down" }[]) myCommentVotes.set(v.comment_id, v.vote_type);
  }

  const comments: CommentRow[] = commentRows.map((x) => {
    const au = Array.isArray(x.author) ? x.author[0] : x.author;
    return {
      id: x.id, post_id: x.post_id, parent_id: x.parent_id,
      author_id: x.author_id, author_name: au?.name || null, author_avatar: au?.avatar_url || null,
      author_reputation: au?.reputation || 0,
      content: x.content, upvotes: x.upvotes || 0, downvotes: x.downvotes || 0,
      is_pinned: x.is_pinned, is_solution: x.is_solution, brilliant_label: x.brilliant_label,
      is_edited: x.is_edited, is_deleted: x.is_deleted, created_at: x.created_at,
      my_vote: myCommentVotes.get(x.id) || null,
    };
  });

  return { post, comments };
}

export async function getTopContributors(limit = 10) {
  const { data } = await supabase()
    .from("users")
    .select("id, name, avatar_url, role, reputation")
    .order("reputation", { ascending: false })
    .limit(limit);
  return (data || []) as Array<{ id: string; name: string; avatar_url: string | null; role: string; reputation: number }>;
}

/* ───────────── Student analytics ───────────── */

export interface StudentAnalytics {
  hoursLearned: number;
  coursesCompleted: number;
  coursesInProgress: number;
  attendancePct: number;
  quizAverage: number;
  xp: number;
  streak: number;
  rank: number;
  totalUsers: number;
  completionLog: { date: string; count: number }[];
  quizAttempts: { date: string; score: number; passed: boolean; title: string }[];
  enrollments: { title: string; progress: number }[];
}

export async function getStudentAnalytics(): Promise<StudentAnalytics | null> {
  const me = await getCurrentDbUser();
  if (!me) return null;
  const sb = supabase();

  const [enrollRes, attendRes, sessionsRes, quizRes, rankRes] = await Promise.all([
    sb.from("course_enrollments").select("progress, status, enrolled_at, completed_at, course:courses(id, title, duration_hours)").eq("user_id", me.id),
    sb.from("attendance").select("joined_at, left_at, duration_minutes, session:class_sessions(duration_minutes)").eq("user_id", me.id),
    sb.from("class_sessions").select("id", { count: "exact", head: true }),
    sb.from("quiz_attempts").select("score, passed, attempted_at, module:course_modules(title)").eq("user_id", me.id).order("attempted_at", { ascending: true }),
    sb.from("users").select("id, xp"),
  ]);

  type EnRow = { progress: number; status: string; completed_at: string | null; course?: { title?: string; duration_hours?: number } | { title?: string; duration_hours?: number }[] | null };
  const enrolls = (enrollRes.data || []) as unknown as EnRow[];
  const coursesCompleted = enrolls.filter((e) => e.status === "completed").length;
  const coursesInProgress = enrolls.filter((e) => e.progress > 0 && e.progress < 100).length;

  const hoursFromCourses = enrolls.reduce((s, e) => {
    const c = Array.isArray(e.course) ? e.course[0] : e.course;
    return s + ((c?.duration_hours || 0) * (e.progress / 100));
  }, 0);
  const attendRows = (attendRes.data || []) as unknown as Array<{ duration_minutes: number; session?: { duration_minutes?: number } | { duration_minutes?: number }[] | null }>;
  const hoursFromClasses = attendRows.reduce((s, a) => {
    const sess = Array.isArray(a.session) ? a.session[0] : a.session;
    return s + ((a.duration_minutes || sess?.duration_minutes || 0) / 60);
  }, 0);
  const hoursLearned = Math.round(hoursFromCourses + hoursFromClasses);

  const totalSessions = sessionsRes.count || 0;
  const attendanceCount = attendRows.length;
  const attendancePct = totalSessions > 0 ? Math.min(100, Math.round((attendanceCount / totalSessions) * 100)) : 0;

  type QRow = { score: number; passed: boolean; attempted_at: string; module?: { title?: string } | { title?: string }[] | null };
  const quizzes = (quizRes.data || []) as unknown as QRow[];
  const quizAverage = quizzes.length > 0
    ? Math.round(quizzes.reduce((s, q) => s + (q.score || 0), 0) / quizzes.length)
    : 0;

  const allUsers = (rankRes.data || []) as unknown as { id: string; xp: number }[];
  const sorted = [...allUsers].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const rank = sorted.findIndex((u) => u.id === me.id) + 1;

  // Build last-60-day completion log from tasks+modules
  const sinceIso = new Date(Date.now() - 60 * 86400000).toISOString();
  const [taskDone, moduleDone] = await Promise.all([
    sb.from("tasks").select("updated_at").eq("assigned_to", me.id).in("status", ["approved", "submitted"]).gte("updated_at", sinceIso),
    sb.from("course_enrollments").select("completed_modules").eq("user_id", me.id),
  ]);
  const completionCounts = new Map<string, number>();
  for (const t of (taskDone.data || []) as { updated_at: string }[]) {
    const d = new Date(t.updated_at).toISOString().slice(0, 10);
    completionCounts.set(d, (completionCounts.get(d) || 0) + 1);
  }
  const completionLog = Array.from(completionCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  void moduleDone;

  return {
    hoursLearned, coursesCompleted, coursesInProgress,
    attendancePct, quizAverage,
    xp: me.xp || 0, streak: me.streak || 0,
    rank: rank > 0 ? rank : allUsers.length,
    totalUsers: allUsers.length,
    completionLog,
    quizAttempts: quizzes.map((q) => {
      const mod = Array.isArray(q.module) ? q.module[0] : q.module;
      return { date: q.attempted_at, score: q.score, passed: q.passed, title: mod?.title || "Quiz" };
    }).slice(-10),
    enrollments: enrolls.map((e) => {
      const c = Array.isArray(e.course) ? e.course[0] : e.course;
      return { title: c?.title || "Course", progress: e.progress };
    }),
  };
}

/* ───────────── Class materials ───────────── */

export interface MaterialRow {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size: number;
  uploaded_by: string;
  session_id: string | null;
  course_id: string | null;
  module_id: string | null;
  created_at: string;
}

export async function listMaterialsForSession(sessionId: string): Promise<MaterialRow[]> {
  const { data } = await supabase()
    .from("class_materials").select("*").eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return (data || []) as MaterialRow[];
}

export async function listMaterialsForCourse(courseId: string): Promise<MaterialRow[]> {
  const { data } = await supabase()
    .from("class_materials").select("*").eq("course_id", courseId)
    .order("created_at", { ascending: false });
  return (data || []) as MaterialRow[];
}

/* ───────────── Course discussions ───────────── */

export interface DiscussionRow {
  id: string;
  course_id: string;
  module_id: string | null;
  parent_id: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  is_pinned: boolean;
  is_instructor_reply: boolean;
  upvotes: number;
  created_at: string;
}

export async function listCourseDiscussions(courseId: string): Promise<DiscussionRow[]> {
  const { data } = await supabase()
    .from("course_discussions")
    .select("id, course_id, module_id, parent_id, content, is_pinned, is_instructor_reply, upvotes, created_at, author_id, author:users!course_discussions_author_id_fkey(name, avatar_url)")
    .eq("course_id", courseId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: true });
  if (!data) return [];
  return (data as unknown as Array<{ id: string; course_id: string; module_id: string | null; parent_id: string | null; content: string; is_pinned: boolean; is_instructor_reply: boolean; upvotes: number; created_at: string; author_id: string; author?: { name?: string; avatar_url?: string | null } | { name?: string; avatar_url?: string | null }[] | null }>).map((r) => {
    const u = Array.isArray(r.author) ? r.author[0] : r.author;
    return {
      id: r.id, course_id: r.course_id, module_id: r.module_id, parent_id: r.parent_id,
      author_id: r.author_id, author_name: u?.name || null, author_avatar: u?.avatar_url || null,
      content: r.content, is_pinned: r.is_pinned, is_instructor_reply: r.is_instructor_reply,
      upvotes: r.upvotes, created_at: r.created_at,
    };
  });
}

/* ───────────── Class sessions ───────────── */

export interface ClassSessionRow {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor_name: string | null;
  instructor_avatar: string | null;
  course_id: string | null;
  course_title: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  max_attendees: number | null;
  attendee_count: number;
  youtube_replay_id: string | null;
  is_mine: boolean;
  i_rsvped: boolean;
  is_compulsory: boolean;
  attendance_opens_at: string | null;
  attendance_closes_at: string | null;
  my_joined_at: string | null;
  my_left_at: string | null;
}

export async function listClassSessions(opts: { upcomingOnly?: boolean; limit?: number } = {}): Promise<ClassSessionRow[]> {
  const me = await getCurrentDbUser();
  const { data } = await supabase()
    .from("class_sessions")
    .select("id, title, description, instructor_id, course_id, scheduled_at, duration_minutes, meeting_url, status, max_attendees, attendee_count, youtube_replay_id, is_compulsory, attendance_opens_at, attendance_closes_at, instructor:users!class_sessions_instructor_id_fkey(name, avatar_url), course:courses!class_sessions_course_id_fkey(title)")
    .order("scheduled_at", { ascending: true })
    .limit(opts.limit ?? 50);

  if (!data) return [];
  const nowMs = Date.now();

  // RSVP list for current user
  const myRsvpSet = new Set<string>();
  const myAttendance = new Map<string, { joined_at: string | null; left_at: string | null }>();
  if (me) {
    const { data: rs } = await supabase().from("attendance").select("session_id,joined_at,left_at").eq("user_id", me.id);
    for (const r of (rs || []) as { session_id: string; joined_at: string | null; left_at: string | null }[]) { myRsvpSet.add(r.session_id); myAttendance.set(r.session_id, r); }
  }

  type R = { id: string; title: string; description: string; instructor_id: string; course_id: string | null; scheduled_at: string; duration_minutes: number; meeting_url: string | null; status: string; max_attendees: number | null; attendee_count: number; youtube_replay_id: string | null; is_compulsory: boolean; attendance_opens_at: string | null; attendance_closes_at: string | null; instructor?: { name?: string; avatar_url?: string | null } | { name?: string; avatar_url?: string | null }[] | null; course?: { title?: string } | { title?: string }[] | null; };

  const rows = (data as unknown as R[]).map((r) => {
    const instr = Array.isArray(r.instructor) ? r.instructor[0] : r.instructor;
    const course = Array.isArray(r.course) ? r.course[0] : r.course;
    return {
      id: r.id, title: r.title, description: r.description,
      instructor_id: r.instructor_id,
      instructor_name: instr?.name || null,
      instructor_avatar: instr?.avatar_url || null,
      course_id: r.course_id, course_title: course?.title || null,
      scheduled_at: r.scheduled_at, duration_minutes: r.duration_minutes,
      meeting_url: r.meeting_url,
      status: r.status as ClassSessionRow["status"],
      max_attendees: r.max_attendees, attendee_count: r.attendee_count || 0,
      youtube_replay_id: r.youtube_replay_id,
      is_mine: me?.id === r.instructor_id,
      i_rsvped: myRsvpSet.has(r.id),
      is_compulsory: !!r.is_compulsory,
      attendance_opens_at: r.attendance_opens_at,
      attendance_closes_at: r.attendance_closes_at,
      my_joined_at: myAttendance.get(r.id)?.joined_at || null,
      my_left_at: myAttendance.get(r.id)?.left_at || null,
    } as ClassSessionRow;
  });

  if (opts.upcomingOnly) {
    return rows.filter((r) => {
      const endMs = new Date(r.scheduled_at).getTime() + r.duration_minutes * 60000;
      return endMs >= nowMs && r.status !== "cancelled";
    });
  }
  return rows;
}

/* ───────────── LMS ───────────── */

export interface CourseFull {
  id: string;
  org_id: string | null;
  title: string;
  subtitle: string | null;
  description: string;
  instructor_id: string;
  instructor_name: string | null;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  language: string;
  duration_hours: number;
  total_modules: number;
  total_enrolled: number;
  price_naira: number;
  discount_naira: number | null;
  thumbnail_url: string | null;
  promo_video_url: string | null;
  status: "draft" | "published" | "archived";
  tags: string[];
  created_at: string;
  published_at: string | null;
}

const COURSE_SELECT_WITH_ORG = "id, org_id, title, subtitle, description, instructor_id, category, difficulty, language, duration_hours, total_modules, total_enrolled, price_naira, discount_naira, thumbnail_url, promo_video_url, status, tags, created_at, published_at, instructor:users!courses_instructor_id_fkey(name)";
const COURSE_SELECT_LEGACY = "id, title, subtitle, description, instructor_id, category, difficulty, language, duration_hours, total_modules, total_enrolled, price_naira, discount_naira, thumbnail_url, promo_video_url, status, tags, created_at, published_at, instructor:users!courses_instructor_id_fkey(name)";

function isMissingOrgIdColumn(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null | undefined;
  return err?.code === "42703" || Boolean(err?.message?.includes("org_id"));
}

export interface QuizQuestion {
  id: string;
  text: string;
  type?: "multiple_choice" | "true_false";
  options: { id: string; text: string; correct: boolean }[];
  points: number;
}

export interface CourseModuleRow {
  id: string;
  course_id: string;
  title: string;
  description: string;
  summary: string;
  order_index: number;
  content_type: "video" | "article" | "quiz" | "assignment";
  content_url: string | null;
  youtube_id: string | null;
  duration_minutes: number;
  is_free_preview: boolean;
  quiz_questions: QuizQuestion[];
  pass_score: number;
  assignment_prompt: string | null;
  assignment_max_score: number;
  is_boss_quiz?: boolean;
  time_limit_sec?: number;
  bonus_xp?: number;
  created_at: string;
}

export interface ModuleSubmissionRow {
  id: string;
  user_id: string;
  module_id: string;
  content: string;
  file_url: string | null;
  status: "submitted" | "graded" | "returned";
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

export async function getMyModuleSubmission(moduleId: string): Promise<ModuleSubmissionRow | null> {
  const me = await getCurrentDbUser();
  if (!me) return null;
  const { data } = await supabase()
    .from("module_submissions")
    .select("*")
    .eq("user_id", me.id).eq("module_id", moduleId).maybeSingle();
  return data as ModuleSubmissionRow | null;
}

export interface QuizAttemptRow {
  id: string;
  user_id: string;
  module_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  attempted_at: string;
}

export async function getMyBestQuizAttempt(moduleId: string): Promise<QuizAttemptRow | null> {
  const me = await getCurrentDbUser();
  if (!me) return null;
  const { data } = await supabase()
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", me.id).eq("module_id", moduleId)
    .order("score", { ascending: false })
    .limit(1).maybeSingle();
  return data as QuizAttemptRow | null;
}

export interface InstructorSubmissionRow {
  id: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  studentAvatar: string | null;
  content: string;
  fileUrl: string | null;
  status: "submitted" | "graded" | "returned";
  grade: number | null;
  feedback: string | null;
  maxScore: number;
  submittedAt: string;
}

export async function getPendingSubmissionsForInstructor(): Promise<InstructorSubmissionRow[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const { data: myCourses } = await supabase()
    .from("courses").select("id").eq("instructor_id", me.id);
  const courseIds = (myCourses || []).map((c: { id: string }) => c.id);
  if (courseIds.length === 0) return [];
  const { data } = await supabase()
    .from("module_submissions")
    .select("id, content, file_url, status, grade, feedback, submitted_at, module:course_modules!module_submissions_module_id_fkey(title, assignment_max_score, course_id, course:courses!course_modules_course_id_fkey(id, title)), user:users!module_submissions_user_id_fkey(name, avatar_url)")
    .order("submitted_at", { ascending: false });
  if (!data) return [];
  return (data as unknown as Array<{
    id: string; content: string; file_url: string | null; status: string; grade: number | null; feedback: string | null; submitted_at: string;
    module?: { title: string; assignment_max_score: number; course_id: string; course?: { id: string; title: string } | { id: string; title: string }[] | null } | { title: string; assignment_max_score: number; course_id: string; course?: { id: string; title: string } | { id: string; title: string }[] | null }[] | null;
    user?: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[] | null;
  }>).map((r) => {
    const mod = Array.isArray(r.module) ? r.module[0] : r.module;
    const course = mod?.course ? (Array.isArray(mod.course) ? mod.course[0] : mod.course) : null;
    const u = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: r.id,
      moduleTitle: mod?.title || "Lesson",
      courseId: course?.id || "",
      courseTitle: course?.title || "Course",
      studentName: u?.name || "Student",
      studentAvatar: u?.avatar_url || null,
      content: r.content,
      fileUrl: r.file_url,
      status: r.status as InstructorSubmissionRow["status"],
      grade: r.grade,
      feedback: r.feedback,
      maxScore: mod?.assignment_max_score || 100,
      submittedAt: r.submitted_at,
    };
  }).filter((r) => courseIds.includes(r.courseId));
}

export async function getAllPublishedCourses(): Promise<CourseFull[]> {
  const primary = await supabase()
    .from("courses")
    .select(COURSE_SELECT_WITH_ORG)
    .is("org_id", null)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (!primary.error) return mapCourses(primary.data);
  if (!isMissingOrgIdColumn(primary.error)) return [];

  const fallback = await supabase()
    .from("courses")
    .select(COURSE_SELECT_LEGACY)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return mapCourses(fallback.data);
}

export async function getMyEnrolledCourses(): Promise<(CourseFull & { progress: number; status_enrollment: string; completed_modules: string[] })[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const primary = await supabase()
    .from("course_enrollments")
    .select(`progress, status, completed_modules, course:courses(${COURSE_SELECT_WITH_ORG})`)
    .eq("user_id", me.id)
    .order("enrolled_at", { ascending: false });
  const data = primary.error && isMissingOrgIdColumn(primary.error)
    ? (await supabase()
      .from("course_enrollments")
      .select(`progress, status, completed_modules, course:courses(${COURSE_SELECT_LEGACY})`)
      .eq("user_id", me.id)
      .order("enrolled_at", { ascending: false })).data
    : primary.data;
  if (!data) return [];
  return (data as unknown as Array<{ progress: number; status: string; completed_modules: string[]; course: unknown }>).map((r) => {
    const course = mapCourses([r.course])[0];
    return { ...course, progress: r.progress, status_enrollment: r.status, completed_modules: r.completed_modules || [] };
  }).filter((c) => c.id);
}

export async function getMyCoursesAsInstructor(): Promise<CourseFull[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const primary = await supabase()
    .from("courses")
    .select(COURSE_SELECT_WITH_ORG)
    .eq("instructor_id", me.id)
    .is("org_id", null)
    .order("created_at", { ascending: false });

  if (!primary.error) return mapCourses(primary.data);
  if (!isMissingOrgIdColumn(primary.error)) return [];

  const fallback = await supabase()
    .from("courses")
    .select(COURSE_SELECT_LEGACY)
    .eq("instructor_id", me.id)
    .order("created_at", { ascending: false });
  return mapCourses(fallback.data);
}

export async function getOrgCoursesForInstructor(orgId: string): Promise<CourseFull[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const sb = supabaseAdmin();

  const isPlatformAdmin = me.role === "admin" || me.role === "super_admin";
  if (!isPlatformAdmin) {
    const { data: membership } = await sb
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", me.id)
      .eq("status", "active")
      .maybeSingle();
    const role = (membership as { role?: string } | null)?.role;
    if (!role || !["owner", "org_admin", "instructor"].includes(role)) return [];
  }

  const { data } = await sb
    .from("courses")
    .select(COURSE_SELECT_WITH_ORG)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return mapCourses(data);
}

export async function getCourseWithModules(courseId: string): Promise<{ course: CourseFull | null; modules: CourseModuleRow[] }> {
  let cRes = await supabase().from("courses").select(COURSE_SELECT_WITH_ORG).eq("id", courseId).maybeSingle();
  const modulesRes = await supabase().from("course_modules").select("*").eq("course_id", courseId).order("order_index", { ascending: true });
  if (cRes.error && isMissingOrgIdColumn(cRes.error)) {
    cRes = await supabase().from("courses").select(COURSE_SELECT_LEGACY).eq("id", courseId).maybeSingle();
  }
  const course = cRes.data ? mapCourses([cRes.data])[0] : null;
  return { course, modules: (modulesRes.data || []) as CourseModuleRow[] };
}

export async function getCourseWithModulesForEditor(courseId: string): Promise<{ course: CourseFull | null; modules: CourseModuleRow[] }> {
  const me = await getCurrentDbUser();
  if (!me) return { course: null, modules: [] };
  const authRole = await getCurrentAuthRole();
  const isPlatformAdmin = me.role === "admin" || me.role === "super_admin" || authRole === "admin" || authRole === "super_admin";

  const sb = supabaseAdmin();
  let cRes = await sb.from("courses")
    .select(COURSE_SELECT_WITH_ORG)
    .eq("id", courseId)
    .maybeSingle();
  const modulesRes = await sb.from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (cRes.error && isMissingOrgIdColumn(cRes.error)) {
    cRes = await sb.from("courses").select(COURSE_SELECT_LEGACY).eq("id", courseId).maybeSingle();
  }

  const course = cRes.data ? mapCourses([cRes.data])[0] : null;
  let canEdit = Boolean(course && (
    course.instructor_id === me.id ||
    isPlatformAdmin
  ));

  if (course?.org_id && !canEdit) {
    const { data: membership } = await sb
      .from("org_members")
      .select("role")
      .eq("org_id", course.org_id)
      .eq("user_id", me.id)
      .eq("status", "active")
      .maybeSingle();
    const role = (membership as { role?: string } | null)?.role;
    canEdit = Boolean(role && ["owner", "org_admin", "instructor"].includes(role));
  }

  if (!canEdit) return { course: null, modules: [] };
  return { course, modules: (modulesRes.data || []) as CourseModuleRow[] };
}

export async function getCourseWithModulesForViewer(courseId: string): Promise<{ course: CourseFull | null; modules: CourseModuleRow[] }> {
  const me = await getCurrentDbUser();
  const authRole = await getCurrentAuthRole();
  const sb = supabaseAdmin();
  let cRes = await sb.from("courses")
    .select(COURSE_SELECT_WITH_ORG)
    .eq("id", courseId)
    .maybeSingle();
  const modulesRes = await sb.from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (cRes.error && isMissingOrgIdColumn(cRes.error)) {
    cRes = await sb.from("courses").select(COURSE_SELECT_LEGACY).eq("id", courseId).maybeSingle();
  }

  const course = cRes.data ? mapCourses([cRes.data])[0] : null;
  if (!course) return { course: null, modules: [] };

  const canViewDraft = !!me && (
    course.instructor_id === me.id ||
    me.role === "admin" ||
    me.role === "super_admin" ||
    authRole === "admin" ||
    authRole === "super_admin"
  );

  if (course.status !== "published" && !canViewDraft) return { course: null, modules: [] };
  return { course, modules: (modulesRes.data || []) as CourseModuleRow[] };
}

export async function getMyEnrollment(courseId: string): Promise<{ enrolled: boolean; progress: number; completedModules: string[]; status: string } | null> {
  const me = await getCurrentDbUser();
  if (!me) return null;
  const { data } = await supabase()
    .from("course_enrollments")
    .select("progress, completed_modules, status")
    .eq("user_id", me.id).eq("course_id", courseId).maybeSingle();
  if (!data) return { enrolled: false, progress: 0, completedModules: [], status: "none" };
  return { enrolled: true, progress: data.progress || 0, completedModules: data.completed_modules || [], status: data.status };
}

export async function getCourseStudents(courseId: string): Promise<{ userId: string; name: string; email: string; avatarUrl: string | null; progress: number; status: string; enrolledAt: string }[]> {
  const { data } = await supabase()
    .from("course_enrollments")
    .select("progress, status, enrolled_at, user:users!course_enrollments_user_id_fkey(id, name, email, avatar_url)")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });
  if (!data) return [];
  return (data as unknown as Array<{ progress: number; status: string; enrolled_at: string; user: { id: string; name: string; email: string; avatar_url: string | null } | { id: string; name: string; email: string; avatar_url: string | null }[] | null }>).map((r) => {
    const u = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      userId: u?.id || "",
      name: u?.name || "Unknown",
      email: u?.email || "",
      avatarUrl: u?.avatar_url || null,
      progress: r.progress,
      status: r.status,
      enrolledAt: r.enrolled_at,
    };
  });
}

export async function getMyCertificates(): Promise<{ id: string; certificateNumber: string; courseId: string; courseTitle: string; instructorName: string | null; issuedAt: string; shareSlug: string | null }[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const { data } = await supabase()
    .from("certificates")
    .select("id, certificate_number, issued_at, share_slug, course:courses!certificates_course_id_fkey(id, title, instructor:users!courses_instructor_id_fkey(name))")
    .eq("user_id", me.id)
    .order("issued_at", { ascending: false });
  if (!data) return [];
  return (data as unknown as Array<{ id: string; certificate_number: string; issued_at: string; share_slug: string | null; course?: { id: string; title: string; instructor?: { name?: string } | { name?: string }[] | null } | { id: string; title: string; instructor?: { name?: string } | { name?: string }[] | null }[] | null }>).map((r) => {
    const c = Array.isArray(r.course) ? r.course[0] : r.course;
    const instr = c?.instructor ? (Array.isArray(c.instructor) ? c.instructor[0] : c.instructor) : null;
    return {
      id: r.id,
      certificateNumber: r.certificate_number,
      courseId: c?.id || "",
      courseTitle: c?.title || "Course",
      instructorName: instr?.name || null,
      issuedAt: r.issued_at,
      shareSlug: r.share_slug,
    };
  });
}

function mapCourses(rows: unknown): CourseFull[] {
  if (!Array.isArray(rows)) return [];
  return (rows as Array<{
    id: string; org_id?: string | null; title: string; subtitle: string | null; description: string;
    instructor_id: string; category: string; difficulty: string; language: string;
    duration_hours: number; total_modules: number; total_enrolled: number;
    price_naira: number; discount_naira: number | null;
    thumbnail_url: string | null; promo_video_url: string | null;
    status: string; tags: string[]; created_at: string; published_at: string | null;
    instructor?: { name?: string } | { name?: string }[] | null;
  }>).filter(Boolean).map((r) => {
    const instr = Array.isArray(r.instructor) ? r.instructor[0] : r.instructor;
    return {
      id: r.id, org_id: r.org_id ?? null, title: r.title, subtitle: r.subtitle, description: r.description,
      instructor_id: r.instructor_id, instructor_name: instr?.name || null,
      category: r.category, difficulty: r.difficulty as CourseFull["difficulty"],
      language: r.language, duration_hours: r.duration_hours,
      total_modules: r.total_modules, total_enrolled: r.total_enrolled,
      price_naira: r.price_naira, discount_naira: r.discount_naira,
      thumbnail_url: r.thumbnail_url, promo_video_url: r.promo_video_url,
      status: r.status as CourseFull["status"], tags: r.tags || [],
      created_at: r.created_at, published_at: r.published_at,
    };
  });
}

/* ───────────── Statuses (24h stories) ───────────── */

export interface StatusRow {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  kind: "text" | "image" | "video";
  content: string;
  media_url: string | null;
  background: string | null;
  text_color: string | null;
  reactions: Record<string, string[]>;
  viewer_count: number;
  has_viewed: boolean;
  created_at: string;
  expires_at: string;
  is_mine: boolean;
}

/** Returns non-expired statuses from all users visible to the current user, newest first. */
export async function listActiveStatuses(orgId?: string): Promise<StatusRow[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const nowIso = new Date().toISOString();

  let allowedUserIds: string[] | null = null;
  if (orgId) {
    const { data: memberships } = await supabaseAdmin().from("org_members").select("user_id").eq("org_id", orgId).eq("status", "active");
    allowedUserIds = (memberships || []).map((m: { user_id: string }) => m.user_id);
    if (!allowedUserIds.includes(me.id)) return [];
  }
  let statusQuery = supabase()
    .from("statuses")
    .select("id, user_id, kind, content, media_url, background, text_color, reactions, created_at, expires_at, user:users!statuses_user_id_fkey(name, avatar_url)")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });
  if (allowedUserIds) statusQuery = statusQuery.in("user_id", allowedUserIds);
  const { data: statuses, error } = await statusQuery;
  if (error || !statuses) { console.error("[db] listActiveStatuses:", error); return []; }

  // View counts per status
  const ids = (statuses as { id: string }[]).map((s) => s.id);
  const viewerCountMap = new Map<string, number>();
  const myViewedSet = new Set<string>();
  if (ids.length > 0) {
    const { data: allViews } = await supabase()
      .from("status_views")
      .select("status_id, viewer_id")
      .in("status_id", ids);
    for (const v of (allViews || []) as { status_id: string; viewer_id: string }[]) {
      viewerCountMap.set(v.status_id, (viewerCountMap.get(v.status_id) || 0) + 1);
      if (v.viewer_id === me.id) myViewedSet.add(v.status_id);
    }
  }

  return (statuses as unknown as Array<{ id: string; user_id: string; kind: string; content: string; media_url: string | null; background: string | null; text_color: string | null; reactions: Record<string, string[]> | null; created_at: string; expires_at: string; user?: { name?: string; avatar_url?: string | null } | { name?: string; avatar_url?: string | null }[] | null }>).map((s) => {
    const u = Array.isArray(s.user) ? s.user[0] : s.user;
    return {
      id: s.id,
      user_id: s.user_id,
      user_name: u?.name || null,
      user_avatar: u?.avatar_url || null,
      kind: s.kind as StatusRow["kind"],
      content: s.content,
      media_url: s.media_url,
      background: s.background,
      text_color: s.text_color,
      reactions: s.reactions || {},
      viewer_count: viewerCountMap.get(s.id) || 0,
      has_viewed: myViewedSet.has(s.id),
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_mine: s.user_id === me.id,
    };
  });
}

/* ───────────── Messaging ───────────── */

export interface DirectoryUser {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  last_seen: string | null;
}

export async function listDirectoryUsers(orgId?: string): Promise<DirectoryUser[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  // Hide anyone I blocked (and anyone who blocked me — reciprocal hide)
  const { data: blocks } = await supabase()
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${me.id},blocked_id.eq.${me.id}`);
  const hiddenIds = new Set<string>();
  for (const b of (blocks || []) as { blocker_id: string; blocked_id: string }[]) {
    hiddenIds.add(b.blocker_id === me.id ? b.blocked_id : b.blocker_id);
  }
  let allowedUserIds: string[] | null = null;
  if (orgId) {
    const { data: memberships } = await supabaseAdmin().from("org_members").select("user_id").eq("org_id", orgId).eq("status", "active");
    allowedUserIds = (memberships || []).map((m: { user_id: string }) => m.user_id).filter((id) => id !== me.id);
    if (allowedUserIds.length === 0) return [];
  }
  let usersQuery = supabase()
    .from("users")
    .select("id, clerk_id, name, email, role, avatar_url, last_seen")
    .neq("id", me.id)
    .order("name", { ascending: true });
  if (allowedUserIds) usersQuery = usersQuery.in("id", allowedUserIds);
  const { data } = await usersQuery;
  return ((data || []) as DirectoryUser[]).filter((u) => !hiddenIds.has(u.id));
}

export interface RoomListItem {
  id: string;
  name: string;
  type: "direct" | "group" | "channel" | "announcement";
  avatar_url: string | null;
  other_user_id: string | null;
  other_user_clerk_id: string | null;
  other_user_name: string | null;
  other_user_avatar: string | null;
  other_user_last_seen: string | null;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  is_archived: boolean;
}

export async function listMyRooms(orgId: string | null = null): Promise<RoomListItem[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const { data: members, error } = await supabase()
    .from("chat_room_members")
    .select("chat_room_id, last_read_at, is_muted, is_pinned, is_archived_for_user, chat_room:chat_rooms!chat_room_members_chat_room_id_fkey(id, name, type, avatar_url, is_archived, org_id)")
    .eq("user_id", me.id);
  if (error || !members) return [];

  type MemberRow = {
    chat_room_id: string;
    last_read_at: string | null;
    is_muted: boolean;
    is_pinned: boolean;
    is_archived_for_user: boolean;
    chat_room: { id: string; name: string; type: string; avatar_url: string | null; is_archived: boolean; org_id: string | null } | { id: string; name: string; type: string; avatar_url: string | null; is_archived: boolean; org_id: string | null }[] | null;
  };
  const mems = (members as unknown as MemberRow[]).filter((m) => {
    const room = Array.isArray(m.chat_room) ? m.chat_room[0] : m.chat_room;
    return orgId ? room?.org_id === orgId : room?.org_id == null;
  });
  const roomIds = mems.map((m) => m.chat_room_id);
  if (roomIds.length === 0) return [];

  // Last message per room
  const { data: lastMsgs } = await supabase()
    .from("messages")
    .select("chat_room_id, content, created_at, is_deleted")
    .in("chat_room_id", roomIds)
    .order("created_at", { ascending: false });

  const lastByRoom = new Map<string, { content: string; created_at: string; is_deleted: boolean }>();
  for (const m of (lastMsgs || []) as { chat_room_id: string; content: string; created_at: string; is_deleted: boolean }[]) {
    if (!lastByRoom.has(m.chat_room_id)) lastByRoom.set(m.chat_room_id, { content: m.content, created_at: m.created_at, is_deleted: m.is_deleted });
  }

  // Unread counts: messages in each room created after last_read_at (and not by me)
  const unreadByRoom = new Map<string, number>();
  for (const m of mems) {
    const after = m.last_read_at || "1970-01-01";
    const { count } = await supabase()
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_room_id", m.chat_room_id)
      .gt("created_at", after)
      .neq("sender_id", me.id);
    unreadByRoom.set(m.chat_room_id, count || 0);
  }

  // For direct rooms, fetch the other user
  const directRoomIds = mems
    .filter((m) => {
      const r = Array.isArray(m.chat_room) ? m.chat_room[0] : m.chat_room;
      return r?.type === "direct";
    })
    .map((m) => m.chat_room_id);

  const otherByRoom = new Map<string, { id: string; clerk_id: string | null; name: string; avatar_url: string | null; last_seen: string | null }>();
  if (directRoomIds.length > 0) {
    const { data: dms } = await supabase()
      .from("chat_room_members")
      .select("chat_room_id, user:users!chat_room_members_user_id_fkey(id, clerk_id, name, avatar_url, last_seen)")
      .in("chat_room_id", directRoomIds)
      .neq("user_id", me.id);
    for (const r of (dms || []) as unknown as { chat_room_id: string; user: { id: string; clerk_id: string | null; name: string; avatar_url: string | null; last_seen: string | null } | { id: string; clerk_id: string | null; name: string; avatar_url: string | null; last_seen: string | null }[] | null }[]) {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      if (u) otherByRoom.set(r.chat_room_id, u);
    }
  }

  const rooms: RoomListItem[] = mems.map((m) => {
    const r = Array.isArray(m.chat_room) ? m.chat_room[0] : m.chat_room;
    if (!r) {
      return { id: m.chat_room_id, name: "", type: "direct", avatar_url: null, other_user_id: null, other_user_clerk_id: null, other_user_name: null, other_user_avatar: null, other_user_last_seen: null, last_message: "", last_message_at: null, unread_count: 0, is_muted: false, is_pinned: false, is_archived: false };
    }
    const other = otherByRoom.get(m.chat_room_id);
    const last = lastByRoom.get(m.chat_room_id);
    return {
      id: r.id,
      name: r.type === "direct" ? (other?.name || "Direct message") : r.name,
      type: r.type as RoomListItem["type"],
      avatar_url: r.type === "direct" ? (other?.avatar_url || null) : r.avatar_url,
      other_user_id: other?.id || null,
      other_user_clerk_id: other?.clerk_id || null,
      other_user_name: other?.name || null,
      other_user_avatar: other?.avatar_url || null,
      other_user_last_seen: other?.last_seen || null,
      last_message: last?.is_deleted ? "Message deleted" : (last?.content || ""),
      last_message_at: last?.created_at || null,
      unread_count: unreadByRoom.get(m.chat_room_id) || 0,
      is_muted: m.is_muted,
      is_pinned: m.is_pinned,
      is_archived: m.is_archived_for_user || r.is_archived,
    };
  });

  // Sort: pinned first, then by last message time desc
  rooms.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    const aT = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bT = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bT - aT;
  });

  return rooms;
}

export interface DbMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  message_type: "text" | "image" | "file" | "system" | "reply";
  reply_to_id: string | null;
  reply_preview: { content: string; sender_name: string | null } | null;
  attachment_url: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: Record<string, string[]>; // emoji -> list of user ids
  created_at: string;
}

export async function getRoomMessages(roomId: string, limit = 80, sinceIso?: string): Promise<DbMessage[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];

  // Ensure I'm a member (RLS would also enforce, but be explicit)
  const { data: member } = await supabase()
    .from("chat_room_members")
    .select("id")
    .eq("chat_room_id", roomId)
    .eq("user_id", me.id)
    .maybeSingle();
  if (!member) return [];

  let query = supabase()
    .from("messages")
    .select("id, chat_room_id, sender_id, content, message_type, reply_to_id, attachment_url, is_edited, is_deleted, reactions, created_at, sender:users!messages_sender_id_fkey(id, name, avatar_url)")
    .eq("chat_room_id", roomId);
  if (sinceIso) query = query.gt("created_at", sinceIso);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  // Hide messages user has deleted-for-me
  const { data: myDeletes } = await supabase()
    .from("message_deletions")
    .select("message_id")
    .eq("user_id", me.id);
  const hidden = new Set((myDeletes || []).map((d: { message_id: string }) => d.message_id));

  // Prefetch reply previews
  const replyIds = (data as unknown as { reply_to_id: string | null }[]).map((r) => r.reply_to_id).filter(Boolean) as string[];
  const replyMap = new Map<string, { content: string; sender_name: string | null }>();
  if (replyIds.length > 0) {
    const { data: replies } = await supabase()
      .from("messages")
      .select("id, content, sender:users!messages_sender_id_fkey(name)")
      .in("id", replyIds);
    for (const r of (replies || []) as unknown as Array<{ id: string; content: string; sender?: { name?: string } | { name?: string }[] | null }>) {
      const s = Array.isArray(r.sender) ? r.sender[0] : r.sender;
      replyMap.set(r.id, { content: r.content, sender_name: s?.name || null });
    }
  }

  const rows = data as unknown as Array<{
    id: string; chat_room_id: string; sender_id: string; content: string; message_type: string;
    reply_to_id: string | null; attachment_url: string | null; is_edited: boolean; is_deleted: boolean;
    reactions: Record<string, string[]> | null; created_at: string;
    sender?: { id: string; name: string; avatar_url: string | null } | { id: string; name: string; avatar_url: string | null }[] | null;
  }>;

  const out: DbMessage[] = rows
    .filter((r) => !hidden.has(r.id))
    .map((r) => {
      const s = Array.isArray(r.sender) ? r.sender[0] : r.sender;
      return {
        id: r.id,
        chat_room_id: r.chat_room_id,
        sender_id: r.sender_id,
        sender_name: s?.name || null,
        sender_avatar: s?.avatar_url || null,
        content: r.content,
        message_type: r.message_type as DbMessage["message_type"],
        reply_to_id: r.reply_to_id,
        reply_preview: r.reply_to_id ? replyMap.get(r.reply_to_id) || null : null,
        attachment_url: r.attachment_url,
        is_edited: r.is_edited,
        is_deleted: r.is_deleted,
        reactions: r.reactions || {},
        created_at: r.created_at,
      };
    });

  // Oldest first for UI
  return out.reverse();
}

export interface RoomMember {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: "member" | "admin" | "owner";
  last_seen: string | null;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data } = await supabase()
    .from("chat_room_members")
    .select("id, user_id, role, user:users!chat_room_members_user_id_fkey(name, avatar_url, last_seen)")
    .eq("chat_room_id", roomId);
  return (data || []).map((r: { id: string; user_id: string; role: string; user: { name: string; avatar_url: string | null; last_seen: string | null } | { name: string; avatar_url: string | null; last_seen: string | null }[] | null }) => {
    const u = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: r.id, user_id: r.user_id, role: r.role as RoomMember["role"],
      name: u?.name || "Unnamed", avatar_url: u?.avatar_url || null, last_seen: u?.last_seen || null,
    };
  });
}

/* ───────────── Intern Dashboard helpers ───────────── */

export interface HomeTask {
  id: string;
  title: string;
  dueLabel: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export async function getTodaysTasksForCurrentUser(limit = 3): Promise<HomeTask[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 4);
  const { data } = await supabase()
    .from("tasks")
    .select("id, title, priority, due_date, status")
    .eq("assigned_to", me.id)
    .not("status", "in", "(approved,submitted)")
    .lte("due_date", tomorrow.toISOString())
    .order("due_date", { ascending: true })
    .limit(limit);
  const now = Date.now();
  return (data || []).map((t: { id: string; title: string; priority: string; due_date: string }) => {
    const d = new Date(t.due_date);
    const diffH = (d.getTime() - now) / 3600000;
    let dueLabel: string;
    if (diffH < 0) dueLabel = "Overdue";
    else if (diffH < 24 && d.toDateString() === new Date().toDateString()) dueLabel = "Today";
    else if (diffH < 48) dueLabel = "Tomorrow";
    else dueLabel = `In ${Math.ceil(diffH / 24)} days`;
    return { id: t.id, title: t.title, dueLabel, priority: t.priority as HomeTask["priority"] };
  });
}

export interface HomeClass {
  id: string;
  title: string;
  instructorName: string;
  startLabel: string;
  isLive: boolean;
}

export async function getUpcomingClasses(limit = 2): Promise<HomeClass[]> {
  const { data, error } = await supabase()
    .from("class_sessions")
    .select("id, title, scheduled_at, status, duration_minutes, instructor:users!class_sessions_instructor_id_fkey(name)")
    .gte("scheduled_at", new Date(Date.now() - 60 * 60000).toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{ id: string; title: string; scheduled_at: string; status: string; duration_minutes: number; instructor?: { name?: string } | { name?: string }[] | null }>).map((r) => {
    const instr = Array.isArray(r.instructor) ? r.instructor[0] : r.instructor;
    const d = new Date(r.scheduled_at);
    const today = new Date().toDateString();
    const ymd = d.toDateString();
    const label =
      ymd === today
        ? `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
        : `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    return {
      id: r.id, title: r.title,
      instructorName: instr?.name || "Instructor",
      startLabel: label,
      isLive: r.status === "live",
    };
  });
}

export interface HomeLeaderRow {
  id: string;
  name: string;
  xp: number;
  avatarUrl: string | null;
  isMe: boolean;
}

export async function getTopLeaderboard(limit = 3): Promise<HomeLeaderRow[]> {
  const meId = (await getCurrentDbUser())?.id || null;
  const { data } = await supabase()
    .from("users")
    .select("id, name, xp, avatar_url")
    .in("role", ["intern", "team_lead"])
    .order("xp", { ascending: false })
    .limit(limit);
  return (data || []).map((r: { id: string; name: string; xp: number; avatar_url: string | null }) => ({
    id: r.id, name: r.name || "Unnamed", xp: r.xp || 0, avatarUrl: r.avatar_url,
    isMe: r.id === meId,
  }));
}

export interface WeeklyBar { day: string; value: number; }

/** Returns 7 bars Mon..Sun of task completion counts normalized to 0..100. */
export async function getWeeklyPerformance(): Promise<WeeklyBar[]> {
  const me = await getCurrentDbUser();
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const bars: { day: string; value: number; raw: number }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { day: days[d.getDay()], value: 0, raw: 0 };
  });
  if (!me) return bars.map((b) => ({ day: b.day, value: 0 }));

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data } = await supabaseAdmin()
    .from("tasks")
    .select("updated_at, status")
    .eq("assigned_to", me.id)
    .in("status", ["approved", "submitted", "under_review", "done", "completed"])
    .gte("updated_at", since.toISOString());

  const todayIdx = 6;
  for (const r of (data || []) as { updated_at: string }[]) {
    const d = new Date(r.updated_at);
    const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
    const slot = todayIdx - daysAgo;
    if (slot >= 0 && slot < 7) bars[slot].raw += 1;
  }
  const max = Math.max(...bars.map((b) => b.raw), 1);
  return bars.map((b) => ({ day: b.day, value: Math.round((b.raw / max) * 95) || (b.raw > 0 ? 20 : 5) }));
}

export interface HomeActivityItem {
  id: string;
  text: string;
  value: string;
  color: string;
  timeLabel: string;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export async function getRecentActivityForCurrentUser(limit = 4): Promise<HomeActivityItem[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const { data: tasks } = await supabaseAdmin()
    .from("tasks")
    .select("id, title, status, xp_reward, updated_at")
    .eq("assigned_to", me.id)
    .in("status", ["approved", "submitted", "done", "completed"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  const { data: txs } = await supabaseAdmin()
    .from("transactions")
    .select("id, type, amount, description, created_at")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const items: (HomeActivityItem & { sort: number })[] = [];
  for (const t of (tasks || []) as { id: string; title: string; status: string; xp_reward: number; updated_at: string }[]) {
    items.push({
      id: `task_${t.id}`,
      text: `Completed '${t.title}'`,
      value: `+${t.xp_reward} XP`,
      color: "#66BB6A",
      timeLabel: relTime(t.updated_at),
      sort: new Date(t.updated_at).getTime(),
    });
  }
  for (const tx of (txs || []) as { id: string; type: string; amount: number | string; description: string; created_at: string }[]) {
    const isDebit = tx.type === "fine" || tx.type === "payment";
    items.push({
      id: `tx_${tx.id}`,
      text: tx.description || `${tx.type} transaction`,
      value: `${isDebit ? "-" : "+"}\u20A6${Number(tx.amount).toLocaleString()}`,
      color: isDebit ? "#EF5350" : "#FFC107",
      timeLabel: relTime(tx.created_at),
      sort: new Date(tx.created_at).getTime(),
    });
  }
  items.sort((a, b) => b.sort - a.sort);
  return items.slice(0, limit).map(({ sort: _sort, ...rest }) => rest);
}

const LADDER_BY_LEVEL = [
  "New Intern", "Active", "Senior Intern", "Team Lead",
  "Dept Lead", "Trainer", "Manager", "Admin", "Executive",
];

export function rankForLevel(level: number): string {
  if (level <= 1) return LADDER_BY_LEVEL[0];
  if (level <= 4) return LADDER_BY_LEVEL[1];
  if (level <= 9) return LADDER_BY_LEVEL[2];
  if (level <= 14) return LADDER_BY_LEVEL[3];
  if (level <= 19) return LADDER_BY_LEVEL[4];
  if (level <= 24) return LADDER_BY_LEVEL[5];
  if (level <= 34) return LADDER_BY_LEVEL[6];
  if (level <= 49) return LADDER_BY_LEVEL[7];
  return LADDER_BY_LEVEL[8];
}

/* ───────────── Moderator helpers ───────────── */

export interface ModPost {
  id: string;
  title: string;
  type: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  author_name: string | null;
  community_name: string | null;
}

export async function listRecentPosts(limit = 10): Promise<ModPost[]> {
  const { data, error } = await supabase()
    .from("posts")
    .select("id, title, type, upvotes, downvotes, comment_count, created_at, author:users!posts_author_id_fkey(name), community:communities!posts_community_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{ id: string; title: string; type: string; upvotes: number; downvotes: number; comment_count: number; created_at: string; author?: { name?: string } | { name?: string }[] | null; community?: { name?: string } | { name?: string }[] | null }>).map((r) => {
    const author = Array.isArray(r.author) ? r.author[0] : r.author;
    const community = Array.isArray(r.community) ? r.community[0] : r.community;
    return {
      id: r.id, title: r.title, type: r.type,
      upvotes: r.upvotes, downvotes: r.downvotes, comment_count: r.comment_count,
      created_at: r.created_at,
      author_name: author?.name || null,
      community_name: community?.name || null,
    };
  });
}

export async function countPosts(): Promise<number> {
  const { count } = await supabase().from("posts").select("*", { count: "exact", head: true });
  return count || 0;
}

/* ───────────── Finance helpers ───────────── */

export interface FinanceTx {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  user_name: string | null;
}

export async function listRecentTransactions(limit = 20): Promise<FinanceTx[]> {
  const { data, error } = await supabase()
    .from("transactions")
    .select("id, type, amount, description, created_at, user:users!transactions_user_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{ id: string; type: string; amount: number | string; description: string; created_at: string; user?: { name?: string } | { name?: string }[] | null }>).map((r) => {
    const user = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: r.id, type: r.type, amount: Number(r.amount),
      description: r.description, created_at: r.created_at,
      user_name: user?.name || null,
    };
  });
}

export async function financeTotals(): Promise<{ totalRevenue: number; totalPayouts: number; finesCollected: number; pendingPayouts: number }> {
  const { data } = await supabase().from("transactions").select("type, amount");
  const rows = (data || []) as { type: string; amount: number | string }[];
  const sumBy = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + Number(r.amount), 0);
  return {
    totalRevenue: sumBy("payment") + sumBy("fine"),
    totalPayouts: sumBy("credit") + sumBy("reward"),
    finesCollected: sumBy("fine"),
    pendingPayouts: 0, // no status column on transactions yet
  };
}

/* ───────────── Support helpers ───────────── */

export interface SupportItem {
  id: string;
  title: string;
  message: string;
  user_name: string | null;
  created_at: string;
  type: string; // info/warning/error/etc
}

/** Until a dedicated tickets table ships, triage via notifications of type warning/error. */
export async function listSupportQueue(limit = 10): Promise<SupportItem[]> {
  const { data, error } = await supabase()
    .from("notifications")
    .select("id, title, message, type, created_at, user:users!notifications_user_id_fkey(name)")
    .in("type", ["warning", "error", "fine", "system"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Array<{ id: string; title: string; message: string; type: string; created_at: string; user?: { name?: string } | { name?: string }[] | null }>).map((r) => {
    const user = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: r.id, title: r.title, message: r.message, type: r.type,
      created_at: r.created_at, user_name: user?.name || null,
    };
  });
}

export async function countOpenSupport(): Promise<{ open: number; inProgress: number; resolvedToday: number }> {
  const { count: open } = await supabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .in("type", ["warning", "error", "fine"])
    .eq("is_read", false);
  const { count: inProgress } = await supabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .in("type", ["warning", "error"])
    .eq("is_read", true);
  return { open: open || 0, inProgress: inProgress || 0, resolvedToday: 0 };
}

/* ───────────── Team / leaderboard helpers ───────────── */

export async function listTeamMembers(): Promise<AdminUserRow[]> {
  // Until teams are modeled, a Team Lead sees all interns + team_leads.
  const { data, error } = await supabase()
    .from("users")
    .select("id, clerk_id, name, email, role, status, performance, xp, avatar_url, last_seen")
    .in("role", ["intern", "team_lead"])
    .order("xp", { ascending: false });
  if (error) { console.error("[db] listTeamMembers:", error); return []; }
  return (data || []) as AdminUserRow[];
}

export async function countTasksInProgressForUsers(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const { count, error } = await supabase()
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("assigned_to", userIds)
    .in("status", ["in_progress", "pending"]);
  if (error) return 0;
  return count || 0;
}

/* ───────────── Generic safe wrapper ───────────── */

export async function safeQuery<T>(
  fn: () => Promise<{ data: T | null; error: unknown }>
): Promise<T | null> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.error("[db] query error:", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[db] exception:", e);
    return null;
  }
}

/* ── Instructor Dashboard: upcoming classes they are teaching ── */
export interface InstructorUpcomingClass {
  id: string;
  title: string;
  startLabel: string;
  enrolledCount: number;
  isLive: boolean;
}

export async function getInstructorUpcomingClasses(limit = 3): Promise<InstructorUpcomingClass[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  const now = new Date(Date.now() - 30 * 60000).toISOString(); // allow 30min grace
  const { data, error } = await supabase()
    .from("class_sessions")
    .select("id, title, scheduled_at, status, attendee_count")
    .eq("instructor_id", me.id)
    .neq("status", "cancelled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  const today = new Date().toDateString();
  return (data as { id: string; title: string; scheduled_at: string; status: string; attendee_count: number }[]).map((r) => {
    const d = new Date(r.scheduled_at);
    const label =
      d.toDateString() === today
        ? `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
        : `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    return {
      id: r.id,
      title: r.title,
      startLabel: label,
      enrolledCount: r.attendee_count || 0,
      isLive: r.status === "live",
    };
  });
}

/* ── Instructor Dashboard: recently graded submissions ── */
export interface InstructorRecentGrade {
  id: string;
  studentName: string;
  moduleTitle: string;
  grade: number;
  maxScore: number;
  gradeLetter: string;
}

function toGradeLetter(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 60) return "D";
  return "F";
}

export async function getInstructorRecentGrades(limit = 5): Promise<InstructorRecentGrade[]> {
  const me = await getCurrentDbUser();
  if (!me) return [];
  // Get instructor's course IDs first
  const { data: myCourses } = await supabase().from("courses").select("id").eq("instructor_id", me.id);
  const courseIds = (myCourses || []).map((c: { id: string }) => c.id);
  if (courseIds.length === 0) return [];
  const { data, error } = await supabase()
    .from("module_submissions")
    .select("id, grade, submitted_at, module:course_modules!module_submissions_module_id_fkey(title, assignment_max_score, course_id), user:users!module_submissions_user_id_fkey(name)")
    .eq("status", "graded")
    .order("submitted_at", { ascending: false })
    .limit(limit * 3); // over-fetch to filter by courseIds
  if (error || !data) return [];
  type Row = {
    id: string; grade: number | null; submitted_at: string;
    module?: { title: string; assignment_max_score: number; course_id: string } | { title: string; assignment_max_score: number; course_id: string }[] | null;
    user?: { name: string } | { name: string }[] | null;
  };
  return (data as unknown as Row[])
    .map((r) => {
      const mod = Array.isArray(r.module) ? r.module[0] : r.module;
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      const maxScore = mod?.assignment_max_score || 100;
      const grade = r.grade ?? 0;
      return {
        id: r.id,
        studentName: u?.name || "Student",
        moduleTitle: mod?.title || "Assignment",
        grade,
        maxScore,
        gradeLetter: toGradeLetter(grade, maxScore),
        courseId: mod?.course_id || "",
      };
    })
    .filter((r) => courseIds.includes(r.courseId))
    .slice(0, limit);
}

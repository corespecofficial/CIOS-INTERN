/**
 * Thin wrapper over @upstash/redis with a graceful no-op fallback.
 *
 * Why a wrapper?
 * - Keeps callers ignorant of cache-miss vs cache-disabled — both look the same.
 * - Lets us run locally without Upstash configured (returns null, callers
 *   then hit Supabase normally).
 * - Centralises key-namespacing and TTL conventions.
 *
 * Free-tier headroom: Upstash Hobby = 10,000 commands/day. Each cache miss
 * = 1 GET; each refresh = 1 GET + 1 SET = 2 commands. With 100 active users
 * checking ~10 hot pages/day, expect ~5,000 commands/day — well inside free.
 */

import { Redis } from "@upstash/redis";

let client: Redis | null = null;
let initialised = false;

function getRedis(): Redis | null {
  if (initialised) return client;
  initialised = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[cache] Upstash not configured — running uncached. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable.");
    }
    return null;
  }
  try {
    client = new Redis({ url, token });
  } catch (e) {
    console.warn("[cache] Upstash init failed:", e);
    client = null;
  }
  return client;
}

/** Get a cached JSON value. Returns null on miss or any error. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const v = await r.get<T>(key);
    return (v as T) ?? null;
  } catch (e) {
    console.warn("[cache] get failed", key, e);
    return null;
  }
}

/** Set a JSON value with TTL in seconds. Silent on failure. */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.warn("[cache] set failed", key, e);
  }
}

/** Invalidate one or more keys. */
export async function cacheDel(...keys: string[]): Promise<void> {
  const r = getRedis();
  if (!r || keys.length === 0) return;
  try {
    await r.del(...keys);
  } catch (e) {
    console.warn("[cache] del failed", keys, e);
  }
}

/**
 * Read-through cache helper. Tries cache; on miss, runs `loader`, stores the
 * result with TTL, and returns it. Loader exceptions bubble up unchanged.
 */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null && hit !== undefined) return hit;
  const value = await loader();
  // Don't cache nullish — saves space and avoids confusing future hits.
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }
  return value;
}

/** Standard TTL constants — use these, don't pass raw numbers. */
export const TTL = {
  short: 60,        // 1 min — leaderboards, presence-adjacent
  medium: 300,      // 5 min — engagement settings, sidebar badges
  long: 3600,       // 1 hour — course context, study buddy course summary
  day: 86400,       // 1 day — rarely-changing metadata
} as const;

/** Key builders — keep namespaces tight so wipe-by-prefix stays surgical. */
export const cacheKey = {
  engagementFeatures: () => "eng:features",
  sidebarBadges: (userId: string) => `nav:badges:${userId}`,
  courseLeaderboard: (courseId: string) => `lb:course:${courseId}`,
  courseContext: (courseId: string) => `course:ctx:${courseId}`,
  userMiniBadges: (userId: string) => `badges:user:${userId}`,
} as const;

/**
 * Org-scoped key builder. ALL host-portal / org-student-portal cache reads
 * MUST go through this so a stray `nav:badges:<userId>` can never leak from
 * org A to org B (the same user can be a member of both).
 *
 * Layout: `org:<orgId>:<...parts>`. Pattern matches the storage prefix
 * `orgs/<orgId>/...` so a single tenant scrub can wipe both at once.
 */
export function orgKey(orgId: string, ...parts: string[]): string {
  return `org:${orgId}:${parts.join(":")}`;
}

/** Pre-built org-scoped keys for the host portal — extend as features land. */
export const orgCacheKey = {
  /** Edge middleware tenant guard: "is user X a member of slug Y?" */
  membership: (userId: string, slug: string) => `org:member:${userId}:${slug}`,
  dashboard: (orgId: string) => orgKey(orgId, "dashboard"),
  memberCount: (orgId: string) => orgKey(orgId, "member_count"),
} as const;

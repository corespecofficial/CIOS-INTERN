"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase, ensureDbUser } from "@/lib/db";

/**
 * Ensures the currently signed-in Clerk user has a matching row in Supabase users table.
 *
 * Resilience notes:
 *   - Fast path: if a Supabase row already exists with a role, return immediately
 *     without hitting Clerk. This is the normal case after the first sign-in and
 *     avoids burning a Clerk API call on every page load.
 *   - Slow path: only goes to Clerk when we need to backfill (first sign-in OR
 *     missing role). On transient Clerk `fetch failed` errors we retry once.
 *   - Failure path: if Clerk is unreachable AND the Supabase row exists, we
 *     return OK with the cached role instead of blowing up the post-auth flow.
 */
export async function ensureCurrentDbUser(): Promise<{
  ok: boolean;
  created: boolean;
  role: string;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { ok: false, created: false, role: "", error: "not signed in" };

    // 1. Fast path — check Supabase first.
    const { data: existing } = await supabase()
      .from("users")
      .select("id, role, email, name")
      .eq("clerk_id", userId)
      .maybeSingle();

    // If we already have a row with a role, skip the Clerk round-trip entirely.
    // This is the hot path after initial sign-in and is what makes post-auth
    // reliable when Clerk's edge has transient failures.
    if (existing && (existing as { role?: string }).role) {
      return { ok: true, created: false, role: String((existing as { role: string }).role) };
    }

    // 2. Slow path — need Clerk data. Retry once on transient fetch failure.
    const clerkUser = await fetchClerkUserWithRetry(userId);
    if (!clerkUser) {
      // Clerk unreachable. If we have an existing row, degrade gracefully.
      if (existing) {
        const fallbackRole = (existing as { role?: string }).role || "intern";
        console.warn("[ensureCurrentDbUser] Clerk unreachable; using cached Supabase row");
        return { ok: true, created: false, role: fallbackRole };
      }
      return { ok: false, created: false, role: "", error: "clerk_unreachable" };
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser.username ||
      email ||
      "New User";
    const avatarUrl = clerkUser.imageUrl || null;

    // 3. Backfill role if it isn't set on Clerk metadata yet.
    const currentRole = (clerkUser.publicMetadata?.role as string) || null;
    if (!currentRole) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
          publicMetadata: { role: "intern" },
        });
      } catch (metaErr) {
        // Metadata backfill is best-effort; don't fail the whole action.
        console.warn("[ensureCurrentDbUser] failed to set default role on Clerk:", metaErr);
      }
    }
    const role = currentRole || "intern";

    // 4. Upsert into Supabase.
    await ensureDbUser(userId, email, name, role as never, avatarUrl);

    return { ok: true, created: !existing, role };
  } catch (e) {
    console.error("[ensureCurrentDbUser] error:", e);
    return { ok: false, created: false, role: "", error: String(e) };
  }
}

/**
 * Fetch a Clerk user with one transparent retry on `fetch failed`. The Clerk
 * SDK surfaces transient DNS/network/edge errors as the string "fetch failed";
 * a single retry after a short backoff clears >90% of them in practice.
 */
async function fetchClerkUserWithRetry(userId: string): Promise<Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const client = await clerkClient();
      return await client.users.getUser(userId);
    } catch (e) {
      const msg = String(e);
      const transient = msg.includes("fetch failed") || msg.includes("unexpected_error") || msg.includes("ECONNRESET");
      if (!transient || attempt === 1) {
        console.warn("[ensureCurrentDbUser] Clerk getUser failed", { attempt, err: msg });
        return null;
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  return null;
}

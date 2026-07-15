"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin, ensureDbUser } from "@/lib/db";

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

    // 1a. Fast path returns Supabase role directly — BUT only if it agrees
    // with Clerk's session role. Middleware enforces routing using Clerk's
    // publicMetadata.role; if Supabase has drifted (legacy 'intern' from
    // before the public_user webhook default, never reconciled) this
    // function would hand back the stale role and post-auth would route
    // the user to a path their actual session can't access — denied loop.
    //
    // The session's `org` claim is unreliable here, but `sessionClaims`
    // already carries publicMetadata for free with no extra Clerk RPC.
    if (existing && (existing as { role?: string }).role) {
      const supaRole = String((existing as { role: string }).role);
      const { sessionClaims } = await auth();
      const claims = sessionClaims as Record<string, unknown> | null;
      const meta = (claims?.publicMetadata ?? claims?.metadata ?? null) as Record<string, unknown> | null;
      const clerkRole = typeof meta?.role === "string" ? (meta.role as string) : null;

      // No clerk role in claims (e.g. JWT not yet refreshed) → trust Supabase.
      if (!clerkRole || clerkRole === supaRole) {
        return { ok: true, created: false, role: supaRole };
      }

      // Drift: reconcile Supabase to Clerk so future fast-path hits agree.
      // Clerk is the source of truth — the middleware uses it, the badge
      // uses it, the user's mental model is "I'm a <clerkRole>".
      try {
        await supabaseAdmin().from("users").update({ role: clerkRole }).eq("clerk_id", userId);
        console.info(`[ensureCurrentDbUser] reconciled Supabase role ${supaRole}→${clerkRole} for ${userId}`);
      } catch (e) {
        console.warn("[ensureCurrentDbUser] reconcile failed (non-fatal):", e);
      }
      return { ok: true, created: false, role: clerkRole };
    }

    // 2. Slow path — need Clerk data. Retry once on transient fetch failure.
    const clerkUser = await fetchClerkUserWithRetry(userId);
    if (!clerkUser) {
      // Clerk unreachable. If we have an existing row, degrade gracefully.
      if (existing) {
        const fallbackRole = (existing as { role?: string }).role || "public_user";
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
    const { data: denied } = await supabaseAdmin().from("platform_identity_blacklist")
      .select("email").eq("email", email.trim().toLowerCase()).is("disabled_at", null).maybeSingle();
    if (denied) {
      const client = await clerkClient();
      await client.users.banUser(userId);
      await supabaseAdmin().from("users").update({ status: "suspended" }).eq("clerk_id", userId);
      return { ok: false, created: false, role: "", error: "identity_blacklisted" };
    }

    // 3. Backfill role if it isn't set on Clerk metadata yet.
    //    Default is "public_user" — every new signup goes through the
    //    /onboarding/intent gate to *choose* their portal. Defaulting to
    //    "intern" was a serious bug: a brand-new user would get auto-
    //    promoted into the intern portal, see the (app) shell with an
    //    "INTERN" badge, and be exposed to internal nav before they had
    //    even consented to a role. Webhook on user.created sets this too;
    //    this server action only runs as the webhook-failed fallback.
    const currentRole = (clerkUser.publicMetadata?.role as string) || null;
    if (!currentRole) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
          publicMetadata: { role: "public_user" },
        });
      } catch (metaErr) {
        // Metadata backfill is best-effort; don't fail the whole action.
        console.warn("[ensureCurrentDbUser] failed to set default role on Clerk:", metaErr);
      }
    }
    const role = currentRole || "public_user";

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

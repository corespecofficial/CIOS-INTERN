"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase, ensureDbUser } from "@/lib/db";

/**
 * Ensures the currently signed-in Clerk user has a matching row in Supabase users table.
 * Safe to call on every authenticated request — upserts are idempotent.
 * Also ensures publicMetadata.role is set (defaults to "intern" for new signups).
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

    // 1. Check if row already exists
    const { data: existing } = await supabase()
      .from("users")
      .select("id, role")
      .eq("clerk_id", userId)
      .maybeSingle();

    // 2. Fetch fresh Clerk user
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser.username ||
      email ||
      "New User";
    const avatarUrl = clerkUser.imageUrl || null;

    // 3. Ensure Clerk publicMetadata.role is set
    const currentRole = (clerkUser.publicMetadata?.role as string) || null;
    if (!currentRole) {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { role: "intern" },
      });
    }
    const role = currentRole || "intern";

    // 4. Upsert into Supabase
    await ensureDbUser(userId, email, name, role as never, avatarUrl);

    return { ok: true, created: !existing, role };
  } catch (e) {
    console.error("[ensureCurrentDbUser] error:", e);
    return { ok: false, created: false, role: "", error: String(e) };
  }
}

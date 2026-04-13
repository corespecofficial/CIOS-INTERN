"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { setWeights, type Weights } from "@/lib/performance";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claimsMeta = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claimsMeta.role === "super_admin") return userId;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.publicMetadata?.role !== "super_admin") throw new Error("Super admin only");
  return userId;
}

export async function saveWeights(weights: Partial<Weights>): Promise<Result> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "user missing" };
    await setWeights(weights, me.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

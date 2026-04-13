"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { setAiConfig, clearAiConfig, callLLM, type AiProvider } from "@/lib/ai-client";

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

export async function saveAiSettings(provider: AiProvider, apiKey: string, model: string): Promise<Result> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "user missing" };
    if (!apiKey || apiKey.length < 10) return { ok: false, error: "Invalid API key" };
    await setAiConfig(provider, apiKey.trim(), model.trim() || "", me.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearAiSettings(): Promise<Result> {
  try {
    await requireSuperAdmin();
    await clearAiConfig();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function testAiConnection(): Promise<Result<{ sample: string; provider: string; model: string }>> {
  try {
    await requireSuperAdmin();
    const r = await callLLM("In one short sentence, tell me why learning AI prompting matters in 2026.", { maxTokens: 80 });
    return { ok: true, data: { sample: r.text, provider: r.provider, model: r.model } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

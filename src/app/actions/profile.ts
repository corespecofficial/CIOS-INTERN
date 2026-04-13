"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { callLLM } from "@/lib/ai-client";
import { auth, clerkClient } from "@clerk/nextjs/server";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface ProfilePatch {
  name?: string;
  bio?: string | null;
  headline?: string | null;
  skills?: string[];
  interests?: string[];
  goals?: string | null;
  location?: string | null;
  social_links?: Record<string, string>;
  avatar_url?: string | null;
  cover_url?: string | null;
}

export interface PrivacySettings {
  profile_visibility?: "public" | "contacts" | "private";
  show_online?: boolean;
  show_last_seen?: boolean;
  show_achievements?: boolean;
  show_email?: boolean;
  messages_from?: "everyone" | "contacts" | "org";
  searchable?: boolean;
}

export interface AppPreferences {
  theme?: "dark" | "light" | "system";
  font_size?: "sm" | "md" | "lg";
  reduced_motion?: boolean;
  compact_layout?: boolean;
  language?: string;
  high_contrast?: boolean;
}

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export async function updateMyProfile(patch: ProfilePatch): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) dbPatch.name = patch.name.trim().slice(0, 120);
    if (patch.bio !== undefined) dbPatch.bio = (patch.bio || "").slice(0, 500);
    if (patch.headline !== undefined) dbPatch.headline = (patch.headline || "").slice(0, 140);
    if (patch.skills !== undefined) dbPatch.skills = patch.skills.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    if (patch.interests !== undefined) dbPatch.interests = patch.interests.map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    if (patch.goals !== undefined) dbPatch.goals = (patch.goals || "").slice(0, 500);
    if (patch.location !== undefined) dbPatch.location = (patch.location || "").slice(0, 120);
    if (patch.social_links !== undefined) {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(patch.social_links)) {
        if (typeof v === "string" && v.trim()) clean[k] = v.trim().slice(0, 200);
      }
      dbPatch.social_links = clean;
    }
    if (patch.avatar_url !== undefined) dbPatch.avatar_url = patch.avatar_url;
    if (patch.cover_url !== undefined) dbPatch.cover_url = patch.cover_url;

    const { error } = await sb.from("users").update(dbPatch).eq("id", me.id);
    if (error) return { ok: false, error: error.message };

    // Sync Clerk name + avatar if changed
    try {
      if (patch.name !== undefined || patch.avatar_url !== undefined) {
        const { userId } = await auth();
        if (userId) {
          const client = await clerkClient();
          if (patch.name !== undefined) {
            const parts = (patch.name || "").trim().split(/\s+/);
            await client.users.updateUser(userId, {
              firstName: parts[0] || undefined,
              lastName: parts.slice(1).join(" ") || undefined,
            });
          }
          if (patch.avatar_url) {
            try {
              const res = await fetch(patch.avatar_url);
              if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                const type = res.headers.get("content-type") || "image/jpeg";
                // Clerk Node SDK expects a Blob/File with a name
                const file = new Blob([new Uint8Array(buf)], { type });
                (file as unknown as { name?: string }).name = "avatar.jpg";
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (client.users as any).updateUserProfileImage(userId, { file });
              }
            } catch (e) { console.warn("[profile] clerk avatar sync:", e); }
          }
        }
      }
    } catch (e) { console.warn("[profile] clerk sync:", e); }

    revalidatePath("/profile");
    revalidatePath(`/profile/${me.id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateMyPrivacy(patch: PrivacySettings): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("users").select("privacy").eq("id", me.id).single();
    const current = (existing?.privacy || {}) as PrivacySettings;
    const merged = { ...current, ...patch };
    const { error } = await sb.from("users").update({ privacy: merged }).eq("id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateMyPreferences(patch: AppPreferences): Promise<Result> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("users").select("preferences").eq("id", me.id).single();
    const current = (existing?.preferences || {}) as AppPreferences;
    const merged = { ...current, ...patch };
    const { error } = await sb.from("users").update({ preferences: merged }).eq("id", me.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function aiSuggestBio(input: { name: string; role: string; skills: string[]; existing?: string }): Promise<Result<{ suggestions: string[] }>> {
  try {
    await requireMe();
    const prompt = `Write 3 different short, professional bios (max 60 words each) for a CIOS Platform user.

Name: ${input.name}
Role: ${input.role}
Skills: ${input.skills.join(", ") || "not listed"}
${input.existing ? `Current bio (improve it): ${input.existing}` : ""}

Return as a numbered list (1., 2., 3.). No other text.`;
    const r = await callLLM(prompt, { maxTokens: 500, temperature: 0.8 });
    const lines = r.text.split("\n").filter((l) => /^\s*\d/.test(l)).map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
    return { ok: true, data: { suggestions: lines.slice(0, 3) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function requestAccountDeletion(reason: string): Promise<Result> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("notifications").insert({
      user_id: me.id,
      title: "Deletion request received",
      message: `We'll review and confirm by email. Reason: ${reason.slice(0, 200)}`,
      type: "system",
    });
    // Admin notification — best effort, flag in a report
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

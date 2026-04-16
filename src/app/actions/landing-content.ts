"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin() {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") throw new Error("Unauthorized");
  return me;
}

/* ─────────────────────────── SETTINGS ─────────────────────────── */

export interface PlatformSettings {
  homepage_video_url: string;
  homepage_stats_interns: string;
  homepage_stats_courses: string;
  homepage_stats_mentors: string;
  homepage_stats_countries: string;
  homepage_stats_partners: string;
  homepage_screenshot_1_url: string;
  homepage_screenshot_1_label: string;
  homepage_screenshot_2_url: string;
  homepage_screenshot_2_label: string;
  homepage_screenshot_3_url: string;
  homepage_screenshot_3_label: string;
  homepage_screenshot_4_url: string;
  homepage_screenshot_4_label: string;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("platform_settings").select("key, value");
  const map: Record<string, string> = {};
  for (const row of (data || []) as { key: string; value: string }[]) {
    map[row.key] = row.value ?? "";
  }
  return {
    homepage_video_url:           map.homepage_video_url           ?? "",
    homepage_stats_interns:       map.homepage_stats_interns       ?? "500+",
    homepage_stats_courses:       map.homepage_stats_courses       ?? "48",
    homepage_stats_mentors:       map.homepage_stats_mentors       ?? "15",
    homepage_stats_countries:     map.homepage_stats_countries     ?? "12",
    homepage_stats_partners:      map.homepage_stats_partners      ?? "80+",
    homepage_screenshot_1_url:    map.homepage_screenshot_1_url    ?? "",
    homepage_screenshot_1_label:  map.homepage_screenshot_1_label  ?? "Intern Dashboard",
    homepage_screenshot_2_url:    map.homepage_screenshot_2_url    ?? "",
    homepage_screenshot_2_label:  map.homepage_screenshot_2_label  ?? "AI Hub",
    homepage_screenshot_3_url:    map.homepage_screenshot_3_url    ?? "",
    homepage_screenshot_3_label:  map.homepage_screenshot_3_label  ?? "Leaderboard",
    homepage_screenshot_4_url:    map.homepage_screenshot_4_url    ?? "",
    homepage_screenshot_4_label:  map.homepage_screenshot_4_label  ?? "Recruiter Portal",
  };
}

export async function updatePlatformSetting(key: string, value: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    await sb.from("platform_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    revalidatePath("/");
    revalidatePath("/about");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<R> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    const rows = Object.entries(settings).map(([key, value]) => ({
      key, value: value ?? "", updated_at: new Date().toISOString(),
    }));
    await sb.from("platform_settings").upsert(rows, { onConflict: "key" });
    revalidatePath("/");
    revalidatePath("/about");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────────────────────── TESTIMONIALS ─────────────────────────── */

export interface LandingTestimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar_url: string | null;
  initials: string;
  gradient: string;
  stars: number;
  is_active: boolean;
  sort_order: number;
}

export async function getLandingTestimonials(): Promise<LandingTestimonial[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("landing_testimonials")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data || []) as LandingTestimonial[];
}

export async function getAllLandingTestimonials(): Promise<LandingTestimonial[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("landing_testimonials")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data || []) as LandingTestimonial[];
}

export async function saveLandingTestimonial(
  input: Omit<LandingTestimonial, "id"> & { id?: string }
): Promise<R<LandingTestimonial>> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    const { id, ...rest } = input;
    const payload = { ...rest, updated_at: new Date().toISOString() };

    let result;
    if (id) {
      const { data, error } = await sb.from("landing_testimonials").update(payload).eq("id", id).select().maybeSingle();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await sb.from("landing_testimonials").insert(payload).select().maybeSingle();
      if (error) throw error;
      result = data;
    }
    revalidatePath("/");
    return { ok: true, data: result as LandingTestimonial };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteLandingTestimonial(id: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    await sb.from("landing_testimonials").delete().eq("id", id);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function toggleTestimonialActive(id: string, is_active: boolean): Promise<R> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    await sb.from("landing_testimonials").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

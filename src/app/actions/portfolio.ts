"use server";

import { supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PortfolioProject {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  artifact_url: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  category: string | null;
}

export interface PortfolioCertificate {
  id: string;
  title: string;
  issued_at: string;
  url: string | null;
  verification_code: string | null;
}

export interface PortfolioData {
  id: string;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  headline: string;
  bio: string;
  skills: string[];
  location: string;
  social_links: Record<string, string>;
  role: string;
  joined_at: string;
  // Stats
  performance_score: number;
  xp: number;
  streak: number;
  projects_count: number;
  certificates_count: number;
  courses_completed: number;
  badges_count: number;
  // Content
  projects: PortfolioProject[];
  certificates: PortfolioCertificate[];
  top_badges: { name: string; icon: string | null; description: string | null }[];
}

export async function getPortfolio(userId: string): Promise<R<PortfolioData>> {
  try {
    const sb = supabaseAdmin();
    const { data: u } = await sb.from("users").select("*").eq("id", userId).maybeSingle();
    if (!u) return { ok: false, error: "User not found" };

    const [subsRes, certsRes, coursesRes, badgesRes] = await Promise.all([
      sb.from("submissions")
        .select("id, task_id, score, feedback, submitted_at, artifact_url, task:tasks(title, description, category, thumbnail_url)")
        .eq("user_id", userId)
        .order("score", { ascending: false, nullsFirst: false })
        .order("submitted_at", { ascending: false })
        .limit(12),
      sb.from("certificates")
        .select("id, title, issued_at, url, verification_code")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false })
        .limit(20),
      sb.from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
      sb.from("user_badges")
        .select("badge:badges(name, icon_url, description), earned_at")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
        .limit(6),
    ]);

    type SubRow = {
      id: string;
      task_id: string;
      score: number | null;
      feedback: string | null;
      submitted_at: string;
      artifact_url: string | null;
      task: { title?: string; description?: string; category?: string; thumbnail_url?: string | null } | null;
    };
    const projects: PortfolioProject[] = ((subsRes.data ?? []) as SubRow[]).map((s) => ({
      id: s.id,
      title: s.task?.title ?? "Project",
      description: s.task?.description ?? null,
      thumbnail_url: s.task?.thumbnail_url ?? null,
      artifact_url: s.artifact_url,
      score: s.score,
      feedback: s.feedback,
      submitted_at: s.submitted_at,
      category: s.task?.category ?? null,
    }));

    const certificates: PortfolioCertificate[] = (certsRes.data ?? []) as PortfolioCertificate[];

    type BadgeRow = { badge: { name: string; icon_url: string | null; description: string | null } | null };
    const top_badges = ((badgesRes.data ?? []) as BadgeRow[])
      .filter((b) => b.badge)
      .map((b) => ({ name: b.badge!.name, icon: b.badge!.icon_url, description: b.badge!.description }));

    return {
      ok: true,
      data: {
        id: u.id,
        name: u.name || "CIOS Member",
        avatar_url: u.avatar_url,
        cover_url: u.cover_url,
        headline: u.headline || "",
        bio: u.bio || "",
        skills: u.skills || [],
        location: u.location || "",
        social_links: u.social_links || {},
        role: u.role,
        joined_at: u.created_at,
        performance_score: Number(u.performance ?? 0),
        xp: Number(u.xp ?? 0),
        streak: Number(u.streak ?? 0),
        projects_count: projects.length,
        certificates_count: certificates.length,
        courses_completed: Number(coursesRes.count ?? 0),
        badges_count: top_badges.length,
        projects,
        certificates,
        top_badges,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

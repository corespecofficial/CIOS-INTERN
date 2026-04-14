import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { CVDocument, type CVData } from "@/components/cv/cv-document";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const me = await getCurrentDbUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const [{ data: u }, certs, courses] = await Promise.all([
    sb.from("users").select("name, email, headline, bio, skills, interests, goals, location, social_links, avatar_url, level, xp, performance, created_at").eq("id", me.id).maybeSingle(),
    sb.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", me.id),
    sb.from("course_enrollments").select("*", { count: "exact", head: true }).eq("user_id", me.id).eq("status", "completed"),
  ]);

  if (!u) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const data: CVData = {
    name: (u as { name: string }).name,
    email: (u as { email: string }).email,
    headline: (u as { headline: string | null }).headline,
    bio: (u as { bio: string | null }).bio,
    skills: ((u as { skills: string[] | null }).skills) || [],
    interests: ((u as { interests: string[] | null }).interests) || [],
    goals: (u as { goals: string | null }).goals,
    location: (u as { location: string | null }).location,
    socialLinks: ((u as { social_links: Record<string, string> | null }).social_links) || {},
    avatarUrl: (u as { avatar_url: string | null }).avatar_url,
    level: (u as { level: number | null }).level || 1,
    xp: (u as { xp: number | null }).xp || 0,
    performance: (u as { performance: number | null }).performance || 0,
    joined: (u as { created_at: string }).created_at,
    certificateCount: certs.count || 0,
    coursesCompleted: courses.count || 0,
  };

  const buffer = await renderToBuffer(React.createElement(CVDocument, { data }));

  const filename = `${data.name.replace(/[^a-z0-9]+/gi, "-")}-CV.pdf`;
  const isDownload = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

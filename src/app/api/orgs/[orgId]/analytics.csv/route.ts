/**
 * GET /api/orgs/<orgId>/analytics.csv?kind=<assignments|students>
 *
 * CSV download of the host analytics page. Two report types share this
 * endpoint:
 *
 *   - kind=assignments → one row per assignment with submitted count,
 *     submission rate, average grade, due date.
 *   - kind=students → one row per student with engagement signals: had
 *     a lesson view in the last 30d? submissions count? last seen?
 *
 * Authz: super_admin OR active member with host role (owner /
 * org_admin / instructor) — same gate as the analytics page.
 *
 * The file pattern (BOM, RFC4180 escaping, csvEscape helper) mirrors
 * audit.csv on purpose — keep parity so spreadsheet imports behave
 * identically across reports.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

const HOST_ROLES = new Set(["owner", "org_admin", "instructor"]);
const WINDOW_DAYS = 30;

function csvEscape(v: unknown): string {
  if (v == null) return "";
  let s = typeof v === "string" ? v : JSON.stringify(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvResponse(filename: string, headers: readonly string[], rows: unknown[][]): NextResponse {
  const lines: string[] = [headers.map(csvEscape).join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  if (!orgId) return new NextResponse("Missing orgId", { status: 400 });

  const me = await getCurrentDbUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();
  const { data: orgRow } = await sb.from("creative_orgs").select("id, slug").eq("id", orgId).maybeSingle();
  const org = orgRow as { id: string; slug: string } | null;
  if (!org) return new NextResponse("Org not found", { status: 404 });

  if (me.role !== "super_admin") {
    const { data: m } = await sb
      .from("org_members")
      .select("role, status")
      .eq("org_id", orgId)
      .eq("user_id", me.id)
      .eq("status", "active")
      .maybeSingle();
    const role = (m as { role?: string } | null)?.role;
    if (!role || !HOST_ROLES.has(role)) return new NextResponse("Forbidden", { status: 403 });
  }

  const kind = (req.nextUrl.searchParams.get("kind") || "assignments").toLowerCase();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "assignments") {
    const [aRes, sRes, mRes] = await Promise.all([
      sb.from("org_assignments")
        .select("id, title, due_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      sb.from("org_submissions")
        .select("assignment_id, student_id, grade, submitted_at")
        .eq("org_id", orgId)
        .gte("submitted_at", since),
      sb.from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("role", "student")
        .eq("status", "active"),
    ]);
    const assignments = (aRes.data || []) as Array<{ id: string; title: string; due_at: string | null; created_at: string }>;
    const subs = (sRes.data || []) as Array<{ assignment_id: string; student_id: string; grade: number | null; submitted_at: string }>;
    const studentCount = mRes.count ?? 0;

    const subsByA = new Map<string, typeof subs>();
    for (const s of subs) {
      const arr = subsByA.get(s.assignment_id) || [];
      arr.push(s);
      subsByA.set(s.assignment_id, arr);
    }

    const headers = ["assignment_id", "title", "due_at", "created_at", "students_submitted", "roster_size", "submission_rate", "avg_grade"] as const;
    const rows = assignments.map((a) => {
      const list = subsByA.get(a.id) || [];
      const submittedSet = new Set(list.map((s) => s.student_id));
      const submitted = submittedSet.size;
      const rate = studentCount > 0 ? submitted / studentCount : 0;
      const grades = list.map((s) => s.grade).filter((g): g is number => g !== null);
      const avg = grades.length > 0 ? grades.reduce((x, y) => x + y, 0) / grades.length : null;
      return [
        a.id,
        a.title,
        a.due_at ?? "",
        a.created_at,
        submitted,
        studentCount,
        rate.toFixed(4),
        avg === null ? "" : avg.toFixed(2),
      ];
    });
    return csvResponse(`cios-${org.slug}-assignments-${stamp}.csv`, headers, rows);
  }

  if (kind === "students") {
    const [rosterRes, lessonViewsRes, subsRes] = await Promise.all([
      sb.from("org_members")
        .select("user_id, joined_at, users:user_id(id, name, email, last_seen)")
        .eq("org_id", orgId)
        .eq("role", "student")
        .eq("status", "active"),
      sb.from("user_events")
        .select("user_id, created_at")
        .eq("event", "page_view")
        .gte("created_at", since)
        .like("meta->>path", `/s/${org.slug}/lessons/%`)
        .limit(10_000),
      sb.from("org_submissions")
        .select("student_id, submitted_at")
        .eq("org_id", orgId)
        .gte("submitted_at", since)
        .limit(10_000),
    ]);

    type RosterRow = { user_id: string; joined_at: string; users: { id: string; name: string | null; email: string | null; last_seen: string | null } | null };
    const roster = ((rosterRes.data || []) as unknown as RosterRow[]).filter((r) => r.users);
    const lessonViews = (lessonViewsRes.data || []) as Array<{ user_id: string; created_at: string }>;
    const subs = (subsRes.data || []) as Array<{ student_id: string; submitted_at: string }>;

    const viewsByUser = new Map<string, number>();
    const lastViewByUser = new Map<string, string>();
    for (const v of lessonViews) {
      viewsByUser.set(v.user_id, (viewsByUser.get(v.user_id) || 0) + 1);
      const prev = lastViewByUser.get(v.user_id);
      if (!prev || v.created_at > prev) lastViewByUser.set(v.user_id, v.created_at);
    }
    const subsByUser = new Map<string, number>();
    const lastSubByUser = new Map<string, string>();
    for (const s of subs) {
      subsByUser.set(s.student_id, (subsByUser.get(s.student_id) || 0) + 1);
      const prev = lastSubByUser.get(s.student_id);
      if (!prev || s.submitted_at > prev) lastSubByUser.set(s.student_id, s.submitted_at);
    }

    const headers = ["student_id", "name", "email", "joined_at", "last_seen", "lesson_views_30d", "last_lesson_view", "submissions_30d", "last_submission", "is_active_30d"] as const;
    const rows = roster.map((r) => {
      const u = r.users!;
      const views = viewsByUser.get(u.id) || 0;
      const subCount = subsByUser.get(u.id) || 0;
      const isActive = views > 0 || subCount > 0;
      return [
        u.id,
        u.name ?? "",
        u.email ?? "",
        r.joined_at,
        u.last_seen ?? "",
        views,
        lastViewByUser.get(u.id) ?? "",
        subCount,
        lastSubByUser.get(u.id) ?? "",
        isActive ? "true" : "false",
      ];
    });
    return csvResponse(`cios-${org.slug}-students-${stamp}.csv`, headers, rows);
  }

  return new NextResponse(`Unknown kind: ${kind}. Use ?kind=assignments or ?kind=students`, { status: 400 });
}

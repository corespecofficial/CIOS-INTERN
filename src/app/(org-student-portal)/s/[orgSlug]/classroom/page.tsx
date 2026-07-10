import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin, rankForLevel, type ClassSessionRow, type HomeActivityItem, type HomeTask } from "@/lib/db";
import { levelFromXP } from "@/lib/gamification-shared";
import { ClassroomClient } from "@/app/(app)/classroom/classroom-client";

export const dynamic = "force-dynamic";

function dueLabel(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const now = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3_600_000;
  if (diffH < 0) return "Overdue";
  if (d.toDateString() === now.toDateString()) return "Today";
  if (diffH < 48) return "Tomorrow";
  return `In ${Math.ceil(diffH / 24)} days`;
}

function relTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export default async function OrgClassroomPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const nowMs = new Date().getTime();
  const yesterdayIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const [assignmentsRes, lessonsRes, completedRes, activityRes] = await Promise.all([
    sb.from("org_assignments")
      .select("id, title, due_at")
      .eq("org_id", ctx.org.id)
      .gte("due_at", yesterdayIso)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(6),
    sb.from("org_lessons")
      .select("id, title, position")
      .eq("org_id", ctx.org.id)
      .order("position", { ascending: true })
      .limit(4),
    sb.from("org_lesson_completions")
      .select("lesson_id")
      .eq("org_id", ctx.org.id)
      .eq("user_id", ctx.me.id),
    sb.from("org_audit_log")
      .select("id, action, meta, created_at")
      .eq("org_id", ctx.org.id)
      .in("action", ["announcement.posted", "lesson.created", "assignment.created"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const completed = new Set(((completedRes.data || []) as Array<{ lesson_id: string }>).map((row) => row.lesson_id));
  const lessons = (lessonsRes.data || []) as Array<{ id: string; title: string; position: number | null }>;
  const continueLearning = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    progress: completed.has(lesson.id) ? 100 : 0,
    thumbnailUrl: null,
    category: "Org course",
    href: `/s/${orgSlug}/lessons/${lesson.id}`,
  }));

  const todaysTasks: HomeTask[] = ((assignmentsRes.data || []) as Array<{ id: string; title: string; due_at: string | null }>).map((task) => ({
    id: task.id,
    title: task.title,
    dueLabel: dueLabel(task.due_at),
    priority: task.due_at && new Date(task.due_at).getTime() < nowMs ? "urgent" : "medium",
  }));

  const activity: HomeActivityItem[] = ((activityRes.data || []) as Array<{ id: string; action: string; meta: Record<string, unknown> | null; created_at: string }>).map((row) => {
    const title = typeof row.meta?.title === "string" ? row.meta.title : "New update";
    const label = row.action === "assignment.created"
      ? `Assignment: ${title}`
      : row.action === "lesson.created"
      ? `Lesson: ${title}`
      : `Announcement: ${title}`;
    return {
      id: row.id,
      text: label,
      value: "",
      color: row.action === "assignment.created" ? "#FFC107" : row.action === "lesson.created" ? "#1E88E5" : "#AB47BC",
      timeLabel: relTime(row.created_at),
    };
  });

  const xp = ctx.me.xp || 0;
  const level = levelFromXP(xp);

  return (
    <ClassroomClient
      sessions={[] as ClassSessionRow[]}
      canInstruct={false}
      panels={{
        todaysTasks,
        activity,
        continueLearning,
        rewards: {
          xp,
          streak: ctx.me.streak || 0,
          level,
          rank: rankForLevel(level),
          performance: ctx.me.performance || 0,
        },
      }}
      basePath={`/s/${orgSlug}`}
    />
  );
}

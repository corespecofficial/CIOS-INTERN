import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import TasksClient, { type TaskVM } from "@/app/(app)/tasks/tasks-client";

export const dynamic = "force-dynamic";

function formatDue(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `Due ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function priorityForDue(iso: string | null): TaskVM["priority"] {
  if (!iso) return "low";
  const diffHours = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  if (diffHours < 0) return "urgent";
  if (diffHours <= 24) return "high";
  if (diffHours <= 72) return "medium";
  return "low";
}

export default async function OrgTasksPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const [assignmentsRes, submissionsRes] = await Promise.all([
    sb.from("org_assignments")
      .select("id, title, due_at")
      .eq("org_id", ctx.org.id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    sb.from("org_submissions")
      .select("assignment_id, grade, submitted_at")
      .eq("org_id", ctx.org.id)
      .eq("student_id", ctx.me.id),
  ]);

  const submissions = new Map(
    ((submissionsRes.data || []) as Array<{ assignment_id: string; grade: number | null; submitted_at: string }>).map((row) => [row.assignment_id, row]),
  );

  const tasks: TaskVM[] = ((assignmentsRes.data || []) as Array<{ id: string; title: string; due_at: string | null }>).map((assignment) => {
    const submitted = submissions.get(assignment.id);
    return {
      title: `Assignment: ${assignment.title}`,
      due: formatDue(assignment.due_at),
      dueIso: assignment.due_at || new Date().toISOString(),
      xp: submitted?.grade != null ? Math.max(10, submitted.grade) : 50,
      status: submitted ? "Done" : "Pending",
      priority: priorityForDue(assignment.due_at),
    };
  });

  return (
    <TasksClient
      tasks={tasks}
      streak={ctx.me.streak || 0}
      performance={ctx.me.performance || 0}
    />
  );
}

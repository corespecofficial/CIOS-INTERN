import { getCurrentUserTasks, getCurrentDbUser, type DbTask } from "@/lib/db";
import TasksClient, { type TaskVM } from "./tasks-client";

export const dynamic = "force-dynamic";

function mapStatus(s: DbTask["status"]): TaskVM["status"] {
  if (s === "approved" || s === "submitted" || s === "under_review") return "Done";
  if (s === "in_progress") return "In Progress";
  return "Pending";
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Due ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default async function TasksPage() {
  const [dbTasks, dbUser] = await Promise.all([getCurrentUserTasks(), getCurrentDbUser()]);
  const tasks: TaskVM[] = dbTasks.map((t) => ({
    title: t.title,
    due: formatDue(t.due_date),
    dueIso: t.due_date,
    xp: t.xp_reward,
    status: mapStatus(t.status),
    priority: t.priority,
  }));
  return (
    <TasksClient
      tasks={tasks}
      streak={dbUser?.streak ?? 0}
      performance={dbUser?.performance ?? 0}
    />
  );
}

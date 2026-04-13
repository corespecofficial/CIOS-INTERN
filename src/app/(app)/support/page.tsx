import { listSupportQueue, countOpenSupport } from "@/lib/db";
import { SupportDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
}

function priorityOf(type: string): "Urgent" | "Medium" | "Low" {
  if (type === "error" || type === "fine") return "Urgent";
  if (type === "warning") return "Medium";
  return "Low";
}

export default async function SupportPage() {
  const [queue, counts] = await Promise.all([listSupportQueue(10), countOpenSupport()]);
  return (
    <SupportDashboard
      stats={{ open: counts.open, inProgress: counts.inProgress, resolved: counts.resolvedToday }}
      tickets={queue.map((t) => ({
        id: t.id,
        priority: priorityOf(t.type),
        title: t.title,
        user: t.user_name || "Unknown",
        time: timeAgo(t.created_at),
      }))}
    />
  );
}

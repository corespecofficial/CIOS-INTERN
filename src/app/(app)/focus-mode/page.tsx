import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { FocusClient } from "./focus-client";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  let recent: Array<Record<string, unknown>> = [];
  let weekPomodoros = 0;
  let weekMinutes = 0;
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabaseAdmin().from("timer_sessions")
      .select("kind, planned_seconds, actual_seconds, label, completed, started_at")
      .eq("user_id", me.id).gte("started_at", since).order("started_at", { ascending: false }).limit(20);
    recent = data || [];
    for (const r of recent as Array<{ kind: string; actual_seconds: number; completed: boolean }>) {
      if (r.kind === "pomodoro" && r.completed) weekPomodoros += 1;
      weekMinutes += Math.round((r.actual_seconds || 0) / 60);
    }
  } catch {/* table may not exist yet */}

  return <FocusClient recent={recent} weekPomodoros={weekPomodoros} weekMinutes={weekMinutes} />;
}

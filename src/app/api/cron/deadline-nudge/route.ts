import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Wave 2.1 — Warning Before the Fine
// Sends warm mentor-tone notifications at 24h, 6h, and 1h before deadline.
// Runs every hour via Vercel Cron. Tracks sent reminders to prevent duplicates.
// ─────────────────────────────────────────────────────────────────────────────

const NUDGE_WINDOWS = [
  {
    key: "24h_nudge" as const,
    minMinutes: 1380,   // 23h
    maxMinutes: 1500,   // 25h
    getMessage: (taskTitle: string, hours: number) =>
      `Hey — "${taskTitle}" is due in about ${hours} hour${hours !== 1 ? "s" : ""}. You still have plenty of time to do your best work. Show up with intention 🌱`,
    getTitle: (taskTitle: string) => `📋 Reminder: ${taskTitle} is due tomorrow`,
  },
  {
    key: "6h_nudge" as const,
    minMinutes: 330,    // 5.5h
    maxMinutes: 390,    // 6.5h
    getMessage: (taskTitle: string) =>
      `6 hours left for "${taskTitle}". This is your moment — you've got this. Don't let it slip by 💪`,
    getTitle: (taskTitle: string) => `⏳ 6 hours left: ${taskTitle}`,
  },
  {
    key: "1h_nudge" as const,
    minMinutes: 50,     // 50min
    maxMinutes: 70,     // 70min
    getMessage: (taskTitle: string) =>
      `Final hour for "${taskTitle}". Submit now — it's not too late. An eagle doesn't wait until the sky is gone 🦅`,
    getTitle: (taskTitle: string) => `🚀 Final hour: ${taskTitle}`,
  },
] as const;

type NudgeKey = (typeof NUDGE_WINDOWS)[number]["key"];

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret") ||
    "";
  return provided === secret;
}

async function runDeadlineNudge() {
  const sb = supabaseAdmin();
  const now = new Date();

  let nudgesSent = 0;

  // Fetch active tasks with deadline in the next 26 hours
  const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString();
  const { data: activeTasks } = await sb
    .from("compliance_tasks")
    .select("id, title, deadline, auto_reminder")
    .eq("status", "active")
    .eq("auto_reminder", true)
    .gt("deadline", now.toISOString())
    .lte("deadline", in26h);

  if (!activeTasks?.length) return { nudgesSent: 0 };

  const taskIds = activeTasks.map((t) => t.id as string);

  // Fetch all assignments for these tasks
  const { data: allAssignments } = await sb
    .from("compliance_task_assignments")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  if (!allAssignments?.length) return { nudgesSent: 0 };

  // Fetch already submitted tasks
  const { data: submissions } = await sb
    .from("compliance_task_submissions")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  const submittedSet = new Set(
    (submissions || []).map((s) => `${s.task_id}::${s.user_id}`)
  );

  // Fetch reminders already sent for these tasks (to avoid duplicates)
  const nudgeTypes: NudgeKey[] = ["24h_nudge", "6h_nudge", "1h_nudge"];
  const { data: existingReminders } = await sb
    .from("compliance_task_reminders")
    .select("task_id, user_id, reminder_type")
    .in("task_id", taskIds)
    .in("reminder_type", nudgeTypes);

  const remindedSet = new Set(
    (existingReminders || []).map((r) => `${r.task_id}::${r.user_id}::${r.reminder_type}`)
  );

  const reminderInserts: Array<{
    task_id: string;
    user_id: string;
    reminder_type: string;
    sent_at: string;
    minutes_before: number;
  }> = [];

  const notifInserts: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    action_url: string;
    is_read: boolean;
  }> = [];

  for (const task of activeTasks) {
    const minsLeft = (new Date(task.deadline as string).getTime() - now.getTime()) / 60000;

    for (const window of NUDGE_WINDOWS) {
      if (minsLeft < window.minMinutes || minsLeft > window.maxMinutes) continue;

      const assignments = allAssignments.filter((a) => a.task_id === task.id);

      for (const a of assignments) {
        const pairKey = `${task.id}::${a.user_id}`;
        const reminderKey = `${pairKey}::${window.key}`;

        if (submittedSet.has(pairKey)) continue;    // already submitted
        if (remindedSet.has(reminderKey)) continue; // already nudged

        const hoursLeft = Math.round(minsLeft / 60);
        const userId = a.user_id as string;
        const taskTitle = task.title as string;

        reminderInserts.push({
          task_id: task.id as string,
          user_id: userId,
          reminder_type: window.key,
          sent_at: now.toISOString(),
          minutes_before: Math.round(minsLeft),
        });

        notifInserts.push({
          user_id: userId,
          title: window.getTitle(taskTitle),
          message:
            window.key === "24h_nudge"
              ? window.getMessage(taskTitle, hoursLeft)
              : window.getMessage(taskTitle),
          type: "task",
          action_url: "/compliance",
          is_read: false,
        });

        nudgesSent++;
      }
    }
  }

  if (reminderInserts.length > 0) {
    await Promise.all([
      sb.from("compliance_task_reminders").insert(reminderInserts),
      sb.from("notifications").insert(notifInserts),
    ]);
  }

  return { nudgesSent };
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDeadlineNudge();
    return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[deadline-nudge] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDeadlineNudge();
    return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[deadline-nudge] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

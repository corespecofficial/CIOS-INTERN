import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type NotifPayload = {
  user_id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
};

async function pushNotifs(sb: ReturnType<typeof supabaseAdmin>, notifs: NotifPayload[]) {
  if (!notifs.length) return;
  await sb.from("notifications").insert(
    notifs.map((n) => ({
      user_id: n.user_id,
      title: n.title.slice(0, 200),
      message: n.message.slice(0, 500),
      type: n.type,
      action_url: n.action_url,
      is_read: false,
    }))
  );
}

function minutesUntil(isoDate: string, now: Date): number {
  return (new Date(isoDate).getTime() - now.getTime()) / 60000;
}

function minsAgo(isoDate: string, now: Date): number {
  return (now.getTime() - new Date(isoDate).getTime()) / 60000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler — Vercel Cron calls GET; POST allowed for manual triggers
// ─────────────────────────────────────────────────────────────────────────────

async function runComplianceCheck() {
  const sb = supabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();

  let remindersCount = 0;
  let violationsCount = 0;
  let incidentReportsCount = 0;
  let suspensionsCount = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch all active tasks with their assignments in a single pass
  // ───────────────────────────────────────────────────────────────────────────
  const { data: activeTasks, error: tasksErr } = await sb
    .from("compliance_tasks")
    .select("id, title, deadline, grace_period_minutes, fine_amount, auto_reminder, auto_escalate")
    .eq("status", "active");

  if (tasksErr || !activeTasks?.length) {
    return { reminders: 0, violations: 0, incidentReports: 0, suspensions: 0 };
  }

  // Batch-fetch all assignments for these tasks
  const taskIds = activeTasks.map((t) => t.id as string);

  const { data: allAssignments } = await sb
    .from("compliance_task_assignments")
    .select("id, task_id, user_id")
    .in("task_id", taskIds);

  if (!allAssignments?.length) {
    return { reminders: 0, violations: 0, incidentReports: 0, suspensions: 0 };
  }

  // Batch-fetch all submissions for assigned tasks
  const assignedUserTaskPairs = allAssignments.map((a) => ({ task_id: a.task_id as string, user_id: a.user_id as string }));
  const { data: allSubmissions } = await sb
    .from("compliance_task_submissions")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  const submittedSet = new Set(
    (allSubmissions || []).map((s) => `${s.task_id}::${s.user_id}`)
  );

  // ── 1. REMINDER PHASE ──────────────────────────────────────────────────────
  // Tasks where deadline is between now+5min and now+30min
  const reminderTasks = activeTasks.filter((t) => {
    if (!t.auto_reminder) return false;
    const minsLeft = minutesUntil(t.deadline as string, now);
    return minsLeft >= 5 && minsLeft <= 30;
  });

  if (reminderTasks.length > 0) {
    const reminderTaskIds = reminderTasks.map((t) => t.id as string);

    // Find reminders already sent within the last 5 minutes
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { data: recentReminders } = await sb
      .from("compliance_task_reminders")
      .select("task_id, user_id")
      .in("task_id", reminderTaskIds)
      .gte("sent_at", fiveMinAgo);

    const alreadyRemindedSet = new Set(
      (recentReminders || []).map((r) => `${r.task_id}::${r.user_id}`)
    );

    const reminderInserts: Array<{
      task_id: string;
      user_id: string;
      reminder_type: string;
      sent_at: string;
      minutes_before: number;
    }> = [];
    const reminderNotifs: NotifPayload[] = [];

    for (const task of reminderTasks) {
      const minsLeft = Math.round(minutesUntil(task.deadline as string, now));
      const assignments = allAssignments.filter((a) => a.task_id === task.id);

      for (const a of assignments) {
        const key = `${task.id}::${a.user_id}`;
        if (alreadyRemindedSet.has(key)) continue;   // already reminded recently
        if (submittedSet.has(key)) continue;          // already submitted

        reminderInserts.push({
          task_id: task.id as string,
          user_id: a.user_id as string,
          reminder_type: "in_app",
          sent_at: nowIso,
          minutes_before: minsLeft,
        });

        reminderNotifs.push({
          user_id: a.user_id as string,
          title: `⏰ Deadline reminder: ${task.title}`,
          message: `"${task.title}" is due in ${minsLeft} minute${minsLeft !== 1 ? "s" : ""}. Submit now to avoid a fine.`,
          type: "task",
          action_url: "/compliance",
        });
      }
    }

    if (reminderInserts.length > 0) {
      await sb.from("compliance_task_reminders").insert(reminderInserts);
      await pushNotifs(sb, reminderNotifs);
      remindersCount = reminderInserts.length;
    }
  }

  // ── 2. MISSED DEADLINE PHASE ───────────────────────────────────────────────
  // Tasks where (deadline + grace_period_minutes) < now
  const missedTasks = activeTasks.filter((t) => {
    const effectiveDeadline =
      new Date(t.deadline as string).getTime() + (t.grace_period_minutes as number) * 60 * 1000;
    return effectiveDeadline < now.getTime();
  });

  if (missedTasks.length > 0) {
    // Batch-fetch existing violations for these tasks to determine severity
    const missedTaskIds = missedTasks.map((t) => t.id as string);

    const { data: existingViolations } = await sb
      .from("compliance_violations")
      .select("user_id, task_id")
      .in("task_id", missedTaskIds)
      .eq("violation_type", "missed_task");

    const violationExistsSet = new Set(
      (existingViolations || []).map((v) => `${v.task_id}::${v.user_id}`)
    );

    // Batch-fetch existing fines for these tasks
    const { data: existingFines } = await sb
      .from("compliance_fines")
      .select("user_id, task_id")
      .in("task_id", missedTaskIds);

    const fineExistsSet = new Set(
      (existingFines || []).map((f) => `${f.task_id}::${f.user_id}`)
    );

    // Batch-fetch per-user violation counts (for severity determination)
    const defaultingUserIds = allAssignments
      .filter((a) => missedTaskIds.includes(a.task_id as string))
      .filter((a) => !submittedSet.has(`${a.task_id}::${a.user_id}`))
      .map((a) => a.user_id as string);

    const uniqueDefaultingUserIds = [...new Set(defaultingUserIds)];

    const { data: userViolationCounts } = await sb
      .from("compliance_violations")
      .select("user_id")
      .in("user_id", uniqueDefaultingUserIds);

    const userViolCountMap = new Map<string, number>();
    for (const v of userViolationCounts || []) {
      const uid = v.user_id as string;
      userViolCountMap.set(uid, (userViolCountMap.get(uid) ?? 0) + 1);
    }

    const violationInserts: Array<{
      user_id: string;
      task_id: string;
      violation_type: string;
      severity: string;
      description: string;
      acknowledged: boolean;
      created_at: string;
    }> = [];

    const fineInserts: Array<{
      user_id: string;
      task_id: string;
      amount: number;
      reason: string;
      status: string;
      issued_at: string;
    }> = [];

    const missedNotifs: NotifPayload[] = [];

    for (const task of missedTasks) {
      const assignments = allAssignments.filter((a) => a.task_id === task.id);

      for (const a of assignments) {
        const pairKey = `${task.id}::${a.user_id}`;
        if (submittedSet.has(pairKey)) continue; // submitted — skip

        // Violation
        if (!violationExistsSet.has(pairKey)) {
          const prevCount = userViolCountMap.get(a.user_id as string) ?? 0;
          const severity =
            prevCount >= 5 ? "critical" :
            prevCount >= 3 ? "major" :
            prevCount >= 1 ? "moderate" : "minor";

          violationInserts.push({
            user_id: a.user_id as string,
            task_id: task.id as string,
            violation_type: "missed_task",
            severity,
            description: `Missed deadline for task: ${task.title}`,
            acknowledged: false,
            created_at: nowIso,
          });

          // Increment local count so subsequent tasks in same run use fresh data
          userViolCountMap.set(a.user_id as string, prevCount + 1);
          violationsCount++;
        }

        // Fine — skip if already exists for this task+user
        if (!fineExistsSet.has(pairKey)) {
          const fineAmount = task.fine_amount as number;

          fineInserts.push({
            user_id: a.user_id as string,
            task_id: task.id as string,
            amount: fineAmount,
            reason: `Missed deadline: ${task.title}`,
            status: "unpaid",
            issued_at: nowIso,
          });

          missedNotifs.push({
            user_id: a.user_id as string,
            title: `🚨 Missed deadline: ${task.title}`,
            message: `You missed "${task.title}". A fine of ₦${fineAmount.toLocaleString()} has been issued. Pay immediately to restore access.`,
            type: "fine",
            action_url: "/compliance",
          });
        }
      }
    }

    if (violationInserts.length > 0) {
      await sb.from("compliance_violations").insert(violationInserts);
    }
    if (fineInserts.length > 0) {
      await sb.from("compliance_fines").insert(fineInserts);
      await pushNotifs(sb, missedNotifs);
    }
  }

  // ── 3. INCIDENT REPORT PHASE ───────────────────────────────────────────────
  // Tasks where deadline + 30min < now AND no submission
  const incidentTasks = activeTasks.filter((t) => {
    if (!t.auto_escalate) return false;
    const effectiveDeadline =
      new Date(t.deadline as string).getTime() + (t.grace_period_minutes as number) * 60 * 1000;
    return now.getTime() > effectiveDeadline + 30 * 60 * 1000;
  });

  if (incidentTasks.length > 0) {
    const incidentTaskIds = incidentTasks.map((t) => t.id as string);

    // Check for existing incident reports
    const { data: existingReports } = await sb
      .from("compliance_incident_reports")
      .select("user_id, task_id")
      .in("task_id", incidentTaskIds);

    const reportExistsSet = new Set(
      (existingReports || []).map((r) => `${r.task_id}::${r.user_id}`)
    );

    // Fetch unpaid fine totals per user for reporting context
    const { data: unpaidFines } = await sb
      .from("compliance_fines")
      .select("user_id, amount")
      .eq("status", "unpaid");

    const unpaidFineMap = new Map<string, number>();
    for (const f of unpaidFines || []) {
      const uid = f.user_id as string;
      unpaidFineMap.set(uid, (unpaidFineMap.get(uid) ?? 0) + (f.amount as number));
    }

    // Fetch user names for incident report text
    const defaultingIncidentUserIds = [
      ...new Set(
        allAssignments
          .filter((a) => incidentTaskIds.includes(a.task_id as string))
          .filter((a) => !submittedSet.has(`${a.task_id}::${a.user_id}`))
          .map((a) => a.user_id as string)
      ),
    ];

    const { data: incidentUsers } = await sb
      .from("users")
      .select("id, name")
      .in("id", defaultingIncidentUserIds);

    const userNameMap = new Map<string, string>();
    for (const u of incidentUsers || []) {
      userNameMap.set(u.id as string, (u.name as string) || "Unknown User");
    }

    // Fetch admin user IDs to notify
    const { data: adminUsers } = await sb
      .from("users")
      .select("id")
      .in("role", ["admin", "super_admin"]);

    const adminIds = (adminUsers || []).map((u) => u.id as string);

    // Fetch per-user violation counts
    const { data: incidentViolations } = await sb
      .from("compliance_violations")
      .select("user_id")
      .in("user_id", defaultingIncidentUserIds);

    const incidentViolCountMap = new Map<string, number>();
    for (const v of incidentViolations || []) {
      const uid = v.user_id as string;
      incidentViolCountMap.set(uid, (incidentViolCountMap.get(uid) ?? 0) + 1);
    }

    const reportInserts: Array<{
      user_id: string;
      task_id: string;
      report_text: string;
      violation_count: number;
      unpaid_fines: number;
      suggested_action: string;
      admin_notified: boolean;
      created_at: string;
    }> = [];
    const incidentNotifs: NotifPayload[] = [];

    for (const task of incidentTasks) {
      const assignments = allAssignments.filter((a) => a.task_id === task.id);

      for (const a of assignments) {
        const pairKey = `${task.id}::${a.user_id}`;
        if (submittedSet.has(pairKey)) continue;
        if (reportExistsSet.has(pairKey)) continue;

        const userName = userNameMap.get(a.user_id as string) ?? "Unknown";
        const violCount = incidentViolCountMap.get(a.user_id as string) ?? 0;
        const unpaidTotal = unpaidFineMap.get(a.user_id as string) ?? 0;

        const suggestedAction =
          violCount >= 5 ? "suspension" :
          violCount >= 3 ? "formal_warning" : "reminder";

        reportInserts.push({
          user_id: a.user_id as string,
          task_id: task.id as string,
          report_text: `${userName} failed to submit "${task.title}" by the deadline. Violation count: ${violCount}. Total unpaid fines: ₦${unpaidTotal.toLocaleString()}.`,
          violation_count: violCount,
          unpaid_fines: unpaidTotal,
          suggested_action: suggestedAction,
          admin_notified: adminIds.length > 0,
          created_at: nowIso,
        });

        // Notify all admins
        for (const adminId of adminIds) {
          incidentNotifs.push({
            user_id: adminId,
            title: `⚠️ Incident Report: ${userName} missed ${task.title}`,
            message: `${userName} missed the deadline for "${task.title}". ${violCount} violation(s) on record. Unpaid fines: ₦${unpaidTotal.toLocaleString()}. Suggested action: ${suggestedAction}.`,
            type: "warning",
            action_url: "/admin/compliance",
          });
        }

        incidentReportsCount++;
      }
    }

    if (reportInserts.length > 0) {
      await sb.from("compliance_incident_reports").insert(reportInserts);
      await pushNotifs(sb, incidentNotifs);
    }
  }

  // ── 4. AUTO-SUSPENSION PHASE ───────────────────────────────────────────────
  // Tasks where deadline + 60min < now AND fine unpaid AND no submission
  // Only suspend users who have 3+ violations AND are not already suspended
  const autoSuspendTasks = activeTasks.filter((t) => {
    const effectiveDeadline =
      new Date(t.deadline as string).getTime() + (t.grace_period_minutes as number) * 60 * 1000;
    return now.getTime() > effectiveDeadline + 60 * 60 * 1000;
  });

  if (autoSuspendTasks.length > 0) {
    const autoSuspendTaskIds = autoSuspendTasks.map((t) => t.id as string);

    // Find users with unpaid fines for these tasks
    const { data: unpaidFinesForTasks } = await sb
      .from("compliance_fines")
      .select("user_id, task_id, amount")
      .in("task_id", autoSuspendTaskIds)
      .eq("status", "unpaid");

    const usersWithUnpaidFines = new Set(
      (unpaidFinesForTasks || []).map((f) => f.user_id as string)
    );

    if (usersWithUnpaidFines.size > 0) {
      const candidateIds = [...usersWithUnpaidFines].filter((uid) => {
        // Also must have no submission for at least one of these tasks
        return autoSuspendTaskIds.some(
          (tid) => !submittedSet.has(`${tid}::${uid}`)
        );
      });

      if (candidateIds.length > 0) {
        // Filter to only users with 3+ violations
        const { data: candidateViolations } = await sb
          .from("compliance_violations")
          .select("user_id")
          .in("user_id", candidateIds);

        const candidateViolCountMap = new Map<string, number>();
        for (const v of candidateViolations || []) {
          const uid = v.user_id as string;
          candidateViolCountMap.set(uid, (candidateViolCountMap.get(uid) ?? 0) + 1);
        }

        const usersToSuspend = candidateIds.filter(
          (uid) => (candidateViolCountMap.get(uid) ?? 0) >= 3
        );

        if (usersToSuspend.length > 0) {
          // Find already-suspended users
          const { data: existingSuspensions } = await sb
            .from("compliance_suspensions")
            .select("user_id")
            .in("user_id", usersToSuspend)
            .eq("status", "active");

          const alreadySuspendedSet = new Set(
            (existingSuspensions || []).map((s) => s.user_id as string)
          );

          // Compute per-user unpaid fine totals
          const userUnpaidTotalMap = new Map<string, number>();
          for (const f of unpaidFinesForTasks || []) {
            const uid = f.user_id as string;
            userUnpaidTotalMap.set(uid, (userUnpaidTotalMap.get(uid) ?? 0) + (f.amount as number));
          }

          const suspensionUpserts: Array<{
            user_id: string;
            reason: string;
            unpaid_fine_total: number;
            suspended_at: string;
            suspended_until: null;
            suspended_by: null;
            lifted_at: null;
            lifted_by: null;
            status: string;
          }> = [];
          const suspensionNotifs: NotifPayload[] = [];

          for (const uid of usersToSuspend) {
            if (alreadySuspendedSet.has(uid)) continue;

            const violCount = candidateViolCountMap.get(uid) ?? 0;
            const unpaidTotal = userUnpaidTotalMap.get(uid) ?? 0;

            suspensionUpserts.push({
              user_id: uid,
              reason: `Auto-suspended due to ${violCount} compliance violations and unpaid fine(s) totalling ₦${unpaidTotal.toLocaleString()}.`,
              unpaid_fine_total: unpaidTotal,
              suspended_at: nowIso,
              suspended_until: null,
              suspended_by: null,
              lifted_at: null,
              lifted_by: null,
              status: "active",
            });

            suspensionNotifs.push({
              user_id: uid,
              title: "🔒 Account suspended due to compliance violations",
              message: `Your account has been automatically suspended. You have ${violCount} violation(s) and ₦${unpaidTotal.toLocaleString()} in unpaid fines. Pay your fines and file an appeal to restore access.`,
              type: "error",
              action_url: "/compliance",
            });

            suspensionsCount++;
          }

          if (suspensionUpserts.length > 0) {
            await sb
              .from("compliance_suspensions")
              .upsert(suspensionUpserts, { onConflict: "user_id" });
            await pushNotifs(sb, suspensionNotifs);
          }
        }
      }
    }
  }

  return {
    reminders: remindersCount,
    violations: violationsCount,
    incidentReports: incidentReportsCount,
    suspensions: suspensionsCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────────────────────────────────────

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured — allow (dev mode)
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret") ||
    "";
  return provided === secret;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await runComplianceCheck();
    return NextResponse.json({ ok: true, processed, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[compliance-check] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await runComplianceCheck();
    return NextResponse.json({ ok: true, processed, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[compliance-check] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

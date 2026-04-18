"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Wave 2.2 — Three Absence Patterns
//
// TIRED   (1st miss):  Something happened. Respond with curiosity + warmth.
// TESTED  (2nd miss):  A pattern is forming. Respond with directness + care.
// TRUANT  (3+ misses): A decision is being made. Respond with clarity + consequence.
//
// Coach sees the classification, intern sees a private nudge. No public display.
// ─────────────────────────────────────────────────────────────────────────────

export type AbsencePattern = "TIRED" | "TESTED" | "TRUANT";

export interface AbsenceReport {
  userId: string;
  userName: string;
  track: string | null;
  missedCount: number;       // total missed tasks (unsubmitted, past deadline)
  pattern: AbsencePattern;
  lastMissedAt: string | null;
  lastMissedTask: string | null;
  recentMisses: Array<{
    taskId: string;
    taskTitle: string;
    deadline: string;
  }>;
}

// Coach response templates — warm, private, non-punitive
const COACH_RESPONSES: Record<AbsencePattern, {
  internMessage: string;
  adminAlert: string;
  suggestedAction: string;
}> = {
  TIRED: {
    internMessage: "Hey — we noticed you missed a deadline. Life happens. If something is going on, we want to know. Reach out to your coach. You're not in trouble — you matter here. 🌱",
    adminAlert: "First absence detected. Suggested response: check in with curiosity, not judgment.",
    suggestedAction: "Schedule a 5-minute check-in. Ask: 'What happened?' — not 'Why didn't you?'",
  },
  TESTED: {
    internMessage: "Two missed deadlines in a short period — this is a pattern worth paying attention to. We believe in you, but we need you to show up. Is there something we can help you remove as an obstacle? Message your coach. 💬",
    adminAlert: "Second absence detected. Pattern forming. Suggested response: direct conversation about commitment.",
    suggestedAction: "Book a 10-minute 1-on-1. Ask about obstacles, renegotiate expectations if needed.",
  },
  TRUANT: {
    internMessage: "You've missed 3 or more deadlines. At this point, a decision has been made — we just don't know if it was intentional. If you want to stay in the program, now is the time to communicate. Silence costs more than honesty ever will. 🦅",
    adminAlert: "Third+ absence detected. TRUANT pattern. Suggested response: formal conversation + consequence warning.",
    suggestedAction: "Formal 1-on-1 required. Document the conversation. Warn of potential suspension if pattern continues.",
  },
};

function classifyPattern(missedCount: number): AbsencePattern {
  if (missedCount >= 3) return "TRUANT";
  if (missedCount === 2) return "TESTED";
  return "TIRED";
}

// ─────────────────────────────────────────────────────────────────────────────
// getAbsenceReport — get absence pattern for a specific user
// ─────────────────────────────────────────────────────────────────────────────

export async function getAbsenceReport(userId: string): Promise<AbsenceReport | null> {
  try {
    const sb = supabaseAdmin();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();

    const [userRes, violationsRes] = await Promise.all([
      sb.from("users").select("name, track").eq("id", userId).single(),
      sb.from("compliance_violations")
        .select("task_id, created_at, description")
        .eq("user_id", userId)
        .eq("violation_type", "missed_task")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false }),
    ]);

    const misses = violationsRes.data ?? [];
    if (misses.length === 0) return null;

    const taskIds = [...new Set(misses.map((m) => m.task_id as string).filter(Boolean))];
    const { data: tasks } = taskIds.length > 0
      ? await sb.from("compliance_tasks").select("id, title, deadline").in("id", taskIds)
      : { data: [] };

    const taskMap = new Map((tasks ?? []).map((t) => [t.id as string, t]));

    return {
      userId,
      userName: (userRes.data?.name as string) ?? "Unknown",
      track: (userRes.data?.track as string | null) ?? null,
      missedCount: misses.length,
      pattern: classifyPattern(misses.length),
      lastMissedAt: (misses[0]?.created_at as string | null) ?? null,
      lastMissedTask: misses[0]?.task_id ? (taskMap.get(misses[0].task_id as string)?.title as string | null) : null,
      recentMisses: misses.slice(0, 5).map((m) => {
        const task = m.task_id ? taskMap.get(m.task_id as string) : null;
        return {
          taskId: (m.task_id as string) ?? "",
          taskTitle: (task?.title as string) ?? "Unknown task",
          deadline: (task?.deadline as string) ?? "",
        };
      }),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getAbsencePatternDashboard — admin sees all interns with absence patterns
// ─────────────────────────────────────────────────────────────────────────────

export async function getAbsencePatternDashboard(): Promise<{
  tired: AbsenceReport[];
  tested: AbsenceReport[];
  truant: AbsenceReport[];
}> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin", "team_lead"].includes(me.role)) {
      return { tired: [], tested: [], truant: [] };
    }

    const sb = supabaseAdmin();
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Get all missed violations in last 30 days, grouped by user
    const { data: violations } = await sb
      .from("compliance_violations")
      .select("user_id, task_id, created_at, description")
      .eq("violation_type", "missed_task")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (!violations?.length) return { tired: [], tested: [], truant: [] };

    // Group by user
    const byUser = new Map<string, typeof violations>();
    for (const v of violations) {
      const uid = v.user_id as string;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push(v);
    }

    const userIds = Array.from(byUser.keys());

    // Fetch user details
    const { data: users } = await sb
      .from("users")
      .select("id, name, track")
      .in("id", userIds);

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

    // Fetch task details for all relevant task IDs
    const allTaskIds = [...new Set(violations.map((v) => v.task_id as string).filter(Boolean))];
    const { data: tasks } = allTaskIds.length > 0
      ? await sb.from("compliance_tasks").select("id, title, deadline").in("id", allTaskIds)
      : { data: [] };
    const taskMap = new Map((tasks ?? []).map((t) => [t.id as string, t]));

    const results: AbsenceReport[] = [];

    for (const [uid, misses] of byUser) {
      const user = userMap.get(uid);
      const pattern = classifyPattern(misses.length);

      results.push({
        userId: uid,
        userName: (user?.name as string) ?? "Unknown",
        track: (user?.track as string | null) ?? null,
        missedCount: misses.length,
        pattern,
        lastMissedAt: (misses[0]?.created_at as string | null) ?? null,
        lastMissedTask: misses[0]?.task_id ? (taskMap.get(misses[0].task_id as string)?.title as string | null) : null,
        recentMisses: misses.slice(0, 3).map((m) => {
          const task = m.task_id ? taskMap.get(m.task_id as string) : null;
          return {
            taskId: (m.task_id as string) ?? "",
            taskTitle: (task?.title as string) ?? "Unknown task",
            deadline: (task?.deadline as string) ?? "",
          };
        }),
      });
    }

    return {
      tired: results.filter((r) => r.pattern === "TIRED"),
      tested: results.filter((r) => r.pattern === "TESTED"),
      truant: results.filter((r) => r.pattern === "TRUANT"),
    };
  } catch {
    return { tired: [], tested: [], truant: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendAbsenceCheckIn — coach sends a private check-in notification to intern
// Based on their pattern, the message is automatically calibrated
// ─────────────────────────────────────────────────────────────────────────────

export async function sendAbsenceCheckIn(
  internId: string,
  pattern: AbsencePattern,
  customNote?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin", "team_lead"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }

    const response = COACH_RESPONSES[pattern];
    const message = customNote
      ? `${customNote}\n\n${response.internMessage}`
      : response.internMessage;

    await pushNotification({
      userId: internId,
      title: pattern === "TIRED"
        ? "💬 A note from your coach"
        : pattern === "TESTED"
        ? "📌 Your coach wants to check in"
        : "🦅 Important message from your coach",
      message,
      type: "info",
      actionUrl: "/compliance",
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getCoachResponseGuide — admin/coach sees what to do for each pattern
// ─────────────────────────────────────────────────────────────────────────────

export function getCoachResponseGuide() {
  return Object.entries(COACH_RESPONSES).map(([pattern, config]) => ({
    pattern: pattern as AbsencePattern,
    ...config,
  }));
}

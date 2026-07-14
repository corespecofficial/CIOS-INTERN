import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { sendEmail, wrapEmail } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

/**
 * Combined digest cron.
 *
 * Runs daily at 08:00 UTC. On Mondays it ALSO sends the weekly digest to
 * weekly-frequency users, so we stay under Vercel Hobby's 2-cron limit.
 *
 * Config: vercel.json → `{ path: "/api/cron/daily-digest", schedule: "0 8 * * *" }`
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const dayOfWeek = new Date().getUTCDay(); // 0=Sun..6=Sat
  const isMonday = dayOfWeek === 1;

  // Pull everyone once — we'll route each user to daily or weekly branch below.
  const { data: users } = await sb.from("users")
    .select("id, name, email, xp, streak, notification_prefs, role")
    .not("email", "is", null);

  if (!users) return NextResponse.json({ ok: true, sent: 0 });

  let dailySent = 0, weeklySent = 0, skipped = 0, errors = 0;

  for (const u of users as Array<{ id: string; name: string | null; email: string | null; xp: number; streak: number; role: string; notification_prefs: { digestFrequency?: string } | null }>) {
    if (!u.email) { skipped++; continue; }
    const freq = u.notification_prefs?.digestFrequency || "weekly";
    if (freq === "off") { skipped++; continue; }

    // DAILY branch — sends every day to daily-frequency users
    if (freq === "daily") {
      const r = await sendDaily(sb, u);
      if (r === "sent") dailySent++;
      else if (r === "skipped") skipped++;
      else errors++;
      continue;
    }

    // WEEKLY branch — only on Mondays, to weekly-frequency (default) users
    if (freq === "weekly" && isMonday && ["intern", "team_lead", "senior_intern"].includes(u.role)) {
      const r = await sendWeekly(sb, u);
      if (r === "sent") weeklySent++;
      else if (r === "skipped") skipped++;
      else errors++;
      continue;
    }

    skipped++;
  }

  return NextResponse.json({ ok: true, dailySent, weeklySent, skipped, errors, mondayRun: isMonday });
}

type User = { id: string; name: string | null; email: string | null; xp: number; streak: number };
type Sb = ReturnType<typeof supabaseAdmin>;

async function sendDaily(sb: Sb, u: User): Promise<"sent" | "skipped" | "error"> {
  try {
    const since = new Date(Date.now() - 86400_000).toISOString();
    const [{ data: tasks }, { data: notifs }] = await Promise.all([
      sb.from("tasks").select("id, title").eq("user_id", u.id).eq("status", "completed").gte("completed_at", since).limit(5),
      sb.from("notifications").select("title").eq("user_id", u.id).eq("is_read", false).gte("created_at", since).limit(5),
    ]);
    const taskList = (tasks || []) as Array<{ title: string }>;
    const notifList = (notifs || []) as Array<{ title: string }>;
    if (taskList.length === 0 && notifList.length === 0) return "skipped";

    const html = wrapEmail(`
      <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">📅 Yesterday in CIOS, ${u.name?.split(" ")[0] || "there"}</h2>
      ${taskList.length > 0 ? `<h3 style="color:#E8EDF5;font-size:14px;margin:14px 0 6px;">✅ Tasks completed</h3><ul style="color:#B0BEC5;padding-left:20px;line-height:1.7;">${taskList.map((t) => `<li>${t.title}</li>`).join("")}</ul>` : ""}
      ${notifList.length > 0 ? `<h3 style="color:#E8EDF5;font-size:14px;margin:14px 0 6px;">🔔 You missed these</h3><ul style="color:#B0BEC5;padding-left:20px;line-height:1.7;">${notifList.map((n) => `<li>${n.title}</li>`).join("")}</ul>` : ""}
      <p style="color:#B0BEC5;margin:18px 0 0;">Streak: <strong style="color:#FF7043;">${u.streak || 0} days</strong> · Total XP: <strong style="color:#FFC107;">${(u.xp || 0).toLocaleString()}</strong></p>
      <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:14px;padding:12px 28px;background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">Open dashboard →</a>
    `, { preheader: `Yesterday: ${taskList.length} tasks done, ${notifList.length} updates` });

    const r = await sendEmail({ to: u.email!, subject: "📅 Your CIOS daily digest", html });
    return r.ok ? "sent" : "error";
  } catch { return "error"; }
}

async function sendWeekly(sb: Sb, u: User): Promise<"sent" | "skipped" | "error"> {
  try {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const sinceDate = since.slice(0, 10);
    const [{ data: logins }, { data: tasks }] = await Promise.all([
      sb.from("daily_logins").select("xp_granted").eq("user_id", u.id).gte("date", sinceDate),
      sb.from("tasks").select("id").eq("user_id", u.id).eq("status", "completed").gte("completed_at", since),
    ]);
    const xpEarned = ((logins || []) as Array<{ xp_granted: number }>).reduce((s, r) => s + (r.xp_granted || 0), 0);
    const tasksDone = (tasks || []).length;

    if (xpEarned === 0 && tasksDone === 0 && (u.streak || 0) === 0) return "skipped";

    const html = wrapEmail(`
      <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">📊 Your week, ${u.name?.split(" ")[0] || "there"}</h2>
      <p style="color:#B0BEC5;margin:0 0 18px;">Here&apos;s how you performed in the last 7 days:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
        <tr>
          <td style="padding:14px;background:rgba(30,136,229,0.08);border-radius:10px;text-align:center;width:33%;">
            <div style="color:#1E88E5;font-size:24px;font-weight:800;">${xpEarned}</div>
            <div style="color:#8892A4;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">XP earned</div>
          </td>
          <td style="width:6px;"></td>
          <td style="padding:14px;background:rgba(102,187,106,0.08);border-radius:10px;text-align:center;width:33%;">
            <div style="color:#66BB6A;font-size:24px;font-weight:800;">${tasksDone}</div>
            <div style="color:#8892A4;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Tasks done</div>
          </td>
          <td style="width:6px;"></td>
          <td style="padding:14px;background:rgba(255,112,67,0.08);border-radius:10px;text-align:center;width:33%;">
            <div style="color:#FF7043;font-size:24px;font-weight:800;">${u.streak || 0}d</div>
            <div style="color:#8892A4;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Streak</div>
          </td>
        </tr>
      </table>
      <p style="color:#B0BEC5;margin:0 0 18px;">Total XP: <strong style="color:#FFC107;">${(u.xp || 0).toLocaleString()}</strong></p>
      <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">Open dashboard →</a>
    `, { preheader: `Your week: ${xpEarned} XP, ${tasksDone} tasks, ${u.streak || 0}-day streak` });

    const r = await sendEmail({ to: u.email!, subject: `📊 Your weekly CIOS report — ${xpEarned} XP earned`, html });
    return r.ok ? "sent" : "error";
  } catch { return "error"; }
}

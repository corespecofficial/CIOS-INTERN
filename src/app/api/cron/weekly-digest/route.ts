import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { sendEmail, wrapEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly digest cron — call this once a week (e.g., Monday 09:00).
 * Configure in vercel.json crons or any external scheduler.
 *
 *   {
 *     "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" }]
 *   }
 *
 * Protect with header `x-cron-secret: $CRON_SECRET` env var.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400_000).toISOString();
  const sevenDaysAgoDate = sevenDaysAgoIso.slice(0, 10);

  // Pull all interns + team_leads with email
  const { data: users } = await sb.from("users")
    .select("id, name, email, xp, streak")
    .in("role", ["intern", "team_lead", "senior_intern"])
    .not("email", "is", null);

  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "No eligible users" });
  }

  let sent = 0, skipped = 0, errors = 0;

  for (const u of users as Array<{ id: string; name: string | null; email: string | null; xp: number; streak: number }>) {
    if (!u.email) { skipped++; continue; }
    try {
      const [{ data: logins }, { data: tasks }] = await Promise.all([
        sb.from("daily_logins").select("xp_granted").eq("user_id", u.id).gte("date", sevenDaysAgoDate),
        sb.from("tasks").select("id").eq("user_id", u.id).eq("status", "completed").gte("completed_at", sevenDaysAgoIso),
      ]);
      const xpEarned = ((logins || []) as Array<{ xp_granted: number }>).reduce((s, r) => s + (r.xp_granted || 0), 0);
      const tasksDone = (tasks || []).length;

      if (xpEarned === 0 && tasksDone === 0 && (u.streak || 0) === 0) { skipped++; continue; }

      const html = wrapEmail(`
        <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">📊 Your week, ${u.name?.split(" ")[0] || "there"}</h2>
        <p style="color:#B0BEC5;margin:0 0 18px;">Here's how you performed in the last 7 days:</p>
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app"}/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">Open dashboard →</a>
      `, { preheader: `Your week: ${xpEarned} XP, ${tasksDone} tasks, ${u.streak || 0}-day streak` });

      const r = await sendEmail({ to: u.email, subject: `📊 Your weekly CIOS report — ${xpEarned} XP earned`, html });
      if (r.ok) sent++; else errors++;
    } catch { errors++; }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors, total: users.length });
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { sendEmail, wrapEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily digest cron — sends to users whose notification_prefs.digestFrequency === "daily".
 * Configure in vercel.json: `{ path: "/api/cron/daily-digest", schedule: "0 8 * * *" }` (08:00 UTC daily)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (secret && provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 86400_000).toISOString();
  const sinceDate = since.slice(0, 10);

  const { data: users } = await sb.from("users")
    .select("id, name, email, xp, streak, notification_prefs")
    .not("email", "is", null);

  if (!users) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0, skipped = 0, errors = 0;

  for (const u of users as Array<{ id: string; name: string | null; email: string | null; xp: number; streak: number; notification_prefs: { digestFrequency?: string } | null }>) {
    if (!u.email) { skipped++; continue; }
    if ((u.notification_prefs?.digestFrequency || "weekly") !== "daily") { skipped++; continue; }
    try {
      const [{ data: tasks }, { data: notifs }] = await Promise.all([
        sb.from("tasks").select("id, title").eq("user_id", u.id).eq("status", "completed").gte("completed_at", since).limit(5),
        sb.from("notifications").select("title").eq("user_id", u.id).eq("is_read", false).gte("created_at", since).limit(5),
      ]);
      const taskList = (tasks || []) as Array<{ title: string }>;
      const notifList = (notifs || []) as Array<{ title: string }>;
      if (taskList.length === 0 && notifList.length === 0) { skipped++; continue; }

      const html = wrapEmail(`
        <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">📅 Yesterday in CIOS, ${u.name?.split(" ")[0] || "there"}</h2>
        ${taskList.length > 0 ? `<h3 style="color:#E8EDF5;font-size:14px;margin:14px 0 6px;">✅ Tasks completed</h3><ul style="color:#B0BEC5;padding-left:20px;line-height:1.7;">${taskList.map((t) => `<li>${t.title}</li>`).join("")}</ul>` : ""}
        ${notifList.length > 0 ? `<h3 style="color:#E8EDF5;font-size:14px;margin:14px 0 6px;">🔔 You missed these</h3><ul style="color:#B0BEC5;padding-left:20px;line-height:1.7;">${notifList.map((n) => `<li>${n.title}</li>`).join("")}</ul>` : ""}
        <p style="color:#B0BEC5;margin:18px 0 0;">Streak: <strong style="color:#FF7043;">${u.streak || 0} days</strong> · Total XP: <strong style="color:#FFC107;">${(u.xp || 0).toLocaleString()}</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.netlify.app"}/dashboard" style="display:inline-block;margin-top:14px;padding:12px 28px;background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">Open dashboard →</a>
      `, { preheader: `Yesterday: ${taskList.length} tasks done, ${notifList.length} updates` });

      const r = await sendEmail({ to: u.email, subject: "📅 Your CIOS daily digest", html });
      if (r.ok) sent++; else errors++;
    } catch { errors++; }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}

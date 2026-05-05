/**
 * Cron — nudge inactive students with a class-specific digest.
 *
 * For each org_members row with role=student and status=active, we check
 * whether the user has touched the class recently (page_view to
 * /s/<slug>/lessons/* or any submission). If they've been quiet for
 * INACTIVE_DAYS+ days AND there's something new in the class since
 * they last engaged (announcement, lesson, or assignment), we send a
 * single per-class digest email.
 *
 * Idempotency: we keep a `notification_prefs.last_class_digest.<orgId>`
 * timestamp on the user; we only send if the newest item in the class
 * is strictly newer than that timestamp. So re-running the cron the
 * same day is a no-op.
 *
 * Wiring: NOT added to vercel.json (Hobby's 3-cron cap). Hit manually
 * or via an external scheduler with the x-cron-secret header.
 *
 *   curl -H "x-cron-secret: $CRON_SECRET" \
 *        https://<host>/api/cron/inactive-class-digest
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { sendEmail, wrapEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";
const INACTIVE_DAYS = 7;
const NEW_ITEMS_LIMIT = 5;

interface MembershipRow {
  user_id: string;
  org_id: string;
  creative_orgs: { id: string; slug: string; name: string; status: string } | null;
  users: { id: string; email: string | null; name: string | null; notification_prefs: Record<string, unknown> | null } | null;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const inactiveCutoff = new Date(Date.now() - INACTIVE_DAYS * 86_400_000).toISOString();

  // Pull every active student membership in active orgs. At platform
  // scale this gets paginated — for now it's bounded by total student
  // count which is small.
  const { data: memberships, error } = await sb
    .from("org_members")
    .select("user_id, org_id, creative_orgs!inner(id, slug, name, status), users:user_id(id, email, name, notification_prefs)")
    .eq("role", "student")
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = ((memberships || []) as unknown as MembershipRow[])
    .filter((r) => r.creative_orgs?.status === "active" && r.users?.email);

  let sent = 0, skippedQuiet = 0, skippedActive = 0, skippedNoEmail = 0, errors = 0;

  for (const row of rows) {
    if (!row.users || !row.users.email || !row.creative_orgs) { skippedNoEmail++; continue; }
    const userId = row.users.id;
    const orgId = row.org_id;
    const slug = row.creative_orgs.slug;

    try {
      // Has the student touched the class recently?
      const [{ count: viewCount }, { count: subCount }] = await Promise.all([
        sb.from("user_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("event", "page_view")
          .gte("created_at", inactiveCutoff)
          .like("meta->>path", `/s/${slug}/%`),
        sb.from("org_submissions")
          .select("id", { count: "exact", head: true })
          .eq("student_id", userId)
          .eq("org_id", orgId)
          .gte("submitted_at", inactiveCutoff),
      ]);
      if ((viewCount || 0) > 0 || (subCount || 0) > 0) { skippedActive++; continue; }

      // What's new in the class? Pull the most recent items across
      // announcements/lessons/assignments. We lean on org_audit_log
      // because its rows are uniformly shaped.
      const prefs = (row.users.notification_prefs || {}) as { last_class_digest?: Record<string, string> };
      const lastDigestIso = prefs.last_class_digest?.[orgId];
      const sinceIso = lastDigestIso || new Date(Date.now() - INACTIVE_DAYS * 86_400_000).toISOString();

      const { data: items } = await sb
        .from("org_audit_log")
        .select("action, meta, created_at")
        .eq("org_id", orgId)
        .in("action", ["announcement.posted", "lesson.created", "assignment.created"])
        .gt("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(NEW_ITEMS_LIMIT);
      const newItems = (items || []) as Array<{ action: string; meta: Record<string, unknown>; created_at: string }>;
      if (newItems.length === 0) { skippedQuiet++; continue; }

      const firstName = row.users.name?.split(" ")[0] || "there";
      const orgName = row.creative_orgs.name;
      const lines = newItems.map((it) => {
        const m = it.meta as Record<string, string | undefined>;
        if (it.action === "announcement.posted") return `<li>📣 New announcement: <strong>${escapeHtml(m.title || "Untitled")}</strong></li>`;
        if (it.action === "lesson.created")      return `<li>📚 New lesson: <strong>${escapeHtml(m.title || "Untitled")}</strong></li>`;
        return `<li>📝 New assignment: <strong>${escapeHtml(m.title || "Untitled")}</strong></li>`;
      }).join("");

      const html = wrapEmail(`
        <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">👋 Hey ${escapeHtml(firstName)}, ${escapeHtml(orgName)} missed you</h2>
        <p style="color:#B0BEC5;margin:0 0 14px;">It&apos;s been over ${INACTIVE_DAYS} days since you opened your class. Here&apos;s what happened while you were away:</p>
        <ul style="color:#B0BEC5;padding-left:20px;line-height:1.8;margin:0 0 18px;">${lines}</ul>
        <a href="${APP_URL}/s/${slug}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#26A69A,#1E88E5);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">Open ${escapeHtml(orgName)} →</a>
      `, { preheader: `${newItems.length} new update${newItems.length === 1 ? "" : "s"} in ${orgName}` });

      const r = await sendEmail({
        to: row.users.email,
        subject: `📣 ${orgName} — ${newItems.length} update${newItems.length === 1 ? "" : "s"} you missed`,
        html,
      });
      if (!r.ok) { errors++; continue; }

      // Mark as sent so re-runs are idempotent.
      const newPrefs = { ...prefs, last_class_digest: { ...(prefs.last_class_digest || {}), [orgId]: new Date().toISOString() } };
      await sb.from("users").update({ notification_prefs: newPrefs }).eq("id", userId);
      sent++;
    } catch (e) {
      console.warn("[inactive-class-digest] row failed:", e instanceof Error ? e.message : e);
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, skippedQuiet, skippedActive, skippedNoEmail, errors, processed: rows.length });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

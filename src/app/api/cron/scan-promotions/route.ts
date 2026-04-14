import { NextResponse } from "next/server";
import { scanForPromotions } from "@/app/actions/promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs the promotion-readiness engine across all eligible users and
 * creates pending recommendations for anyone scoring >= 75.
 *
 * Schedule via netlify.toml / vercel.json → Mondays-Sundays 02:00 UTC.
 * Protected by x-cron-secret header.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await scanForPromotions();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true, ...r.data });
}

import { NextResponse } from "next/server";
import { scanForPromotions } from "@/app/actions/promotions";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs the promotion-readiness engine across all eligible users and
 * creates pending recommendations for anyone scoring >= 75.
 *
 * Schedule via vercel.json → daily at 02:00 UTC.
 * Protected by x-cron-secret header.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await scanForPromotions();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true, ...r.data });
}

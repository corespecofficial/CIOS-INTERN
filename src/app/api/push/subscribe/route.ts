import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Stores a browser Push subscription for the current user.
 * Requires a `push_subscriptions` table — run the SQL in docs/push-notifications.md.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await getCurrentDbUser();
  if (!me) return NextResponse.json({ error: "user row missing" }, { status: 404 });
  const body = await req.json();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const userAgent = req.headers.get("user-agent") || null;
  const { error } = await sb.from("push_subscriptions").upsert({
    user_id: me.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: userAgent,
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body?.endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  const sb = supabaseAdmin();
  await sb.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}

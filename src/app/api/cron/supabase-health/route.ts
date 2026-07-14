import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date().toISOString();
  const sb = supabaseAdmin();
  const { data: current, error: readError } = await sb
    .from("system_heartbeat")
    .select("check_count")
    .eq("id", 1)
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { ok: false, service: "supabase", error: readError.message, checkedAt: now },
      { status: 503 },
    );
  }

  const { error: writeError } = await sb.from("system_heartbeat").upsert({
    id: 1,
    service: "cios-web",
    last_seen_at: now,
    check_count: Number(current?.check_count ?? 0) + 1,
    metadata: { source: "vercel-cron", purpose: "database-health" },
  });

  if (writeError) {
    return NextResponse.json(
      { ok: false, service: "supabase", error: writeError.message, checkedAt: now },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    service: "supabase",
    checkedAt: now,
    responseMs: Date.now() - startedAt,
  });
}

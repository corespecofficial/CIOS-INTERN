/**
 * Phase 2 backfill — provisions a tenant org for every already-approved
 * creative_space. Idempotent (provisionOrgFromSpace is keyed by space_id),
 * so safe to re-run.
 *
 * Super-admin only. Trigger via:
 *   curl -X POST -H "Cookie: <super-admin session>" \
 *        http://localhost:3001/api/admin/backfill-creative-orgs
 *
 * GET returns a dry-run summary (which spaces would be provisioned).
 */

import { NextResponse } from "next/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { provisionOrgFromSpace } from "@/app/actions/creative-spaces";

async function ensureSuperAdmin() {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false as const, status: 401, msg: "Unauthorized" };
  if (me.role !== "super_admin") return { ok: false as const, status: 403, msg: "Super admin only" };
  return { ok: true as const };
}

async function listApprovedSpaces() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("creative_spaces")
    .select("id, title, owner_id, slug, org_id")
    .eq("status", "approved");
  if (error) throw new Error(error.message);
  return (data || []) as { id: string; title: string; owner_id: string; slug: string | null; org_id: string | null }[];
}

export async function GET() {
  const auth = await ensureSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status });

  const spaces = await listApprovedSpaces();
  const pending = spaces.filter((s) => !s.org_id);
  return NextResponse.json({
    total_approved: spaces.length,
    already_provisioned: spaces.length - pending.length,
    pending_provision: pending.length,
    sample: pending.slice(0, 10).map((s) => ({ id: s.id, title: s.title })),
  });
}

export async function POST() {
  const auth = await ensureSuperAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.msg }, { status: auth.status });

  const spaces = await listApprovedSpaces();
  const pending = spaces.filter((s) => !s.org_id);

  const results: { space_id: string; ok: boolean; org_id?: string; created?: boolean; error?: string }[] = [];
  for (const s of pending) {
    const r = await provisionOrgFromSpace(s.id);
    if (r.ok) results.push({ space_id: s.id, ok: true, org_id: r.data?.orgId, created: r.data?.created });
    else results.push({ space_id: s.id, ok: false, error: r.error });
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    processed: results.length,
    ok,
    failed: failed.length,
    failures: failed,
  });
}

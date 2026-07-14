import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloudinary ephemeral-upload sweep.
 *
 * Phase 0 of the public-portals masterplan (§2.4). Deletes any asset tracked
 * in `ephemeral_uploads` whose `expires_at` has passed. Safe to call at any
 * cadence — idempotent, batched, and bounded by BATCH_LIMIT so a single run
 * never exceeds Vercel's serverless timeout.
 *
 * Trigger options (pick one per environment):
 *   - Vercel Pro cron: add to vercel.json → `{ path: "/api/cron/cloudinary-sweep", schedule: "0 * * * *" }`
 *   - Vercel Hobby: call from inside `/api/cron/daily-digest` (2-cron limit)
 *   - Manual: `curl -H "x-cron-secret: $CRON_SECRET" https://…/api/cron/cloudinary-sweep`
 */

const BATCH_LIMIT = 200;
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_API_SECRET;

async function deleteFromCloudinary(publicId: string, resourceType: string): Promise<{ ok: boolean; reason?: string }> {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_KEY || !CLOUDINARY_SECRET) {
    return { ok: false, reason: "cloudinary-env-missing" };
  }
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signed destroy: signature = SHA-1 of `public_id=<id>&timestamp=<t><secret>`
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_SECRET}`;
  const { createHash } = await import("crypto");
  const signature = createHash("sha1").update(toSign).digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: CLOUDINARY_KEY,
    signature,
  });

  const rt = resourceType === "video" ? "video" : resourceType === "raw" ? "raw" : "image";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${rt}/destroy`;

  try {
    const res = await fetch(url, { method: "POST", body });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    const json = await res.json();
    // result: "ok" | "not found"   — both are terminal states we can mark deleted.
    if (json.result === "ok" || json.result === "not found") return { ok: true };
    return { ok: false, reason: String(json.result) };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  // Pull a batch of rows whose TTL has passed and that haven't been deleted yet.
  const { data: rows, error } = await sb
    .from("ephemeral_uploads")
    .select("id, public_id, resource_type, delete_attempts")
    .is("deleted_at", null)
    .lt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ ok: true, swept: 0 });

  let deleted = 0;
  let failed = 0;

  for (const r of rows as Array<{ id: string; public_id: string; resource_type: string; delete_attempts: number }>) {
    const result = await deleteFromCloudinary(r.public_id, r.resource_type);
    if (result.ok) {
      await sb.from("ephemeral_uploads").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
      deleted++;
    } else {
      await sb.from("ephemeral_uploads")
        .update({ delete_attempts: (r.delete_attempts ?? 0) + 1 })
        .eq("id", r.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, swept: rows.length, deleted, failed });
}

"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface TrackEphemeralUploadInput {
  publicId: string;
  secureUrl: string;
  resourceType: "image" | "video" | "raw";
  bytes: number;
  portal: string;
  kind?: string;
  /** Optional TTL override in hours. Defaults to 24 (masterplan §2.4). */
  ttlHours?: number;
}

/**
 * Record a row in `ephemeral_uploads` so the sweep cron can clean the
 * Cloudinary asset once expires_at passes. Best-effort: never throws to the
 * client, because an un-tracked upload is better than a failed upload — the
 * trade-off is we may leak that asset past 24h. The sweep also cleans by
 * folder-prefix regardless, so this is a hard-backstop.
 */
export async function trackEphemeralUpload(input: TrackEphemeralUploadInput): Promise<R> {
  try {
    const me = await getCurrentDbUser().catch(() => null);
    const sb = supabaseAdmin();
    const ttl = Math.max(1, input.ttlHours ?? 24);

    const { error } = await sb.from("ephemeral_uploads").insert({
      public_id: input.publicId,
      resource_type: input.resourceType,
      secure_url: input.secureUrl,
      bytes: input.bytes,
      kind: input.kind ?? null,
      uploader_id: me?.id ?? null,
      uploader_role: me?.role ?? null,
      portal: input.portal,
      expires_at: new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString(),
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

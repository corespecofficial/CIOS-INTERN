/**
 * Cloudflare R2 storage wrapper. R2 is S3-compatible, so we use the standard
 * AWS SDK pointed at the R2 endpoint.
 *
 * Why R2?
 * - Free tier: 10 GB storage + UNLIMITED egress (no bandwidth charges).
 * - Hosting certificate PDFs and large user uploads here keeps Vercel
 *   bandwidth budget (100 GB/mo) almost untouched.
 *
 * Setup:
 * - Create a Cloudflare account, R2 → "Create bucket" → e.g. "cios-files".
 * - R2 → Manage R2 API Tokens → create an "Object Read & Write" token.
 * - Set env vars (see .env.example).
 * - Optionally enable a public custom domain on the bucket; otherwise we
 *   serve via short-lived presigned URLs.
 *
 * Same graceful-degradation idea as cache.ts: if env vars are missing,
 * helpers throw with a clear "R2 not configured" — callers should fall
 * back to in-memory generation.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
let bucket: string | null = null;
let publicBaseUrl: string | null = null;
let initialised = false;

function getR2(): { client: S3Client; bucket: string } | null {
  if (initialised) return client && bucket ? { client, bucket } : null;
  initialised = true;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET;
  publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || null; // e.g. https://files.cios.dev

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[r2] not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET to enable.");
    }
    return null;
  }

  try {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    bucket = bucketName;
    return { client, bucket };
  } catch (e) {
    console.warn("[r2] init failed:", e);
    return null;
  }
}

/** Upload a buffer to R2. Returns the storage key. */
export async function r2Put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  const r = getR2();
  if (!r) throw new Error("R2 not configured");
  await r.client.send(new PutObjectCommand({
    Bucket: r.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return key;
}

/** True if the object exists at `key`. Used to skip re-rendering cert PDFs. */
export async function r2Exists(key: string): Promise<boolean> {
  const r = getR2();
  if (!r) return false;
  try {
    await r.client.send(new HeadObjectCommand({ Bucket: r.bucket, Key: key }));
    return true;
  } catch { return false; }
}

/**
 * Public URL for an R2 object. If R2_PUBLIC_BASE_URL is set (custom-domain
 * bucket), we return that; otherwise we mint a short-lived presigned URL.
 */
export async function r2Url(key: string, expiresInSeconds = 600): Promise<string> {
  const r = getR2();
  if (!r) throw new Error("R2 not configured");
  if (publicBaseUrl) return `${publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  return await getSignedUrl(
    r.client,
    new GetObjectCommand({ Bucket: r.bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

/** Quick "is R2 wired?" check for callers that have an in-memory fallback. */
export function r2IsConfigured(): boolean {
  return getR2() !== null;
}

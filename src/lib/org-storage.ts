/**
 * Org-tenant storage wrapper around the raw R2 helper.
 *
 * Why this exists: every upload that originates from a host portal or
 * student portal MUST land in that org's storage prefix
 * (`orgs/<orgId>/...`) so a single tenant scrub can wipe both R2 and
 * `org_files` rows in one sweep, and so a bug in app code can't write
 * into another org's namespace.
 *
 * The raw `r2Put` accepts arbitrary keys — passing it directly from an
 * uploader handler is a real risk. This wrapper:
 *   1. Requires an explicit `orgId` (TS won't let you forget).
 *   2. Verifies the org exists, is active, and has a `storage_prefix`.
 *   3. Composes the final key as `<storage_prefix><cleanRelativeKey>`,
 *      stripping any leading slashes the caller might have included
 *      (which would silently bypass the prefix).
 *   4. Inserts an `org_files` audit row tying the storage key to the
 *      org so cleanup queries are O(1).
 *
 * Reads are governed by RLS on `org_files` (see p391) — any reader
 * must be an active org member, super_admin bypasses.
 */

import "server-only";
import { supabaseAdmin } from "@/lib/db";
import { r2Put, r2Url, r2IsConfigured } from "@/lib/r2";

export interface OrgUploadInput {
  orgId: string;
  /** Path WITHIN the org's namespace, no leading slash. e.g.
   *  "lessons/<id>/cover.png", "submissions/<id>/<student>.pdf". */
  relativeKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
  /** users.id of the uploader — recorded on org_files for audit. */
  uploadedBy: string;
}

export interface OrgUploadResult {
  /** Full storage key including the org prefix. Use this for r2Url. */
  key: string;
  /** Row id of the org_files audit entry. */
  fileId: string;
}

const SAFE_RELATIVE = /^[A-Za-z0-9._\-/]+$/;

export async function orgUploadFile(input: OrgUploadInput): Promise<OrgUploadResult> {
  if (!input.orgId) throw new Error("orgUploadFile: orgId is required");
  if (!input.relativeKey) throw new Error("orgUploadFile: relativeKey is required");
  if (!input.uploadedBy) throw new Error("orgUploadFile: uploadedBy is required");

  // Refuse path-traversal-y inputs. ../ would smuggle the file out of
  // the prefix at the storage layer; backslashes confuse R2 vs path
  // tooling. Whitelist over blacklist.
  const cleanRel = input.relativeKey.replace(/^\/+/, "");
  if (cleanRel.includes("..") || !SAFE_RELATIVE.test(cleanRel)) {
    throw new Error(`orgUploadFile: unsafe relativeKey "${input.relativeKey}"`);
  }

  if (!r2IsConfigured()) throw new Error("orgUploadFile: R2 not configured");

  const sb = supabaseAdmin();
  const { data: orgRow } = await sb
    .from("creative_orgs")
    .select("id, storage_prefix, status")
    .eq("id", input.orgId)
    .maybeSingle();
  type Row = { id: string; storage_prefix: string; status: string };
  const org = orgRow as Row | null;
  if (!org) throw new Error(`orgUploadFile: org ${input.orgId} not found`);
  if (org.status !== "active") throw new Error(`orgUploadFile: org ${input.orgId} is ${org.status}, uploads disabled`);
  if (!org.storage_prefix) throw new Error(`orgUploadFile: org ${input.orgId} has no storage_prefix`);

  // Compose the canonical key and assert (defensively — an admin might
  // have edited storage_prefix in Supabase Studio without a trailing /).
  const prefix = org.storage_prefix.endsWith("/") ? org.storage_prefix : `${org.storage_prefix}/`;
  const fullKey = `${prefix}${cleanRel}`;
  if (!fullKey.startsWith(prefix)) throw new Error("orgUploadFile: composed key escapes prefix");

  // Upload, then record. If the upload succeeds but the audit row fails
  // we end up with an orphan blob — accept that vs. the inverse (audit
  // row pointing at a nonexistent blob is more confusing).
  await r2Put(fullKey, input.body, input.contentType);

  const { data: fileRow, error } = await sb
    .from("org_files")
    .upsert(
      {
        org_id: input.orgId,
        key: fullKey,
        mime: input.contentType,
        size_bytes: input.body.byteLength,
        uploaded_by: input.uploadedBy,
      },
      { onConflict: "org_id,key" },
    )
    .select("id")
    .single();
  if (error || !fileRow) {
    console.warn("[org-storage] org_files insert failed (orphan blob risk):", JSON.stringify({
      message: (error as { message?: string } | null)?.message,
      key: fullKey,
    }));
    return { key: fullKey, fileId: "" };
  }

  return { key: fullKey, fileId: (fileRow as { id: string }).id };
}

/**
 * Verify a storage key belongs to a given org BEFORE returning it to a
 * client. Useful for endpoints that resolve `?key=...` to a presigned
 * URL — without this check, a member of org A could request a key
 * belonging to org B and we'd happily sign it.
 */
export function keyBelongsToOrg(key: string, storagePrefix: string): boolean {
  const prefix = storagePrefix.endsWith("/") ? storagePrefix : `${storagePrefix}/`;
  return key.startsWith(prefix);
}

/**
 * Server-only signed-URL helper that enforces tenant boundary. Pass the
 * org_id along with the key; we look up the prefix and assert match
 * before signing. Reading the actual file from a signed URL bypasses
 * RLS by design (R2 doesn't know about Supabase auth) so this gate is
 * the LAST line of defence — every consumer should use it instead of
 * raw `r2Url`.
 */
export async function orgFileUrl(orgId: string, key: string, expiresIn = 600): Promise<string> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("creative_orgs").select("storage_prefix").eq("id", orgId).maybeSingle();
  const prefix = (data as { storage_prefix?: string } | null)?.storage_prefix;
  if (!prefix) throw new Error(`orgFileUrl: org ${orgId} not found`);
  if (!keyBelongsToOrg(key, prefix)) throw new Error("orgFileUrl: key does not belong to this org");
  return r2Url(key, expiresIn);
}

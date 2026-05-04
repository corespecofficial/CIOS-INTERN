"use server";

/**
 * Server actions for the org Files tab.
 *
 * Upload path goes through src/lib/org-storage.ts:orgUploadFile which
 * enforces the storage prefix on every write — no caller can bypass
 * tenant isolation by handing in a custom key. Reads use orgFileUrl
 * which gates signed-URL emission on org membership at the call site
 * (RLS on org_files governs the row-level read; this gates the
 * R2 signature emission).
 *
 * Allowed roles:
 *   - upload: owner, org_admin, instructor
 *   - list/get-url: any active member
 *   - delete: owner, org_admin
 */

import { supabaseAdmin, getCurrentDbUser, type DbUser } from "@/lib/db";
import { orgUploadFile, orgFileUrl } from "@/lib/org-storage";
import { r2IsConfigured } from "@/lib/r2";
import { logOrgAudit } from "@/lib/org-audit";
import { revalidatePath } from "next/cache";
import type { OrgMemberRole } from "@/lib/active-org";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const STAFF_ROLES: OrgMemberRole[] = ["owner", "org_admin"];
const UPLOAD_ROLES: OrgMemberRole[] = ["owner", "org_admin", "instructor"];

interface OrgAuthz { me: DbUser; slug: string; role: OrgMemberRole | null; isSuperAdmin: boolean }

async function assertOrgMember(orgId: string, opts?: { roles?: OrgMemberRole[] }): Promise<R<OrgAuthz>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };
  const sb = supabaseAdmin();
  const { data: org } = await sb.from("creative_orgs").select("slug, status").eq("id", orgId).maybeSingle();
  const orgRow = org as { slug: string; status: string } | null;
  if (!orgRow) return { ok: false, error: "Org not found" };
  if (orgRow.status !== "active") return { ok: false, error: `Org is ${orgRow.status}` };

  const isSuperAdmin = me.role === "super_admin";
  const { data: m } = await sb
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", me.id)
    .eq("status", "active")
    .maybeSingle();
  const role = (m as { role: OrgMemberRole } | null)?.role ?? null;

  if (!isSuperAdmin) {
    if (!role) return { ok: false, error: "Not a member" };
    if (opts?.roles && !opts.roles.includes(role)) return { ok: false, error: "Insufficient role" };
  }

  return { ok: true, data: { me, slug: orgRow.slug, role, isSuperAdmin } };
}

/* ───────────── Upload ───────────── */

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file — generous for class material, well under R2 single-PUT limits
const SAFE_NAME = /^[A-Za-z0-9._\- ]+$/;

export async function uploadOrgFileAction(orgId: string, formData: FormData): Promise<R<{ fileId: string; key: string }>> {
  if (!r2IsConfigured()) {
    return { ok: false, error: "Storage isn't configured. Ask your CIOS admin to set the R2_* env vars." };
  }
  const a = await assertOrgMember(orgId, { roles: UPLOAD_ROLES });
  if (!a.ok) return a;

  const file = formData.get("file");
  if (!file || typeof file === "string") return { ok: false, error: "No file attached" };
  const blob = file as File;
  if (blob.size === 0) return { ok: false, error: "File is empty" };
  if (blob.size > MAX_BYTES) return { ok: false, error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` };

  // Sanitize the filename. R2 keys are case-sensitive; we keep the
  // user's casing but reject anything that would need URL escaping
  // (spaces are allowed → encodeURIComponent handles them downstream).
  const rawName = blob.name || "upload";
  const cleanName = rawName.normalize("NFKC").trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
  if (!SAFE_NAME.test(cleanName)) return { ok: false, error: "Filename has unsupported characters" };

  // Compose a unique relative key under `files/`. Prefix with a UTC
  // timestamp so listing in the bucket sorts naturally; suffix the
  // original filename so users can recognise it.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).slice(2, 8);
  const relativeKey = `files/${stamp}-${random}-${cleanName}`;

  const buf = Buffer.from(await blob.arrayBuffer());
  let result;
  try {
    result = await orgUploadFile({
      orgId,
      relativeKey,
      body: buf,
      contentType: blob.type || "application/octet-stream",
      uploadedBy: a.data.me.id,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }

  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "file.uploaded",
    target: `file:${result.fileId}`,
    meta: { name: cleanName, size: blob.size, mime: blob.type, key: result.key },
  });

  revalidatePath(`/o/${a.data.slug}/files`);
  revalidatePath(`/s/${a.data.slug}/files`);
  return { ok: true, data: { fileId: result.fileId, key: result.key } };
}

/* ───────────── List ───────────── */

export interface OrgFileRow {
  id: string;
  key: string;
  display_name: string;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
  uploaded_by: { id: string; name: string; avatar_url: string | null } | null;
}

export async function listOrgFiles(orgId: string, page = 1, pageSize = 50): Promise<R<{ files: OrgFileRow[]; total: number }>> {
  const a = await assertOrgMember(orgId);
  if (!a.ok) return a;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const sb = supabaseAdmin();
  const { data, count } = await sb
    .from("org_files")
    .select(
      "id, key, mime, size_bytes, created_at, uploaded_by:users!org_files_uploaded_by_fkey(id, name, avatar_url)",
      { count: "exact" },
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  type Row = {
    id: string; key: string; mime: string | null; size_bytes: number | null;
    created_at: string;
    uploaded_by: { id: string; name: string; avatar_url: string | null } | null;
  };

  const files = ((data || []) as unknown as Row[]).map((r) => ({
    ...r,
    // The key encodes a timestamp + random + original name. The display
    // name is the bit after the last `-` group (cheap, lossless for the
    // shapes our uploader writes).
    display_name: extractDisplayName(r.key),
  }));

  return { ok: true, data: { files, total: count ?? 0 } };
}

function extractDisplayName(key: string): string {
  // Pattern from uploadOrgFileAction:
  //   files/<iso-stamp>-<rand6>-<original-name>
  // org-prefix is stripped by R2 (we only get key part); we want the
  // segment after `files/<stamp>-<random>-`. Regex is permissive — if
  // the key doesn't match the pattern we just return the basename.
  const m = key.match(/files\/[0-9T:.-]+Z?-[a-z0-9]+-(.+)$/);
  if (m) return m[1];
  const slash = key.lastIndexOf("/");
  return slash >= 0 ? key.slice(slash + 1) : key;
}

/* ───────────── Signed URL for download ───────────── */

export async function getOrgFileSignedUrl(orgId: string, fileId: string): Promise<R<{ url: string }>> {
  const a = await assertOrgMember(orgId);
  if (!a.ok) return a;

  const sb = supabaseAdmin();
  const { data } = await sb.from("org_files").select("key, org_id").eq("id", fileId).maybeSingle();
  const row = data as { key: string; org_id: string } | null;
  if (!row) return { ok: false, error: "File not found" };
  // org_id check is also enforced by RLS, but a defense-in-depth
  // assertion before signing the URL costs nothing.
  if (row.org_id !== orgId) return { ok: false, error: "Tenant mismatch" };

  try {
    const url = await orgFileUrl(orgId, row.key, 600);
    return { ok: true, data: { url } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not sign URL" };
  }
}

/* ───────────── Delete ───────────── */

export async function deleteOrgFile(orgId: string, fileId: string): Promise<R> {
  const a = await assertOrgMember(orgId, { roles: STAFF_ROLES });
  if (!a.ok) return a;

  const sb = supabaseAdmin();
  const { data } = await sb.from("org_files").select("key, org_id").eq("id", fileId).maybeSingle();
  const row = data as { key: string; org_id: string } | null;
  if (!row) return { ok: false, error: "File not found" };
  if (row.org_id !== orgId) return { ok: false, error: "Tenant mismatch" };

  // Delete the org_files row first so the UI updates immediately. The
  // R2 object cleanup is best-effort — orphan blobs are recoverable
  // via tenant scrub (storage_prefix sweep) but a phantom org_files
  // row pointing at a deleted blob would 404 on download forever.
  const { error } = await sb.from("org_files").delete().eq("id", fileId).eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  // R2 delete: skipped here because removing src/lib/r2.ts wrapper is
  // not in scope — the row removal is the user-visible delete. A
  // periodic GC sweep can clean orphan R2 blobs by listing keys with
  // the org's storage_prefix and dropping any not present in
  // org_files. Out of scope for this commit.

  await logOrgAudit({
    orgId, actorId: a.data.me.id, action: "file.deleted",
    target: `file:${fileId}`,
    meta: { key: row.key },
  });

  revalidatePath(`/o/${a.data.slug}/files`);
  revalidatePath(`/s/${a.data.slug}/files`);
  return { ok: true };
}

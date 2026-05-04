/**
 * /o/<slug>/files — host-side file library.
 *
 * Owner / org_admin / instructor can upload + delete; students see the
 * read-only /s/<slug>/files mirror. Storage isolation is enforced by
 * src/lib/org-storage.ts:orgUploadFile (every key is forced under the
 * org's storage_prefix). Reading is gated by RLS on org_files +
 * orgFileUrl signing only when the requester is an active member.
 */

import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { listOrgFiles } from "@/app/actions/org-files";
import { r2IsConfigured } from "@/lib/r2";
import { FilesPanel } from "./files-panel";

export const dynamic = "force-dynamic";

export default async function HostFilesPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageStr } = await searchParams;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const canUpload = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin", "instructor"].includes(ctx.memberRole));
  const canDelete = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin"].includes(ctx.memberRole));
  const storageReady = r2IsConfigured();

  const page = Math.max(1, Number(pageStr) || 1);
  const res = await listOrgFiles(ctx.org.id, page, 50);
  const files = res.ok ? res.data!.files : [];
  const total = res.ok ? res.data!.total : 0;

  return (
    <FilesPanel
      orgId={ctx.org.id}
      orgSlug={orgSlug}
      mode="host"
      canUpload={!!canUpload && storageReady}
      canDelete={!!canDelete}
      storageReady={storageReady}
      initialFiles={files}
      total={total}
      page={page}
    />
  );
}

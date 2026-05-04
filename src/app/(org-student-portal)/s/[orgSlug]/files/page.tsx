/**
 * /s/<slug>/files — student read-only file library. Reuses the host's
 * FilesPanel component with `mode="student"` + `canUpload=false` +
 * `canDelete=false` so students can only download.
 */

import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { listOrgFiles } from "@/app/actions/org-files";
import { r2IsConfigured } from "@/lib/r2";
import { FilesPanel } from "@/app/(host-portal)/o/[orgSlug]/files/files-panel";

export const dynamic = "force-dynamic";

export default async function StudentFilesPage({ params, searchParams }: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageStr } = await searchParams;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const page = Math.max(1, Number(pageStr) || 1);
  const res = await listOrgFiles(ctx.org.id, page, 50);
  const files = res.ok ? res.data!.files : [];
  const total = res.ok ? res.data!.total : 0;

  return (
    <FilesPanel
      orgId={ctx.org.id}
      orgSlug={orgSlug}
      mode="student"
      canUpload={false}
      canDelete={false}
      storageReady={r2IsConfigured()}
      initialFiles={files}
      total={total}
      page={page}
    />
  );
}

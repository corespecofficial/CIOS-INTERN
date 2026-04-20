import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { getTool } from "@/lib/document-tools";
import { ToolShell } from "./tool-shell";

export const dynamic = "force-dynamic";

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolId } = await params;
  const tool = getTool(toolId);
  if (!tool) notFound();

  // Tools with a bespoke route (e.g. the CV wizard) redirect here so the
  // generic shell never fights with them.
  if (tool.customHref) redirect(tool.customHref);

  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/documents/app/t/${toolId}`);

  let me = await getCurrentDbUser();
  if (!me) {
    const repair = await ensureCurrentDbUser();
    if (repair.ok) me = await getCurrentDbUser();
  }
  if (!me) redirect(`/sign-in?redirect_url=/documents/app/t/${toolId}`);

  const firstName = (me.name || "there").split(" ")[0];
  return <ToolShell tool={tool} firstName={firstName} />;
}

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { DocumentsClient } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/documents/app/library");
  let docs: Array<Record<string, unknown>> = [];
  try {
    const { data } = await supabaseAdmin().from("documents").select("*")
      .eq("owner_id", me.id).is("deleted_at", null).order("created_at", { ascending: false });
    docs = data || [];
  } catch {/* table may not exist yet */}
  return <DocumentsClient initial={docs} />;
}

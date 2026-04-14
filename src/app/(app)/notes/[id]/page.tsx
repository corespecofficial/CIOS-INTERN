import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { EditorClient } from "./editor-client";
import type { DbNote } from "@/app/actions/notes";

export const dynamic = "force-dynamic";

export default async function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data } = await sb.from("notes").select("*").eq("id", id).eq("user_id", me.id).maybeSingle();
  if (!data) notFound();
  return <EditorClient initialNote={data as DbNote} />;
}

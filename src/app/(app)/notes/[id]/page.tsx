import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { EditorClient } from "./editor-client";
import { SlidesEditorClient } from "./slides-editor-client";
import { TableEditorClient } from "./table-editor-client";
import { PdfEditorClient } from "./pdf-editor-client";
import type { DbNote } from "@/app/actions/notes";

export const dynamic = "force-dynamic";

/**
 * Dispatcher — loads the note and hands it off to the editor that matches
 * its doc type. The note's `icon` column doubles as the doc type ("doc" |
 * "slides" | "table" | "pdf"); see createNote in notes actions.
 */
export default async function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data } = await sb.from("notes").select("*").eq("id", id).eq("user_id", me.id).maybeSingle();
  if (!data) notFound();
  const note = data as DbNote;
  switch (note.icon) {
    case "slides": return <SlidesEditorClient initialNote={note} />;
    case "table":  return <TableEditorClient initialNote={note} />;
    case "pdf":    return <PdfEditorClient initialNote={note} />;
    default:       return <EditorClient initialNote={note} />;
  }
}

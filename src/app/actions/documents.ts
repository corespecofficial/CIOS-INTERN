"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface DocumentInput {
  name: string;
  kind?: string;
  mime?: string;
  sizeBytes?: number;
  url: string;
  thumbnailUrl?: string;
  tags?: string[];
  folder?: string;
  description?: string;
  isGenerated?: boolean;
  generatedBy?: string;
}

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

export async function listMyDocuments(filter?: { kind?: string; folder?: string; q?: string }): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    let q = supabaseAdmin().from("documents").select("*")
      .eq("owner_id", me.id).is("deleted_at", null).order("created_at", { ascending: false });
    if (filter?.kind) q = q.eq("kind", filter.kind);
    if (filter?.folder) q = q.eq("folder", filter.folder);
    if (filter?.q) q = q.ilike("name", `%${filter.q}%`);
    const { data } = await q;
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function saveDocument(input: DocumentInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    if (!input.name?.trim() || !input.url) return { ok: false, error: "Name and URL required" };
    const { data, error } = await supabaseAdmin().from("documents").insert({
      owner_id: me.id,
      name: input.name.trim(),
      kind: input.kind || "other",
      mime: input.mime || null,
      size_bytes: input.sizeBytes || 0,
      url: input.url,
      thumbnail_url: input.thumbnailUrl || null,
      tags: input.tags || [],
      folder: input.folder || null,
      description: input.description || null,
      is_generated: input.isGenerated || false,
      generated_by: input.generatedBy || null,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/documents");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function renameDocument(id: string, name: string): Promise<R> {
  try {
    const me = await requireMe();
    if (!name.trim()) return { ok: false, error: "Name required" };
    await supabaseAdmin().from("documents").update({ name: name.trim(), updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", me.id);
    revalidatePath("/documents");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteDocument(id: string): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("owner_id", me.id);
    revalidatePath("/documents");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function shareDocument(id: string, userIds: string[]): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("documents").update({ shared_with: userIds, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", me.id);
    revalidatePath("/documents");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Generate a CV from the user's profile (template-based, no AI for now). */
export async function generateCV(): Promise<R<{ id: string; content: string }>> {
  try {
    const me = await requireMe();
    const { data: u } = await supabaseAdmin().from("users")
      .select("name, email, headline, bio, skills, location, social_links")
      .eq("id", me.id).maybeSingle();
    if (!u) return { ok: false, error: "Profile not found" };
    const content = buildCVText(u as { name: string; email: string; headline: string | null; bio: string | null; skills: string[]; location: string | null; social_links: Record<string, string> });
    // Store as a data-URL so it's usable without external storage
    const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
    const res = await saveDocument({
      name: `${u.name.replace(/\s+/g, "-")}-CV-${new Date().toISOString().slice(0, 10)}.txt`,
      kind: "cv",
      mime: "text/plain",
      sizeBytes: content.length,
      url: dataUrl,
      description: "Auto-generated from your profile",
      isGenerated: true,
      generatedBy: "cv_generator",
    });
    if (!res.ok) return { ok: false, error: res.error };
    await logAudit({ actionCode: "account.profile_updated", category: "account", summary: "Generated CV", actorUserId: me.id, actorName: me.name, entityType: "document", entityId: res.data!.id });
    return { ok: true, data: { id: res.data!.id, content } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

function buildCVText(u: { name: string; email: string; headline: string | null; bio: string | null; skills: string[]; location: string | null; social_links: Record<string, string> }): string {
  const lines: string[] = [];
  lines.push(u.name.toUpperCase());
  if (u.headline) lines.push(u.headline);
  lines.push(`${u.email}${u.location ? ` · ${u.location}` : ""}`);
  const links = Object.entries(u.social_links || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ");
  if (links) lines.push(links);
  lines.push("");
  if (u.bio) { lines.push("SUMMARY"); lines.push(u.bio); lines.push(""); }
  if (u.skills?.length) { lines.push("SKILLS"); lines.push(u.skills.join(" · ")); lines.push(""); }
  lines.push("EXPERIENCE");
  lines.push("COSPRONOS Media — CIOS Internship Program");
  lines.push("· Built real-world projects on the CIOS platform");
  lines.push("· Completed structured training modules with measurable outcomes");
  lines.push("");
  lines.push(`Generated from CIOS on ${new Date().toLocaleDateString()}`);
  return lines.join("\n");
}

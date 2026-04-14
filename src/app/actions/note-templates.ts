"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface NoteTemplateRow {
  id: string;
  name: string;
  category: string;
  doc_type: "doc" | "slides" | "table" | "pdf";
  html: string;
  accent: string;
  preview_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/** Public — all active custom templates. Used by the Template Picker. */
export async function listActiveTemplates(): Promise<R<NoteTemplateRow[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("note_templates").select("*")
      .eq("is_active", true).order("category").order("name");
    return { ok: true, data: (data || []) as NoteTemplateRow[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Admin — all templates including inactive ones. */
export async function listAllTemplates(): Promise<R<NoteTemplateRow[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admin only" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("note_templates").select("*").order("created_at", { ascending: false });
    return { ok: true, data: (data || []) as NoteTemplateRow[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export interface CreateTemplateInput {
  name: string;
  category: string;
  docType?: "doc" | "slides" | "table" | "pdf";
  html: string;
  accent?: string;
  previewUrl?: string | null;
  isPremium?: boolean;
}

export async function createTemplate(input: CreateTemplateInput): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admin only" };
    if (!input.name.trim()) return { ok: false, error: "Name required" };
    if (!input.html.trim()) return { ok: false, error: "Template content required" };

    const sb = supabaseAdmin();
    const { data, error } = await sb.from("note_templates").insert({
      name: input.name.trim(),
      category: input.category.trim() || "Letters",
      doc_type: input.docType || "doc",
      html: input.html,
      accent: input.accent || "#1E88E5",
      preview_url: input.previewUrl || null,
      is_premium: !!input.isPremium,
      created_by: me.id,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Create failed" };
    revalidatePath("/admin/note-templates");
    revalidatePath("/notes");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateTemplate(id: string, patch: Partial<CreateTemplateInput & { isActive: boolean }>): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admin only" };
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined)       update.name = patch.name.trim();
    if (patch.category !== undefined)   update.category = patch.category.trim() || "Letters";
    if (patch.docType !== undefined)    update.doc_type = patch.docType;
    if (patch.html !== undefined)       update.html = patch.html;
    if (patch.accent !== undefined)     update.accent = patch.accent;
    if (patch.previewUrl !== undefined) update.preview_url = patch.previewUrl;
    if (patch.isPremium !== undefined)  update.is_premium = patch.isPremium;
    if (patch.isActive !== undefined)   update.is_active = patch.isActive;
    const sb = supabaseAdmin();
    const { error } = await sb.from("note_templates").update(update).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/note-templates");
    revalidatePath("/notes");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteTemplate(id: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admin only" };
    const sb = supabaseAdmin();
    await sb.from("note_templates").delete().eq("id", id);
    revalidatePath("/admin/note-templates");
    revalidatePath("/notes");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Is the current user allowed to use premium templates? */
export async function amIPremium(): Promise<boolean> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return false;
    // Admins + super-admins + anyone with a valid premium flag.
    if (["admin", "super_admin"].includes(me.role)) return true;
    const sb = supabaseAdmin();
    const { data } = await sb.from("users").select("is_premium, premium_until").eq("id", me.id).maybeSingle();
    if (!data) return false;
    const u = data as { is_premium: boolean; premium_until: string | null };
    if (!u.is_premium) return false;
    if (u.premium_until && new Date(u.premium_until) < new Date()) return false;
    return true;
  } catch { return false; }
}

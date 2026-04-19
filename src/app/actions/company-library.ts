"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type CompanyDocCategory = "investor" | "product" | "market" | "press" | "technical" | "growth";
export type CompanyDocType = "pdf" | "html" | "slides" | "video" | "external";
export type CompanyDocAccess = "public" | "investor" | "internal";

export interface CompanyDoc {
  id: string;
  title: string;
  description: string | null;
  category: CompanyDocCategory;
  doc_type: CompanyDocType;
  file_url: string;
  thumbnail_url: string | null;
  cover_emoji: string;
  cover_color: string;
  tags: string[];
  access_level: CompanyDocAccess;
  featured: boolean;
  sort_order: number;
  page_count: number | null;
  file_size_bytes: number | null;
  view_count: number;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyDocInput {
  title: string;
  description?: string;
  category: CompanyDocCategory;
  doc_type: CompanyDocType;
  file_url: string;
  thumbnail_url?: string;
  cover_emoji?: string;
  cover_color?: string;
  tags?: string[];
  access_level?: CompanyDocAccess;
  featured?: boolean;
  sort_order?: number;
  page_count?: number;
  file_size_bytes?: number;
  status?: "draft" | "published" | "archived";
}

// ── Public: list published public docs ──────────────────────────────────────
export async function getPublicCompanyDocs(): Promise<R<CompanyDoc[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("company_documents")
      .select("*")
      .eq("status", "published")
      .eq("access_level", "public")
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as CompanyDoc[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Admin: list all docs ────────────────────────────────────────────────────
export async function getAllCompanyDocs(): Promise<R<CompanyDoc[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admins only" };
    }
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("company_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { ok: true, data: (data ?? []) as CompanyDoc[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Admin: create doc ───────────────────────────────────────────────────────
export async function createCompanyDoc(input: CompanyDocInput): Promise<R<CompanyDoc>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admins only" };
    }
    if (!input.title || !input.file_url) {
      return { ok: false, error: "Title and file URL are required" };
    }
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("company_documents")
      .insert({
        uploader_id: me.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        doc_type: input.doc_type,
        file_url: input.file_url,
        thumbnail_url: input.thumbnail_url ?? null,
        cover_emoji: input.cover_emoji ?? "📄",
        cover_color: input.cover_color ?? "#1E88E5",
        tags: input.tags ?? [],
        access_level: input.access_level ?? "public",
        featured: input.featured ?? false,
        sort_order: input.sort_order ?? 0,
        page_count: input.page_count ?? null,
        file_size_bytes: input.file_size_bytes ?? null,
        status: input.status ?? "published",
        published_at: (input.status ?? "published") === "published" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/resources");
    revalidatePath("/admin/company-docs");
    return { ok: true, data: data as CompanyDoc };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Admin: update doc ───────────────────────────────────────────────────────
export async function updateCompanyDoc(id: string, input: Partial<CompanyDocInput>): Promise<R<CompanyDoc>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admins only" };
    }
    const sb = supabaseAdmin();
    const patch: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
    if (input.status === "published") patch.published_at = new Date().toISOString();
    const { data, error } = await sb
      .from("company_documents")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/resources");
    revalidatePath("/admin/company-docs");
    return { ok: true, data: data as CompanyDoc };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Admin: delete doc ───────────────────────────────────────────────────────
export async function deleteCompanyDoc(id: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Admins only" };
    }
    const sb = supabaseAdmin();
    const { error } = await sb.from("company_documents").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/resources");
    revalidatePath("/admin/company-docs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

// ── Public: log a view ──────────────────────────────────────────────────────
export async function logCompanyDocView(id: string, referrer?: string): Promise<R<void>> {
  try {
    const sb = supabaseAdmin();
    const me = await getCurrentDbUser();
    await sb.from("company_document_views").insert({
      document_id: id,
      viewer_id: me?.id ?? null,
      referrer: referrer ?? null,
    });
    const { data: current } = await sb.from("company_documents").select("view_count").eq("id", id).maybeSingle();
    if (current) {
      await sb.from("company_documents").update({ view_count: Number(current.view_count ?? 0) + 1 }).eq("id", id);
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

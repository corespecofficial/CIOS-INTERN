"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface SystemIncident {
  id: string;
  title: string;
  description: string | null;
  severity: "info" | "minor" | "major" | "critical";
  status: "investigating" | "monitoring" | "resolved";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
}

export interface SystemMaintenance {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  expected_duration_min: number;
  status: "upcoming" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  created_by: string | null;
}

export async function getSystemIncidents(): Promise<SystemIncident[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("system_incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []) as SystemIncident[];
  } catch {
    return [];
  }
}

export async function getUpcomingMaintenance(): Promise<SystemMaintenance[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("system_maintenance")
      .select("*")
      .in("status", ["upcoming", "in_progress"])
      .order("scheduled_at", { ascending: true });
    if (error) return [];
    return (data ?? []) as SystemMaintenance[];
  } catch {
    return [];
  }
}

export async function createIncident(data: {
  title: string;
  description?: string;
  severity: "info" | "minor" | "major" | "critical";
  status: "investigating" | "monitoring" | "resolved";
}): Promise<R<SystemIncident>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }

    const { data: inserted, error } = await supabaseAdmin()
      .from("system_incidents")
      .insert({
        title: data.title,
        description: data.description ?? null,
        severity: data.severity,
        status: data.status,
        created_by: me.id,
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/status");
    return { ok: true, data: inserted as SystemIncident };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function resolveIncident(
  id: string,
  resolution_note: string
): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }

    const { error } = await supabaseAdmin()
      .from("system_incidents")
      .update({
        status: "resolved",
        resolution_note,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/status");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function createMaintenance(data: {
  title: string;
  description?: string;
  scheduled_at: string;
  expected_duration_min: number;
}): Promise<R<SystemMaintenance>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }

    const { data: inserted, error } = await supabaseAdmin()
      .from("system_maintenance")
      .insert({
        title: data.title,
        description: data.description ?? null,
        scheduled_at: data.scheduled_at,
        expected_duration_min: data.expected_duration_min,
        created_by: me.id,
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/status");
    return { ok: true, data: inserted as SystemMaintenance };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateMaintenanceStatus(
  id: string,
  status: "upcoming" | "in_progress" | "completed" | "cancelled"
): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    if (!["admin", "super_admin"].includes(me.role)) {
      return { ok: false, error: "Insufficient permissions" };
    }

    const { error } = await supabaseAdmin()
      .from("system_maintenance")
      .update({ status })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/status");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

import "server-only";

import * as Ably from "ably";
import { supabaseAdmin } from "@/lib/db";

let ablyRest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest | null {
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  if (!ablyRest) ablyRest = new Ably.Rest({ key });
  return ablyRest;
}

export type PlatformOrgEventType =
  | "org.created"
  | "org.status_changed"
  | "org.member_invited"
  | "org.member_joined"
  | "org.member_removed"
  | "org.member_role_changed"
  | "org.quota_warning";

export async function publishPlatformOrgEvent(input: {
  orgId: string | null;
  eventType: PlatformOrgEventType;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const metadata = input.metadata ?? {};
  let eventId: string | null = null;
  let createdAt = new Date().toISOString();

  try {
    const { data } = await supabaseAdmin()
      .from("platform_org_events")
      .insert({
        org_id: input.orgId,
        event_type: input.eventType,
        actor_id: input.actorId ?? null,
        metadata,
      })
      .select("id, created_at")
      .single();
    const row = data as { id?: string; created_at?: string } | null;
    eventId = row?.id ?? null;
    createdAt = row?.created_at ?? createdAt;
  } catch (e) {
    console.warn("[platform-org-event] insert failed:", e instanceof Error ? e.message : e);
  }

  const rest = getAblyRest();
  if (!rest) return;

  try {
    await rest.channels.get("platform-orgs").publish("event", {
      id: eventId,
      org_id: input.orgId,
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      metadata,
      created_at: createdAt,
    });
  } catch (e) {
    console.warn("[platform-org-event] ably publish failed:", e instanceof Error ? e.message : e);
  }
}

async function publishQuotaWarningOnce(input: {
  orgId: string | null;
  actorId?: string | null;
  scope: "platform_orgs" | "platform_interns" | "org_interns";
  severity: "warning" | "critical";
  current: number;
  limit: number;
  percent: number;
}) {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let query = sb
    .from("platform_org_events")
    .select("id")
    .eq("event_type", "org.quota_warning")
    .contains("metadata", { scope: input.scope, severity: input.severity })
    .gte("created_at", since)
    .limit(1);

  query = input.orgId ? query.eq("org_id", input.orgId) : query.is("org_id", null);
  const { data } = await query;
  if (data && data.length > 0) return;

  await publishPlatformOrgEvent({
    orgId: input.orgId,
    eventType: "org.quota_warning",
    actorId: input.actorId ?? null,
    metadata: {
      scope: input.scope,
      severity: input.severity,
      current: input.current,
      limit: input.limit,
      percent: input.percent,
    },
  });
}

function quotaSeverity(current: number, limit: number): { percent: number; severity: "warning" | "critical" | null } {
  if (limit <= 0) return { percent: 100, severity: "critical" };
  const percent = Math.round((current / limit) * 100);
  if (percent >= 95) return { percent, severity: "critical" };
  if (percent >= 80) return { percent, severity: "warning" };
  return { percent, severity: null };
}

export async function publishOrgQuotaWarnings(orgId?: string | null, actorId?: string | null) {
  const sb = supabaseAdmin();
  const [{ data: limitsRow }, { count: activeOrgs }, { count: activeInterns }] = await Promise.all([
    sb.from("org_platform_limits").select("max_active_orgs, max_active_intern_memberships, reserved_org_seats, reserved_intern_seats").eq("key", "default").maybeSingle(),
    sb.from("creative_orgs").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("org_members").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active"),
  ]);

  const limits = (limitsRow as {
    max_active_orgs?: number;
    max_active_intern_memberships?: number;
    reserved_org_seats?: number;
    reserved_intern_seats?: number;
  } | null) ?? {};
  const orgLimit = Math.max(0, Number(limits.max_active_orgs ?? 100) - Number(limits.reserved_org_seats ?? 0));
  const internLimit = Math.max(0, Number(limits.max_active_intern_memberships ?? 1000) - Number(limits.reserved_intern_seats ?? 0));

  const orgQuota = quotaSeverity(activeOrgs ?? 0, orgLimit);
  if (orgQuota.severity) {
    await publishQuotaWarningOnce({
      orgId: null,
      actorId,
      scope: "platform_orgs",
      severity: orgQuota.severity,
      current: activeOrgs ?? 0,
      limit: orgLimit,
      percent: orgQuota.percent,
    });
  }

  const internQuota = quotaSeverity(activeInterns ?? 0, internLimit);
  if (internQuota.severity) {
    await publishQuotaWarningOnce({
      orgId: null,
      actorId,
      scope: "platform_interns",
      severity: internQuota.severity,
      current: activeInterns ?? 0,
      limit: internLimit,
      percent: internQuota.percent,
    });
  }

  if (!orgId) return;
  const { data: orgRow } = await sb
    .from("creative_orgs")
    .select("active_intern_count, intern_limit")
    .eq("id", orgId)
    .maybeSingle();
  const org = orgRow as { active_intern_count?: number | null; intern_limit?: number | null } | null;
  const orgInterns = Number(org?.active_intern_count ?? 0);
  const orgInternLimit = Number(org?.intern_limit ?? 50);
  const orgInternQuota = quotaSeverity(orgInterns, orgInternLimit);
  if (orgInternQuota.severity) {
    await publishQuotaWarningOnce({
      orgId,
      actorId,
      scope: "org_interns",
      severity: orgInternQuota.severity,
      current: orgInterns,
      limit: orgInternLimit,
      percent: orgInternQuota.percent,
    });
  }
}

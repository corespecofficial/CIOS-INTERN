/**
 * GET /api/orgs/<orgId>/audit.csv
 *
 * Streams the org's audit log as a CSV download. Owner + org_admin
 * only (super_admin bypasses). Same filter knobs as the /audit
 * viewer — pass `?action=foo.bar` to scope to one action.
 *
 * Why an API route + URL instead of a server action: browser-native
 * file download. The user clicks a link, the browser sees
 * `Content-Disposition: attachment` and saves the file with the
 * right name. No client-side Blob plumbing, no race-y "build the
 * string in memory then dispatch a click()" hack.
 *
 * Cap is 10,000 rows — the audit log is append-only and most orgs
 * won't approach that for years. If they do, paginate via a `from`
 * cursor (e.g. `?from=<iso>` to export pre-cursor only).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

const STAFF = new Set(["owner", "org_admin"]);
const HARD_CAP = 10_000;

// Columns in stable order — never re-shuffle, downstream tools (Excel
// macros, Sheets imports) lock on column position.
const HEADERS = ["created_at", "action", "actor_name", "actor_email", "target", "meta"] as const;

function csvEscape(v: unknown): string {
  if (v == null) return "";
  let s = typeof v === "string" ? v : JSON.stringify(v);
  // Excel-injection defence: prefix any leading =, +, -, @ with a
  // single quote so spreadsheet apps don't evaluate the cell as a
  // formula. This is the OWASP-recommended sanitisation.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  // RFC 4180: quote any cell that contains comma / quote / newline.
  // Embedded quotes are doubled.
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  if (!orgId) return new NextResponse("Missing orgId", { status: 400 });

  const me = await getCurrentDbUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();

  // Verify the org exists + load slug for the filename
  const { data: orgRow } = await sb.from("creative_orgs").select("id, slug").eq("id", orgId).maybeSingle();
  const org = orgRow as { id: string; slug: string } | null;
  if (!org) return new NextResponse("Org not found", { status: 404 });

  // Authz: super_admin OR (active member with staff role)
  if (me.role !== "super_admin") {
    const { data: m } = await sb
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", me.id)
      .eq("status", "active")
      .maybeSingle();
    const role = (m as { role?: string } | null)?.role;
    if (!role || !STAFF.has(role)) return new NextResponse("Forbidden", { status: 403 });
  }

  const action = req.nextUrl.searchParams.get("action");
  let q = sb
    .from("org_audit_log")
    .select(
      "action, target, meta, created_at, actor:users!org_audit_log_actor_id_fkey(name, email)",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(HARD_CAP);
  if (action) q = q.eq("action", action);

  const { data, error } = await q;
  if (error) return new NextResponse(`Query failed: ${error.message}`, { status: 500 });

  type Row = {
    action: string;
    target: string | null;
    meta: Record<string, unknown> | null;
    created_at: string;
    actor: { name: string | null; email: string | null } | null;
  };
  const rows = (data || []) as unknown as Row[];

  const lines: string[] = [HEADERS.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push([
      r.created_at,
      r.action,
      r.actor?.name ?? "",
      r.actor?.email ?? "",
      r.target ?? "",
      r.meta ? JSON.stringify(r.meta) : "",
    ].map(csvEscape).join(","));
  }
  // Trailing newline — standard for CSVs and avoids "missing last
  // line" complaints from some spreadsheet importers.
  const csv = lines.join("\r\n") + "\r\n";

  // BOM for Excel — without it, non-ASCII characters in actor names
  // (e.g. accented letters, CJK) render as mojibake on Windows Excel.
  const body = "﻿" + csv;

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `cios-${org.slug}-audit${action ? `-${action.replace(/[^a-z0-9_.-]/gi, "")}` : ""}-${stamp}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

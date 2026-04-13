import { NextResponse } from "next/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { pushNotification } from "@/app/actions/notifications";

export async function POST(req: Request) {
  try {
    const me = await getCurrentDbUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { subject, message, priority } = (await req.json()) as { subject?: string; message?: string; priority?: "low" | "medium" | "high" };
    const s = (subject || "").trim().slice(0, 160);
    const m = (message || "").trim().slice(0, 4000);
    if (!s || !m) return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
    const p: "low" | "medium" | "high" = priority === "high" || priority === "low" ? priority : "medium";
    const type = p === "high" ? "error" : p === "medium" ? "warning" : "info";
    const body = `${m}\n\n— From ${me.name || me.email || me.id}`;

    const sb = supabaseAdmin();
    const { data: admins } = await sb.from("users").select("id").in("role", ["admin", "super_admin"]).limit(20);
    for (const a of (admins || []) as Array<{ id: string }>) {
      await pushNotification({ userId: a.id, kind: type as "error" | "warning" | "info", title: `🆘 ${s}`, body, url: "/support" }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

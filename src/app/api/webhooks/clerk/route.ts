import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

/* Supabase admin client (service role for writes) */
function supa() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const payload = await req.text();

  // Verify signature with svix (Clerk uses Svix for webhooks)
  let evt: WebhookEvent;

  if (CLERK_WEBHOOK_SECRET) {
    try {
      const headers = {
        "svix-id": req.headers.get("svix-id") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
      };
      const wh = new Webhook(CLERK_WEBHOOK_SECRET);
      evt = wh.verify(payload, headers) as WebhookEvent;
    } catch (e) {
      console.error("[clerk-webhook] signature verification failed:", e);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Dev mode — allow without signing secret (NOT safe for prod)
    evt = JSON.parse(payload) as WebhookEvent;
    console.warn("[clerk-webhook] running without CLERK_WEBHOOK_SECRET — unsafe for production");
  }

  try {
    switch (evt.type) {
      case "user.created":
        await handleUserCreated(evt.data);
        break;
      case "user.updated":
        await handleUserUpdated(evt.data);
        break;
      case "user.deleted":
        await handleUserDeleted(evt.data);
        break;
      default:
        // ignore other events
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[clerk-webhook] handler error:", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/* Simple GET for Clerk's webhook test */
export async function GET() {
  return NextResponse.json({ ok: true, message: "Clerk webhook endpoint live" });
}

interface ClerkUserData {
  id: string;
  email_addresses?: Array<{ email_address: string; id: string }>;
  primary_email_address_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string;
  public_metadata?: Record<string, unknown>;
  created_at?: number;
}

interface ClerkDeletedData {
  id?: string;
  deleted?: boolean;
}

type WebhookEvent =
  | { type: "user.created"; data: ClerkUserData }
  | { type: "user.updated"; data: ClerkUserData }
  | { type: "user.deleted"; data: ClerkDeletedData };

function primaryEmail(data: ClerkUserData): string {
  if (!data.email_addresses || data.email_addresses.length === 0) return "";
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  return primary?.email_address || data.email_addresses[0].email_address || "";
}

async function handleUserCreated(data: ClerkUserData) {
  const email = primaryEmail(data);
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Visitor";

  // 1. Default role is "public_user" — every new signup goes through the
  //    /onboarding/intent gate first to choose their portal. Existing
  //    publicMetadata.role (e.g. set programmatically by an invite flow)
  //    wins. The full enum is now permitted thanks to p392a.
  const existingRole = data.public_metadata?.role as string | undefined;
  const validRoles = [
    "intern", "team_lead", "admin", "super_admin",
    "instructor", "moderator", "finance", "support", "premium",
    "recruiter", "mentor", "alumni",
    "public_user", "investor", "startup_founder", "partner_org", "creative_host",
  ];
  const role = existingRole && validRoles.includes(existingRole) ? existingRole : "public_user";

  if (!existingRole) {
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(data.id, {
        publicMetadata: { role: "public_user" },
      });
      console.log(`[clerk-webhook] set default role "public_user" on new user ${data.id}`);
    } catch (e) {
      console.error("[clerk-webhook] failed to set default role:", e);
    }
  }

  // 2. Upsert into Supabase users table. onboarding_completed_at stays
  //    NULL so the middleware gate fires on first auth'd request.
  const { error } = await supa()
    .from("users")
    .upsert(
      {
        clerk_id: data.id,
        email,
        name,
        role,
        avatar_url: data.image_url || null,
        status: "active",
        // Webhook can't see browser headers (Clerk proxies the form),
        // so risk is computed properly on /onboarding/intent which DOES
        // have the user's request headers. We just record the email
        // domain here so the super-admin queue has a value to filter on.
        signup_signals: { email_domain: email.split("@")[1]?.toLowerCase() || "" },
      },
      { onConflict: "clerk_id" }
    );

  if (error) {
    console.error("[clerk-webhook] supabase upsert failed:", error);
  } else {
    console.log(`[clerk-webhook] synced user ${data.id} (${email}) to Supabase`);
  }
}

async function handleUserUpdated(data: ClerkUserData) {
  const email = primaryEmail(data);
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Intern";
  const role = (data.public_metadata?.role as string | undefined) || "intern";

  const { error } = await supa()
    .from("users")
    .upsert(
      {
        clerk_id: data.id,
        email,
        name,
        role,
        avatar_url: data.image_url || null,
      },
      { onConflict: "clerk_id" }
    );

  if (error) console.error("[clerk-webhook] update failed:", error);
}

async function handleUserDeleted(data: ClerkDeletedData) {
  if (!data.id) return;
  const { error } = await supa().from("users").delete().eq("clerk_id", data.id);
  if (error) console.error("[clerk-webhook] delete failed:", error);
}

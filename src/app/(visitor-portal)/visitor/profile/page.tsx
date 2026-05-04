/**
 * /visitor/profile — visitor profile view + edit. Shows the same fields
 * collected during the welcome carousel (headline, bio, location plus
 * interests / tracks) and lets the user edit them anytime.
 *
 * Public-facing creator/instructor profiles already exist for paying
 * surfaces; this page is the visitor's *own* private profile editor.
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function VisitorProfilePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/visitor/profile");

  // Pull the visitor preferences sidecar (under signup_signals.visitor_prefs)
  // so we can pre-fill the editor with what they picked in the carousel.
  const sb = supabaseAdmin();
  const { data } = await sb.from("users").select("signup_signals").eq("id", me.id).maybeSingle();
  const signals = (data as { signup_signals?: Record<string, unknown> } | null)?.signup_signals ?? {};
  const prefs = (signals as { visitor_prefs?: { interests?: string[]; tracks?: string[] } }).visitor_prefs ?? {};

  return (
    <ProfileEditor
      initial={{
        name: me.name || "",
        email: me.email,
        avatarUrl: me.avatar_url || null,
        headline: me.headline || "",
        bio: me.bio || "",
        location: me.location || "",
        interests: Array.isArray(prefs.interests) ? prefs.interests : [],
        tracks: Array.isArray(prefs.tracks) ? prefs.tracks : (me.skills || []),
      }}
    />
  );
}

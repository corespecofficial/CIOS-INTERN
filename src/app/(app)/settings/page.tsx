import { getCurrentDbUser } from "@/lib/db";
import { SettingsClient } from "./settings-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  return (
    <SettingsClient
      me={{
        id: me.id, name: me.name, email: me.email, avatarUrl: me.avatar_url, role: me.role,
        privacy: (me.privacy || {}) as Record<string, unknown>,
        preferences: (me.preferences || {}) as Record<string, unknown>,
      }}
    />
  );
}

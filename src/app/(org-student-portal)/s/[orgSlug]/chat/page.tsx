import { notFound, redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { getCurrentDbUser, listActiveStatuses, listDirectoryUsers, listMyRooms } from "@/lib/db";
import { MessagesClient } from "@/app/(app)/messages/messages-client";

export const dynamic = "force-dynamic";

export default async function StudentChatPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [rooms, directory, statuses] = await Promise.all([
    listMyRooms(ctx.org.id),
    listDirectoryUsers(ctx.org.id),
    listActiveStatuses(ctx.org.id),
  ]);

  return (
    <MessagesClient
      initialRooms={rooms}
      directory={directory}
      initialStatuses={statuses}
      me={{ id: me.id, clerkId: me.clerk_id, name: me.name, avatarUrl: me.avatar_url }}
      orgSlug={orgSlug}
    />
  );
}

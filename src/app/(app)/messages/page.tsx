import { listMyRooms, listDirectoryUsers, getCurrentDbUser, listActiveStatuses } from "@/lib/db";
import { MessagesClient } from "./messages-client";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const [rooms, directory, me, statuses] = await Promise.all([
    listMyRooms(),
    listDirectoryUsers(),
    getCurrentDbUser(),
    listActiveStatuses(),
  ]);

  return (
    <MessagesClient
      initialRooms={rooms}
      directory={directory}
      initialStatuses={statuses}
      me={{
        id: me?.id || "",
        clerkId: me?.clerk_id || "",
        name: me?.name || "You",
        avatarUrl: me?.avatar_url || null,
      }}
    />
  );
}

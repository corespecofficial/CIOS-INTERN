import { getCurrentDbUser } from "@/lib/db";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

// Auth + AI access guard runs in the parent layout ((workspace)/layout.tsx).
export default async function AIHubChatPage() {
  const me = await getCurrentDbUser();
  const firstName = (me?.name || "there").split(" ")[0];
  return <ChatClient firstName={firstName} />;
}

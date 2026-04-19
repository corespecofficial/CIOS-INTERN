import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listActiveStories } from "@/app/actions/stories";
import StoriesClient from "./stories-client";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listActiveStories();
  return <StoriesClient initialStories={res.ok ? res.data ?? [] : []} />;
}

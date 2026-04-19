import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listArticles } from "@/app/actions/articles";
import ArticlesClient from "./articles-client";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listArticles();
  return <ArticlesClient initialArticles={res.ok ? res.data ?? [] : []} />;
}

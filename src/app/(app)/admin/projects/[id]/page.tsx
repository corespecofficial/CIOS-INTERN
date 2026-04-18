import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getProjectById, getProjectSubmissions } from "@/app/actions/custom-projects";
import { AdminProjectDetailClient } from "./admin-project-detail-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;

  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "moderator"].includes(me.role)) redirect("/dashboard");

  const [projectRes, subsRes] = await Promise.all([
    getProjectById(id),
    getProjectSubmissions(id),
  ]);

  if (!projectRes.ok) redirect("/admin/projects");

  return (
    <AdminProjectDetailClient
      project={projectRes.data}
      submissions={subsRes.ok ? subsRes.data : []}
      defaultTab={(tab as "overview" | "edit" | "submissions") ?? "overview"}
    />
  );
}

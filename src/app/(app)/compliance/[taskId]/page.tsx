import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getTaskDetail } from "@/app/actions/compliance-tasks";
import TaskDetailClient from "./task-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { taskId } = await params;

  const result = await getTaskDetail(taskId);

  if (!result.ok || !result.data) {
    notFound();
  }

  return <TaskDetailClient task={result.data} />;
}

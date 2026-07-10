import { notFound } from "next/navigation";
import { getCourseWithModulesForEditor } from "@/lib/db";
import { BuilderClient } from "./builder-client";

export const dynamic = "force-dynamic";

export default async function CourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, modules } = await getCourseWithModulesForEditor(id);
  if (!course) notFound();
  return <BuilderClient course={course} initialModules={modules} />;
}

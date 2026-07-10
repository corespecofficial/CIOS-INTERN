import { notFound } from "next/navigation";
import { getCourseWithModulesForViewer, getMyEnrollment, getCurrentDbUser, listCourseDiscussions, listMaterialsForCourse } from "@/lib/db";
import { PlayerClient } from "./player-client";

export const dynamic = "force-dynamic";

export default async function CourseViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ course, modules }, enrollment, me, discussions, materials] = await Promise.all([
    getCourseWithModulesForViewer(id),
    getMyEnrollment(id),
    getCurrentDbUser(),
    listCourseDiscussions(id),
    listMaterialsForCourse(id),
  ]);
  if (!course) notFound();

  const iAmInstructor = me?.id === course.instructor_id || me?.role === "admin" || me?.role === "super_admin";
  const canView = iAmInstructor || course.status === "published";
  if (!canView) notFound();

  return (
    <PlayerClient
      course={course}
      modules={modules}
      enrollment={enrollment}
      iAmInstructor={iAmInstructor}
      meId={me?.id || ""}
      meName={me?.name || "You"}
      discussions={discussions}
      materials={materials}
    />
  );
}

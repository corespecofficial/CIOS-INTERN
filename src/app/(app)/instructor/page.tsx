import { getCoursesByInstructor, getCurrentDbUser } from "@/lib/db";
import { InstructorDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

export default async function InstructorPage() {
  const [me, courses] = await Promise.all([getCurrentDbUser(), getCoursesByInstructor()]);

  return (
    <InstructorDashboard
      name={me?.name}
      courses={courses.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        totalEnrolled: c.total_enrolled,
        totalModules: c.total_modules,
        thumbnailUrl: c.thumbnail_url,
      }))}
    />
  );
}

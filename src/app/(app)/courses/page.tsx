import { getAllPublishedCourses, getMyEnrolledCourses, getMyCoursesAsInstructor, getCurrentDbUser } from "@/lib/db";
import { CoursesClient } from "./courses-client";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [me, published, enrolled, mine] = await Promise.all([
    getCurrentDbUser(),
    getAllPublishedCourses(),
    getMyEnrolledCourses(),
    getMyCoursesAsInstructor(),
  ]);

  return (
    <CoursesClient
      published={published}
      enrolled={enrolled}
      mine={mine}
      role={me?.role || "intern"}
    />
  );
}

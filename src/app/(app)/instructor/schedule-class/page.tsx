import { getMyCoursesAsInstructor } from "@/lib/db";
import { ScheduleClient } from "./schedule-client";

export const dynamic = "force-dynamic";

export default async function ScheduleClassPage() {
  const courses = await getMyCoursesAsInstructor();
  return <ScheduleClient courses={courses.map((c) => ({ id: c.id, title: c.title }))} />;
}

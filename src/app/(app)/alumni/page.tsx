import { listAlumniStories, listAlumni, countAlumni } from "@/app/actions/alumni";
import { AlumniHubClient } from "./alumni-hub-client";

export const dynamic = "force-dynamic";

export default async function AlumniPage() {
  const [storiesRes, alumniRes, total] = await Promise.all([
    listAlumniStories(12),
    listAlumni(20),
    countAlumni(),
  ]);

  return (
    <AlumniHubClient
      stories={storiesRes.ok ? storiesRes.data! : []}
      alumni={alumniRes.ok ? alumniRes.data! : []}
      totalAlumni={total}
    />
  );
}

import { listAlumni } from "@/app/actions/alumni";
import { AlumniDirectoryClient } from "./alumni-directory-client";

export const dynamic = "force-dynamic";

export default async function AlumniDirectoryPage() {
  const res = await listAlumni(200);
  const alumni = res.ok ? res.data! : [];

  return <AlumniDirectoryClient alumni={alumni} />;
}

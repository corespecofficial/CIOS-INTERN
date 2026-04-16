import { getMySpaces, getMyEnrollments } from "@/app/actions/creative-spaces";
import { ManageSpacesClient } from "./manage-spaces-client";
export const dynamic = "force-dynamic";
export default async function ManageSpacesPage() {
  const [mySpaces, myEnrollments] = await Promise.all([getMySpaces(), getMyEnrollments()]);
  return (
    <ManageSpacesClient
      mySpaces={mySpaces.ok ? mySpaces.data! : []}
      myEnrollments={myEnrollments.ok ? myEnrollments.data! : []}
    />
  );
}

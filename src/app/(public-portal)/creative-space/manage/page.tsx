import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMySpaces, getMyEnrollments } from "@/app/actions/creative-spaces";
import { ManageSpacesClient } from "./manage-spaces-client";

export const dynamic = "force-dynamic";

export default async function ManageSpacesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/creative-space/manage");

  const [mySpaces, myEnrollments] = await Promise.all([getMySpaces(), getMyEnrollments()]);
  return (
    <ManageSpacesClient
      mySpaces={mySpaces.ok ? mySpaces.data! : []}
      myEnrollments={myEnrollments.ok ? myEnrollments.data! : []}
    />
  );
}

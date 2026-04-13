import { listUsers, listPendingInvitations } from "@/app/actions/users";
import { UserManagementClient } from "./user-management-client";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  const [usersRes, invitesRes] = await Promise.all([
    listUsers(),
    listPendingInvitations(),
  ]);

  if (!usersRes.ok) {
    return (
      <div style={{ padding: 24, color: "#EF5350" }}>
        Error loading users: {usersRes.error}
      </div>
    );
  }

  return (
    <UserManagementClient
      initialUsers={usersRes.users}
      initialInvitations={invitesRes.ok ? invitesRes.invitations : []}
    />
  );
}

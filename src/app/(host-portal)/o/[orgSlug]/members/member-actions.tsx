"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { removeMember, updateMemberRole } from "@/app/actions/org-portal";

type OrgMemberRole = "org_admin" | "instructor" | "student" | "moderator" | "finance" | "support" | "mentor";

const ROLE_OPTIONS: Array<{ value: OrgMemberRole; label: string }> = [
  { value: "org_admin", label: "Org admin" },
  { value: "instructor", label: "Instructor" },
  { value: "student", label: "Intern" },
  { value: "moderator", label: "Moderator" },
  { value: "finance", label: "Finance" },
  { value: "support", label: "Support" },
  { value: "mentor", label: "Mentor" },
];

interface Props {
  orgId: string;
  orgSlug: string;
  memberId: string;
  memberName: string;
  currentRole: string;
  canManage: boolean;
}

export function MemberActions({ orgId, orgSlug, memberId, memberName, currentRole, canManage }: Props) {
  const [role, setRole] = useState(currentRole);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!canManage || currentRole === "owner") return null;

  function changeRole(nextRole: OrgMemberRole) {
    setRole(nextRole);
    start(async () => {
      const r = await updateMemberRole(orgId, memberId, nextRole);
      if (!r.ok) {
        setRole(currentRole);
        toast.error(r.error);
        return;
      }
      toast.success(`${memberName} is now ${nextRole === "student" ? "an intern" : nextRole.replace("_", " ")}`);
      router.refresh();
    });
  }

  function remove() {
    const ok = window.confirm(`Remove ${memberName} from this organization?`);
    if (!ok) return;
    start(async () => {
      const r = await removeMember(orgId, memberId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`${memberName} removed`);
      router.push(`/o/${orgSlug}/members`);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => changeRole(e.target.value as OrgMemberRole)}
        aria-label={`Change role for ${memberName}`}
        style={{
          height: 30,
          padding: "0 8px",
          background: "#0A0E1A",
          border: "1px solid #1F2937",
          borderRadius: 6,
          color: "#C7CFD8",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        style={{
          height: 30,
          padding: "0 10px",
          background: "transparent",
          color: "#FF8A80",
          border: "1px solid rgba(255,138,128,0.35)",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 800,
          cursor: pending ? "not-allowed" : "pointer",
        }}
      >
        Remove
      </button>
    </div>
  );
}

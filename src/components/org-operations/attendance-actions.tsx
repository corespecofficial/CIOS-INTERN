"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIntoMeeting, signOutOfMeeting } from "@/app/actions/org-operations";

export function AttendanceActions({ orgSlug, meetingId }: { orgSlug: string; meetingId: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  const run = (kind: "in" | "out") => start(async () => {
    setMessage(""); const result = kind === "in" ? await signIntoMeeting(orgSlug, meetingId) : await signOutOfMeeting(orgSlug, meetingId);
    if (!result.ok) setMessage(result.error); else { setMessage(kind === "in" ? "Signed in. Participation still requires instructor confirmation." : "Signed out successfully."); router.refresh(); }
  });
  return <div style={{ marginTop: 10 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <button disabled={pending} onClick={() => run("in")} style={button("#1E88E5")}>{pending ? "Checking…" : "Sign in"}</button>
    <button disabled={pending} onClick={() => run("out")} style={button("#26A69A")}>Sign out</button>
  </div>{message && <p role="status" style={{ color: message.startsWith("Signed") ? "#66BB6A" : "#FF8A80", fontSize: 12 }}>{message}</p>}</div>;
}

function button(color: string): React.CSSProperties { return { padding: "9px 14px", borderRadius: 8, border: 0, background: color, color: "white", fontWeight: 700, cursor: "pointer" }; }

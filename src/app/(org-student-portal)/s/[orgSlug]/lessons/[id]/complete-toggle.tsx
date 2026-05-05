"use client";

/**
 * "Mark complete" toggle for the student lesson view. Calls the
 * markLessonComplete / unmarkLessonComplete server actions, optimistic
 * UI with toast on failure.
 */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { markLessonComplete, unmarkLessonComplete } from "@/app/actions/org-portal";

interface Props {
  orgId: string;
  lessonId: string;
  initialDone: boolean;
}

export function CompleteToggle({ orgId, lessonId, initialDone }: Props) {
  const [done, setDone] = useState(initialDone);
  const [pending, start] = useTransition();

  const toggle = () => {
    const next = !done;
    setDone(next); // optimistic
    start(async () => {
      const res = next
        ? await markLessonComplete(orgId, lessonId)
        : await unmarkLessonComplete(orgId, lessonId);
      if (!res.ok) {
        toast.error(res.error || "Failed to update");
        setDone(!next);
      }
    });
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: pending ? "not-allowed" : "pointer",
    opacity: pending ? 0.7 : 1,
    border: "1px solid",
    transition: "all 0.15s",
  };
  const doneStyle: React.CSSProperties = {
    ...baseStyle,
    background: "rgba(38,166,154,0.15)",
    color: "#26A69A",
    borderColor: "rgba(38,166,154,0.45)",
  };
  const todoStyle: React.CSSProperties = {
    ...baseStyle,
    background: "transparent",
    color: "#8892A4",
    borderColor: "rgba(255,255,255,0.12)",
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      style={done ? doneStyle : todoStyle}
      aria-pressed={done}
    >
      <span aria-hidden style={{ fontSize: 14 }}>{done ? "✓" : "○"}</span>
      {done ? "Completed" : "Mark complete"}
    </button>
  );
}

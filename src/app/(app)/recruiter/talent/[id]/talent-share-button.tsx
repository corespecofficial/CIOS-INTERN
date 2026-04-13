"use client";

import toast from "react-hot-toast";

export function TalentShareButton({ id, name }: { id: string; name: string }) {
  const onShare = async () => {
    const url = `${window.location.origin}/recruiter/talent/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} — verified CIOS talent`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied — share with your team");
      }
    } catch { /* user cancelled */ }
  };
  return (
    <button onClick={onShare} style={{ padding: "10px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#E8EDF5", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      🔗 Share
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClassSession } from "@/app/actions/classes";
import { formatCompulsoryClassSchedule } from "@/lib/class-schedule";

function toInputDT(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ScheduleClient({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState(toInputDT(defaultStart));
  const [duration, setDuration] = useState(60);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [maxAttendees, setMaxAttendees] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [isCompulsory, setIsCompulsory] = useState(true);

  async function submit() {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!when) { toast.error("Date & time required"); return; }
    setBusy(true);
    const r = await createClassSession({
      title, description,
      scheduledAt: new Date(when).toISOString(),
      durationMinutes: Number(duration) || 60,
      meetingUrl,
      courseId: courseId || null,
      maxAttendees: maxAttendees === "" ? null : Number(maxAttendees),
      isCompulsory,
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Class scheduled — students can now RSVP");
    router.push("/classroom");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 18 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          INSTRUCTOR · LIVE CLASS
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>Schedule a live class</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Students will see this under /classroom and can RSVP + join when you go live.</p>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(30,136,229,0.10)", color: "#B8D9FF", fontSize: 13 }}>
          Compulsory programme schedule: {formatCompulsoryClassSchedule()}
        </div>
        <Field label="Class title (required)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Live Q&A: Prompt Engineering Advanced" style={input} autoFocus />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will this class cover?" style={{ ...input, minHeight: 80, resize: "vertical" }} />
        </Field>
        <div style={grid2}>
          <Field label="Starts at (local time)">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={input} />
          </Field>
          <Field label="Duration (minutes)">
            <input type="number" min={15} max={300} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} style={input} />
          </Field>
        </div>
        <Field label="Meeting link (Zoom / Meet / LiveKit / any URL)">
          <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://zoom.us/j/... or https://meet.google.com/..." style={input} />
        </Field>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#E8EDF5", fontSize: 13 }}>
          <input type="checkbox" checked={isCompulsory} onChange={(e) => setIsCompulsory(e.target.checked)} />
          <span><strong>Compulsory class</strong><br /><span style={{ color: "#8892A4" }}>Opens attendance 15 minutes before class and records late arrival after 15 minutes. Absence still requires human review.</span></span>
        </label>
        <div style={grid2}>
          <Field label="Link to a course (optional)">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={input}>
              <option value="">— Standalone class —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Max attendees (optional)">
            <input type="number" min={1} value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="No limit" style={input} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={() => router.back()} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Scheduling…" : "📅 Schedule class"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 20px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

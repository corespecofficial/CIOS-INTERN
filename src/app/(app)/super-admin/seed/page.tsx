"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { seedDemoData, wipeDemoData, seedSampleCourse } from "@/app/actions/seed";

export default function SeedPage() {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  async function handleSeed() {
    if (!confirm("Seed demo tasks, courses, transactions and notifications for all intern/team_lead users?")) return;
    setBusy(true);
    const toastId = toast.loading("Seeding demo data…");
    const r = await seedDemoData();
    setBusy(false);
    if (!r.ok) {
      toast.error(`Failed: ${r.error}`, { id: toastId });
      setLastResult(`❌ ${r.error}`);
      return;
    }
    toast.success("Seed complete", { id: toastId });
    setLastResult(`✅ Seeded: ${r.stats?.tasks} tasks · ${r.stats?.transactions} transactions · ${r.stats?.notifications} notifications · ${r.stats?.courses} courses · ${r.stats?.enrollments} enrollments across ${r.stats?.users} users`);
  }

  async function handleSeedCourse() {
    if (!confirm("Create a playable sample course (video + quiz + assignment) attributed to you as instructor?")) return;
    setBusy(true);
    const toastId = toast.loading("Creating sample course…");
    const r = await seedSampleCourse();
    setBusy(false);
    if (!r.ok) {
      toast.error(`Failed: ${r.error}`, { id: toastId });
      setLastResult(`❌ ${r.error}`);
      return;
    }
    toast.success("Sample course created", { id: toastId });
    setLastResult(`✅ Sample course ready. Visit /courses to enroll and test it end-to-end.`);
  }

  async function handleWipe() {
    if (!confirm("⚠️ This will DELETE all tasks, transactions, notifications, courses, and enrollments. User accounts will be preserved. Continue?")) return;
    if (!confirm("Really wipe? Second confirmation.")) return;
    setBusy(true);
    const r = await wipeDemoData();
    setBusy(false);
    if (!r.ok) { toast.error(r.error || "Wipe failed"); return; }
    toast.success("Demo data wiped");
    setLastResult("🗑️ All demo data cleared.");
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", padding: 4 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(30,136,229,0.08))",
        border: "1px solid rgba(171,71,188,0.25)",
        borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#AB47BC", letterSpacing: 0.5, marginBottom: 6 }}>SUPER ADMIN · DEMO TOOLS</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 6px 0" }}>Data Seeder</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Populate Supabase with realistic demo content so dashboards, wallet, tasks and analytics all show real numbers.
          Seeds for every intern/team_lead user already signed up.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div style={card}>
          <h3 style={h3}>🎓 Seed Sample Course</h3>
          <p style={p}>
            One playable course attributed to you:<br />
            • 1 YouTube lesson (3 min)<br />
            • 1 quiz (3 questions, pass at 60%)<br />
            • 1 assignment with clear brief<br />
            • Published & ready to enroll
          </p>
          <button onClick={handleSeedCourse} disabled={busy} style={{ ...btn, background: "linear-gradient(135deg, #66BB6A, #2E7D32)" }}>
            {busy ? "Working…" : "🎓 Create Sample Course"}
          </button>
        </div>
        <div style={card}>
          <h3 style={h3}>✨ Seed Demo Data</h3>
          <p style={p}>
            Creates for each intern/team_lead:<br />
            • 7 tasks with varied priority/status/XP<br />
            • 5 transactions (stipends, fines, rewards)<br />
            • 3 notifications<br />
            • Enrollment in 2 courses<br />
            • Sets wallet balance, XP, streak, performance
          </p>
          <button onClick={handleSeed} disabled={busy} style={{ ...btn, background: "linear-gradient(135deg, #1E88E5, #AB47BC)" }}>
            {busy ? "Working…" : "🌱 Run Seed"}
          </button>
        </div>

        <div style={card}>
          <h3 style={h3}>🗑️ Wipe Demo Data</h3>
          <p style={p}>
            Deletes all tasks, transactions, notifications, courses and enrollments.
            User accounts are preserved. Use before a fresh seed.
          </p>
          <button onClick={handleWipe} disabled={busy} style={{ ...btn, background: "#EF5350" }}>
            {busy ? "Working…" : "Wipe All Demo Data"}
          </button>
        </div>
      </div>

      {lastResult && (
        <div style={{ marginTop: 16, padding: 14, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, fontSize: 13, color: "#E8EDF5" }}>
          {lastResult}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: 20,
};
const h3: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: "0 0 8px 0" };
const p: React.CSSProperties = { fontSize: 12, color: "#8892A4", margin: "0 0 16px 0", lineHeight: 1.7 };
const btn: React.CSSProperties = {
  color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%",
};

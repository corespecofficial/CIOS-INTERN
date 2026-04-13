"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { resolveIncidentAction } from "@/app/actions/audit";

interface Incident { id: string; kind: string; summary: string; severity: string; ip_address: string | null; actor_name: string | null; metadata: Record<string, unknown>; status: string; created_at: string }
interface Critical { id: string; summary: string; action_code: string | null; category: string; created_at: string; actor_name: string | null; ip_address: string | null }
interface Stats { lastHour: number; last24h: number; criticals24h: number; failures24h: number; openIncidents: number }

const SEVERITY_COLOR: Record<string, string> = { info: "#8892A4", notice: "#1E88E5", warning: "#FFC107", critical: "#EF5350" };

export function SecurityCenterClient({ incidents, criticals, stats }: { incidents: Incident[]; criticals: Critical[]; stats: Stats }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tick, setTick] = useState(0);

  // Live refresh every 15s
  useEffect(() => {
    const i = setInterval(() => { setTick((t) => t + 1); router.refresh(); }, 15000);
    return () => clearInterval(i);
  }, [router]);

  const onResolve = (id: string) => start(async () => {
    const res = await resolveIncidentAction(id);
    if (res.ok) { toast.success("Incident resolved"); router.refresh(); }
    else toast.error(res.error);
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(239,83,80,0.15)", color: "#EF5350", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>SECURITY CENTER · LIVE</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🚨 Real-time threat feed</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Auto-refresh every 15s · Last tick #{tick}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        <Stat label="Events / hour"     value={stats.lastHour}       color="#1E88E5" />
        <Stat label="Events / 24h"      value={stats.last24h}         color="#AB47BC" />
        <Stat label="Critical (24h)"    value={stats.criticals24h}    color="#EF5350" />
        <Stat label="Failures (24h)"    value={stats.failures24h}     color="#FFC107" />
        <Stat label="Open incidents"    value={stats.openIncidents}   color="#FF7043" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <section style={panel}>
          <h2 style={sectionHeader}>🔥 Open incidents ({incidents.length})</h2>
          {incidents.length === 0 && <Empty text="No open incidents. System is healthy." />}
          {incidents.map((i) => (
            <div key={i.id} style={{ padding: 12, background: "#0A0E1A", border: `1px solid ${SEVERITY_COLOR[i.severity] || "#8892A4"}33`, borderRadius: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: `${SEVERITY_COLOR[i.severity] || "#8892A4"}22`, color: SEVERITY_COLOR[i.severity] || "#8892A4", textTransform: "uppercase" }}>{i.severity}</span>
                    <span style={{ fontSize: 10, color: "#8892A4", fontFamily: "monospace" }}>{i.kind}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{i.summary}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>
                    {new Date(i.created_at).toLocaleString()}{i.ip_address ? ` · IP ${i.ip_address}` : ""}{i.actor_name ? ` · by ${i.actor_name}` : ""}
                  </div>
                </div>
                <button onClick={() => onResolve(i.id)} disabled={pending} style={btnSmall}>Resolve</button>
              </div>
            </div>
          ))}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>⚠️ Critical events (latest 30)</h2>
          {criticals.length === 0 && <Empty text="No critical events in the window." />}
          {criticals.map((c) => (
            <Link key={c.id} href={`/admin/audit-logs/${c.id}`} style={{ display: "block", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.summary}</div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>
                {new Date(c.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {c.action_code} {c.ip_address && `· ${c.ip_address}`}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value.toLocaleString()}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) { return <div style={{ color: "#8892A4", fontSize: 12, padding: 10 }}>{text}</div>; }

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
const btnSmall: React.CSSProperties = { padding: "6px 12px", fontSize: 10, fontWeight: 700, background: "#66BB6A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" };

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { reviewSpace } from "@/app/actions/creative-spaces";
import { type CreativeSpace } from "@/app/actions/creative-spaces-types";

const GOLD = "#FFC107";
const GOLD_DIM = "rgba(255,193,7,0.12)";
const GOLD_BORDER = "rgba(255,193,7,0.25)";
const GREEN = "#26A69A";
const GREEN_DIM = "rgba(38,166,154,0.12)";
const GREEN_BORDER = "rgba(38,166,154,0.30)";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFC107",
  approved: "#66BB6A",
  rejected: "#EF5350",
  suspended: "#8892A4",
};

const FORMAT_LABEL: Record<string, string> = {
  live: "🔴 Live cohort",
  recorded: "📼 Self-paced (recorded)",
  hybrid: "🎬 Hybrid",
};

export function AdminCreativeSpacesClient({
  pendingSpaces: initialPending,
  allSpaces: initialAll,
}: {
  pendingSpaces: CreativeSpace[];
  allSpaces: CreativeSpace[];
}) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [pending, setPending] = useState(initialPending);
  const [all, setAll] = useState(initialAll);
  const [recentlyApproved, setRecentlyApproved] = useState<CreativeSpace | null>(null);

  const approvedCount = initialAll.filter((s) => s.status === "approved").length;
  const orgCount = initialAll.filter((s) => s.org_id).length;

  const handleReview = async (spaceId: string, decision: "approved" | "rejected", reason?: string) => {
    const res = await reviewSpace(spaceId, decision, reason);
    if (!res.ok) { toast.error(res.error); return; }

    if (decision === "approved") {
      // The server-side reviewSpace also calls provisionOrgFromSpace —
      // pull a refreshed view via revalidate by toasting and surfacing a
      // success banner. The page will refetch on next nav; for now we
      // optimistically flip status + clear from pending list.
      const space = pending.find((s) => s.id === spaceId);
      if (space) setRecentlyApproved({ ...space, status: "approved" });
      toast.success("✓ Space approved — organization provisioned.");
    } else {
      toast.success("Space rejected.");
    }
    setPending((prev) => prev.filter((s) => s.id !== spaceId));
    setAll((prev) =>
      prev.map((s) => (s.id === spaceId ? { ...s, status: decision } : s))
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 0.5 }}>SUPER-ADMIN PANEL</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "4px 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
          🏫 Creative Space applications
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.5 }}>
          Each approval spawns a per-host organization at <code style={{ color: "#E8EDF5", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>/o/&lt;slug&gt;</code> with its own portal,
          channels, lessons, and members. Reject sends the applicant a notification.
        </p>
      </div>

      {/* Approved-just-now banner */}
      {recentlyApproved && (
        <ApprovedBanner space={recentlyApproved} onDismiss={() => setRecentlyApproved(null)} />
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Pending review" value={pending.length} color={GOLD} />
        <StatCard label="Approved" value={approvedCount} color="#66BB6A" />
        <StatCard label="Active orgs" value={orgCount} color={GREEN} sub="provisioned" />
        <StatCard label="Total spaces" value={initialAll.length} color="#42A5F5" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: tab === t ? GOLD : "#8892A4",
              borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
            }}
          >
            {t === "pending" ? `Pending review (${pending.length})` : `All spaces (${all.length})`}
          </button>
        ))}
      </div>

      {/* Pending tab */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
              No spaces pending review. 🎉
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pending.map((s) => <PendingSpaceCard key={s.id} space={s} onReview={handleReview} />)}
            </div>
          )}
        </div>
      )}

      {/* All tab */}
      {tab === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {all.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
              No spaces yet.
            </div>
          ) : (
            all.map((s) => <SpaceRow key={s.id} space={s} />)
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── Approved-just-now banner ───────────── */

function ApprovedBanner({ space, onDismiss }: { space: CreativeSpace; onDismiss: () => void }) {
  return (
    <div style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BORDER}`, borderRadius: 14, padding: 18, marginBottom: 18, display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>✅</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: GREEN, fontWeight: 800, marginBottom: 4 }}>
          Organization created
        </div>
        <div style={{ fontSize: 13, color: "#E8EDF5", marginBottom: 6 }}>
          <strong>{space.title}</strong> is approved. The owner ({space.owner_name || "—"}) has been promoted to
          <span style={{ padding: "1px 6px", margin: "0 4px", background: "rgba(30,136,229,0.18)", color: "#1E88E5", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>creative_host</span>
          and a new tenant portal is live.
        </div>
        {space.org_slug ? (
          <div style={{ fontSize: 12, color: "#8892A4" }}>
            Portal: <Link href={`/o/${space.org_slug}`} style={{ color: GREEN, textDecoration: "none", fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>/o/{space.org_slug}</Link>
            {" · "}<Link href={`/super-admin/orgs?q=${encodeURIComponent(space.title)}`} style={{ color: "#8892A4" }}>View in super-admin</Link>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#FFA726" }}>
            ⚠ Provisioning in progress — refresh in a moment to see the org link.
          </div>
        )}
      </div>
      <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }} aria-label="Dismiss">×</button>
    </div>
  );
}

/* ───────────── Stat card ───────────── */

function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}{sub && <span style={{ marginLeft: 6, color: "#5A6478", textTransform: "none", fontWeight: 500 }}>· {sub}</span>}
      </div>
    </div>
  );
}

/* ───────────── Pending card with full details ───────────── */

function PendingSpaceCard({ space: s, onReview }: { space: CreativeSpace; onReview: (id: string, decision: "approved" | "rejected", reason?: string) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const approve = () => start(() => onReview(s.id, "approved"));
  const reject = () => {
    // Prompt for a reason — passed straight into the in-app
    // notification the applicant receives. Empty / cancelled = abort
    // (avoid silent rejections). Cancelling the prompt returns null.
    const reason = window.prompt(
      `Reject "${s.title}"? Optional reviewer note (sent to the applicant):`,
      "",
    );
    if (reason === null) return;
    start(() => onReview(s.id, "rejected", reason || undefined));
  };

  return (
    <article style={{ background: "#111827", border: "1px solid rgba(255,193,7,0.20)", borderRadius: 14, overflow: "hidden" }}>
      {/* Cover */}
      {s.cover_image_url ? (
        <div style={{ height: 180, position: "relative", overflow: "hidden", background: "#0A0E1A" }}>
          <img src={s.cover_image_url} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(17,24,39,0.85))" }} />
          <div style={{ position: "absolute", left: 18, bottom: 14, right: 18, display: "flex", gap: 8 }}>
            <Tag>{s.category}</Tag>
            <Tag>{FORMAT_LABEL[s.format] || s.format}</Tag>
            {s.is_featured && <Tag color="#FFA726">⭐ Featured</Tag>}
          </div>
        </div>
      ) : (
        <div style={{ height: 60, background: "linear-gradient(135deg, #1E2937, #0F1626)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <Tag>{s.category}</Tag>
          <Tag>{FORMAT_LABEL[s.format] || s.format}</Tag>
        </div>
      )}

      <div style={{ padding: 20 }}>
        {/* Title + owner */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
          {s.title}
        </h2>
        <OwnerLine space={s} />

        {/* Description */}
        <p style={{ fontSize: 13, color: "#C7CFD8", margin: "12px 0 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {expanded || s.description.length <= 280 ? s.description : `${s.description.slice(0, 280)}…`}
        </p>
        {s.description.length > 280 && (
          <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 6, background: "transparent", border: "none", color: "#1E88E5", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            {expanded ? "Show less" : "Read full description"}
          </button>
        )}

        {/* Quick facts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 16 }}>
          <Fact label="Price">{s.price_per_student === 0 ? "Free" : `₦${Number(s.price_per_student).toLocaleString()}`}</Fact>
          <Fact label="Capacity">{s.capacity} learners</Fact>
          <Fact label="Duration">{s.duration_weeks ? `${s.duration_weeks} wk${s.duration_weeks === 1 ? "" : "s"}` : "—"}</Fact>
          <Fact label="Schedule">{s.schedule || "—"}</Fact>
        </div>

        {/* Tags */}
        {s.tags && s.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {s.tags.map((t) => (
              <span key={t} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(255,255,255,0.06)", color: "#8892A4", borderRadius: 999, fontWeight: 600 }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Outcomes */}
        {s.outcomes && s.outcomes.length > 0 && (
          <Section title="What learners will achieve">
            <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#C7CFD8", fontSize: 13, lineHeight: 1.7 }}>
              {s.outcomes.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </Section>
        )}

        {/* Syllabus */}
        {s.syllabus && s.syllabus.length > 0 && (
          <Section title="Syllabus">
            <ol style={{ margin: 0, padding: "0 0 0 18px", color: "#C7CFD8", fontSize: 13, lineHeight: 1.6 }}>
              {s.syllabus.map((sec, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong style={{ color: "#E8EDF5" }}>{sec.title}</strong>
                  {sec.lessons && sec.lessons.length > 0 && (
                    <ul style={{ margin: "4px 0 0", padding: "0 0 0 14px", color: "#8892A4", fontSize: 12 }}>
                      {sec.lessons.map((l, j) => <li key={j}>{l}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Intro video */}
        {s.intro_video_url && (
          <Section title="Intro video">
            <a href={s.intro_video_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "8px 14px", background: "#26A69A", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              🎬 Open video ↗
            </a>
          </Section>
        )}

        {/* Org-creation note */}
        <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(38,166,154,0.08)", border: "1px dashed rgba(38,166,154,0.30)", borderRadius: 8, fontSize: 12, color: "#26A69A", lineHeight: 1.5 }}>
          <strong>On approve:</strong> a new organization will be created at <code style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4, color: "#E8EDF5", fontSize: 11 }}>/o/{s.slug || "<slug>"}</code>.
          The owner will be promoted to <strong>creative_host</strong>, default channels seeded, and existing public-marketplace enrollees auto-added as students.
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={approve} disabled={pending} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #26A69A, #00897B)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
            {pending ? "Provisioning…" : "✓ Approve & create org"}
          </button>
          <button onClick={reject} disabled={pending} style={{ padding: "10px 20px", background: "transparent", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.4)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
            Reject
          </button>
          <Link href={`/creative-space/${s.slug || s.id}`} target="_blank" style={{ padding: "10px 16px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Preview public listing ↗
          </Link>
          <Link href={`/creative-space/instructor/${s.owner_id}`} target="_blank" style={{ padding: "10px 16px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            View instructor profile ↗
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ───────────── Compact "all spaces" row ───────────── */

function SpaceRow({ space: s }: { space: CreativeSpace }) {
  const statusColor = STATUS_COLORS[s.status] || "#8892A4";
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{s.title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: `${statusColor}22`, color: statusColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {s.status}
          </span>
          {s.org_slug && (
            <Link href={`/o/${s.org_slug}`} target="_blank" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(38,166,154,0.15)", color: GREEN, fontFamily: "ui-monospace, monospace", textDecoration: "none", fontWeight: 700 }}>
              /o/{s.org_slug}
            </Link>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#5A6478", marginTop: 4 }}>
          {s.owner_name || "—"} · {s.category} · {s.format}
          {s.org_member_count != null && <> · {s.org_member_count} member{s.org_member_count === 1 ? "" : "s"}</>}
          {" · "}{new Date(s.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", whiteSpace: "nowrap" }}>
        {s.enrollment_count}/{s.capacity}
      </div>
    </div>
  );
}

/* ───────────── Small UI helpers ───────────── */

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 10, padding: "4px 10px", background: color ? `${color}22` : "rgba(255,255,255,0.10)", color: color || "#E8EDF5", borderRadius: 999, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}

function OwnerLine({ space: s }: { space: CreativeSpace }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#8892A4", overflow: "hidden", flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.owner_avatar ? <img src={s.owner_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (s.owner_name?.[0]?.toUpperCase() ?? "?")}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 700 }}>{s.owner_name || "Unknown"}</div>
        <div style={{ fontSize: 11, color: "#5A6478" }}>
          {s.owner_role} · L{s.owner_level} · {s.owner_xp.toLocaleString()} XP
          {s.owner_percentile != null && <> · top {s.owner_percentile}%</>}
        </div>
      </div>
    </div>
  );
}

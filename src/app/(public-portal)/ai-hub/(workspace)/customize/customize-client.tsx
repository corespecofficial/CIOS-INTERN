"use client";

import { useState } from "react";
import Link from "next/link";
import { ACCENT } from "../_components/workspace-shell";

type Section = "home" | "skills" | "connectors";

export function CustomizeClient() {
  const [section, setSection] = useState<Section>("home");

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 0 }}>
      {/* Secondary nav */}
      <nav
        style={{
          borderRight: "1px solid var(--ws-border, #EAE7DF)",
          padding: "18px 14px",
          background: "var(--ws-sidebar, #FBFAF6)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px 14px" }}>
          <button
            onClick={() => setSection("home")}
            aria-label="Back to Customize home"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 16,
              color: "var(--ws-text, #1F2430)",
              padding: 4,
            }}
          >
            ←
          </button>
          <div style={{ fontWeight: 900, fontSize: 16, color: "var(--ws-text, #1F2430)" }}>Customize</div>
        </div>
        <SubNav emoji="📜" label="Skills"     active={section === "skills"}     onClick={() => setSection("skills")} />
        <SubNav emoji="🔗" label="Connectors" active={section === "connectors"} onClick={() => setSection("connectors")} />
      </nav>

      {/* Main */}
      <div style={{ overflow: "auto", padding: "48px 40px" }}>
        {section === "home" && <Home onGo={setSection} />}
        {section === "skills" && <SkillsView />}
        {section === "connectors" && <ConnectorsView />}
      </div>
    </div>
  );
}

function Home({ onGo }: { onGo: (s: Section) => void }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
      <div
        style={{
          width: 120,
          height: 120,
          margin: "0 auto 24px",
          borderRadius: 24,
          background: "var(--ws-sidebar, #F7F6F3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
        }}
      >
        🧰
      </div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>
        Customize CIOS
      </h1>
      <p style={{ color: "var(--ws-text-muted, #55524A)", fontSize: 15, lineHeight: 1.55, marginTop: 10 }}>
        Skills, connectors, and plugins shape how CIOS works with you.
      </p>

      <div style={{ marginTop: 32, display: "grid", gap: 12, textAlign: "left" }}>
        <TileLink
          emoji="🔗"
          title="Connect your apps"
          blurb="Let CIOS read and write to the tools you already use."
          onClick={() => onGo("connectors")}
        />
        <TileLink
          emoji="📜"
          title="Create new skills"
          blurb="Teach CIOS your processes, team norms, and expertise."
          onClick={() => onGo("skills")}
        />
      </div>

      <div
        style={{
          marginTop: 28,
          padding: "14px 16px",
          background: "var(--ws-chip, #F2F1ED)",
          borderRadius: 12,
          fontSize: 13,
          color: "var(--ws-text-muted, #55524A)",
          lineHeight: 1.55,
          textAlign: "left",
        }}
      >
        <strong>Admins:</strong> configure global connectors & skills in{" "}
        <Link href="/super-admin/ai-settings" style={{ color: ACCENT, fontWeight: 700 }}>
          Super Admin → AI Settings
        </Link>
        .
      </div>
    </div>
  );
}

function SkillsView() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <SectionHeader title="Skills" subtitle="Teach CIOS your processes, team norms, and expertise." />
      <div style={{ display: "grid", gap: 10 }}>
        <ListRow emoji="🎯" title="Interview coach" blurb="Track-specific mock interviews"  status="Active" />
        <ListRow emoji="📝" title="Cover letter"     blurb="Tailored to a job posting"       status="Active" />
        <ListRow emoji="📊" title="Pitch coach"      blurb="10-slide investor deck coaching" status="Pro+" />
        <ListRow emoji="🎓" title="SOP writer"       blurb="Scholarship / grad-school SOP"   status="Pro+" />
        <ListRow emoji="➕" title="Create new skill" blurb="Upload a document and turn it into a skill" status="Coming soon" />
      </div>
    </div>
  );
}

function ConnectorsView() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <SectionHeader title="Connectors" subtitle="Let CIOS read from the tools you already use." />
      <div style={{ display: "grid", gap: 10 }}>
        <ListRow emoji="🔗" title="Google Drive"    blurb="Read from your Drive files"        status="Coming soon" />
        <ListRow emoji="📅" title="Google Calendar" blurb="Pull schedule context into answers" status="Coming soon" />
        <ListRow emoji="✉️" title="Gmail"           blurb="Summarise & draft emails"          status="Coming soon" />
        <ListRow emoji="🐙" title="GitHub"          blurb="Chat with your repos"               status="Coming soon" />
        <ListRow emoji="📝" title="Notion"          blurb="Search your Notion workspace"       status="Coming soon" />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "var(--ws-text, #1F2430)", letterSpacing: -0.3 }}>{title}</h1>
      <p style={{ color: "var(--ws-text-muted, #55524A)", fontSize: 14, marginTop: 6 }}>{subtitle}</p>
    </div>
  );
}

function SubNav({ emoji, label, active, onClick }: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "none",
        borderRadius: 10,
        background: active ? "var(--ws-chip-hover, #EDEAE0)" : "transparent",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        color: active ? "var(--ws-text, #1F2430)" : "var(--ws-text-muted, #55524A)",
        fontWeight: active ? 800 : 700,
        fontSize: 13,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--ws-chip-hover, #EFECE4)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function TileLink({
  emoji,
  title,
  blurb,
  onClick,
}: {
  emoji: string;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 20px",
        borderRadius: 16,
        border: "1px solid var(--ws-border, #EAE7DF)",
        background: "var(--ws-canvas, #fff)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: "var(--ws-sidebar, #F7F6F3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flex: "0 0 auto",
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ws-text, #1F2430)" }}>{title}</div>
        <div style={{ color: "var(--ws-text-faint, #8F8B80)", fontSize: 13, marginTop: 2 }}>{blurb}</div>
      </div>
      <div style={{ fontSize: 16, color: "var(--ws-text-faint, #8F8B80)" }}>→</div>
    </button>
  );
}

function ListRow({ emoji, title, blurb, status }: { emoji: string; title: string; blurb: string; status: string }) {
  const statusColor =
    status === "Active" ? "#2E7D32" : status === "Pro+" ? ACCENT : "#8F8B80";
  const statusBg =
    status === "Active" ? "#E8F5E9" : status === "Pro+" ? `${ACCENT}1A` : "#F2F1ED";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid var(--ws-border, #EAE7DF)",
        background: "var(--ws-canvas, #fff)",
      }}
    >
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ws-text, #1F2430)" }}>{title}</div>
        <div style={{ color: "var(--ws-text-faint, #8F8B80)", fontSize: 13 }}>{blurb}</div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: statusColor,
          background: statusBg,
          padding: "4px 10px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </div>
    </div>
  );
}

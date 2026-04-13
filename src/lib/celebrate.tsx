"use client";

import toast from "react-hot-toast";
import type { ReactNode } from "react";
import { rankFromLevel } from "@/lib/gamification-shared";

interface AwardSummary {
  awarded?: number;
  leveledUp?: boolean;
  newLevel?: number;
  newBadges?: Array<{ id?: string; name: string; description?: string; icon_url?: string }> | unknown[];
  reason?: string;
}

/** Shows celebratory toasts for an award result and fires confetti on level-up or badge unlock. */
export function celebrateAward(result: AwardSummary | null | undefined) {
  if (!result || result.reason && result.reason !== "ok") return;
  if ((result.awarded ?? 0) > 0) {
    toast.custom((t) => <XPToast visible={t.visible} xp={result.awarded!} />, { duration: 2200 });
  }
  if (result.leveledUp && result.newLevel) {
    setTimeout(() => {
      const rank = rankFromLevel(result.newLevel!);
      toast.custom((t) => <LevelUpToast visible={t.visible} level={result.newLevel!} rankLabel={`${rank.emoji} ${rank.title}`} color={rank.color} />, { duration: 4500 });
      fireConfetti();
    }, 400);
  }
  const badges = (result.newBadges || []) as Array<{ name: string; description?: string; icon_url?: string }>;
  badges.forEach((b, i) => {
    setTimeout(() => {
      toast.custom((t) => <BadgeToast visible={t.visible} name={b.name} description={b.description} icon={b.icon_url} />, { duration: 4500 });
      fireConfetti();
    }, 800 + i * 600);
  });
}

function XPToast({ visible, xp }: { visible: boolean; xp: number }) {
  return (
    <Shell visible={visible} border="#1E88E5" bg="linear-gradient(135deg, rgba(30,136,229,0.95), rgba(21,101,192,0.95))">
      <div style={{ fontSize: 20 }}>{xp > 0 ? "⚡" : "⚠️"}</div>
      <div>
        <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1 }}>{xp > 0 ? "XP EARNED" : "XP DEDUCTED"}</div>
        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{xp > 0 ? "+" : ""}{xp} XP</div>
      </div>
    </Shell>
  );
}

function LevelUpToast({ visible, level, rankLabel, color }: { visible: boolean; level: number; rankLabel: string; color: string }) {
  return (
    <Shell visible={visible} border={color} bg={`linear-gradient(135deg, ${color}DD, ${color}99)`}>
      <div style={{ fontSize: 28 }}>🎉</div>
      <div>
        <div style={{ fontSize: 11, opacity: 0.9, letterSpacing: 1.5, fontWeight: 700 }}>LEVEL UP!</div>
        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Level {level} · {rankLabel}</div>
      </div>
    </Shell>
  );
}

function BadgeToast({ visible, name, description, icon }: { visible: boolean; name: string; description?: string; icon?: string }) {
  return (
    <Shell visible={visible} border="#FFC107" bg="linear-gradient(135deg, rgba(255,193,7,0.95), rgba(255,112,67,0.95))">
      <div style={{ fontSize: 30 }}>{icon || "🏆"}</div>
      <div>
        <div style={{ fontSize: 11, opacity: 0.95, letterSpacing: 1.5, fontWeight: 700, color: "#1A1A1A" }}>BADGE UNLOCKED</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A" }}>{name}</div>
        {description && <div style={{ fontSize: 11, color: "#2A2A2A", marginTop: 2 }}>{description}</div>}
      </div>
    </Shell>
  );
}

function Shell({ visible, border, bg, children }: { visible: boolean; border: string; bg: string; children: ReactNode }) {
  return (
    <div style={{
      transform: visible ? "translateY(0)" : "translateY(-24px)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.35s cubic-bezier(.2,.8,.2,1), opacity 0.25s",
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 18px", borderRadius: 14,
      background: bg, border: `1px solid ${border}`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      color: "#fff", minWidth: 260, maxWidth: 360,
      fontFamily: "'Nunito', sans-serif",
    }}>
      {children}
    </div>
  );
}

/** Lightweight confetti — no extra dependencies. Renders ~80 colored divs that fall. */
export function fireConfetti(count = 80) {
  if (typeof window === "undefined") return;
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);
  const colors = ["#1E88E5", "#AB47BC", "#FFC107", "#66BB6A", "#FF7043", "#26C6DA", "#EF5350"];
  for (let i = 0; i < count; i++) {
    const d = document.createElement("div");
    const size = 6 + Math.random() * 8;
    const startX = Math.random() * 100;
    const duration = 1400 + Math.random() * 1800;
    const delay = Math.random() * 200;
    const drift = (Math.random() - 0.5) * 300;
    const rot = Math.random() * 720;
    d.style.cssText = `
      position:absolute;top:-20px;left:${startX}%;
      width:${size}px;height:${size * 0.4}px;
      background:${colors[i % colors.length]};
      border-radius:2px;
      transform:rotate(${Math.random() * 360}deg);
      animation:ciosConfetti ${duration}ms ${delay}ms cubic-bezier(.15,.7,.3,1) forwards;
      --drift:${drift}px;--rot:${rot}deg;
    `;
    container.appendChild(d);
  }
  if (!document.getElementById("cios-confetti-keyframes")) {
    const s = document.createElement("style");
    s.id = "cios-confetti-keyframes";
    s.textContent = `@keyframes ciosConfetti {
      to { transform: translate(var(--drift), 110vh) rotate(var(--rot)); opacity: 0; }
    }`;
    document.head.appendChild(s);
  }
  setTimeout(() => container.remove(), 3500);
}

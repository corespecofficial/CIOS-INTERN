"use client";

import { useEffect, useRef, useState } from "react";

/**
 * First-run coachmark tour. Runs once per user (localStorage flag) and walks
 * a new intern through the five screens they'll use daily. Each step picks
 * its target element by CSS selector; if the target is missing (e.g. the
 * element hasn't rendered yet, or a role-restricted nav item is hidden) we
 * skip that step instead of getting stuck.
 */

const STORAGE_KEY = "cios-onboarding-done";

interface Step {
  selector: string;   // element to spotlight
  title: string;
  body: string;
  placement?: "right" | "bottom" | "top" | "left";
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="sidebar"], nav[aria-label="Primary"], aside',
    title: "👋 Welcome to CIOS",
    body: "This is your home base. The sidebar carries every part of the internship — classroom, tasks, community, AI hub, and your wallet. Everything is one click away.",
    placement: "right",
  },
  {
    selector: 'a[href="/tasks"], a[href^="/tasks"]',
    title: "✅ Your tasks live here",
    body: "Each assignment tells you what's due, how much XP it's worth, and how to submit. Complete them on time to keep your streak and climb the leaderboard.",
    placement: "right",
  },
  {
    selector: 'a[href="/community"], a[href^="/community"]',
    title: "💬 Ask, share, grow",
    body: "The community is where interns, admins, and instructors hang out. Post a win, ask a question, join a group, react and vote. Don't learn alone.",
    placement: "right",
  },
  {
    selector: 'a[href="/ai-hub"], a[href^="/ai-hub"]',
    title: "✨ AI Hub",
    body: "Your personal AI workbench — practice prompts, get feedback, generate drafts, and level up your skills. Use it daily.",
    placement: "right",
  },
  {
    selector: 'a[href="/wallet"], a[href^="/wallet"]',
    title: "💰 Your Wallet",
    body: "Every task you complete earns XP and cash rewards. Track your earnings, redeem them, and see your payout history here. You've got this.",
    placement: "right",
  },
];

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  // Start once (first mount after localStorage check).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch { return; }
    // Delay so the page has rendered and refs exist.
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Locate and measure the current step's target element.
  useEffect(() => {
    if (!active) return;
    const step = STEPS[idx];
    if (!step) { finish(); return; }

    const find = () => {
      const selectors = step.selector.split(",").map((s) => s.trim());
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) return el;
      }
      return null;
    };

    const measure = () => {
      const el = find();
      if (!el) {
        // Target not in DOM (role-hidden or responsive). Skip ahead.
        setIdx((i) => i + 1);
        return;
      }
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      targetRef.current = el;
      setRect(el.getBoundingClientRect());
    };

    measure();
    const onResize = () => { if (targetRef.current) setRect(targetRef.current.getBoundingClientRect()); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { capture: true });
    // Re-measure after a short tick to let mobile layouts settle.
    const t = setTimeout(onResize, 250);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, { capture: true });
      clearTimeout(t);
    };
  }, [active, idx]);

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setActive(false);
  }

  if (!active) return null;
  const step = STEPS[idx];
  if (!step) { finish(); return null; }

  // Popover placement math
  let popTop = 20, popLeft = 20;
  const POPOVER_W = 320;
  if (rect) {
    const place = step.placement || "right";
    if (place === "right") { popTop = rect.top; popLeft = rect.right + 14; }
    else if (place === "bottom") { popTop = rect.bottom + 14; popLeft = rect.left; }
    else if (place === "top") { popTop = rect.top - 14 - 160; popLeft = rect.left; }
    else { popTop = rect.top; popLeft = rect.left - POPOVER_W - 14; }
    // Viewport clamp
    popLeft = Math.max(10, Math.min(popLeft, window.innerWidth - POPOVER_W - 10));
    popTop = Math.max(10, Math.min(popTop, window.innerHeight - 200));
    // On mobile widths, always anchor the popover to the bottom for readability.
    if (window.innerWidth < 720) {
      popLeft = Math.max(10, (window.innerWidth - POPOVER_W) / 2);
      popTop = window.innerHeight - 240;
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}>
      {/* Four-quadrant dim mask that leaves the target cut out with a soft ring */}
      {rect ? (
        <>
          <div style={{ ...maskBase, top: 0, left: 0, right: 0, height: rect.top - 6, pointerEvents: "auto" }} onClick={(e) => e.preventDefault()} />
          <div style={{ ...maskBase, top: rect.bottom + 6, left: 0, right: 0, bottom: 0, pointerEvents: "auto" }} />
          <div style={{ ...maskBase, top: rect.top - 6, left: 0, width: rect.left - 6, height: rect.height + 12, pointerEvents: "auto" }} />
          <div style={{ ...maskBase, top: rect.top - 6, left: rect.right + 6, right: 0, height: rect.height + 12, pointerEvents: "auto" }} />
          {/* Spotlight ring */}
          <div style={{
            position: "fixed", top: rect.top - 6, left: rect.left - 6,
            width: rect.width + 12, height: rect.height + 12,
            borderRadius: 12, border: "2px solid #FFC107",
            boxShadow: "0 0 0 3px rgba(255,193,7,0.2), 0 0 40px rgba(255,193,7,0.35)",
            pointerEvents: "none",
            transition: "all 0.25s ease",
          }} />
        </>
      ) : (
        <div style={{ ...maskBase, inset: 0, pointerEvents: "auto" }} />
      )}

      {/* Popover */}
      <div style={{
        position: "fixed", top: popTop, left: popLeft, width: POPOVER_W,
        background: "#0F1524", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 14,
        padding: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", pointerEvents: "auto",
        color: "#E8EDF5", fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#FFC107", letterSpacing: 1, textTransform: "uppercase" }}>
            Step {idx + 1} of {STEPS.length}
          </span>
          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${((idx + 1) / STEPS.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#1E88E5,#FFC107)", transition: "width 0.3s" }} />
          </div>
        </div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{step.title}</h3>
        <p style={{ margin: "6px 0 12px", fontSize: 13, lineHeight: 1.55, color: "#B0BEC5" }}>{step.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={finish} style={skipBtn}>Skip tour</button>
          <div style={{ display: "flex", gap: 6 }}>
            {idx > 0 && (
              <button onClick={() => setIdx((i) => i - 1)} style={backBtn}>Back</button>
            )}
            <button
              onClick={() => { if (idx === STEPS.length - 1) finish(); else setIdx((i) => i + 1); }}
              style={nextBtn}
            >
              {idx === STEPS.length - 1 ? "Got it" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const maskBase: React.CSSProperties = { position: "fixed", background: "rgba(5,8,15,0.72)", backdropFilter: "blur(1px)", transition: "all 0.2s ease" };
const skipBtn: React.CSSProperties = { background: "transparent", border: "none", color: "#8892A4", fontSize: 11, cursor: "pointer", fontWeight: 700 };
const backBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#E8EDF5", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const nextBtn: React.CSSProperties = { background: "linear-gradient(135deg,#1E88E5,#1565C0)", border: "none", color: "#fff", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" };

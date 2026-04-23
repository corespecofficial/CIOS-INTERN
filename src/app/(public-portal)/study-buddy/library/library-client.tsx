"use client";

/* Offline Library — Phase 3. Shows saved study packs that were bundled via
 * getOfflinePack() on the server and saved to localStorage. The user can
 * re-open any pack and work through it offline (flashcards, quiz, explain,
 * story, podcast script) without network. Chat modes are gated offline. */

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  listOfflineBundles,
  loadOfflineBundle,
  deleteOfflineBundle,
  formatBytes,
  type OfflineIndexEntry,
} from "@/lib/study-buddy/offline";

const CIOS_LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface PackShape {
  savedAt: string;
  session: { id: string; topic: string; language: string; map?: { overview?: string; concepts?: Array<{ id: string; title: string }> } };
  chunks: Array<{ kind: string; text: string }>;
  mastery: Array<{ conceptId: string; lastScore: number }>;
  modeRuns: Array<{ concept_id: string; mode: string; output: unknown }>;
}

export function LibraryClient() {
  const [entries, setEntries] = useState<OfflineIndexEntry[]>([]);
  const [selected, setSelected] = useState<PackShape | null>(null);

  useEffect(() => { setEntries(listOfflineBundles()); }, []);

  const open = (id: string) => {
    const pack = loadOfflineBundle<PackShape>(id);
    if (!pack) { toast.error("Pack is corrupted — delete and re-save"); return; }
    setSelected(pack);
  };

  const remove = (id: string) => {
    if (!confirm("Remove this offline pack? You can always re-save it when online.")) return;
    deleteOfflineBundle(id);
    setEntries(listOfflineBundles());
    if (selected?.session.id === id) setSelected(null);
  };

  return (
    <div data-workspace="study-buddy-library" style={{
      minHeight: "100vh",
      background: "var(--ws-canvas, #fff)",
      color: "var(--ws-text, #0F172A)",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid var(--ws-border, #EEF2FF)",
        background: "var(--ws-canvas, #fff)",
      }}>
        <Link href="/study-buddy" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src={CIOS_LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--ws-text, #1F2430)" }}>Offline Library</div>
            <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)" }}>Study without a connection</div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle compact />
          <Link href="/study-buddy" style={{
            padding: "8px 16px",
            background: "var(--ws-chip, #F1F5F9)",
            color: "var(--ws-text, #1F2430)",
            borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>← Study Buddy</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 20 }}>
        {/* Sidebar — list of packs */}
        <aside>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ws-text-faint, #64748B)", letterSpacing: 0.5, marginBottom: 10 }}>
            SAVED PACKS · {entries.length} / 3
          </div>
          {entries.length === 0 ? (
            <div style={{
              padding: 18, borderRadius: 14,
              background: "var(--ws-chip, #F8FAFC)",
              border: "1px dashed var(--ws-border, #E2E8F0)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>📦</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>No offline packs yet</div>
              <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 4, lineHeight: 1.5 }}>
                Finish a study session and tap <strong>Save for offline</strong> to cache it here.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {entries.map((e) => (
                <div key={e.sessionId} style={{
                  padding: 12, borderRadius: 12,
                  background: selected?.session.id === e.sessionId ? "#60A5FA14" : "var(--ws-chip, #F8FAFC)",
                  border: `1px solid ${selected?.session.id === e.sessionId ? "#60A5FA" : "var(--ws-border, #E2E8F0)"}`,
                  cursor: "pointer",
                }}
                  onClick={() => open(e.sessionId)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ws-text, #0F172A)" }}>{e.topic}</div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); remove(e.sessionId); }}
                      aria-label="Delete pack"
                      style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "var(--ws-text-faint, #64748B)", fontSize: 14, padding: 2, lineHeight: 1,
                      }}>×</button>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", marginTop: 4 }}>
                    {formatSaved(e.savedAt)} · {formatBytes(e.bytes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main pane — pack viewer */}
        <main>
          {selected ? <PackViewer pack={selected} /> : (
            <div style={{
              padding: 40, borderRadius: 20,
              background: "var(--ws-chip, #F8FAFC)",
              border: "1px dashed var(--ws-border, #E2E8F0)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>
                {entries.length > 0 ? "Pick a pack to review" : "Your offline shelf is empty"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--ws-text-faint, #64748B)", marginTop: 8, maxWidth: 440, marginInline: "auto", lineHeight: 1.55 }}>
                Offline packs let you review flashcards, read stories and podcast scripts, and listen via your browser&apos;s speech engine — all without data.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PackViewer({ pack }: { pack: PackShape }) {
  const map = pack.session.map;
  const concepts = map?.concepts || [];
  const masteryById = new Map(pack.mastery.map((m) => [m.conceptId, m.lastScore]));
  const runsByConcept = new Map<string, Map<string, unknown>>();
  for (const r of pack.modeRuns) {
    const inner = runsByConcept.get(r.concept_id) || new Map();
    inner.set(r.mode, r.output);
    runsByConcept.set(r.concept_id, inner);
  }

  return (
    <div>
      <div style={{
        padding: 20, borderRadius: 18,
        background: "var(--ws-chip, #F8FAFC)",
        border: "1px solid var(--ws-border, #E2E8F0)",
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#3B82F6", letterSpacing: 0.4 }}>STUDY PACK</div>
        <h2 style={{ margin: "4px 0 8px", fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>
          {pack.session.topic}
        </h2>
        {map?.overview && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ws-text-muted, #475569)", lineHeight: 1.55 }}>{map.overview}</p>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--ws-text-faint, #64748B)" }}>
          Saved {formatSaved(pack.savedAt)} · {concepts.length} concepts · {pack.modeRuns.length} cached lesson{pack.modeRuns.length === 1 ? "" : "s"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {concepts.map((c) => {
          const runs = runsByConcept.get(c.id);
          const score = masteryById.get(c.id) ?? 0;
          return (
            <div key={c.id} style={{
              padding: 14, borderRadius: 14,
              background: "var(--ws-canvas, #fff)",
              border: "1px solid var(--ws-border, #E2E8F0)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  minWidth: 28, height: 28, borderRadius: 14,
                  background: score >= 80 ? "#10B98122" : score >= 50 ? "#F59E0B22" : "#EF444422",
                  color:      score >= 80 ? "#065F46"    : score >= 50 ? "#92400E"    : "#991B1B",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                }}>{score}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ws-text, #0F172A)" }}>{c.title}</div>
              </div>
              {runs && runs.size > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Array.from(runs.keys()).map((m) => (
                    <span key={m} style={{
                      fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
                      background: "var(--ws-chip, #F8FAFC)",
                      border: "1px solid var(--ws-border, #E2E8F0)",
                      color: "var(--ws-text-muted, #475569)",
                    }}>
                      ✓ {m}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)" }}>
                  No cached lessons for this concept — generate one online then re-save.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatSaved(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

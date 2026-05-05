"use client";

/**
 * Drag-to-reorder lesson list for hosts. Uses native HTML5 drag-and-drop
 * — no extra dependency. Limitations of HTML5 dnd that we accept:
 *   - No touch support out of the box. Mobile fallback is the up/down
 *     arrow buttons next to each row.
 *   - Drag preview is the browser default. Good enough for a flat list.
 *
 * Optimistic update: we reorder locally on drop, then call
 * reorderLessons(). On failure we revert and toast.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { reorderLessons } from "@/app/actions/org-portal";

export interface LessonRow {
  id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  position: number;
}

interface Props {
  orgId: string;
  orgSlug: string;
  initial: LessonRow[];
}

export function LessonListDraggable({ orgId, orgSlug, initial }: Props) {
  const [items, setItems] = useState<LessonRow[]>(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const persist = (next: LessonRow[]) => {
    const prev = items;
    setItems(next);
    start(async () => {
      const res = await reorderLessons(orgId, next.map((l) => l.id));
      if (!res.ok) {
        toast.error(res.error || "Failed to reorder");
        setItems(prev);
      }
    });
  };

  const moveBy = (id: string, delta: number) => {
    const idx = items.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [row] = next.splice(idx, 1);
    next.splice(target, 0, row);
    persist(next);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    try { e.dataTransfer.effectAllowed = "move"; } catch { /* */ }
  };
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== overId) setOverId(id);
  };
  const onDrop = (e: React.DragEvent, dropOnId: string) => {
    e.preventDefault();
    setOverId(null);
    if (!draggingId || draggingId === dropOnId) { setDraggingId(null); return; }
    const fromIdx = items.findIndex((l) => l.id === draggingId);
    const toIdx = items.findIndex((l) => l.id === dropOnId);
    if (fromIdx < 0 || toIdx < 0) { setDraggingId(null); return; }
    const next = items.slice();
    const [row] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, row);
    setDraggingId(null);
    persist(next);
  };
  const onDragEnd = () => {
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, opacity: pending ? 0.7 : 1 }}>
      {items.map((l, i) => {
        const isDragging = l.id === draggingId;
        const isOver = l.id === overId && !isDragging;
        return (
          <div
            key={l.id}
            draggable
            onDragStart={(e) => onDragStart(e, l.id)}
            onDragOver={(e) => onDragOver(e, l.id)}
            onDrop={(e) => onDrop(e, l.id)}
            onDragEnd={onDragEnd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "#111827",
              border: `1px solid ${isOver ? "#26A69A" : "#1F2937"}`,
              borderRadius: 10,
              opacity: isDragging ? 0.4 : 1,
              transition: "border-color 0.1s ease, opacity 0.1s ease",
            }}
          >
            <span
              title="Drag to reorder"
              style={{
                cursor: "grab",
                color: "#5A6478",
                fontSize: 16,
                userSelect: "none",
                padding: "0 4px",
              }}
            >⋮⋮</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#5A6478", fontWeight: 700, flexShrink: 0 }}>
              {i + 1}
            </div>
            <Link
              href={`/o/${orgSlug}/lessons/${l.id}`}
              style={{ flex: 1, textDecoration: "none", color: "#E8EDF5", minWidth: 0 }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>{l.title}</div>
              {l.body && <div style={{ fontSize: 12, color: "#5A6478", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.body.slice(0, 80)}</div>}
            </Link>
            {l.video_url && <span style={{ fontSize: 11, color: "#26A69A" }}>🎬</span>}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                type="button"
                onClick={() => moveBy(l.id, -1)}
                disabled={i === 0 || pending}
                aria-label="Move up"
                style={iconBtn(i === 0 || pending)}
              >▲</button>
              <button
                type="button"
                onClick={() => moveBy(l.id, +1)}
                disabled={i === items.length - 1 || pending}
                aria-label="Move down"
                style={iconBtn(i === items.length - 1 || pending)}
              >▼</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid #1F2937",
    borderRadius: 4,
    color: disabled ? "#2A3140" : "#8892A4",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 9,
    width: 22,
    height: 16,
    padding: 0,
    lineHeight: 1,
  };
}

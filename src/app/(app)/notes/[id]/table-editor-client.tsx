"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { saveNote, type DbNote } from "@/app/actions/notes";
import { ShareNoteModal } from "@/components/notes/share-modal";
import { EditorShell, SyncBadge, useAutoSave, useBackHandler } from "./editor-shell";
import { evalCell, formatValue, colName } from "@/lib/spreadsheet-formula";

/* ────────────────────────────────────────────────────────────
   DATA MODEL
   ──────────────────────────────────────────────────────────── */

type Align = "left" | "center" | "right";
type NumFmt = "general" | "0" | "0.00" | "%" | "0.00%" | "$" | "₦" | "date";

interface CellFormat {
  bold?: boolean; italic?: boolean; underline?: boolean;
  color?: string; bg?: string;
  align?: Align;
  numFmt?: NumFmt;
}

interface Sheet {
  name: string;
  rows: string[][];           // raw values (including formulas starting with "=")
  formats?: Record<string, CellFormat>;  // key = "r:c"
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  freezeRows?: number;
  freezeCols?: number;
}

interface Doc { sheets: Sheet[]; }

function parseDoc(html: string): Doc {
  try {
    const j = JSON.parse(html || "{}");
    if (Array.isArray(j.sheets)) {
      // Backwards-compat: each sheet may be { name, rows } only
      return { sheets: j.sheets.map((s: Sheet) => ({ ...s, rows: s.rows || [] })) };
    }
  } catch {}
  return {
    sheets: [
      { name: "Sheet1", rows: makeEmpty(30, 12) },
      { name: "Sheet2", rows: makeEmpty(30, 12) },
      { name: "Sheet3", rows: makeEmpty(30, 12) },
    ],
  };
}
function makeEmpty(r: number, c: number): string[][] {
  return Array(r).fill(null).map(() => Array(c).fill(""));
}

interface Selection { r1: number; c1: number; r2: number; c2: number; }
const norm = (s: Selection): Selection => ({
  r1: Math.min(s.r1, s.r2), c1: Math.min(s.c1, s.c2),
  r2: Math.max(s.r1, s.r2), c2: Math.max(s.c1, s.c2),
});
const cellKey = (r: number, c: number) => `${r}:${c}`;

/* ────────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────────── */

type ToolTab = "format" | "insert" | "data" | "view";

export function TableEditorClient({ initialNote }: { initialNote: DbNote }) {
  const back = useBackHandler();
  const [title, setTitle] = useState(initialNote.title || "Spreadsheet.xlsx");
  const [doc, setDoc] = useState<Doc>(() => parseDoc(initialNote.html));
  const [active, setActive] = useState(0);
  const [sel, setSel] = useState<Selection>({ r1: 0, c1: 0, r2: 0, c2: 0 });
  const [editing, setEditing] = useState<{ r: number; c: number; value: string } | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [history, setHistory] = useState<Doc[]>([]);
  const [redoStack, setRedoStack] = useState<Doc[]>([]);
  const cellRef = useRef<HTMLInputElement>(null);
  const formulaRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  // Native browser fullscreen — toggles real fullscreen on the html element.
  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullScreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setFullScreen(true);
      }
    } catch (e) {
      toast.error((e as Error).message || "Couldn't toggle full screen");
    }
  };
  useEffect(() => {
    const onFsChange = () => setFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const sheet = doc.sheets[active];
  const selN = norm(sel);

  const { sync, schedule } = useAutoSave({
    saver: async () => {
      const r = await saveNote({ id: initialNote.id, title, html: JSON.stringify(doc) });
      return !!r.ok;
    },
  });

  const pushHistory = () => { setHistory((h) => [...h.slice(-29), structuredClone(doc)]); setRedoStack([]); };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) { toast("Nothing to undo"); return; }
    setRedoStack((r) => [doc, ...r].slice(0, 30));
    setDoc(last); setHistory((h) => h.slice(0, -1)); schedule();
  };
  const redo = () => {
    const next = redoStack[0]; if (!next) { toast("Nothing to redo"); return; }
    setHistory((h) => [...h, doc]); setDoc(next); setRedoStack((r) => r.slice(1)); schedule();
  };

  /* ── cell mutations ── */
  const setCell = (r: number, c: number, v: string) => {
    setDoc((d) => ({
      ...d, sheets: d.sheets.map((s, i) => {
        if (i !== active) return s;
        const rows = s.rows.map((row) => [...row]);
        while (rows.length <= r) rows.push(Array(rows[0]?.length || 12).fill(""));
        rows.forEach((row) => { while (row.length <= c) row.push(""); });
        rows[r][c] = v;
        return { ...s, rows };
      }),
    }));
    schedule();
  };
  const setRange = (range: Selection, fn: (r: number, c: number, cur: string) => string) => {
    pushHistory();
    setDoc((d) => ({
      ...d, sheets: d.sheets.map((s, i) => {
        if (i !== active) return s;
        const rows = s.rows.map((row) => [...row]);
        for (let r = range.r1; r <= range.r2; r++) {
          for (let c = range.c1; c <= range.c2; c++) {
            while (rows.length <= r) rows.push(Array(rows[0]?.length || 12).fill(""));
            while (rows[r].length <= c) rows[r].push("");
            rows[r][c] = fn(r, c, rows[r][c]);
          }
        }
        return { ...s, rows };
      }),
    }));
    schedule();
  };
  const updateFormatRange = (range: Selection, patch: CellFormat) => {
    pushHistory();
    setDoc((d) => ({
      ...d, sheets: d.sheets.map((s, i) => {
        if (i !== active) return s;
        const formats = { ...(s.formats || {}) };
        for (let r = range.r1; r <= range.r2; r++) {
          for (let c = range.c1; c <= range.c2; c++) {
            const k = cellKey(r, c);
            formats[k] = { ...(formats[k] || {}), ...patch };
          }
        }
        return { ...s, formats };
      }),
    }));
    schedule();
  };

  /* ── structure ── */
  const insertRow = (at: number) => { pushHistory(); setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => i === active ? { ...s, rows: [...s.rows.slice(0, at), Array(s.rows[0]?.length || 12).fill(""), ...s.rows.slice(at)] } : s) })); schedule(); };
  const deleteRow = (at: number) => { pushHistory(); setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => i === active ? { ...s, rows: s.rows.filter((_, r) => r !== at) } : s) })); schedule(); };
  const insertCol = (at: number) => { pushHistory(); setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => i === active ? { ...s, rows: s.rows.map((row) => [...row.slice(0, at), "", ...row.slice(at)]) } : s) })); schedule(); };
  const deleteCol = (at: number) => { pushHistory(); setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => i === active ? { ...s, rows: s.rows.map((row) => row.filter((_, c) => c !== at)) } : s) })); schedule(); };
  const addSheet = () => { pushHistory(); setDoc((d) => ({ ...d, sheets: [...d.sheets, { name: `Sheet${d.sheets.length + 1}`, rows: makeEmpty(30, 12) }] })); setActive(doc.sheets.length); schedule(); };
  const renameSheet = (i: number) => { const n = prompt("Sheet name:", doc.sheets[i].name); if (!n?.trim()) return; pushHistory(); setDoc((d) => ({ ...d, sheets: d.sheets.map((s, idx) => idx === i ? { ...s, name: n.trim() } : s) })); schedule(); };
  const deleteSheet = (i: number) => { if (doc.sheets.length <= 1) { toast.error("Need at least one sheet"); return; } if (!confirm(`Delete ${doc.sheets[i].name}?`)) return; pushHistory(); setDoc((d) => ({ ...d, sheets: d.sheets.filter((_, idx) => idx !== i) })); setActive(Math.max(0, i - 1)); schedule(); };

  /* ── selection ── */
  const startEdit = (r: number, c: number) => {
    setSel({ r1: r, c1: c, r2: r, c2: c });
    setEditing({ r, c, value: sheet.rows[r]?.[c] ?? "" });
  };
  const commitEdit = (advance: "down" | "right" | "none" = "none") => {
    if (!editing) return;
    setCell(editing.r, editing.c, editing.value);
    setEditing(null);
    if (advance === "down") setSel({ r1: editing.r + 1, c1: editing.c, r2: editing.r + 1, c2: editing.c });
    if (advance === "right") setSel({ r1: editing.r, c1: editing.c + 1, r2: editing.r, c2: editing.c + 1 });
  };

  /* ── display value resolver (applies formula + format) ── */
  const get = useMemo(() => {
    return (col: number, row: number): string | number | boolean => {
      const v = sheet.rows[row]?.[col] ?? "";
      const out = evalCell(v, get);
      return out as string | number;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const displayCell = (r: number, c: number): string => {
    const raw = sheet.rows[r]?.[c] ?? "";
    const fmt = sheet.formats?.[cellKey(r, c)]?.numFmt;
    if (raw === "" || raw == null) return "";
    if (typeof raw === "string" && raw.startsWith("=")) {
      const out = evalCell(raw, get);
      if (typeof out === "number") return formatValue(out, fmt);
      return String(out);
    }
    const n = Number(raw);
    if (isFinite(n) && raw !== "" && fmt && fmt !== "general") return formatValue(n, fmt);
    return String(raw);
  };

  /* ── keyboard ── */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === "Enter") { e.preventDefault(); commitEdit("down"); }
        if (e.key === "Tab") { e.preventDefault(); commitEdit("right"); }
        if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z") { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === "y" || (e.key === "Z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === "f") { e.preventDefault(); setFindOpen(true); return; }
      if (e.key === "F2" || e.key === "Enter") { e.preventDefault(); startEdit(sel.r1, sel.c1); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setRange(selN, () => ""); return; }
      const nudge = (dr: number, dc: number) => { e.preventDefault(); const r = Math.max(0, sel.r1 + dr); const c = Math.max(0, sel.c1 + dc); setSel(e.shiftKey ? { ...sel, r2: r, c2: c } : { r1: r, c1: c, r2: r, c2: c }); };
      if (e.key === "ArrowUp")    return nudge(-1, 0);
      if (e.key === "ArrowDown")  return nudge(1, 0);
      if (e.key === "ArrowLeft")  return nudge(0, -1);
      if (e.key === "ArrowRight") return nudge(0, 1);
      if (e.key === "Home") { e.preventDefault(); setSel({ r1: 0, c1: 0, r2: 0, c2: 0 }); }
      // If alphanumeric, start typing a new value in selected cell
      if (e.key.length === 1 && !ctrl && !e.altKey) startEdit(sel.r1, sel.c1);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [editing, sel, selN]);  // eslint-disable-line react-hooks/exhaustive-deps

  const numRows = Math.max(sheet.rows.length, 30);
  const numCols = Math.max(sheet.rows[0]?.length || 0, 12);
  const colWidth = (c: number) => sheet.colWidths?.[c] || 96;
  const rowHeight = (r: number) => sheet.rowHeights?.[r] || 28;
  const isInSel = (r: number, c: number) => r >= selN.r1 && r <= selN.r2 && c >= selN.c1 && c <= selN.c2;
  const cellFmt = (r: number, c: number): CellFormat => sheet.formats?.[cellKey(r, c)] || {};
  const selStr = `${colName(selN.c1)}${selN.r1 + 1}` + (selN.r1 !== selN.r2 || selN.c1 !== selN.c2 ? `:${colName(selN.c2)}${selN.r2 + 1}` : "");

  return (
    <>
      <EditorShell
      accent="#107C41"
      topBar={<>
        <button onClick={back} style={iconBtn}>‹</button>
        <button onClick={undo} title="Undo (Ctrl+Z)" style={iconBtn}>↶</button>
        <button onClick={redo} title="Redo (Ctrl+Y)" style={iconBtn}>↷</button>
        <input value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} style={titleInput} />
        <button onClick={() => setShareOpen(true)} style={iconBtn} aria-label="Share / collaborate">👥</button>
        <SyncBadge status={sync} />
      </>}
      content={
        <div style={{ background: "#fff", color: "#111", minHeight: "100%", display: "flex", flexDirection: "column" }}>
          {/* Formula bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: "1px solid #ddd", background: "#FAFBFC", position: "sticky", top: 0, zIndex: 6 }}>
            <div style={{ minWidth: 60, padding: "4px 8px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, fontWeight: 700, color: "#107C41", textAlign: "center" }}>{selStr}</div>
            <span style={{ fontSize: 14, color: "#888", fontStyle: "italic" }}>fx</span>
            <input
              ref={formulaRef}
              value={editing ? editing.value : (sheet.rows[selN.r1]?.[selN.c1] ?? "")}
              onChange={(e) => {
                if (editing) setEditing({ ...editing, value: e.target.value });
                else { startEdit(selN.r1, selN.c1); setEditing({ r: selN.r1, c: selN.c1, value: e.target.value }); }
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { commitEdit("down"); cellRef.current?.focus(); } if (e.key === "Escape") setEditing(null); }}
              placeholder="Type a value or formula like =SUM(A1:A5)"
              style={{ flex: 1, border: "1px solid #ddd", borderRadius: 4, padding: "5px 10px", fontSize: 13, outline: "none", fontFamily: "ui-monospace, monospace" }}
            />
          </div>

          {/* Format strip */}
          <FormatStrip
            fmt={cellFmt(selN.r1, selN.c1)}
            onPatch={(p) => updateFormatRange(selN, p)}
            onTab={(t) => setTab(t)}
          />

          {/* Sheet tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 8px", borderBottom: "1px solid #E0E0E0", background: "#F4F6FA", overflowX: "auto" }}>
            {doc.sheets.map((s, i) => (
              <button key={i} onClick={() => { setActive(i); setSel({ r1: 0, c1: 0, r2: 0, c2: 0 }); }} onDoubleClick={() => renameSheet(i)} onContextMenu={(e) => { e.preventDefault(); deleteSheet(i); }}
                style={{ padding: "6px 12px", background: active === i ? "#fff" : "transparent", color: active === i ? "#107C41" : "#555", border: "none", borderBottom: active === i ? "2px solid #107C41" : "2px solid transparent", cursor: "pointer", fontSize: 12, fontWeight: active === i ? 800 : 600, whiteSpace: "nowrap" }}>
                {s.name}
              </button>
            ))}
            <button onClick={addSheet} title="Add sheet" style={{ padding: "6px 10px", background: "transparent", color: "#107C41", border: "none", fontSize: 16, cursor: "pointer" }}>+</button>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflow: "auto", padding: 0 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, fontFamily: "Arial, sans-serif", width: "max-content" }}
              onMouseUp={() => { dragging.current = false; }}>
              <thead>
                <tr>
                  <th style={{ ...colHeader, minWidth: 36, width: 36 }}>
                    <button onClick={() => setSel({ r1: 0, c1: 0, r2: numRows - 1, c2: numCols - 1 })} title="Select all"
                      style={{ width: 24, height: 18, border: "none", background: "#E8E8E8", cursor: "pointer" }} />
                  </th>
                  {Array(numCols).fill(0).map((_, c) => (
                    <th key={c} style={{ ...colHeader, minWidth: colWidth(c), width: colWidth(c) }}
                      onClick={() => setSel({ r1: 0, c1: c, r2: numRows - 1, c2: c })}
                      onContextMenu={(e) => { e.preventDefault(); const a = confirm(`Insert column before ${colName(c)}? OK = insert, Cancel = delete column`); if (a) insertCol(c); else deleteCol(c); }}>
                      {colName(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array(numRows).fill(0).map((_, r) => {
                  const rowFrozen = (sheet.freezeRows || 0) > 0 && r < (sheet.freezeRows || 0);
                  return (
                  <tr key={r}>
                    <th style={{ ...rowHeader, height: rowHeight(r), top: rowFrozen ? 28 + r * 28 : undefined, zIndex: rowFrozen ? 4 : 2 }}
                      onClick={() => setSel({ r1: r, c1: 0, r2: r, c2: numCols - 1 })}
                      onContextMenu={(e) => { e.preventDefault(); const a = confirm(`Insert row before ${r + 1}? OK = insert, Cancel = delete row`); if (a) insertRow(r); else deleteRow(r); }}>
                      {r + 1}
                    </th>
                    {Array(numCols).fill(0).map((_, c) => {
                      const f = cellFmt(r, c);
                      const inSel = isInSel(r, c);
                      const isAnchor = r === selN.r1 && c === selN.c1;
                      const display = displayCell(r, c);
                      const colFrozen = (sheet.freezeCols || 0) > 0 && c < (sheet.freezeCols || 0);
                      // Compute sticky offsets so frozen rows/columns stay pinned
                      // while the rest of the grid scrolls under/around them.
                      const stickyTop = rowFrozen ? 28 + r * 28 : undefined;          // 28px ≈ col header height
                      const stickyLeft = colFrozen ? 36 + c * 96 : undefined;         // 36px row header + sum prev col widths
                      const isFrozen = rowFrozen || colFrozen;
                      return (
                        <td key={c} style={{
                          ...cellTd,
                          minWidth: colWidth(c), width: colWidth(c),
                          background: f.bg || (rowFrozen || colFrozen ? "#FAFBFC" : (inSel ? (isAnchor ? "rgba(16,124,65,0.08)" : "rgba(16,124,65,0.05)") : "#fff")),
                          color: f.color || "#111",
                          fontWeight: f.bold ? 700 : (rowFrozen ? 700 : 400),
                          fontStyle: f.italic ? "italic" : "normal",
                          textDecoration: f.underline ? "underline" : "none",
                          textAlign: f.align || (typeof Number(display) === "number" && isFinite(Number(display)) && display !== "" ? "right" : "left"),
                          outline: isAnchor ? "2px solid #107C41" : "none", outlineOffset: -1,
                          position: isFrozen ? "sticky" : undefined,
                          top: stickyTop, left: stickyLeft,
                          zIndex: rowFrozen && colFrozen ? 4 : isFrozen ? 3 : undefined,
                          boxShadow: rowFrozen && r === (sheet.freezeRows || 0) - 1 ? "0 1px 0 #107C41" : colFrozen && c === (sheet.freezeCols || 0) - 1 ? "1px 0 0 #107C41" : undefined,
                        }}
                        onPointerDown={(e) => { dragging.current = true; setSel({ r1: r, c1: c, r2: r, c2: c }); e.stopPropagation(); }}
                        onPointerMove={() => { if (dragging.current) setSel((s) => ({ ...s, r2: r, c2: c })); }}
                        onDoubleClick={() => startEdit(r, c)}>
                          {editing && editing.r === r && editing.c === c ? (
                            <input
                              ref={cellRef}
                              autoFocus
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onBlur={() => commitEdit()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); commitEdit("down"); }
                                if (e.key === "Tab") { e.preventDefault(); commitEdit("right"); }
                                if (e.key === "Escape") { e.preventDefault(); setEditing(null); }
                              }}
                              style={{ width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", padding: "4px 6px", fontFamily: "inherit", fontSize: "inherit", textAlign: f.align || "left" }}
                            />
                          ) : (
                            <span title={display.length > 12 ? display : undefined}>{display}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Find bar */}
          {findOpen && <FindBar sheet={sheet} onJump={(r, c) => { setSel({ r1: r, c1: c, r2: r, c2: c }); }} onReplace={(find, repl, all) => {
            pushHistory();
            setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => {
              if (i !== active) return s;
              const rows = s.rows.map((row) => row.map((cell) => {
                if (typeof cell !== "string") return cell;
                if (all) return cell.split(find).join(repl);
                return cell === find ? repl : cell;
              }));
              return { ...s, rows };
            }) }));
            schedule();
          }} onClose={() => setFindOpen(false)} />}
        </div>
      }
      bottomBar={
        <div style={{ display: "flex", justifyContent: "space-around", padding: "6px 10px max(6px, env(safe-area-inset-bottom))" }}>
          <ToolBtn icon="⌨" label="Keyboard" onClick={() => cellRef.current?.focus()} />
          <ToolBtn icon="⛶" label={fullScreen ? "Exit FS" : "Full Screen"} onClick={toggleFullScreen} />
          <ToolBtn icon="⌕" label="Find" onClick={() => setFindOpen(true)} />
          <ToolBtn icon="⊞" label="Tools" onClick={() => setTab("format")} />
        </div>
      }
      />
      {tab && (
        <ToolsTabsSheet
          tab={tab} onTab={setTab} onClose={() => setTab(null)}
          fmt={cellFmt(selN.r1, selN.c1)}
          onPatch={(p) => updateFormatRange(selN, p)}
          onInsertRow={(at) => insertRow(at)}
          onInsertCol={(at) => insertCol(at)}
          onDeleteRow={(at) => deleteRow(at)}
          onDeleteCol={(at) => deleteCol(at)}
          onClearRange={() => setRange(selN, () => "")}
          onFreeze={(rows, cols) => {
            setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => i === active ? { ...s, freezeRows: rows, freezeCols: cols } : s) }));
            schedule();
            if (rows === 0 && cols === 0) toast.success("Unfrozen");
            else toast.success(`Frozen — first ${rows ? "row" : ""}${rows && cols ? " + " : ""}${cols ? "column" : ""}`);
            setTab(null);
          }}
          onSort={(asc) => {
            pushHistory();
            setDoc((d) => ({ ...d, sheets: d.sheets.map((s, i) => {
              if (i !== active) return s;
              const headerRow = s.rows[0];
              const body = s.rows.slice(1);
              body.sort((a, b) => {
                const av = a[selN.c1] ?? ""; const bv = b[selN.c1] ?? "";
                const an = Number(av); const bn = Number(bv);
                if (isFinite(an) && isFinite(bn)) return asc ? an - bn : bn - an;
                return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
              });
              return { ...s, rows: [headerRow, ...body] };
            }) }));
            schedule();
          }}
          selR={selN.r1} selC={selN.c1}
          fullScreen={fullScreen} setFullScreen={() => toggleFullScreen()}
        />
      )}

      {shareOpen && (
        <ShareNoteModal noteId={initialNote.id} noteTitle={title} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   FORMAT STRIP — sticky toolbar above the grid
   ════════════════════════════════════════════════════════════ */

function FormatStrip({ fmt, onPatch, onTab }: { fmt: CellFormat; onPatch: (p: CellFormat) => void; onTab: (t: ToolTab) => void }) {
  const colors = ["#000", "#EF5350", "#FF6F00", "#FFC107", "#43A047", "#1E88E5", "#AB47BC", "#fff"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderBottom: "1px solid #ddd", background: "#FAFBFC", overflowX: "auto" }}>
      <ChipBtn active={!!fmt.bold} onClick={() => onPatch({ bold: !fmt.bold })} style={{ fontWeight: 900 }}>B</ChipBtn>
      <ChipBtn active={!!fmt.italic} onClick={() => onPatch({ italic: !fmt.italic })} style={{ fontStyle: "italic" }}>I</ChipBtn>
      <ChipBtn active={!!fmt.underline} onClick={() => onPatch({ underline: !fmt.underline })} style={{ textDecoration: "underline" }}>U</ChipBtn>
      <Sep />
      {(["left", "center", "right"] as Align[]).map((a) => (
        <ChipBtn key={a} active={fmt.align === a} onClick={() => onPatch({ align: a })}>{a === "left" ? "⇤" : a === "center" ? "≡" : "⇥"}</ChipBtn>
      ))}
      <Sep />
      <select value={fmt.numFmt || "general"} onChange={(e) => onPatch({ numFmt: e.target.value as NumFmt })} style={{ fontSize: 11, border: "1px solid #ddd", borderRadius: 4, padding: "3px 6px", background: "#fff" }}>
        <option value="general">General</option>
        <option value="0">Number (0)</option>
        <option value="0.00">Number (0.00)</option>
        <option value="%">Percent</option>
        <option value="0.00%">Percent (2dp)</option>
        <option value="$">USD ($)</option>
        <option value="₦">NGN (₦)</option>
        <option value="date">Date</option>
      </select>
      <Sep />
      <span title="Text colour" style={{ fontSize: 10, color: "#666" }}>A</span>
      {colors.map((c) => (
        <button key={`f${c}`} onClick={() => onPatch({ color: c })} title={`Text ${c}`}
          style={{ width: 16, height: 16, borderRadius: 3, background: c, border: fmt.color === c ? "2px solid #107C41" : "1px solid #ccc", cursor: "pointer" }} />
      ))}
      <Sep />
      <span title="Fill" style={{ fontSize: 10, color: "#666" }}>▣</span>
      {colors.map((c) => (
        <button key={`b${c}`} onClick={() => onPatch({ bg: c })} title={`Fill ${c}`}
          style={{ width: 16, height: 16, borderRadius: 3, background: c, border: fmt.bg === c ? "2px solid #107C41" : "1px solid #ccc", cursor: "pointer" }} />
      ))}
      <button onClick={() => onPatch({ bg: "" })} title="Clear fill" style={{ fontSize: 10, padding: "2px 6px", background: "#fff", border: "1px solid #ddd", borderRadius: 3, cursor: "pointer", color: "#666" }}>×</button>
      <Sep />
      <button onClick={() => onTab("insert")} style={{ fontSize: 11, padding: "4px 10px", background: "#107C41", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}>＋ Insert</button>
      <button onClick={() => onTab("data")} style={{ fontSize: 11, padding: "4px 10px", background: "#fff", color: "#107C41", border: "1px solid #107C41", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}>↕ Data</button>
    </div>
  );
}
function ChipBtn({ active, onClick, children, style }: { active: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      width: 26, height: 26, borderRadius: 4, border: "none", cursor: "pointer",
      background: active ? "#D5E8D6" : "#fff", color: "#111",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, ...style,
    }}>{children}</button>
  );
}
function Sep() { return <span style={{ width: 1, height: 18, background: "#ddd", margin: "0 4px" }} />; }
function ToolBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#B0BEC5", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 6px", minWidth: 52, borderRadius: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 700 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   FIND & REPLACE BAR
   ════════════════════════════════════════════════════════════ */

function FindBar({ sheet, onJump, onReplace, onClose }: {
  sheet: Sheet;
  onJump: (r: number, c: number) => void;
  onReplace: (find: string, repl: string, all: boolean) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [repl, setRepl] = useState("");
  const matches = useMemo(() => {
    if (!q) return [] as Array<{ r: number; c: number }>;
    const out: Array<{ r: number; c: number }> = [];
    sheet.rows.forEach((row, r) => row.forEach((cell, c) => { if (typeof cell === "string" && cell.toLowerCase().includes(q.toLowerCase())) out.push({ r, c }); }));
    return out;
  }, [sheet.rows, q]);
  const [idx, setIdx] = useState(0);
  useEffect(() => { if (matches.length > 0) onJump(matches[idx % matches.length].r, matches[idx % matches.length].c); /* eslint-disable-next-line */ }, [idx, matches.length]);
  return (
    <div style={{ position: "fixed", top: 110, right: 20, background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 20, display: "flex", flexDirection: "column", gap: 6, minWidth: 280 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find" style={{ flex: 1, border: "1px solid #ddd", borderRadius: 4, padding: "5px 8px", fontSize: 12 }} />
        <span style={{ fontSize: 10, color: "#666", minWidth: 50 }}>{matches.length ? `${(idx % matches.length) + 1}/${matches.length}` : "0"}</span>
        <button onClick={() => setIdx((i) => (i + 1) % Math.max(1, matches.length))} style={{ background: "none", border: "1px solid #ddd", borderRadius: 4, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>↓</button>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#666" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input value={repl} onChange={(e) => setRepl(e.target.value)} placeholder="Replace with" style={{ flex: 1, border: "1px solid #ddd", borderRadius: 4, padding: "5px 8px", fontSize: 12 }} />
        <button onClick={() => { onReplace(q, repl, false); }} title="Replace one" style={{ background: "#107C41", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>One</button>
        <button onClick={() => { onReplace(q, repl, true); }} title="Replace all" style={{ background: "#fff", color: "#107C41", border: "1px solid #107C41", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>All</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOOLS TABBED SHEET
   ════════════════════════════════════════════════════════════ */

interface ToolsSheetProps {
  tab: ToolTab; onTab: (t: ToolTab) => void; onClose: () => void;
  fmt: CellFormat; onPatch: (p: CellFormat) => void;
  onInsertRow: (at: number) => void;
  onInsertCol: (at: number) => void;
  onDeleteRow: (at: number) => void;
  onDeleteCol: (at: number) => void;
  onClearRange: () => void;
  onFreeze: (rows: number, cols: number) => void;
  onSort: (asc: boolean) => void;
  selR: number; selC: number;
  fullScreen: boolean; setFullScreen: (v: boolean) => void;
}

function ToolsTabsSheet(p: ToolsSheetProps) {
  const tabs: ToolTab[] = ["format", "insert", "data", "view"];
  return (
    <div onClick={p.onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "80dvh", overflowY: "auto", background: "#0A0E1A", borderRadius: "16px 16px 0 0" }}>
        <div style={{ display: "flex", gap: 4, padding: "10px 12px 0", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => p.onTab(t)} style={{
              padding: "10px 14px", border: "none", cursor: "pointer", background: "transparent",
              color: p.tab === t ? "#107C41" : "#8892A4",
              borderBottom: p.tab === t ? "2px solid #107C41" : "2px solid transparent",
              fontSize: 13, fontWeight: 800, textTransform: "capitalize",
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={p.onClose} style={{ background: "none", border: "none", color: "#8892A4", fontSize: 20, cursor: "pointer", padding: "6px 12px" }}>✕</button>
        </div>
        <div style={{ padding: 14 }}>
          {p.tab === "format" && <FormatTab fmt={p.fmt} onPatch={p.onPatch} />}
          {p.tab === "insert" && <InsertTabT p={p} />}
          {p.tab === "data" && <DataTab p={p} />}
          {p.tab === "view" && <ViewTab p={p} />}
        </div>
      </div>
    </div>
  );
}

function FormatTab({ fmt, onPatch }: { fmt: CellFormat; onPatch: (p: CellFormat) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Text</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <DTile label="Bold" active={!!fmt.bold} onClick={() => onPatch({ bold: !fmt.bold })} />
        <DTile label="Italic" active={!!fmt.italic} onClick={() => onPatch({ italic: !fmt.italic })} />
        <DTile label="Underline" active={!!fmt.underline} onClick={() => onPatch({ underline: !fmt.underline })} />
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Alignment</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["left", "center", "right"] as Align[]).map((a) => (
          <DTile key={a} label={a} active={fmt.align === a} onClick={() => onPatch({ align: a })} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "4px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Number format</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {(["general", "0", "0.00", "%", "0.00%", "$", "₦", "date"] as NumFmt[]).map((n) => (
          <DTile key={n} label={n} active={fmt.numFmt === n} onClick={() => onPatch({ numFmt: n })} />
        ))}
      </div>
    </div>
  );
}
function InsertTabT({ p }: { p: ToolsSheetProps }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      <DTile label="Insert row above" onClick={() => p.onInsertRow(p.selR)} />
      <DTile label="Insert row below" onClick={() => p.onInsertRow(p.selR + 1)} />
      <DTile label="Insert column left" onClick={() => p.onInsertCol(p.selC)} />
      <DTile label="Insert column right" onClick={() => p.onInsertCol(p.selC + 1)} />
      <DTile label="Delete row" onClick={() => p.onDeleteRow(p.selR)} />
      <DTile label="Delete column" onClick={() => p.onDeleteCol(p.selC)} />
      <DTile label="Clear cells" onClick={p.onClearRange} />
    </div>
  );
}
function DataTab({ p }: { p: ToolsSheetProps }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
        <DTile label="Sort ascending (A→Z)" onClick={() => p.onSort(true)} />
        <DTile label="Sort descending (Z→A)" onClick={() => p.onSort(false)} />
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, padding: "8px 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Common formulas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <FormulaHint name="=SUM(A1:A10)" desc="Add a range" />
        <FormulaHint name="=AVERAGE(A1:A10)" desc="Average of values" />
        <FormulaHint name="=COUNT(A1:A10)" desc="Count numbers" />
        <FormulaHint name="=MAX(A1:A10)" desc="Largest" />
        <FormulaHint name="=MIN(A1:A10)" desc="Smallest" />
        <FormulaHint name="=IF(A1>0,&quot;Yes&quot;,&quot;No&quot;)" desc="Conditional" />
        <FormulaHint name="=ROUND(A1,2)" desc="Round to N dp" />
        <FormulaHint name="=CONCAT(A1,&quot; &quot;,B1)" desc="Join cells" />
      </div>
    </div>
  );
}
function ViewTab({ p }: { p: ToolsSheetProps }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      <DTile label={p.fullScreen ? "Exit full screen" : "Full screen"} onClick={() => p.setFullScreen(!p.fullScreen)} />
      <DTile label="Freeze first row" onClick={() => p.onFreeze(1, 0)} />
      <DTile label="Freeze first column" onClick={() => p.onFreeze(0, 1)} />
      <DTile label="Unfreeze" onClick={() => p.onFreeze(0, 0)} />
    </div>
  );
}

function DTile({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px 10px", borderRadius: 10,
      background: active ? "rgba(16,124,65,0.15)" : "#111827",
      border: `1px solid ${active ? "#107C41" : "rgba(255,255,255,0.05)"}`,
      color: active ? "#107C41" : "#E8EDF5", cursor: "pointer",
      fontSize: 12, fontWeight: 700, textAlign: "left",
    }}>{label}</button>
  );
}
function FormulaHint({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "#111827", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#107C41", fontFamily: "ui-monospace, monospace" }} dangerouslySetInnerHTML={{ __html: name }} />
      <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{desc}</div>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "none", border: "none", color: "#E8EDF5", width: 38, height: 38, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" };
const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "#E8EDF5", fontSize: 15, fontWeight: 700, padding: "6px 10px", fontFamily: "'Nunito', sans-serif", borderRadius: 6 };
const colHeader: React.CSSProperties = { border: "1px solid #E0E0E0", padding: "5px 6px", textAlign: "center", fontWeight: 700, color: "#666", background: "#F4F6FA", position: "sticky", top: 0, zIndex: 3, cursor: "pointer", fontSize: 11 };
const rowHeader: React.CSSProperties = { border: "1px solid #E0E0E0", padding: "0 6px", textAlign: "center", fontWeight: 700, color: "#666", background: "#F4F6FA", position: "sticky", left: 0, zIndex: 2, cursor: "pointer", fontSize: 11, minWidth: 36, width: 36 };
const cellTd: React.CSSProperties = { border: "1px solid #E0E0E0", padding: "4px 6px", height: 28, verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 };

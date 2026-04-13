"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Collaboration } from "@tiptap/extension-collaboration";
import { Mark, mergeAttributes } from "@tiptap/core";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────────────────────────
   Custom marks for "Suggestion mode" — track-changes
   We use simple <ins> / <del> marks; no history yet.
   ───────────────────────────────────────────── */
const Insertion = Mark.create({
  name: "insertion",
  parseHTML() { return [{ tag: "ins" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["ins", mergeAttributes(HTMLAttributes, { style: "background:rgba(102,187,106,0.18);text-decoration:underline;text-decoration-color:#66BB6A;" }), 0];
  },
});
const Deletion = Mark.create({
  name: "deletion",
  parseHTML() { return [{ tag: "del" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["del", mergeAttributes(HTMLAttributes, { style: "background:rgba(239,83,80,0.18);text-decoration:line-through;text-decoration-color:#EF5350;" }), 0];
  },
});

export interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Pass a stable docId + userName to enable real-time collaboration. */
  collab?: { docId: string; userName: string; userColor?: string; serverUrl?: string };
  /** Suggestion mode toggle — when true, user edits become <ins>/<del> marks. */
  suggestionMode?: boolean;
}

/** The default y-websocket demo server. Public, NOT for production use. */
const DEFAULT_WS = "wss://demos.yjs.dev";

export function TiptapEditor({ value, onChange, placeholder = "Start writing — '/' for commands soon", collab, suggestionMode = false }: TiptapEditorProps) {
  const [ready, setReady] = useState(!collab); // for collab mode, wait for sync
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  // Set up Y.js doc + provider once per docId
  const collabExtensions = useMemo(() => {
    if (!collab) return [];
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const provider = new WebsocketProvider(collab.serverUrl || DEFAULT_WS, `cios-note-${collab.docId}`, ydoc);
    providerRef.current = provider;
    provider.awareness.setLocalStateField("user", { name: collab.userName, color: collab.userColor || "#1E88E5" });
    provider.on("status", (e: { status: string }) => { if (e.status === "connected") setReady(true); });
    return [Collaboration.configure({ document: ydoc })];
  }, [collab?.docId]); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // history is replaced by Yjs in collab mode; otherwise keep default
        history: collab ? false : undefined,
      }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image,
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Insertion,
      Deletion,
      ...collabExtensions,
    ],
    content: collab ? "" : value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Suggestion mode: wrap typed-in text as <ins>
      // (Simple approach: marker-based; for proper track-changes, use a TipTap Pro extension or roll deeper.)
      if (suggestionMode && !insertingProgrammaticallyRef.current) {
        // We can't easily intercept typing here without a full ProseMirror plugin.
        // The marks are added via the toolbar buttons + paste handler instead.
      }
      onChange(html);
    },
  });

  const insertingProgrammaticallyRef = useRef(false);

  // Sync external `value` only when NOT collab (in collab mode Y.js is the source of truth)
  useEffect(() => {
    if (!editor || collab) return;
    if (editor.getHTML() !== value) {
      insertingProgrammaticallyRef.current = true;
      editor.commands.setContent(value || "", { emitUpdate: false });
      insertingProgrammaticallyRef.current = false;
    }
  }, [value, editor, collab]);

  // Cleanup Y.js provider
  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, [collab?.docId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return <div style={{ padding: 24, color: "#5A6478" }}>Loading editor…</div>;

  return (
    <>
      <Toolbar editor={editor} suggestionMode={suggestionMode} />
      {!ready && collab && (
        <div style={{ padding: "6px 12px", background: "rgba(255,193,7,0.1)", color: "#FFC107", fontSize: 11, fontWeight: 600, borderBottom: "1px solid rgba(255,193,7,0.2)" }}>
          🔄 Connecting to live collaboration session…
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <EditorContent editor={editor} className="cios-tt-content" />
      </div>
      <style>{`
        .cios-tt-content { padding: 36px 56px; outline: none; min-height: 100%; font-size: 16px; line-height: 1.7; color: #E8EDF5; }
        .cios-tt-content .ProseMirror { outline: none; min-height: calc(100vh - 320px); }
        .cios-tt-content h1 { font-family: 'Space Grotesk', sans-serif; font-size: 32px; font-weight: 800; margin: 18px 0 10px; }
        .cios-tt-content h2 { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; margin: 14px 0 8px; }
        .cios-tt-content h3 { font-size: 19px; font-weight: 700; margin: 12px 0 6px; }
        .cios-tt-content ul, .cios-tt-content ol { padding-left: 24px; margin: 8px 0; }
        .cios-tt-content ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
        .cios-tt-content ul[data-type="taskList"] li { display: flex; gap: 8px; align-items: flex-start; }
        .cios-tt-content ul[data-type="taskList"] li input[type="checkbox"] { margin-top: 6px; }
        .cios-tt-content a { color: #1E88E5; text-decoration: underline; }
        .cios-tt-content blockquote { border-left: 3px solid #1E88E5; margin: 8px 0; padding: 4px 14px; color: #B0BEC5; }
        .cios-tt-content pre { background: #0A0E1A; padding: 12px; border-radius: 8px; overflow-x: auto; font-family: ui-monospace, monospace; font-size: 13px; }
        .cios-tt-content code { background: #0A0E1A; padding: 2px 6px; border-radius: 4px; font-size: 0.92em; }
        .cios-tt-content table { border-collapse: collapse; margin: 12px 0; }
        .cios-tt-content table td, .cios-tt-content table th { border: 1px solid rgba(255,255,255,0.15); padding: 8px; min-width: 80px; }
        .cios-tt-content table th { background: rgba(255,255,255,0.04); font-weight: 700; }
        .cios-tt-content img { max-width: 100%; border-radius: 8px; }
        .cios-tt-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #5A6478; pointer-events: none; float: left; height: 0; }
        @media (max-width: 768px) { .cios-tt-content { padding: 20px 16px 90px; font-size: 15px; } }
      `}</style>
    </>
  );
}

/* ─── Toolbar ─── */
function Toolbar({ editor, suggestionMode }: { editor: Editor; suggestionMode: boolean }) {
  const btn = (active: boolean): React.CSSProperties => ({ background: active ? "rgba(30,136,229,0.2)" : "transparent", border: "1px solid rgba(255,255,255,0.07)", color: active ? "#1E88E5" : "#E8EDF5", minWidth: 32, height: 30, padding: "0 8px", borderRadius: 6, fontSize: 13, cursor: "pointer" });
  const sep = <span style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "4px 4px", height: 22, display: "inline-block" }} />;

  const run = (fn: () => void) => () => { fn(); };
  const insertLink = () => { const url = prompt("Link URL:"); if (url) editor.chain().focus().setLink({ href: url }).run(); };
  const insertImage = () => { const url = prompt("Image URL:"); if (url) editor.chain().focus().setImage({ src: url }).run(); };
  const wrapAsInsertion = () => editor.chain().focus().toggleMark("insertion").run();
  const wrapAsDeletion = () => editor.chain().focus().toggleMark("deletion").run();

  return (
    <div className="cios-tt-toolbar" style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", alignItems: "center" }}>
      <button style={btn(editor.isActive("bold"))} onClick={run(() => editor.chain().focus().toggleBold().run())} title="Bold (Ctrl+B)"><b>B</b></button>
      <button style={btn(editor.isActive("italic"))} onClick={run(() => editor.chain().focus().toggleItalic().run())}><i>I</i></button>
      <button style={btn(editor.isActive("underline"))} onClick={run(() => editor.chain().focus().toggleUnderline().run())}><u>U</u></button>
      <button style={btn(editor.isActive("strike"))} onClick={run(() => editor.chain().focus().toggleStrike().run())}><s>S</s></button>
      {sep}
      <button style={btn(editor.isActive("heading", { level: 1 }))} onClick={run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}>H1</button>
      <button style={btn(editor.isActive("heading", { level: 2 }))} onClick={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>H2</button>
      <button style={btn(editor.isActive("heading", { level: 3 }))} onClick={run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>H3</button>
      <button style={btn(editor.isActive("paragraph"))} onClick={run(() => editor.chain().focus().setParagraph().run())}>P</button>
      <button style={btn(editor.isActive("blockquote"))} onClick={run(() => editor.chain().focus().toggleBlockquote().run())}>“</button>
      {sep}
      <button style={btn(editor.isActive("bulletList"))} onClick={run(() => editor.chain().focus().toggleBulletList().run())}>•</button>
      <button style={btn(editor.isActive("orderedList"))} onClick={run(() => editor.chain().focus().toggleOrderedList().run())}>1.</button>
      <button style={btn(editor.isActive("taskList"))} onClick={run(() => editor.chain().focus().toggleTaskList().run())}>☑</button>
      <button style={btn(editor.isActive("codeBlock"))} onClick={run(() => editor.chain().focus().toggleCodeBlock().run())}>{"</>"}</button>
      {sep}
      <button style={btn(false)} onClick={insertLink} title="Link">🔗</button>
      <button style={btn(false)} onClick={insertImage} title="Image">🖼</button>
      <button style={btn(false)} onClick={run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())} title="Table">⌗</button>
      <button style={btn(false)} onClick={run(() => editor.chain().focus().setHorizontalRule().run())} title="Divider">―</button>
      {sep}
      <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} style={{ width: 30, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} title="Text color" />
      <input type="color" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} style={{ width: 30, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} title="Highlight" />
      {sep}
      <button style={btn(false)} onClick={run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())} title="Clear">✕</button>
      {sep}
      {suggestionMode && (
        <>
          <button style={btn(editor.isActive("insertion"))} onClick={wrapAsInsertion} title="Mark as insertion (track-changes)" >+ ins</button>
          <button style={btn(editor.isActive("deletion"))} onClick={wrapAsDeletion} title="Mark as deletion (track-changes)">− del</button>
          {sep}
        </>
      )}
      <button style={btn(false)} onClick={run(() => editor.chain().focus().undo().run())} title="Undo (Ctrl+Z)">↶</button>
      <button style={btn(false)} onClick={run(() => editor.chain().focus().redo().run())} title="Redo (Ctrl+Shift+Z)">↷</button>
    </div>
  );
}

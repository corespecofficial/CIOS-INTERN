/**
 * Tiny spreadsheet formula engine.
 *
 * Supports:
 *  - Cell refs: A1, B12, AA3, etc.
 *  - Ranges: A1:B5
 *  - Functions: SUM, AVG (=AVERAGE), AVERAGE, COUNT, COUNTA, MAX, MIN,
 *               IF, ABS, ROUND, INT, CONCAT, LEN, UPPER, LOWER, NOW, TODAY
 *  - Operators: + - * / ^ % parentheses
 *  - Strings: "double-quoted"
 *  - Comparisons in IF: >, <, >=, <=, =, <>
 *
 * Not Excel-perfect — deliberately small and predictable. Cycles are detected
 * and return #CYCLE!. Unknown refs return 0. Type errors return #ERROR!.
 */

export type CellGetter = (col: number, row: number) => string | number | boolean;

const FN_REGEX = /^[A-Z]+/;
const REF_REGEX = /^([A-Z]+)(\d+)/;

/** Convert "A1" → {col: 0, row: 0}. Supports multi-letter cols (AA, AB...). */
export function parseRef(ref: string): { col: number; row: number } | null {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col: col - 1, row: parseInt(m[2], 10) - 1 };
}
export function colName(col: number): string {
  let n = col + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Evaluate a single cell value. If it starts with `=`, parse + compute. */
export function evalCell(raw: string, get: CellGetter, depth = 0): string | number {
  if (depth > 50) return "#CYCLE!";
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("=")) {
    // Plain value — try numeric
    const n = Number(trimmed);
    return isFinite(n) && trimmed !== "" ? n : trimmed;
  }
  try {
    const tokens = tokenize(trimmed.slice(1));
    const ast = parse(tokens);
    const v = run(ast, get, depth);
    return typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : v;
  } catch (e) {
    return (e as Error).message.startsWith("#") ? (e as Error).message : "#ERROR!";
  }
}

/* ── tokenizer ── */

type Tok = { type: "num" | "str" | "id" | "op" | "lparen" | "rparen" | "comma" | "colon"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c === "(") { out.push({ type: "lparen", v: c }); i++; continue; }
    if (c === ")") { out.push({ type: "rparen", v: c }); i++; continue; }
    if (c === ",") { out.push({ type: "comma", v: c }); i++; continue; }
    if (c === ":") { out.push({ type: "colon", v: c }); i++; continue; }
    if ("+-*/^%".includes(c)) { out.push({ type: "op", v: c }); i++; continue; }
    if (c === "<" || c === ">" || c === "=") {
      // multi-char comparisons
      if (src[i + 1] === "=" || (c === "<" && src[i + 1] === ">")) { out.push({ type: "op", v: c + src[i + 1] }); i += 2; }
      else { out.push({ type: "op", v: c }); i++; }
      continue;
    }
    if (c === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== '"') s += src[j++];
      out.push({ type: "str", v: s }); i = j + 1; continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ type: "num", v: src.slice(i, j) }); i = j; continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ type: "id", v: src.slice(i, j).toUpperCase() }); i = j; continue;
    }
    throw new Error("#PARSE!");
  }
  return out;
}

/* ── recursive-descent parser ── */

type Node =
  | { kind: "num"; v: number }
  | { kind: "str"; v: string }
  | { kind: "ref"; col: number; row: number }
  | { kind: "range"; c1: number; r1: number; c2: number; r2: number }
  | { kind: "bin"; op: string; l: Node; r: Node }
  | { kind: "neg"; x: Node }
  | { kind: "call"; name: string; args: Node[] };

function parse(tokens: Tok[]): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (t?: string) => { const x = tokens[pos++]; if (t && x?.type !== t) throw new Error("#PARSE!"); return x; };
  const expr = (): Node => cmp();
  const cmp = (): Node => { let l = add(); while (peek() && peek().type === "op" && ["=", "<", ">", "<=", ">=", "<>"].includes(peek().v)) { const op = eat().v; l = { kind: "bin", op, l, r: add() }; } return l; };
  const add = (): Node => { let l = mul(); while (peek() && peek().type === "op" && (peek().v === "+" || peek().v === "-")) { const op = eat().v; l = { kind: "bin", op, l, r: mul() }; } return l; };
  const mul = (): Node => { let l = pow(); while (peek() && peek().type === "op" && (peek().v === "*" || peek().v === "/" || peek().v === "%")) { const op = eat().v; l = { kind: "bin", op, l, r: pow() }; } return l; };
  const pow = (): Node => { let l = unary(); if (peek() && peek().type === "op" && peek().v === "^") { eat(); l = { kind: "bin", op: "^", l, r: pow() }; } return l; };
  const unary = (): Node => { if (peek() && peek().type === "op" && peek().v === "-") { eat(); return { kind: "neg", x: unary() }; } return atom(); };
  const atom = (): Node => {
    const t = peek();
    if (!t) throw new Error("#PARSE!");
    if (t.type === "num") { eat(); return { kind: "num", v: parseFloat(t.v) }; }
    if (t.type === "str") { eat(); return { kind: "str", v: t.v }; }
    if (t.type === "lparen") { eat(); const e = expr(); eat("rparen"); return e; }
    if (t.type === "id") {
      const name = t.v; eat();
      // Function call?
      if (peek()?.type === "lparen") {
        eat("lparen");
        const args: Node[] = [];
        if (peek()?.type !== "rparen") {
          args.push(expr());
          while (peek()?.type === "comma") { eat(); args.push(expr()); }
        }
        eat("rparen");
        return { kind: "call", name, args };
      }
      // Cell ref or range
      const m = (name + (peek()?.type === "num" ? eat().v : "")).match(REF_REGEX);
      if (m) {
        const a = parseRef(m[0]); if (!a) throw new Error("#REF!");
        if (peek()?.type === "colon") {
          eat();
          const t2 = eat();
          const b = parseRef(t2.v + (peek()?.type === "num" ? eat().v : ""));
          if (!b) throw new Error("#REF!");
          return { kind: "range", c1: Math.min(a.col, b.col), r1: Math.min(a.row, b.row), c2: Math.max(a.col, b.col), r2: Math.max(a.row, b.row) };
        }
        return { kind: "ref", col: a.col, row: a.row };
      }
      throw new Error("#NAME?");
    }
    throw new Error("#PARSE!");
  };
  const ast = expr();
  if (pos < tokens.length) throw new Error("#PARSE!");
  return ast;
}

/* ── interpreter ── */

function rangeValues(node: Extract<Node, { kind: "range" }>, get: CellGetter, depth: number): (string | number | boolean)[] {
  const out: (string | number | boolean)[] = [];
  for (let r = node.r1; r <= node.r2; r++) {
    for (let c = node.c1; c <= node.c2; c++) {
      const v = get(c, r);
      if (typeof v === "string" && v.startsWith("=")) out.push(evalCell(v, get, depth + 1));
      else out.push(v);
    }
  }
  return out;
}

function nums(values: (string | number | boolean)[]): number[] {
  return values.map((v) => typeof v === "number" ? v : (typeof v === "boolean" ? (v ? 1 : 0) : Number(v))).filter((n) => isFinite(n));
}

function run(node: Node, get: CellGetter, depth: number): string | number | boolean {
  switch (node.kind) {
    case "num": return node.v;
    case "str": return node.v;
    case "ref": {
      const v = get(node.col, node.row);
      if (typeof v === "string" && v.startsWith("=")) return evalCell(v, get, depth + 1);
      const n = Number(v);
      return isFinite(n) && v !== "" && v !== true && v !== false ? n : v;
    }
    case "range": throw new Error("#REF!"); // Range used outside a function
    case "neg": return -Number(run(node.x, get, depth));
    case "bin": {
      const l = run(node.l, get, depth) as number; const r = run(node.r, get, depth) as number;
      switch (node.op) {
        case "+": return Number(l) + Number(r);
        case "-": return Number(l) - Number(r);
        case "*": return Number(l) * Number(r);
        case "/": if (Number(r) === 0) throw new Error("#DIV/0!"); return Number(l) / Number(r);
        case "^": return Math.pow(Number(l), Number(r));
        case "%": return Number(l) % Number(r);
        case "=": return l == r;
        case "<>": return l != r;
        case "<": return l < r;
        case ">": return l > r;
        case "<=": return l <= r;
        case ">=": return l >= r;
      }
      throw new Error("#OP!");
    }
    case "call": {
      const name = node.name;
      const collect = (): (string | number | boolean)[] => {
        const out: (string | number | boolean)[] = [];
        for (const a of node.args) {
          if (a.kind === "range") out.push(...rangeValues(a, get, depth));
          else out.push(run(a, get, depth));
        }
        return out;
      };
      switch (name) {
        case "SUM":     return nums(collect()).reduce((a, b) => a + b, 0);
        case "AVERAGE":
        case "AVG":     { const n = nums(collect()); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0; }
        case "COUNT":   return nums(collect()).length;
        case "COUNTA":  return collect().filter((v) => v !== "" && v !== null && v !== undefined).length;
        case "MAX":     { const n = nums(collect()); return n.length ? Math.max(...n) : 0; }
        case "MIN":     { const n = nums(collect()); return n.length ? Math.min(...n) : 0; }
        case "ABS":     return Math.abs(Number(run(node.args[0], get, depth)));
        case "ROUND":   { const v = Number(run(node.args[0], get, depth)); const d = node.args[1] ? Number(run(node.args[1], get, depth)) : 0; const p = Math.pow(10, d); return Math.round(v * p) / p; }
        case "INT":     return Math.floor(Number(run(node.args[0], get, depth)));
        case "CONCAT":
        case "CONCATENATE": return collect().map(String).join("");
        case "LEN":     return String(run(node.args[0], get, depth)).length;
        case "UPPER":   return String(run(node.args[0], get, depth)).toUpperCase();
        case "LOWER":   return String(run(node.args[0], get, depth)).toLowerCase();
        case "IF":      return run(node.args[0], get, depth) ? run(node.args[1], get, depth) : run(node.args[2], get, depth);
        case "NOW":     return new Date().toLocaleString();
        case "TODAY":   return new Date().toLocaleDateString();
        case "PI":      return Math.PI;
        case "SQRT":    return Math.sqrt(Number(run(node.args[0], get, depth)));
      }
      throw new Error("#NAME?");
    }
  }
}

/** Format a value using a format token: "", "0.00", "0%", "$", "date" */
export function formatValue(v: string | number, fmt?: string): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string") return v;
  if (!fmt || fmt === "general") return String(v);
  if (fmt === "0") return Math.round(v).toString();
  if (fmt === "0.00") return v.toFixed(2);
  if (fmt === "%") return (v * 100).toFixed(0) + "%";
  if (fmt === "0.00%") return (v * 100).toFixed(2) + "%";
  if (fmt === "$") return "$" + v.toFixed(2);
  if (fmt === "₦") return "₦" + v.toFixed(2);
  if (fmt === "date") return new Date(v).toLocaleDateString();
  return String(v);
}

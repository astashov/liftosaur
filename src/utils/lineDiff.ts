export interface ILineDiffSpan {
  text: string;
  isChanged: boolean;
}

export interface ILineDiffOp {
  kind: "same" | "add" | "remove";
  text: string;
  spans?: ILineDiffSpan[];
}

const minInlineSimilarity = 0.5;
const maxInlineLineTokens = 200;
const maxInlineTotalChars = 20000;

export type ILineDiffRow = ILineDiffOp | { kind: "skip"; count: number };

function lines(text: string): string[] {
  const split = text.replace(/\r\n/g, "\n").split("\n");
  return split.length > 0 && split[split.length - 1] === "" ? split.slice(0, -1) : split;
}

function backtrack(trace: Map<number, number>[], a: string[], b: string[]): ILineDiffOp[] {
  const ops: ILineDiffOp[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d -= 1) {
    const v = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? k + 1 : k - 1;
    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ kind: "same", text: a[x - 1] });
      x -= 1;
      y -= 1;
    }
    if (d > 0) {
      if (x === prevX) {
        ops.push({ kind: "add", text: b[y - 1] });
      } else {
        ops.push({ kind: "remove", text: a[x - 1] });
      }
    }
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

export const LineDiff_maxEdits = 500;

function replaceAll(a: string[], b: string[]): ILineDiffOp[] {
  return [
    ...a.map((text): ILineDiffOp => ({ kind: "remove", text })),
    ...b.map((text): ILineDiffOp => ({ kind: "add", text })),
  ];
}

export function LineDiff_diff(before: string, after: string): ILineDiffOp[] {
  const a = lines(before);
  const b = lines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start += 1;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const same = (text: string): ILineDiffOp => ({ kind: "same", text });
  const middleA = a.slice(start, endA);
  const middleB = b.slice(start, endB);
  return [
    ...a.slice(0, start).map(same),
    ...(myers(middleA, middleB) ?? replaceAll(middleA, middleB)),
    ...a.slice(endA).map(same),
  ];
}

function myers(a: string[], b: string[]): ILineDiffOp[] | undefined {
  const max = Math.min(a.length + b.length, LineDiff_maxEdits);
  const v = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];
  for (let d = 0; d <= max; d += 1) {
    trace.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1));
      let x = down ? (v.get(k + 1) ?? 0) : (v.get(k - 1) ?? 0) + 1;
      let y = x - k;
      while (x < a.length && y < b.length && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      v.set(k, x);
      if (x >= a.length && y >= b.length) {
        return backtrack(trace, a, b);
      }
    }
  }
  return undefined;
}

function tokens(line: string): string[] {
  return line.match(/\w+|\s+|[^\w\s]/g) ?? [];
}

function toSpans(ops: ILineDiffOp[], side: "remove" | "add"): ILineDiffSpan[] {
  const spans: ILineDiffSpan[] = [];
  for (const op of ops) {
    if (op.kind !== "same" && op.kind !== side) {
      continue;
    }
    const isChanged = op.kind !== "same";
    const last = spans[spans.length - 1];
    if (last != null && last.isChanged === isChanged) {
      last.text += op.text;
    } else {
      spans.push({ text: op.text, isChanged });
    }
  }
  return spans;
}

function sharedTokenLength(a: string[], b: string[]): number {
  const counts = new Map<string, number>();
  for (const token of a) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  let shared = 0;
  for (const token of b) {
    const count = counts.get(token) ?? 0;
    if (count > 0) {
      counts.set(token, count - 1);
      shared += token.trim().length;
    }
  }
  return shared;
}

function isSimilarEnough(sharedLength: number, before: string, after: string): boolean {
  const longest = Math.max(before.trim().length, after.trim().length);
  return longest > 0 && sharedLength / longest >= minInlineSimilarity;
}

export function LineDiff_inline(
  before: string,
  after: string
): { before: ILineDiffSpan[]; after: ILineDiffSpan[] } | undefined {
  const a = tokens(before);
  const b = tokens(after);
  if (a.length + b.length > maxInlineLineTokens || !isSimilarEnough(sharedTokenLength(a, b), before, after)) {
    return undefined;
  }
  const ops = myers(a, b);
  if (ops == null) {
    return undefined;
  }
  const sameLength = ops.filter((op) => op.kind === "same").reduce((sum, op) => sum + op.text.trim().length, 0);
  if (!isSimilarEnough(sameLength, before, after)) {
    return undefined;
  }
  return { before: toSpans(ops, "remove"), after: toSpans(ops, "add") };
}

export function LineDiff_withInline(ops: ILineDiffOp[]): ILineDiffOp[] {
  const result = [...ops];
  let budget = maxInlineTotalChars;
  let i = 0;
  while (i < result.length) {
    if (result[i].kind !== "remove") {
      i += 1;
      continue;
    }
    const removeStart = i;
    while (i < result.length && result[i].kind === "remove") {
      i += 1;
    }
    const addStart = i;
    while (i < result.length && result[i].kind === "add") {
      i += 1;
    }
    const pairs = Math.min(addStart - removeStart, i - addStart);
    for (let p = 0; p < pairs && budget > 0; p += 1) {
      const removed = result[removeStart + p];
      const added = result[addStart + p];
      budget -= removed.text.length + added.text.length;
      const inline = LineDiff_inline(removed.text, added.text);
      if (inline != null) {
        result[removeStart + p] = { ...removed, spans: inline.before };
        result[addStart + p] = { ...added, spans: inline.after };
      }
    }
  }
  return result;
}

export function LineDiff_rows(ops: ILineDiffOp[], context: number): ILineDiffRow[] {
  const keep = ops.map((op, i) => {
    if (op.kind !== "same") {
      return true;
    }
    for (let j = Math.max(0, i - context); j <= Math.min(ops.length - 1, i + context); j += 1) {
      if (ops[j].kind !== "same") {
        return true;
      }
    }
    return false;
  });
  const rows: ILineDiffRow[] = [];
  let skipped = 0;
  ops.forEach((op, i) => {
    if (keep[i]) {
      if (skipped > 0) {
        rows.push({ kind: "skip", count: skipped });
        skipped = 0;
      }
      rows.push(op);
    } else {
      skipped += 1;
    }
  });
  if (skipped > 0) {
    rows.push({ kind: "skip", count: skipped });
  }
  return rows;
}

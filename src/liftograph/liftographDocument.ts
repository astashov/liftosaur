export interface ILiftographSpan {
  from: number;
  to: number;
}

export interface ILiftographPair {
  key: string;
  value: string;
  span: ILiftographSpan;
  valueSpan: ILiftographSpan;
}

export interface ILiftographScriptNode {
  text: string;
  span: ILiftographSpan;
  textSpan: ILiftographSpan;
}

export interface ILiftographSeriesNode {
  pairs: ILiftographPair[];
  script?: ILiftographScriptNode;
  span: ILiftographSpan;
}

export interface ILiftographTextItem {
  type: "text";
  markdown: string;
  span: ILiftographSpan;
}

export interface ILiftographWidgetItem {
  type: "widget";
  kind: string;
  pairs: ILiftographPair[];
  script?: ILiftographScriptNode;
  series: ILiftographSeriesNode[];
  hasBlock: boolean;
  caption?: ILiftographTextItem;
  span: ILiftographSpan;
}

export interface ILiftographRowItem {
  type: "row";
  items: (ILiftographWidgetItem | ILiftographTextItem)[];
  caption?: ILiftographTextItem;
  span: ILiftographSpan;
}

export interface ILiftographDiagnostic {
  message: string;
  span: ILiftographSpan;
}

export interface ILiftographDocument {
  text: string;
  items: (ILiftographWidgetItem | ILiftographTextItem | ILiftographRowItem)[];
  hiddenSpans: ILiftographSpan[];
  diagnostics: ILiftographDiagnostic[];
}

interface ILogicalLine {
  span: ILiftographSpan;
  head: string;
  headFrom: number;
  script?: ILiftographScriptNode;
  isScriptClosed: boolean;
}

type IFrame =
  | { type: "row"; row: ILiftographRowItem; openSpan: ILiftographSpan; owner: ILiftographSpan }
  | { type: "graph"; widget: ILiftographWidgetItem; openSpan: ILiftographSpan; owner: ILiftographSpan }
  | { type: "skip"; openSpan: ILiftographSpan; owner?: ILiftographSpan };

interface IPendingText {
  lines: string[];
  span: ILiftographSpan;
}

function skipQuoted(text: string, from: number): number {
  let i = from + 1;
  while (i < text.length && text[i] !== "\n") {
    if (text[i] === "\\") {
      i += 2;
    } else if (text[i] === '"') {
      return i + 1;
    } else {
      i += 1;
    }
  }
  return i;
}

function readLogicalLines(text: string): ILogicalLine[] {
  const lines: ILogicalLine[] = [];
  let lineStart = 0;
  while (lineStart <= text.length) {
    let i = lineStart;
    let script: ILiftographScriptNode | undefined;
    let isScriptClosed = true;
    let headEnd: number | undefined;
    const trimmedStart = text.slice(lineStart).match(/^[ \t]*/)?.[0].length ?? 0;
    const isComment = text.startsWith("//", lineStart + trimmedStart);
    while (i < text.length && text[i] !== "\n") {
      if (!isComment && text[i] === '"') {
        i = skipQuoted(text, i);
      } else if (!isComment && text.startsWith("{~", i)) {
        headEnd = i;
        const close = text.indexOf("~}", i + 2);
        const textFrom = i + 2;
        const textTo = close === -1 ? text.length : close;
        const scriptTo = close === -1 ? text.length : close + 2;
        isScriptClosed = close !== -1;
        script = {
          text: text.slice(textFrom, textTo),
          span: { from: i, to: scriptTo },
          textSpan: { from: textFrom, to: textTo },
        };
        i = scriptTo;
        while (i < text.length && text[i] !== "\n") {
          i += 1;
        }
      } else {
        i += 1;
      }
    }
    const lineEnd = i;
    const head = text.slice(lineStart, headEnd ?? lineEnd);
    lines.push({ span: { from: lineStart, to: lineEnd }, head, headFrom: lineStart, script, isScriptClosed });
    lineStart = lineEnd + 1;
  }
  return lines;
}

function splitOutsideQuotes(text: string, separator: string, from: number): { part: string; from: number }[] {
  const parts: { part: string; from: number }[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '"') {
      i = skipQuoted(text, i);
      continue;
    }
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (char === separator && depth === 0) {
      parts.push({ part: text.slice(start, i), from: from + start });
      start = i + 1;
    }
    i += 1;
  }
  parts.push({ part: text.slice(start), from: from + start });
  return parts;
}

function indexOutsideQuotes(text: string, char: string): number {
  let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      i = skipQuoted(text, i);
      continue;
    }
    if (text[i] === char) {
      return i;
    }
    i += 1;
  }
  return -1;
}

function trimmedSpan(part: string, from: number): { text: string; span: ILiftographSpan } {
  const leading = part.length - part.trimStart().length;
  const trimmed = part.trim();
  return { text: trimmed, span: { from: from + leading, to: from + leading + trimmed.length } };
}

function parsePair(part: string, from: number): ILiftographPair | undefined {
  const { text, span } = trimmedSpan(part, from);
  const colon = indexOutsideQuotes(text, ":");
  if (colon <= 0) {
    return undefined;
  }
  const key = text.slice(0, colon).trim();
  const rawValue = text.slice(colon + 1);
  const value = trimmedSpan(rawValue, span.from + colon + 1);
  return { key, value: value.text, span, valueSpan: value.span };
}

interface ISplitHead {
  first?: { text: string; span: ILiftographSpan };
  pairs: ILiftographPair[];
  badParts: ILiftographSpan[];
  opensBlock: boolean;
}

function splitHead(head: string, headFrom: number, isFirstKind: boolean): ISplitHead {
  let body = head.trimEnd();
  let opensBlock = false;
  if (body.endsWith("{") && indexOutsideQuotes(body, "{") === body.length - 1) {
    opensBlock = true;
    body = body.slice(0, -1);
  }
  const parts = splitOutsideQuotes(body, "/", headFrom);
  const pairs: ILiftographPair[] = [];
  const badParts: ILiftographSpan[] = [];
  let first: { text: string; span: ILiftographSpan } | undefined;
  parts.forEach((part, index) => {
    if (index === 0 && isFirstKind) {
      first = trimmedSpan(part.part, part.from);
      return;
    }
    const trimmed = trimmedSpan(part.part, part.from);
    if (trimmed.text === "") {
      return;
    }
    const pair = parsePair(part.part, part.from);
    if (pair == null) {
      badParts.push(trimmed.span);
    } else {
      pairs.push(pair);
    }
  });
  return { first, pairs, badParts, opensBlock };
}

function isKindLine(head: string): boolean {
  const body = head.trim();
  const firstPart = splitOutsideQuotes(body, "/", 0)[0]?.part.trim() ?? "";
  return /^[A-Za-z_][A-Za-z0-9_]*(\s*\{)?$/.test(firstPart);
}

export function LiftographDocument_parse(text: string): ILiftographDocument {
  const items: ILiftographDocument["items"] = [];
  const hiddenSpans: ILiftographSpan[] = [];
  const diagnostics: ILiftographDiagnostic[] = [];
  const stack: IFrame[] = [];
  let pendingText: IPendingText | undefined;

  function error(message: string, span: ILiftographSpan): void {
    diagnostics.push({ message, span });
  }

  function currentContainer(): ILiftographRowItem | undefined {
    const top = stack[stack.length - 1];
    return top?.type === "row" ? top.row : undefined;
  }

  function isSkipping(): boolean {
    return stack.some((frame) => frame.type === "skip");
  }

  function takeText(): ILiftographTextItem | undefined {
    if (pendingText == null) {
      return undefined;
    }
    const item: ILiftographTextItem = { type: "text", markdown: pendingText.lines.join("\n"), span: pendingText.span };
    pendingText = undefined;
    return item;
  }

  function flushTextAsItem(): void {
    const item = takeText();
    if (item == null) {
      return;
    }
    const top = stack[stack.length - 1];
    if (top == null) {
      items.push(item);
    } else if (top.type === "row") {
      top.row.items.push(item);
    }
  }

  function addWidget(widget: ILiftographWidgetItem): void {
    const row = currentContainer();
    if (row != null) {
      row.items.push(widget);
    } else {
      items.push(widget);
    }
  }

  for (const line of readLogicalLines(text)) {
    const trimmed = line.head.trim();
    if (!line.isScriptClosed && line.script != null) {
      error("The script has no closing '~}'", line.script.span);
    }
    if (line.script == null && trimmed.startsWith("///")) {
      hiddenSpans.push(line.span);
      continue;
    }
    if (isSkipping()) {
      if (line.script == null && trimmed === "}") {
        const frame = stack.pop();
        if (frame?.owner != null) {
          frame.owner.to = line.span.to;
        }
      } else if (line.script == null && trimmed.endsWith("{")) {
        stack.push({ type: "skip", openSpan: line.span });
      }
      continue;
    }
    if (line.script == null && trimmed.startsWith("//")) {
      const markdown = trimmed.slice(2).replace(/^ /, "");
      if (pendingText == null) {
        pendingText = { lines: [markdown], span: { ...line.span } };
      } else {
        pendingText.lines.push(markdown);
        pendingText.span.to = line.span.to;
      }
      continue;
    }
    if (line.script == null && trimmed === "") {
      flushTextAsItem();
      continue;
    }
    if (line.script == null && trimmed === "}") {
      flushTextAsItem();
      const frame = stack.pop();
      if (frame == null) {
        error("This '}' closes nothing", line.span);
      } else if (frame.owner != null) {
        frame.owner.to = line.span.to;
      }
      continue;
    }
    if (line.script == null && /^row\s*\{$/.test(trimmed)) {
      const caption = takeText();
      if (stack.length > 0) {
        error("A row can't be inside another row or a graph", line.span);
        stack.push({ type: "skip", openSpan: line.span });
        continue;
      }
      const row: ILiftographRowItem = { type: "row", items: [], caption, span: { ...line.span } };
      items.push(row);
      stack.push({ type: "row", row, openSpan: line.span, owner: row.span });
      continue;
    }
    const top = stack[stack.length - 1];
    if (top?.type === "graph") {
      takeText();
      if (isKindLine(line.head)) {
        error("Expected a series line, like 'name: Squat / source: exercise(Squat)'", line.span);
        continue;
      }
      const head = splitHead(line.head, line.headFrom, false);
      head.badParts.forEach((span) => error("Expected 'key: value'", span));
      if (head.opensBlock) {
        error("A series line can't open a block", line.span);
      }
      top.widget.series.push({ pairs: head.pairs, script: line.script, span: line.span });
      continue;
    }
    if (!isKindLine(line.head)) {
      takeText();
      error("Expected a widget, like 'graph {' or 'value / source: workout'", line.span);
      continue;
    }
    const head = splitHead(line.head, line.headFrom, true);
    head.badParts.forEach((span) => error("Expected 'key: value'", span));
    const caption = takeText();
    const widget: ILiftographWidgetItem = {
      type: "widget",
      kind: head.first?.text ?? "",
      pairs: head.pairs,
      script: line.script,
      series: [],
      hasBlock: head.opensBlock,
      caption,
      span: { ...line.span },
    };
    addWidget(widget);
    if (head.opensBlock) {
      if (widget.kind === "graph") {
        stack.push({ type: "graph", widget, openSpan: line.span, owner: widget.span });
      } else {
        stack.push({ type: "skip", openSpan: line.span, owner: widget.span });
      }
    }
  }
  flushTextAsItem();
  for (let frame = stack.pop(); frame != null; frame = stack.pop()) {
    error("This block has no closing '}'", frame.openSpan);
    if (frame.owner != null) {
      frame.owner.to = text.length;
    }
  }
  return { text, items, hiddenSpans, diagnostics };
}

export function LiftographDocument_scripts(doc: ILiftographDocument): ILiftographScriptNode[] {
  const widgets = doc.items.flatMap((item) => (item.type === "row" ? item.items : [item]));
  return widgets.flatMap((item) =>
    item.type === "widget"
      ? [
          ...(item.script != null ? [item.script] : []),
          ...item.series.flatMap((s) => (s.script != null ? [s.script] : [])),
        ]
      : []
  );
}

export function LiftographDocument_quote(value: string): string {
  return /[,/():{}"\\]/.test(value) ? `"${value.replace(/(["\\])/g, "\\$1")}"` : value;
}

export function LiftographDocument_unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  return value;
}

export function LiftographDocument_splitArgs(value: string): string[] {
  return splitOutsideQuotes(value, ",", 0)
    .map((part) => part.part.trim())
    .filter((part) => part !== "");
}

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");

interface IStamp {
  base: string;
  head: string;
}

interface ILink {
  raw: string;
  file: string;
  line?: number;
  endLine?: number;
  changed: boolean;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

export function ArchdocRelink_stamp(text: string): IStamp | undefined {
  const head = text.slice(0, 600).match(/\bhead\s+`([0-9a-f]{7,40})`/i);
  const base = text.slice(0, 600).match(/\bbase\s+`([0-9a-f]{7,40})`/i);
  return head && base ? { base: base[1], head: head[1] } : undefined;
}

/**
 * Ranges of the HEAD revision that base..head touched, per file, expanded to whole functions.
 *
 * `-W` is what makes the classification right. A doc links a function's declaration while the edit
 * sits deep in its body, so a bare hunk test sends those to the file view and hides the change:
 * Progress_changeAmrapAction's declaration is 73 lines above its edit. With -W, git's own function
 * detection puts the declaration inside the hunk, while a true host integration point 703 lines away
 * (Progress_startTimer) stays outside. No proximity constant to tune.
 */
function changedRanges(stamp: IStamp): Map<string, Array<[number, number]>> {
  const files = git(["diff", "--name-only", `${stamp.base}..${stamp.head}`]).split("\n").filter(Boolean);
  const map = new Map<string, Array<[number, number]>>();
  for (const file of files) {
    const diff = git(["diff", "-W", "-U0", `${stamp.base}..${stamp.head}`, "--", file]);
    const ranges: Array<[number, number]> = [];
    for (const m of diff.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      if (count > 0) ranges.push([start, start + count - 1]);
    }
    map.set(file, ranges);
  }
  return map;
}

function isChanged(ranges: Map<string, Array<[number, number]>>, file: string, line?: number): boolean {
  const r = ranges.get(file);
  if (!r) return false;
  if (line == null) return r.length > 0;
  return r.some(([a, b]) => line >= a && line <= b);
}

function lineParam(line?: number, endLine?: number): string {
  if (line == null) return "";
  return endLine && endLine > line ? `&line=${line}-${endLine}` : `&line=${line}`;
}

function diffUrl(stamp: IStamp, file: string, line?: number, endLine?: number): string {
  const l = lineParam(line, endLine);
  return `vscode://aireviewer.aireviewer/archdoc/diff?base=${stamp.base}&head=${stamp.head}&file=${file}${l}`;
}

function openUrl(stamp: IStamp, file: string, line?: number, endLine?: number): string {
  const l = lineParam(line, endLine);
  return `vscode://aireviewer.aireviewer/archdoc/open?head=${stamp.head}&file=${file}${l}`;
}

export function ArchdocRelink_analyze(text: string, stamp: IStamp): ILink[] {
  const ranges = changedRanges(stamp);
  const links: ILink[] = [];
  for (const m of text.matchAll(/\]\((\.\.\/\.\.\/\.\.\/[^)#\s]+)(?:#L(\d+)(?:-L?(\d+))?)?\)/g)) {
    const file = m[1].replace(/^(\.\.\/){3}/, "");
    if (!fs.existsSync(path.join(ROOT, file)) || fs.statSync(path.join(ROOT, file)).isDirectory()) continue;
    const line = m[2] ? Number(m[2]) : undefined;
    const endLine = m[3] ? Number(m[3]) : undefined;
    links.push({ raw: m[0], file, line, endLine, changed: isChanged(ranges, file, line) });
  }
  return links;
}

export function ArchdocRelink_rewrite(text: string, stamp: IStamp): { text: string; links: ILink[] } {
  const links = ArchdocRelink_analyze(text, stamp);
  let out = text;
  for (const link of links) {
    const url = link.changed
      ? diffUrl(stamp, link.file, link.line, link.endLine)
      : openUrl(stamp, link.file, link.line, link.endLine);
    out = out.split(link.raw).join(`](${url})`);
  }
  return { text: out, links };
}

function main(): void {
  const file = process.argv[2];
  const write = process.argv.includes("--write");
  if (!file) {
    console.error("usage: archdoc-relink.ts <archdoc.md> [--write]");
    process.exit(2);
  }
  const text = fs.readFileSync(file, "utf8");
  const stamp = ArchdocRelink_stamp(text);
  if (!stamp) {
    console.error(`${file}: no "base \`sha\` · head \`sha\`" stamp in the header`);
    process.exit(1);
  }

  const { text: next, links } = ArchdocRelink_rewrite(text, stamp);
  const changed = links.filter((l) => l.changed);
  const unchanged = links.filter((l) => !l.changed);

  console.log(`${path.relative(ROOT, path.resolve(file))}  base ${stamp.base} .. head ${stamp.head}`);
  console.log(`  ${links.length} file links: ${changed.length} -> diff route, ${unchanged.length} -> file route\n`);

  const byFile = new Map<string, { d: number; o: number }>();
  for (const l of links) {
    const e = byFile.get(l.file) ?? { d: 0, o: 0 };
    if (l.changed) e.d += 1;
    else e.o += 1;
    byFile.set(l.file, e);
  }
  for (const [f, e] of [...byFile.entries()].sort((a, b) => b[1].d + b[1].o - (a[1].d + a[1].o))) {
    console.log(`  ${String(e.d).padStart(3)} diff  ${String(e.o).padStart(3)} file   ${f}`);
  }

  if (write) {
    fs.writeFileSync(file, next);
    console.log(`\nwritten.`);
  } else {
    console.log(`\ndry run — pass --write to apply.`);
  }
}

if (require.main === module) {
  main();
}

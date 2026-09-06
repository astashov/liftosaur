import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { ProseRules_extract, ProseRules_splice } from "./generate-prose-rules";

const ROOT = path.resolve(__dirname, "..");

type ISeverity = "error" | "warn";

interface IFinding {
  line: number;
  rule: string;
  severity: ISeverity;
  message: string;
}

const BANNED: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bload[- ]bearing\b/i, "name what depends on it"],
  [/\bsmoking gun\b/i, 'say "the cause is X"'],
  [/\bnorth star\b|\blodestar\b/i, "state the goal itself"],
  [/\bfootguns?\b|\bsharp edges?\b/i, 'say "calling this without X corrupts Y"'],
  [/\bescape hatch\b/i, "name the override"],
  [/\bmoving parts\b/i, "count them"],
  [/\bthe (whole|entire) point\b/i, "state the point"],
  [/\bcheap(ly|er)?\b|\bexpensive\b/i, "say the actual work, with a number"],
  [/\bfor free\b/i, 'say "no extra call", or what makes it free'],
  [/\bbuys us\b|\bpays for itself\b|\bearns its keep\b|\bcosts us\b/i, "state the benefit or cost"],
  [/\bnot just [^,.;]{2,40}[,]? but\b/i, "delete the first half, state the second"],
  [/\bis not [^,.;]{2,40}, it(?:'s| is)\b/i, "delete the first half, state the second"],
  [/\bisn't [^,.;—-]{2,40}[,—-] it's\b/i, "delete the first half, state the second"],
  [/\bless an? [^,.;]{2,40} than an?\b/i, "delete the first half, state the second"],
  [/\bactually\b|\bgenuinely\b|\bprecisely\b|\bcrucially\b|\bcritically\b/i, "delete it, or use a number"],
  [/\bimportantly\b|\bfundamentally\b|\bessentially\b|\bmerely\b|\btruly\b/i, "delete it, or use a number"],
  [/\bdramatically\b|\bsignificantly\b|\bmassively\b|\bwildly\b/i, "use a number"],
  [/\bhere's the thing\b|\bthe key insight\b|\bworth noting\b|\bnote that\b/i, "say the thing instead"],
  [/\bto be clear\b|\bthat said\b|\bin other words\b|\bwhich is to say\b/i, "say the thing instead"],
  [/\bat its core\b|\bthe real question is\b/i, "say the thing instead"],
  [/\brobust\b|\bseamless\b|\belegant\b|\bsurgical\b|\bcomprehensive\b/i, "describe the mechanism"],
  [/\bleverage[sd]?\b|\bprincipled\b|\bnuanced\b|\bdelve[sd]?\b/i, "describe the mechanism"],
];

const BUDGETS: ReadonlyArray<readonly [RegExp, number, string]> = [
  [/\bdeliberate(ly)?\b/gi, 3, "deliberate"],
  [/\bby construction\b/gi, 2, "by construction"],
  [/\bfirst[- ]class\b/gi, 1, "first-class"],
];

/** Fenced blocks and inline code spans become blanks, so a doc may quote a banned word in backticks. */
function maskCode(lines: readonly string[]): string[] {
  let inFence = false;
  return lines.map((raw) => {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      return "";
    }
    if (inFence) return "";
    return raw.replace(/``[\s\S]*?``/g, " ").replace(/`[^`]*`/g, " ");
  });
}

/**
 * Notation checks run here instead of on the fully masked text: `// :N` lives inside fences, and a
 * numeric link writes its number in single backticks inside the link text. Only ``…`` spans are
 * blanked, which is how a doc quotes a whole bad example without tripping the rule it illustrates.
 */
function maskQuotedExamples(lines: readonly string[]): string[] {
  return lines.map((raw) => raw.replace(/``[\s\S]*?``/g, " "));
}

function fenceMask(lines: readonly string[]): boolean[] {
  let inFence = false;
  return lines.map((raw) => {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      return true;
    }
    return inFence;
  });
}

function isProseLine(raw: string): boolean {
  if (raw.trim() === "") return false;
  if (/^\s/.test(raw)) return false;
  if (/^[-*+]\s/.test(raw)) return false;
  if (/^\d+[.)]\s/.test(raw)) return false;
  if (/^#{1,6}\s/.test(raw)) return false;
  if (/^>/.test(raw)) return false;
  if (/^\|/.test(raw)) return false;
  if (/^<!--/.test(raw)) return false;
  if (/^\s*(```|~~~)/.test(raw)) return false;
  return true;
}

/** Closing markup may sit between the stop and the space: `…the boundary.**` still ends a sentence. */
const SENTENCE_END = /[.!?][*`)"'\]]*(?:\s|$)/g;

function sentenceCount(text: string): number {
  const stripped = text.replace(/\b[A-Za-z]\.[A-Za-z]\./g, "X").replace(/\be\.g\.|\bi\.e\./gi, "X");
  const matches = stripped.match(SENTENCE_END);
  return matches ? matches.length : 1;
}

function headStamp(lines: readonly string[]): string | undefined {
  for (const raw of lines.slice(0, 12)) {
    const explicit = raw.match(/\bhead\s+`?([0-9a-f]{7,40})`?/i);
    if (explicit) return explicit[1];
    const legacy = raw.match(/@\s*`([0-9a-f]{7,40})`/);
    if (legacy) return legacy[1];
  }
  return undefined;
}

function gitFileLineCount(sha: string, relPath: string): number | undefined {
  try {
    const out = execFileSync("git", ["show", `${sha}:${relPath}`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    return out.toString("utf8").split("\n").length;
  } catch {
    return undefined;
  }
}

function checkProseBlockFresh(): IFinding[] {
  const source = fs.readFileSync(path.join(ROOT, "PROSE.md"), "utf8");
  const block = ProseRules_extract(source);
  const stale: string[] = [];
  for (const rel of ["CLAUDE.md", ".claude/skills/archdoc/SKILL.md", ".claude/skills/feature/SKILL.md"]) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const current = fs.readFileSync(file, "utf8");
    const next = ProseRules_splice(current, block);
    if (next == null || next !== current) stale.push(rel);
  }
  if (stale.length === 0) return [];
  return [
    {
      line: 1,
      rule: "stale-prose-block",
      severity: "error",
      message: `out of date with PROSE.md: ${stale.join(", ")} — run npx ts-node scripts/generate-prose-rules.ts`,
    },
  ];
}

export function LintDocs_check(file: string, text: string): IFinding[] {
  const findings: IFinding[] = [];
  const lines = text.split("\n");
  const masked = maskCode(lines);
  const notation = maskQuotedExamples(lines);
  const inFence = fenceMask(lines);
  const add = (line: number, rule: string, severity: ISeverity, message: string): void => {
    findings.push({ line, rule, severity, message });
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    const m = masked[i];

    if (/\/\/\s*:\d+/.test(notation[i])) {
      add(n, "inline-line-number", "error", "`// :N` carries no information — link the symbol in the API list");
    }
    if (/\[\s*`?:?\d+`?\s*\]\(/.test(notation[i])) {
      add(n, "numeric-link-text", "error", "link text is a number — use the symbol name or the behaviour");
    }
    if (/§/.test(m) || /\bsections?\s+\d/i.test(m)) {
      add(n, "section-ref", "error", "reference the section by name as a link, never by number");
    }
    if (/\b(see above|as mentioned above|as discussed|per the above)\b/i.test(m)) {
      add(n, "vague-backref", "error", "name what you are pointing at");
    }
    if (!inFence[i] && /^\|/.test(raw)) {
      add(n, "pipe-table", "error", "no pipe tables — use a list");
    }
    if (!inFence[i] && (/- \[[ x]\].*- \[[ x]\]/.test(raw) || /^\s*[-*+]\s.*\s{2,}[-*+]\s\S/.test(raw))) {
      add(n, "multi-item-line", "error", "one list item per line");
    }
    if (isProseLine(raw) && !inFence[i] && i > 0 && isProseLine(lines[i - 1]) && !inFence[i - 1]) {
      add(n, "wrapped-paragraph", "error", "one paragraph per line, no hard wrap");
    }
    for (const [pattern, fix] of BANNED) {
      const hit = m.match(pattern);
      if (hit) add(n, "banned-word", "error", `"${hit[0].trim()}" — ${fix}`);
    }
    if (isProseLine(raw) && sentenceCount(m) > 6) {
      add(n, "long-paragraph", "warn", `${sentenceCount(m)} sentences — split it`);
    }
    if (isProseLine(raw)) {
      for (const sentence of m.split(SENTENCE_END)) {
        const words = sentence.trim().split(/\s+/).filter(Boolean).length;
        if (words > 45) add(n, "long-sentence", "warn", `${words}-word sentence`);
      }
    }
  });

  const maskedAll = masked.join("\n");
  for (const [pattern, cap, label] of BUDGETS) {
    const hits = maskedAll.match(pattern);
    if (hits && hits.length > cap) {
      add(1, "budget", "warn", `"${label}" used ${hits.length} times, budget is ${cap}`);
    }
  }
  const dashes = (maskedAll.match(/—/g) || []).length;
  const dashBudget = Math.floor(lines.length / 8);
  if (dashes > dashBudget) {
    add(1, "budget", "warn", `${dashes} em-dashes over ${lines.length} lines, budget is ${dashBudget}`);
  }

  findings.push(...checkRunBlockSymbols(lines, inFence, text));
  findings.push(...checkAnchors(file, lines, masked));
  return findings;
}

/** A "How it runs" fence shows shape; every symbol in it must be linked somewhere in the same doc. */
function checkRunBlockSymbols(lines: readonly string[], inFence: readonly boolean[], text: string): IFinding[] {
  const findings: IFinding[] = [];
  let underRunHeading = false;
  const linked = new Set<string>();
  for (const link of text.matchAll(/\[([^\]]+)\]\(/g)) {
    for (const token of link[1].matchAll(/[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+|use[A-Z][A-Za-z0-9]{2,}/g)) {
      linked.add(token[0]);
    }
  }
  lines.forEach((raw, i) => {
    if (/^#{2,6}\s/.test(raw)) underRunHeading = /how it runs/i.test(raw);
    if (!underRunHeading || !inFence[i] || /^\s*(```|~~~)/.test(raw)) return;
    for (const token of raw.matchAll(/[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+|use[A-Z][A-Za-z0-9]{2,}/g)) {
      if (!linked.has(token[0])) {
        findings.push({
          line: i + 1,
          rule: "unlinked-symbol",
          severity: "error",
          message: `${token[0]} appears in a How it runs block but is never linked in this doc`,
        });
      }
    }
  });
  return findings;
}

function checkAnchors(file: string, lines: readonly string[], masked: readonly string[]): IFinding[] {
  const sha = headStamp(lines);
  if (!sha) return [];
  const findings: IFinding[] = [];
  const dir = path.dirname(file);
  const counts = new Map<string, number | undefined>();
  const targets = (m: string): Array<[string, string | undefined]> => {
    const out: Array<[string, string | undefined]> = [];
    for (const l of m.matchAll(/\]\((\.\.[^)#\s]*)(?:#L(\d+)(?:-L?(\d+))?)?\)/g)) {
      out.push([path.relative(ROOT, path.resolve(dir, l[1])), l[3] ?? l[2]]);
    }
    // Archdoc routes carry the same claim as a relative link and must rot the same way.
    for (const l of m.matchAll(/archdoc\/(?:diff|open)\?[^)\s]*?file=([^&)\s]+)(?:&line=(\d+)(?:-(\d+))?)?/g)) {
      out.push([decodeURIComponent(l[1]), l[3] ?? l[2]]);
    }
    return out;
  };
  masked.forEach((m, i) => {
    for (const link of targets(m)) {
      const rel = link[0];
      if (!counts.has(rel)) counts.set(rel, gitFileLineCount(sha, rel));
      const total = counts.get(rel);
      if (total == null) {
        findings.push({ line: i + 1, rule: "dead-path", severity: "error", message: `${rel} does not exist at ${sha}` });
      } else if (link[1] && Number(link[1]) > total) {
        findings.push({
          line: i + 1,
          rule: "dead-anchor",
          severity: "error",
          message: `${rel}:${link[1]} is past end of file (${total} lines) at ${sha}`,
        });
      }
    }
  });
  return findings;
}

function main(): void {
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const quiet = process.argv.includes("--quiet");
  if (files.length === 0) {
    console.error("usage: lint-docs.ts <file.md...> [--quiet]");
    process.exit(2);
  }

  let errors = 0;
  let warnings = 0;
  const blockFindings = checkProseBlockFresh();
  for (const f of blockFindings) {
    errors += 1;
    console.error(`PROSE.md:1  ${f.rule}  ${f.message}`);
  }

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const findings = LintDocs_check(path.resolve(file), fs.readFileSync(file, "utf8"));
    const rel = path.relative(ROOT, path.resolve(file));
    for (const f of findings.sort((a, b) => a.line - b.line)) {
      if (f.severity === "error") errors += 1;
      else warnings += 1;
      if (f.severity === "warn" && quiet) continue;
      const tag = f.severity === "error" ? "ERROR" : " warn";
      console.error(`${rel}:${f.line}  ${tag}  ${f.rule}  ${f.message}`);
    }
  }

  console.error(`\n${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) process.exit(1);
}

if (require.main === module) {
  main();
}

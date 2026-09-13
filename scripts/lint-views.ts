// The "Where logic lives" rule in CLAUDE.md, as a question rather than a gate. A function inside a
// component that returns no JSX and runs past 20 lines is probably a decision that belongs in a
// pure module. The agent judges; a function that stays goes in the baseline with the reason.
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(ROOT, "scripts", "lint-views-baseline.json");
const VIEW_DIRS = ["src/components", "src/navigation", "src/pages"];
const MAX_DECISION_LINES = 20;
const MAX_VIEW_LINES = 400;

interface IFinding {
  file: string;
  line: number;
  key: string;
  message: string;
}

type IBaseline = Record<string, Record<string, string>>;
const PREDATES_RULE = "predates the rule";

function listViews(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
        out.push(full);
      }
    }
  };
  for (const dir of VIEW_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
      walk(full);
    }
  }
  return out;
}

function isViewFile(file: string): boolean {
  const rel = path.relative(ROOT, file);
  return rel.endsWith(".tsx") && !rel.endsWith(".test.tsx") && VIEW_DIRS.some((d) => rel.startsWith(d + path.sep));
}

function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
    return true;
  }
  return ts.forEachChild(node, containsJsx) === true;
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node)
  );
}

// Keyed by name, or by callee and ordinal for callbacks, never by line: an edit above the
// function would otherwise turn every baseline entry stale and ask the question again.
function functionName(node: ts.FunctionLikeDeclaration, ordinals: Record<string, number>): string {
  if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name != null) {
    return node.name.getText();
  }
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    return parent.name.getText();
  }
  const base = ts.isCallExpression(parent) ? parent.expression.getText() : "anonymous";
  ordinals[base] = (ordinals[base] ?? 0) + 1;
  return `${base}#${ordinals[base]}`;
}

function bodyLines(source: ts.SourceFile, node: ts.FunctionLikeDeclaration): number {
  const body = node.body;
  if (body == null) {
    return 0;
  }
  const start = source.getLineAndCharacterOfPosition(body.getStart(source)).line;
  const end = source.getLineAndCharacterOfPosition(body.getEnd()).line;
  return end - start + 1;
}

function decisionsIn(source: ts.SourceFile, component: ts.FunctionLikeDeclaration, rel: string): IFinding[] {
  const findings: IFinding[] = [];
  const ordinals: Record<string, number> = {};
  const visit = (node: ts.Node): void => {
    if (node !== component && isFunctionLike(node) && node.body != null) {
      const lines = bodyLines(source, node);
      if (lines > MAX_DECISION_LINES && !containsJsx(node.body)) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        const name = functionName(node, ordinals);
        findings.push({
          file: rel,
          line,
          key: `decision-in-view:${name}`,
          message: `${name} is ${lines} lines and returns no JSX. Is it a decision that belongs in a pure module? If it stays, add it to the baseline with the reason.`,
        });
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(component, visit);
  return findings;
}

function isComponentOrHook(node: ts.Node): node is ts.FunctionLikeDeclaration {
  if (!isFunctionLike(node) || node.body == null) {
    return false;
  }
  const name = ts.isFunctionDeclaration(node)
    ? node.name?.text
    : ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)
      ? node.parent.name.text
      : undefined;
  if (name == null) {
    return false;
  }
  return /^use[A-Z]/.test(name) || containsJsx(node.body);
}

function lintFile(file: string): IFinding[] {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  const findings: IFinding[] = [];
  const lineCount = text.split("\n").length;
  if (lineCount > MAX_VIEW_LINES) {
    findings.push({
      file: rel,
      line: 1,
      key: "long-view",
      message: `${lineCount} lines, over ${MAX_VIEW_LINES}. Does this file hold more than one screen's responsibility? If it stays, add it to the baseline with the reason.`,
    });
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visitTop = (node: ts.Node): void => {
    if (isComponentOrHook(node)) {
      findings.push(...decisionsIn(source, node, rel));
      return;
    }
    ts.forEachChild(node, visitTop);
  };
  ts.forEachChild(source, visitTop);
  return findings;
}

function readBaseline(): IBaseline {
  if (!fs.existsSync(BASELINE_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

function writeBaseline(findings: IFinding[], previous: IBaseline): void {
  const baseline: IBaseline = {};
  for (const f of findings) {
    (baseline[f.file] ??= {})[f.key] = previous[f.file]?.[f.key] ?? PREDATES_RULE;
  }
  const sorted = Object.fromEntries(
    Object.keys(baseline)
      .sort()
      .map((file) => [
        file,
        Object.fromEntries(
          Object.keys(baseline[file])
            .sort()
            .map((key) => [key, baseline[file][key]])
        ),
      ])
  );
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const quiet = args.includes("--quiet");
  const updateBaseline = args.includes("--update-baseline");
  const requested = args.filter((a) => !a.startsWith("--")).map((a) => path.resolve(a));
  const files = requested.length > 0 ? requested.filter(isViewFile) : listViews();
  const findings = files.flatMap(lintFile);
  const baseline = readBaseline();
  if (updateBaseline) {
    const all = requested.length > 0 ? listViews().flatMap(lintFile) : findings;
    writeBaseline(all, baseline);
    console.error(`baseline: ${all.length} finding(s) in ${new Set(all.map((f) => f.file)).size} file(s)`);
    return;
  }
  const fresh = findings.filter((f) => baseline[f.file]?.[f.key] == null);
  const kept = findings.length - fresh.length;
  for (const f of fresh) {
    console.error(`${f.file}:${f.line}  WARN  ${f.key.split(":")[0]}  ${f.message}`);
  }
  if (!quiet) {
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const seen = new Set(findings.filter((f) => f.file === rel).map((f) => f.key));
      for (const key of Object.keys(baseline[rel] ?? {})) {
        if (!seen.has(key)) {
          console.error(`${rel}:1  INFO  stale-baseline  ${key} no longer fires; remove it from the baseline.`);
        }
      }
    }
    console.error(`\n${fresh.length} warning(s), ${kept} kept in the baseline`);
  }
  if (fresh.length > 0) {
    process.exit(1);
  }
}

main();

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const SNAPSHOTS = path.join(ROOT, ".archdoc-snapshots");

const SPARSE_PATHS_FILE = path.join(__dirname, "archdoc-sparse-paths.txt");

export function ArchdocSnapshot_sparsePatterns(): string[] {
  return fs
    .readFileSync(SPARSE_PATHS_FILE, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

function git(args: string[], cwd: string = ROOT): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function ArchdocSnapshot_path(sha: string): string {
  return path.join(SNAPSHOTS, sha);
}

export function ArchdocSnapshot_ensure(sha: string): string {
  const dir = ArchdocSnapshot_path(sha);
  if (fs.existsSync(path.join(dir, "src"))) return dir;

  const full = git(["rev-parse", sha]);
  fs.mkdirSync(SNAPSHOTS, { recursive: true });
  // Deleting .archdoc-snapshots by hand leaves the registration behind, and `worktree add` then
  // refuses the path as already registered. Prune first so a hand-deleted snapshot self-heals.
  git(["worktree", "prune"]);
  if (fs.existsSync(dir)) {
    git(["worktree", "remove", "--force", dir]);
  }
  git(["worktree", "add", "--detach", "--no-checkout", dir, full]);
  git(["sparse-checkout", "set", "--no-cone", ...ArchdocSnapshot_sparsePatterns()], dir);
  git(["checkout"], dir);

  // Without this the TypeScript language service in the snapshot cannot resolve any import, so
  // go-to-definition dies at the first node_modules type — which is the reason snapshots exist.
  const modules = path.join(dir, "node_modules");
  if (!fs.existsSync(modules)) {
    fs.symlinkSync(path.join(ROOT, "node_modules"), modules, "dir");
  }
  return dir;
}

export function ArchdocSnapshot_list(): string[] {
  if (!fs.existsSync(SNAPSHOTS)) return [];
  return fs.readdirSync(SNAPSHOTS).filter((n) => /^[0-9a-f]{7,40}$/.test(n));
}

function shasReferencedByArchdocs(): Set<string> {
  const dir = path.join(ROOT, "lambda/scripts/archdocs");
  const shas = new Set<string>();
  if (!fs.existsSync(dir)) return shas;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const head = fs.readFileSync(path.join(dir, name), "utf8").split("\n").slice(0, 12).join("\n");
    for (const m of head.matchAll(/\b(?:base|head)\s+`([0-9a-f]{7,40})`/gi)) shas.add(m[1]);
  }
  return shas;
}

export function ArchdocSnapshot_prune(): string[] {
  const keep = shasReferencedByArchdocs();
  const removed: string[] = [];
  for (const sha of ArchdocSnapshot_list()) {
    if (keep.has(sha)) continue;
    git(["worktree", "remove", "--force", ArchdocSnapshot_path(sha)]);
    removed.push(sha);
  }
  return removed;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === "--prune") {
    const removed = ArchdocSnapshot_prune();
    console.log(removed.length ? `pruned: ${removed.join(", ")}` : "nothing to prune");
    return;
  }
  if (args[0] === "--list") {
    for (const sha of ArchdocSnapshot_list()) console.log(sha, ArchdocSnapshot_path(sha));
    return;
  }
  if (!args[0]) {
    console.error("usage: archdoc-snapshot.ts <sha> | --list | --prune");
    process.exit(2);
  }
  console.log(ArchdocSnapshot_ensure(args[0]));
}

if (require.main === module) {
  main();
}

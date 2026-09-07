import * as fs from "fs";
import * as path from "path";

const START = "<!-- prose:start -->";
const END = "<!-- prose:end -->";

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "PROSE.md");
// The archdoc skill left this repo for the graspcode plugin, which serves every repo and cannot
// carry one repo's writing rules. CLAUDE.md is where an agent writing an archdoc reads them now.
const TARGETS = ["CLAUDE.md", ".claude/skills/feature/SKILL.md"];

export function ProseRules_extract(source: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`PROSE.md is missing ${START} / ${END}`);
  }
  return source.slice(start + START.length, end).trim();
}

export function ProseRules_splice(target: string, block: string): string {
  const start = target.indexOf(START);
  const end = target.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    return undefined as unknown as string;
  }
  return `${target.slice(0, start)}${START}\n\n${block}\n\n${target.slice(end)}`;
}

function main(): void {
  const check = process.argv.includes("--check");
  const block = ProseRules_extract(fs.readFileSync(SOURCE, "utf8"));
  let drifted = 0;

  for (const rel of TARGETS) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      console.error(`missing target: ${rel}`);
      drifted += 1;
      continue;
    }
    const current = fs.readFileSync(file, "utf8");
    const next = ProseRules_splice(current, block);
    if (next == null) {
      console.error(`${rel}: no ${START} / ${END} markers`);
      drifted += 1;
      continue;
    }
    if (next === current) {
      console.log(`${rel}: up to date`);
      continue;
    }
    drifted += 1;
    if (check) {
      console.error(`${rel}: OUT OF DATE with PROSE.md`);
    } else {
      fs.writeFileSync(file, next);
      console.log(`${rel}: updated`);
    }
  }

  if (check && drifted > 0) {
    console.error(`\n${drifted} target(s) out of date. Run: npx ts-node scripts/generate-prose-rules.ts`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

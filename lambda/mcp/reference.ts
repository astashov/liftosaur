import * as fs from "fs";
import * as path from "path";

let cachedLiftoscriptReference: string | undefined;
let cachedLiftoscriptExamples: string | undefined;
let cachedLiftohistoryReference: string | undefined;
let cachedExercisesList: string[] | undefined;

function resolveBaseDir(): string {
  const bundled = path.join(__dirname, "..");
  if (fs.existsSync(path.join(bundled, "llms"))) {
    return bundled;
  }
  return path.join(__dirname, "..", "..");
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(resolveBaseDir(), relativePath), "utf8");
}

export function McpReference_getLiftoscriptReference(): string {
  if (cachedLiftoscriptReference) {
    return cachedLiftoscriptReference;
  }

  cachedLiftoscriptReference = readFile("llms/liftoscript_llm.md");
  return cachedLiftoscriptReference;
}

export function McpReference_getLiftoscriptExamples(): string {
  if (cachedLiftoscriptExamples) {
    return cachedLiftoscriptExamples;
  }

  cachedLiftoscriptExamples = [
    "# Complete Liftoscript Program Examples\n",
    readFile("llms/liftoscript_examples.md"),
  ].join("\n");

  return cachedLiftoscriptExamples;
}

export function McpReference_getLiftohistoryReference(): string {
  if (cachedLiftohistoryReference) {
    return cachedLiftohistoryReference;
  }

  cachedLiftohistoryReference = `# Liftohistory Format Reference

Liftohistory is a human-readable text format for workout history records in Liftosaur.

## Format

\`\`\`
// Optional workout note
2026-02-28T10:45:30Z / program: "5/3/1 For Beginners" / dayName: "Push Day" / week: 1 / dayInWeek: 5 / duration: 1235s / exercises: {
  // Optional exercise note
  Bench Press, Barbell / 3x8 185lb @7, 1x6 185lb @9 / warmup: 1x10 95lb, 1x5 135lb / target: 3x8-12 185lb @8 90s
  OHP / 3x10 95lb / target: 3x10 95lb 60s
  Pull Ups / 3x8|7 0lb / target: 3x10 0lb 60s
}
\`\`\`

## Syntax Details

### Workout Header
\`date / program: "name" / dayName: "name" / week: N / dayInWeek: N / duration: Ns / exercises: {\`
- Date is ISO 8601 format
- All metadata fields are optional except the exercises block

### Exercise Line
\`ExerciseName[, Equipment] / completed sets / warmup: sets / target: sets\`

### Set Notation
- \`3x8 185lb\` — 3 sets of 8 reps at 185lb
- \`1x5+ 185lb\` — AMRAP set (5+ reps)
- \`3x8 185lb @7\` — with RPE
- \`3x8 185lb @8+\` — with logged RPE
- \`3x8|7 0lb\` — unilateral: 8 right, 7 left
- Units always explicit: \`lb\` or \`kg\`

### Sections
- Completed sets come first (what user actually did)
- \`warmup:\` prefix for warmup sets
- \`target:\` prefix for prescribed sets (timer is inline, e.g. \`3x8 185lb 90s\`)

### Notes
- \`//\` at start of line = workout or exercise note
- Workouts separated by blank lines
- Closing \`}\` on its own line
`;

  return cachedLiftohistoryReference;
}

export function McpReference_listBuiltinPrograms(): { id: string; name: string }[] {
  const dir = path.join(resolveBaseDir(), "programs", "builtin");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf8");
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const name = nameMatch ? nameMatch[1].replace(/^["']|["']$/g, "") : f.replace(".md", "");
    return { id: f.replace(".md", ""), name };
  });
}

export function McpReference_getBuiltinProgram(id: string): string | undefined {
  const filePath = path.join(resolveBaseDir(), "programs", "builtin", `${id}.md`);
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export function McpReference_listExercises(): string[] {
  if (!cachedExercisesList) {
    const content = readFile("llms/exercises.md");
    cachedExercisesList = content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => line.trim());
  }
  return cachedExercisesList;
}

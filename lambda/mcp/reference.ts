import * as fs from "fs";
import * as path from "path";

let cachedLiftoscriptReference: string | undefined;
let cachedLiftohistoryReference: string | undefined;

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", "..", relativePath), "utf8");
}

function extractSkillPatterns(skillContent: string): string {
  const patternsStart = skillContent.indexOf("## Idiomatic Liftoscript Patterns");
  if (patternsStart === -1) {
    return "";
  }
  let text = skillContent.substring(patternsStart);

  text = text.replace(
    /## Validation[\s\S]*?```bash[\s\S]*?```/,
    "## Validation\n\nAfter writing a program, ALWAYS use the `run_playground` tool to validate it. Pass the program text and check for errors. Use the `finish_workout()` command to test progression logic."
  );

  return text;
}

export function McpReference_getLiftoscriptReference(): string {
  if (cachedLiftoscriptReference) {
    return cachedLiftoscriptReference;
  }

  const liftoscriptMd = readFile("llms/liftoscript.md");
  const examplesMd = readFile("llms/liftoscript_examples.md");
  const skillContent = readFile(".claude/skills/liftoscript/SKILL.md");
  const skillPatterns = extractSkillPatterns(skillContent);

  cachedLiftoscriptReference = [
    "# Liftoscript Language Reference\n",
    liftoscriptMd,
    "\n\n# Complete Program Examples\n",
    examplesMd,
    "\n\n# Writing Guidelines\n",
    skillPatterns,
  ].join("\n");

  return cachedLiftoscriptReference;
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

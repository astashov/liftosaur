import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { runClaudeInDocker } from "../shared/docker-claude";

const PROJECT_DIR = path.resolve(__dirname, "..", "..");
const LOG_DIR = path.join(PROJECT_DIR, "logs", "program-orchestrator");
const TIMEOUT_MS = 90 * 60 * 1000;
const REVIEW_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_PROGRAMS = 5;

const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
let logFile: fs.WriteStream;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  logFile?.write(line + "\n");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function runGhCommand(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn("gh", args, { cwd: PROJECT_DIR });
    let output = "";
    proc.stdout.on("data", (data) => (output += data));
    proc.stderr.on("data", () => {});
    proc.on("close", () => resolve(output.trim()));
  });
}

interface IProgramPR {
  number: number;
  title: string;
  state: string;
  headRefName: string;
}

async function fetchProgramPRs(): Promise<IProgramPR[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const raw = await runGhCommand([
    "pr",
    "list",
    "--repo",
    "astashov/liftosaur",
    "--state",
    "all",
    "--search",
    `add-program in:title created:>=${since}`,
    "--json",
    "number,title,state,headRefName",
  ]);

  try {
    return JSON.parse(raw || "[]");
  } catch {
    log("Warning: failed to parse GitHub PR list");
    return [];
  }
}

async function getPRNumber(slug: string): Promise<number | null> {
  const output = await runGhCommand([
    "api",
    `repos/astashov/liftosaur/pulls?state=open&head=astashovai:add-program/${slug}`,
    "--jq",
    ".[0].number",
  ]);

  const num = parseInt(output, 10);
  return isNaN(num) ? null : num;
}

async function main(): Promise<void> {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const mainLogPath = path.join(LOG_DIR, `${runId}.log`);
  logFile = fs.createWriteStream(mainLogPath);
  log("=== Program Orchestrator Started ===");
  log(`Project: ${PROJECT_DIR}`);
  log(`Run ID: ${runId}`);
  log(`Main log: ${mainLogPath}`);

  log("Pulling latest master...");
  await new Promise<void>((resolve) => {
    const proc = spawn("git", ["pull", "--ff-only", "origin", "master"], { cwd: PROJECT_DIR });
    proc.on("close", () => resolve());
  });

  const todoPath = path.join(PROJECT_DIR, "PROGRAMSTODO.md");
  if (!fs.existsSync(todoPath)) {
    log("PROGRAMSTODO.md not found, nothing to do");
    logFile.end();
    return;
  }

  const programs = fs
    .readFileSync(todoPath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  log(`Found ${programs.length} programs in PROGRAMSTODO.md`);

  log("Fetching existing program PRs from GitHub...");
  const existingPRs = await fetchProgramPRs();
  log(`Found ${existingPRs.length} existing program PRs`);

  const existingBranches = new Set(existingPRs.map((pr) => pr.headRefName));

  let writtenCount = 0;

  for (const programName of programs) {
    if (writtenCount >= MAX_PROGRAMS) {
      break;
    }

    const slug = slugify(programName);
    log("");
    log(`--- Checking: ${programName} (slug: ${slug}) ---`);

    if (existingBranches.has(`add-program/${slug}`)) {
      log(`  Skipping: PR already exists with branch add-program/${slug}`);
      continue;
    }

    const programFile = path.join(PROJECT_DIR, "programs", "builtin", `${slug}.md`);
    if (fs.existsSync(programFile)) {
      log(`  Skipping: file already exists at programs/builtin/${slug}.md`);
      continue;
    }

    log(`=== Writing program: ${programName} ===`);

    const startTime = Date.now();
    const fixLogPath = path.join(LOG_DIR, `${runId}-write-${slug}.log`);
    log(`Log file: ${fixLogPath}`);
    const result = await runClaudeInDocker(
      {
        command: `/write-program ${slug} ${programName}`,
        logFilePath: fixLogPath,
        timeoutMs: TIMEOUT_MS,
      },
      log
    );
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      log(`Write command failed or timed out after ${duration}s`);
      continue;
    }

    log(`Write completed in ${duration}s`);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const prNumber = await getPRNumber(slug);
    if (prNumber) {
      log(`PR #${prNumber} created for program ${programName}`);

      log(`Running review-pr command on PR #${prNumber}...`);
      const reviewLogPath = path.join(LOG_DIR, `${runId}-review-${prNumber}.log`);
      log(`Log file: ${reviewLogPath}`);
      const reviewResult = await runClaudeInDocker(
        {
          command: `/review-pr ${prNumber}`,
          logFilePath: reviewLogPath,
          timeoutMs: REVIEW_TIMEOUT_MS,
        },
        log
      );

      if (reviewResult.success) {
        log(`Review completed for PR #${prNumber}`);
      } else {
        log(`Review failed or timed out for PR #${prNumber}`);
      }

      writtenCount += 1;
    } else {
      log("No PR found after write command - may have failed");
    }
  }

  log("");
  log("=== Program Orchestrator Complete ===");
  log(`Written: ${writtenCount} program(s)`);

  logFile.end();
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});

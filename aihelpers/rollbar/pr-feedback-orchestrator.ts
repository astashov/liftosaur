import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { prefetchOccurrenceData, cleanupPrefetchDir } from "../shared/prefetch";
import { runClaudeInDocker } from "../shared/docker-claude";

const PROJECT_DIR = path.resolve(__dirname, "..", "..");
const LOG_DIR = path.join(PROJECT_DIR, "logs", "pr-feedback-orchestrator");
const TIMEOUT_MS = 60 * 60 * 1000;

interface IPRInfo {
  number: number;
  title: string;
  headRefName: string;
}

interface IComment {
  createdAt: string;
  author: { login: string };
  body: string;
}

const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
let logFile: fs.WriteStream;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  logFile?.write(line + "\n");
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

async function getOpenRollbarPRs(): Promise<IPRInfo[]> {
  const raw = await runGhCommand([
    "pr",
    "list",
    "--repo",
    "astashov/liftosaur",
    "--state",
    "open",
    "--search",
    "fix-rollbar in:title",
    "--json",
    "number,title,headRefName",
  ]);

  try {
    return JSON.parse(raw || "[]");
  } catch {
    log("Warning: failed to parse GitHub PR list");
    return [];
  }
}

async function getLastCommitDate(prNumber: number): Promise<string | null> {
  const raw = await runGhCommand([
    "pr",
    "view",
    String(prNumber),
    "--repo",
    "astashov/liftosaur",
    "--json",
    "commits",
    "--jq",
    ".commits[-1].committedDate",
  ]);

  return raw || null;
}

async function getCommentsAfterDate(prNumber: number, afterDate: string): Promise<IComment[]> {
  const reviewCommentsRaw = await runGhCommand([
    "api",
    `repos/astashov/liftosaur/pulls/${prNumber}/comments`,
    "--jq",
    `.[] | select(.created_at > "${afterDate}") | {createdAt: .created_at, author: {login: .user.login}, body: .body}`,
  ]);

  const issueCommentsRaw = await runGhCommand([
    "pr",
    "view",
    String(prNumber),
    "--repo",
    "astashov/liftosaur",
    "--json",
    "comments",
    "--jq",
    `.comments[] | select(.createdAt > "${afterDate}") | {createdAt, author: {login: .author.login}, body}`,
  ]);

  const comments: IComment[] = [];

  for (const raw of [reviewCommentsRaw, issueCommentsRaw]) {
    if (!raw) {
      continue;
    }
    for (const line of raw.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      try {
        comments.push(JSON.parse(line));
      } catch {
        continue;
      }
    }
  }

  return comments.filter(
    (c) =>
      c.author.login !== "astashovai" &&
      !c.body.includes("Automated follow-up by Claude Code") &&
      !c.body.includes("Automated Code Review")
  );
}

function extractOccurrenceId(headRefName: string): string | null {
  const match = headRefName.match(/^fix\/rollbar-(\d+)$/);
  return match ? match[1] : null;
}

async function main(): Promise<void> {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const mainLogPath = path.join(LOG_DIR, `${runId}.log`);
  logFile = fs.createWriteStream(mainLogPath);
  log("=== PR Feedback Orchestrator Started ===");
  log(`Project: ${PROJECT_DIR}`);
  log(`Run ID: ${runId}`);

  log("Fetching open fix/rollbar-* PRs...");
  const prs = await getOpenRollbarPRs();
  log(`Found ${prs.length} open rollbar fix PRs`);

  if (prs.length === 0) {
    log("No open PRs to check");
    logFile.end();
    return;
  }

  let addressedCount = 0;

  for (const pr of prs) {
    log("");
    log(`--- Checking PR #${pr.number}: ${pr.title} ---`);

    const lastCommitDate = await getLastCommitDate(pr.number);
    if (!lastCommitDate) {
      log(`  Could not get last commit date, skipping`);
      continue;
    }
    log(`  Last commit: ${lastCommitDate}`);

    const newComments = await getCommentsAfterDate(pr.number, lastCommitDate);
    if (newComments.length === 0) {
      log(`  No new comments after last commit, skipping`);
      continue;
    }

    log(`  Found ${newComments.length} new comment(s) to address:`);
    for (const c of newComments) {
      log(`    - [${c.author.login}] ${c.body.slice(0, 100).replace(/\n/g, " ")}...`);
    }

    const occurrenceId = extractOccurrenceId(pr.headRefName);
    let prefetchDir: string | undefined;

    if (occurrenceId) {
      log(`  Pre-fetching data for occurrence ${occurrenceId}...`);
      const prefetch = await prefetchOccurrenceData(occurrenceId, log);
      if (prefetch.rollbar) {
        prefetchDir = prefetch.dir;
      } else {
        log(`  Pre-fetch failed, proceeding without pre-fetched data`);
        cleanupPrefetchDir(prefetch.dir);
      }
    } else {
      log(`  Could not extract occurrence ID from branch ${pr.headRefName}, skipping pre-fetch`);
    }

    const feedbackLogPath = path.join(LOG_DIR, `${runId}-pr-${pr.number}.log`);
    log(`  Running /address-pr-feedback ${pr.number}...`);
    const startTime = Date.now();
    const result = await runClaudeInDocker(
      {
        command: `/address-pr-feedback ${pr.number}`,
        logFilePath: feedbackLogPath,
        timeoutMs: TIMEOUT_MS,
        prefetchDir,
      },
      log
    );
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (prefetchDir) {
      cleanupPrefetchDir(prefetchDir);
    }

    if (result.success) {
      log(`  Feedback addressed in ${duration}s`);
      addressedCount += 1;
    } else {
      log(`  Failed or timed out after ${duration}s`);
    }
  }

  log("");
  log("=== PR Feedback Orchestrator Complete ===");
  log(`Addressed feedback on ${addressedCount} PR(s)`);

  logFile.end();
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});

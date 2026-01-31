import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PROJECT_DIR = path.resolve(__dirname, "..");
const LOG_DIR = path.join(PROJECT_DIR, "logs", "rollbar-orchestrator");
const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour per fix
const MAX_FIXES = 3;
const REVIEW_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for review

interface RollbarItem {
  id: number;
  title: string;
  occurrences: number;
}

interface RollbarOccurrence {
  id: number;
  itemId: number;
  title: string;
}

interface GitHubPR {
  number: number;
  title: string;
  headRefName: string;
}

const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
let logFile: fs.WriteStream;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  logFile?.write(line + "\n");
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function getTopActiveItems(): Promise<RollbarItem[]> {
  const token = process.env.ROLLBAR_READ_TOKEN;
  if (!token) {
    throw new Error("ROLLBAR_READ_TOKEN not set");
  }

  const response = await fetchJson<{
    err: number;
    result: Array<{ item: { id: number; title: string; occurrences: number } }>;
  }>("https://api.rollbar.com/api/1/reports/top_active_items?sort=occurrences", {
    "X-Rollbar-Access-Token": token,
  });

  return response.result.map((r) => ({
    id: r.item.id,
    title: r.item.title,
    occurrences: r.item.occurrences,
  }));
}

async function getOccurrenceForItem(itemId: number): Promise<number | null> {
  const token = process.env.ROLLBAR_READ_TOKEN;
  if (!token) {
    throw new Error("ROLLBAR_READ_TOKEN not set");
  }

  const response = await fetchJson<{
    result: { instances: Array<{ id: number }> };
  }>(`https://api.rollbar.com/api/1/item/${itemId}/instances?page=1`, {
    "X-Rollbar-Access-Token": token,
  });

  return response.result.instances[0]?.id ?? null;
}

async function getExistingPRs(): Promise<Set<string>> {
  const existingIds = new Set<string>();

  const runGh = (args: string[]): Promise<GitHubPR[]> => {
    return new Promise((resolve) => {
      const proc = spawn("gh", ["pr", "list", "--repo", "astashov/liftosaur", ...args], {
        cwd: PROJECT_DIR,
      });

      let output = "";
      proc.stdout.on("data", (data) => (output += data));
      proc.on("close", () => {
        try {
          resolve(JSON.parse(output || "[]"));
        } catch {
          resolve([]);
        }
      });
    });
  };

  const [openPRs, mergedPRs] = await Promise.all([
    runGh(["--state", "open", "--json", "number,title,headRefName"]),
    runGh(["--state", "merged", "--limit", "50", "--json", "number,title,headRefName"]),
  ]);

  for (const pr of [...openPRs, ...mergedPRs]) {
    const match = pr.headRefName.match(/rollbar-(\d+)/);
    if (match) {
      existingIds.add(match[1]);
    }
  }

  return existingIds;
}

function runClaudeCommand(
  command: string,
  timeoutMs: number,
  logFilePath?: string
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(PROJECT_DIR, "scripts", "claude-stream.sh");
    const args = logFilePath ? [command, "-l", logFilePath] : [command];

    log(`Running: ${scriptPath} "${command}"${logFilePath ? ` -l ${logFilePath}` : ""}`);

    const proc = spawn(scriptPath, args, {
      cwd: PROJECT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      log("Command timed out, killing process...");
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
    }, timeoutMs);

    proc.stdout.on("data", (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    proc.stderr.on("data", (data) => {
      output += data.toString();
      process.stderr.write(data);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: !killed && code === 0,
        output,
      });
    });
  });
}

async function getPRNumber(occurrenceId: number): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(
      "gh",
      [
        "pr",
        "list",
        "--repo",
        "astashov/liftosaur",
        "--state",
        "open",
        "--head",
        `fix/rollbar-${occurrenceId}`,
        "--json",
        "number",
        "--jq",
        ".[0].number",
      ],
      { cwd: PROJECT_DIR }
    );

    let output = "";
    proc.stdout.on("data", (data) => (output += data));
    proc.on("close", () => {
      const num = parseInt(output.trim(), 10);
      resolve(isNaN(num) ? null : num);
    });
  });
}

function cleanupWorktree(occurrenceId: number): void {
  spawn("git", ["worktree", "remove", `./worktrees/${occurrenceId}`], {
    cwd: PROJECT_DIR,
    stdio: "ignore",
  });
}

async function main(): Promise<void> {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const mainLogPath = path.join(LOG_DIR, `${runId}.log`);
  logFile = fs.createWriteStream(mainLogPath);
  log("=== Rollbar Orchestrator Started ===");
  log(`Project: ${PROJECT_DIR}`);
  log(`Run ID: ${runId}`);
  log(`Main log: ${mainLogPath}`);

  // Step 1: Get top active items
  log("Fetching top active items from Rollbar...");
  const items = await getTopActiveItems();
  log(`Found ${items.length} active items`);

  // Step 2: Get existing PRs
  log("Checking for existing Rollbar fix PRs...");
  const existingPRs = await getExistingPRs();
  log(`Found PRs for items: ${Array.from(existingPRs).join(", ")}`);

  // Step 3: Get candidates (items without PRs, with occurrence IDs)
  log("Getting occurrence IDs for top items...");
  const candidates: RollbarOccurrence[] = [];

  for (const item of items) {
    if (candidates.length >= 5) break;

    if (existingPRs.has(item.id.toString())) {
      log(`  Skipping item ${item.id} (already has PR): ${item.title}`);
      continue;
    }

    const occurrenceId = await getOccurrenceForItem(item.id);
    if (occurrenceId) {
      log(`  Item ${item.id} -> Occurrence ${occurrenceId}: ${item.title}`);
      candidates.push({ id: occurrenceId, itemId: item.id, title: item.title });
    } else {
      log(`  Could not get occurrence for item ${item.id}`);
    }
  }

  if (candidates.length === 0) {
    log("No items to fix (all have existing PRs or no occurrences found)");
    return;
  }

  log(`Found ${candidates.length} candidates to fix`);

  // Step 4: Fix top N items
  let fixedCount = 0;

  for (const candidate of candidates) {
    if (fixedCount >= MAX_FIXES) break;

    log("");
    log(`=== Processing fix ${fixedCount + 1}/${MAX_FIXES} ===`);
    log(`Occurrence: ${candidate.id}`);
    log(`Item: ${candidate.itemId}`);
    log(`Title: ${candidate.title}`);

    const startTime = Date.now();
    const fixLogPath = path.join(LOG_DIR, `${runId}-fix-${candidate.id}.log`);
    log(`Log file: ${fixLogPath}`);
    const result = await runClaudeCommand(`/fix-rollbar-error ${candidate.id}`, TIMEOUT_MS, fixLogPath);
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (!result.success) {
      log(`Fix command failed or timed out after ${duration}s`);
      cleanupWorktree(candidate.id);
      continue;
    }

    log(`Fix completed in ${duration}s`);

    // Wait a moment for GitHub to register the PR
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const prNumber = await getPRNumber(candidate.id);
    if (prNumber) {
      log(`PR #${prNumber} created for occurrence ${candidate.id}`);

      // Run review-pr command
      log(`Running review-pr command on PR #${prNumber}...`);
      const reviewLogPath = path.join(LOG_DIR, `${runId}-review-${prNumber}.log`);
      log(`Log file: ${reviewLogPath}`);
      const reviewResult = await runClaudeCommand(`/review-pr ${prNumber}`, REVIEW_TIMEOUT_MS, reviewLogPath);

      if (reviewResult.success) {
        log(`Review completed for PR #${prNumber}`);
      } else {
        log(`Review failed or timed out for PR #${prNumber}`);
      }

      fixedCount++;
    } else {
      log("No PR found after fix command - may have been ignored or failed");
    }
  }

  log("");
  log("=== Rollbar Orchestrator Complete ===");
  log(`Fixed: ${fixedCount} issues`);

  logFile.end();
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});

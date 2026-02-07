import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PROJECT_DIR = path.resolve(__dirname, "..");
const LOG_DIR = path.join(PROJECT_DIR, "logs", "rollbar-orchestrator");
const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour per fix
const MAX_FIXES = 3;
const REVIEW_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for review
const SIMILARITY_TIMEOUT_MS = 60 * 1000; // 1 minute for Claude similarity check

interface IRollbarItem {
  id: number;
  title: string;
  occurrences: number;
}

interface IRollbarOccurrence {
  id: number;
  itemId: number;
  title: string;
}

interface IRollbarPR {
  number: number;
  title: string;
  state: string;
  itemId: string | null;
  occurrenceId: string | null;
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

async function getTopActiveItems(): Promise<IRollbarItem[]> {
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

function runGhCommand(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn("gh", args, { cwd: PROJECT_DIR });
    let output = "";
    proc.stdout.on("data", (data) => (output += data));
    proc.stderr.on("data", () => {});
    proc.on("close", () => resolve(output.trim()));
  });
}

async function fetchRollbarPRs(): Promise<IRollbarPR[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const raw = await runGhCommand([
    "pr",
    "list",
    "--repo",
    "astashov/liftosaur",
    "--state",
    "all",
    "--search",
    `fix-rollbar in:title created:>=${since}`,
    "--json",
    "number,title,state",
  ]);

  let prs: Array<{ number: number; title: string; state: string }>;
  try {
    prs = JSON.parse(raw || "[]");
  } catch {
    log("Warning: failed to parse GitHub PR list");
    return [];
  }

  const titlePattern = /fix-rollbar \((\d+)\/(\d+)\)/;

  return prs.map((pr) => {
    const match = pr.title.match(titlePattern);
    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      itemId: match ? match[1] : null,
      occurrenceId: match ? match[2] : null,
    };
  });
}

function checkIdMatch(
  item: IRollbarItem,
  occurrenceId: number,
  prs: IRollbarPR[]
): { skip: boolean; reason: string } | null {
  for (const pr of prs) {
    if (pr.occurrenceId === occurrenceId.toString()) {
      return { skip: true, reason: `occurrence ${occurrenceId} already has PR #${pr.number} (${pr.state})` };
    }
    if (pr.itemId === item.id.toString()) {
      return { skip: true, reason: `item ${item.id} already has PR #${pr.number} (${pr.state})` };
    }
  }
  return null;
}

function extractResponseFromRawLog(logFilePath: string): string | null {
  const rawJsonlPath = logFilePath.replace(/\.log$/, "-raw.jsonl");
  try {
    const lines = fs.readFileSync(rawJsonlPath, "utf-8").trim().split("\n");
    let lastText = "";
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === "assistant" && Array.isArray(event.message?.content)) {
          for (const block of event.message.content) {
            if (block.type === "text" && block.text) {
              lastText = block.text;
            }
          }
        }
      } catch {
        continue;
      }
    }
    return lastText || null;
  } catch {
    return null;
  }
}

async function checkSimilarityWithClaude(
  candidates: IRollbarOccurrence[],
  existingPRs: IRollbarPR[]
): Promise<Set<number>> {
  const skipItemIds = new Set<number>();
  const parsedPRs = existingPRs.filter((pr) => pr.itemId !== null);

  if (candidates.length === 0 || parsedPRs.length === 0) {
    return skipItemIds;
  }

  const prList = parsedPRs
    .map((pr, i) => `${i + 1}. PR #${pr.number} (${pr.state}): "${pr.title}"`)
    .join("\n");

  const candidateList = candidates
    .map((c, i) => `${String.fromCharCode(65 + i)}. Item ${c.itemId}: "${c.title}"`)
    .join("\n");

  const prompt = `You are checking if new Rollbar errors are likely the same root cause as existing PRs.

Existing Rollbar fix PRs:
${prList}

New Rollbar errors to potentially fix:
${candidateList}

For each new error (A, B, C...), determine if it is likely the same root cause as any existing PR.
Reply ONLY with a JSON object mapping each letter to either null (no match) or the PR number.
Example: {"A": null, "B": 42}`;

  log("Running Claude similarity check...");
  const similarityLogPath = path.join(LOG_DIR, `${runId}-similarity.log`);
  const result = await runClaudeCommand(prompt, SIMILARITY_TIMEOUT_MS, similarityLogPath);

  if (!result.success) {
    log("Claude similarity check failed or timed out, proceeding with all candidates");
    return skipItemIds;
  }

  const responseText = extractResponseFromRawLog(similarityLogPath);
  if (!responseText) {
    log("Could not extract response from similarity check log, proceeding with all candidates");
    return skipItemIds;
  }

  log(`Similarity check response: ${responseText.slice(0, 500)}`);

  try {
    const jsonMatch = responseText.match(/\{[^}]+\}/);
    const parsed: Record<string, unknown> = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

    for (let i = 0; i < candidates.length; i++) {
      const key = String.fromCharCode(65 + i);
      const match = parsed[key];
      if (match != null) {
        log(`  Candidate ${key} (item ${candidates[i].itemId}) similar to PR #${match}, skipping`);
        skipItemIds.add(candidates[i].itemId);
      }
    }
  } catch (err) {
    log(`Failed to parse Claude similarity response: ${(err as Error).message}`);
  }

  return skipItemIds;
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
  const output = await runGhCommand([
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
  ]);

  const num = parseInt(output, 10);
  return isNaN(num) ? null : num;
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

  log("Fetching top active items from Rollbar...");
  const items = await getTopActiveItems();
  log(`Found ${items.length} active items`);

  log("Fetching existing Rollbar fix PRs from GitHub...");
  const existingPRs = await fetchRollbarPRs();
  log(`Found ${existingPRs.length} existing rollbar PRs`);

  log("Filtering candidates by ID match...");
  const needsSimilarityCheck: IRollbarOccurrence[] = [];

  for (const item of items) {
    if (needsSimilarityCheck.length >= 5) {
      break;
    }

    const occurrenceId = await getOccurrenceForItem(item.id);
    if (!occurrenceId) {
      log(`  Could not get occurrence for item ${item.id}`);
      continue;
    }

    const idMatch = checkIdMatch(item, occurrenceId, existingPRs);
    if (idMatch) {
      log(`  Skipping item ${item.id}: ${idMatch.reason}`);
      continue;
    }

    log(`  Item ${item.id} -> Occurrence ${occurrenceId}: ${item.title} (needs similarity check)`);
    needsSimilarityCheck.push({ id: occurrenceId, itemId: item.id, title: item.title });
  }

  if (needsSimilarityCheck.length === 0) {
    log("No candidates after ID matching");
    logFile.end();
    return;
  }

  const similarSkips = await checkSimilarityWithClaude(needsSimilarityCheck, existingPRs);
  const candidates = needsSimilarityCheck.filter((c) => !similarSkips.has(c.itemId));

  log(`${candidates.length} candidates remaining after similarity check`);

  if (candidates.length === 0) {
    log("No items to fix after similarity filtering");
    logFile.end();
    return;
  }

  let fixedCount = 0;

  for (const candidate of candidates) {
    if (fixedCount >= MAX_FIXES) {
      break;
    }

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

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const prNumber = await getPRNumber(candidate.id);
    if (prNumber) {
      log(`PR #${prNumber} created for occurrence ${candidate.id}`);

      log(`Running review-pr command on PR #${prNumber}...`);
      const reviewLogPath = path.join(LOG_DIR, `${runId}-review-${prNumber}.log`);
      log(`Log file: ${reviewLogPath}`);
      const reviewResult = await runClaudeCommand(`/review-pr ${prNumber}`, REVIEW_TIMEOUT_MS, reviewLogPath);

      if (reviewResult.success) {
        log(`Review completed for PR #${prNumber}`);
      } else {
        log(`Review failed or timed out for PR #${prNumber}`);
      }

      fixedCount += 1;
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

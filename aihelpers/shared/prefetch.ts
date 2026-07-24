import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROJECT_DIR = path.resolve(__dirname, "..", "..");

interface IPrefetchResult {
  dir: string;
  rollbar: boolean;
  item: boolean;
  exception: boolean;
  userEvents: boolean;
  serverLogs: boolean;
}

function runScript(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

function extractJsonFromOutput(output: string): string {
  const firstBrace = output.indexOf("{");
  if (firstBrace === -1) {
    return output;
  }
  const jsonPart = output.slice(firstBrace);
  try {
    JSON.parse(jsonPart);
    return jsonPart;
  } catch {
    return output;
  }
}

async function fetchRollbarApi(urlPath: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.rollbar.com${urlPath}`, {
    headers: { "X-Rollbar-Access-Token": token },
  });
  if (!response.ok) {
    throw new Error(`Rollbar API ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function prefetchOccurrenceData(
  occurrenceId: string,
  log: (msg: string) => void
): Promise<IPrefetchResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-"));
  const result: IPrefetchResult = {
    dir,
    rollbar: false,
    item: false,
    exception: false,
    userEvents: false,
    serverLogs: false,
  };

  const token = process.env.ROLLBAR_READ_TOKEN;
  if (!token) {
    throw new Error("ROLLBAR_READ_TOKEN not set");
  }

  log(`Pre-fetching data for occurrence ${occurrenceId} into ${dir}`);

  // 1. Fetch rollbar.json
  let rollbarData: Record<string, unknown>;
  try {
    rollbarData = (await fetchRollbarApi(`/api/1/instance/${occurrenceId}`, token)) as Record<string, unknown>;
    fs.writeFileSync(path.join(dir, "rollbar.json"), JSON.stringify(rollbarData, null, 2));
    result.rollbar = true;
    log("  rollbar.json fetched");
  } catch (err) {
    log(`  FATAL: rollbar.json failed: ${(err as Error).message}`);
    return result;
  }

  // 2. Fetch item.json
  const resultData = rollbarData.result as Record<string, unknown> | undefined;
  const itemId = resultData?.item_id;
  if (itemId) {
    try {
      const itemData = await fetchRollbarApi(`/api/1/item/${itemId}`, token);
      fs.writeFileSync(path.join(dir, "item.json"), JSON.stringify(itemData, null, 2));
      result.item = true;
      log("  item.json fetched");
    } catch (err) {
      log(`  item.json failed: ${(err as Error).message}`);
    }
  }

  // 3. Fetch exception.json
  const data = resultData?.data as Record<string, unknown> | undefined;
  const exceptionId = data?.liftosaur_exception_id as string | undefined;
  if (exceptionId) {
    try {
      const scriptResult = await runScript(
        "npx",
        ["ts-node", "./lambda/scripts/get_exception.ts", exceptionId],
        PROJECT_DIR
      );
      if (scriptResult.exitCode === 0 && scriptResult.stdout.trim()) {
        const json = extractJsonFromOutput(scriptResult.stdout);
        const parsed = JSON.parse(json);
        if (parsed.data && parsed.data !== "{}") {
          fs.writeFileSync(path.join(dir, "exception.json"), json);
          result.exception = true;
          log("  exception.json fetched");
        } else {
          log("  exception.json skipped: empty data");
        }
      } else {
        log(`  exception.json failed: exit ${scriptResult.exitCode}`);
      }
    } catch (err) {
      log(`  exception.json failed: ${(err as Error).message}`);
    }
  } else {
    log("  no liftosaur_exception_id, skipping exception.json");
  }

  // 4. Fetch user_events.md
  const person = data?.person as Record<string, unknown> | undefined;
  const userId = person?.id as string | undefined;
  if (userId) {
    try {
      const scriptResult = await runScript(
        "npx",
        ["ts-node", "./lambda/scripts/user_events_markdown.ts", userId],
        PROJECT_DIR
      );
      if (scriptResult.exitCode === 0 && scriptResult.stdout.trim()) {
        fs.writeFileSync(path.join(dir, "user_events.md"), scriptResult.stdout);
        result.userEvents = true;
        log("  user_events.md fetched");
      } else {
        log(`  user_events.md failed: exit ${scriptResult.exitCode}`);
      }
    } catch (err) {
      log(`  user_events.md failed: ${(err as Error).message}`);
    }
  } else {
    log("  no person.id, skipping user_events.md");
  }

  // 5. Fetch server_logs.txt
  const timestamp = data?.timestamp as number | undefined;
  if (timestamp && userId) {
    try {
      const date = new Date(timestamp * 1000);
      const dateStr = date.toISOString().slice(0, 10);

      const tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), "logs-"));
      const scriptResult = await runScript(
        "npx",
        ["ts-node", path.resolve(PROJECT_DIR, "./lambda/scripts/get_logs.ts"), dateStr, userId],
        tmpCwd
      );

      const logFileName = `logs-${dateStr}-${userId}.txt`;
      const logFilePath = path.join(tmpCwd, logFileName);
      if (fs.existsSync(logFilePath)) {
        fs.copyFileSync(logFilePath, path.join(dir, "server_logs.txt"));
        result.serverLogs = true;
        log("  server_logs.txt fetched");
      } else if (scriptResult.exitCode === 0) {
        log("  server_logs.txt: no output file produced");
      } else {
        log(`  server_logs.txt failed: exit ${scriptResult.exitCode}`);
      }

      fs.rmSync(tmpCwd, { recursive: true, force: true });
    } catch (err) {
      log(`  server_logs.txt failed: ${(err as Error).message}`);
    }
  } else {
    log("  no timestamp/userid, skipping server_logs.txt");
  }

  log(`Pre-fetch complete: ${Object.entries(result).filter(([k, v]) => k !== "dir" && v).length}/5 artifacts`);
  return result;
}

export function cleanupPrefetchDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}

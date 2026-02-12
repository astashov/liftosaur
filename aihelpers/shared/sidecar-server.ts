import * as http from "http";
import * as url from "url";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const PORT = 9888;
const HOST = "127.0.0.1";
const PROJECT_DIR = path.resolve(__dirname, "..", "..");

interface IScriptConfig {
  script: string;
  params: string[];
  outputFile?: (args: string[]) => string;
}

const ALLOWED_SCRIPTS: Record<string, IScriptConfig> = {
  get_logs: {
    script: "./lambda/scripts/get_logs.ts",
    params: ["date", "userid"],
    // get_logs writes to a file in cwd instead of stdout
    outputFile: (args) => `logs-${args[0]}-${args[1]}.txt`,
  },
  user_events_markdown: {
    script: "./lambda/scripts/user_events_markdown.ts",
    params: ["userid"],
  },
};

function runScript(
  scriptPath: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn("npx", ["ts-node", scriptPath, ...args], {
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

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || "", true);
  const scriptName = (parsed.pathname || "").replace(/^\//, "");
  const query = parsed.query as Record<string, string>;

  if (scriptName === "health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const config = ALLOWED_SCRIPTS[scriptName];
  if (!config) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Unknown script: ${scriptName}` }));
    return;
  }

  const args: string[] = [];
  for (const param of config.params) {
    const value = query[param];
    if (!value) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Missing required parameter: ${param}` }));
      return;
    }
    if (!/^[a-zA-Z0-9._@-]+$/.test(value)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Invalid parameter value for ${param}` }));
      return;
    }
    args.push(value);
  }

  console.log(`[${new Date().toISOString()}] ${scriptName} ${args.join(" ")}`);

  try {
    let cwd = PROJECT_DIR;
    let tmpDir: string | undefined;

    if (config.outputFile) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sidecar-"));
      cwd = tmpDir;
    }

    const result = await runScript(path.resolve(PROJECT_DIR, config.script), args, cwd);

    if (config.outputFile && tmpDir) {
      const outputFileName = config.outputFile(args);
      const outputPath = path.join(tmpDir, outputFileName);
      if (fs.existsSync(outputPath)) {
        result.stdout = fs.readFileSync(outputPath, "utf-8");
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sidecar server listening on http://${HOST}:${PORT}`);
  console.log(`Allowed scripts: ${Object.keys(ALLOWED_SCRIPTS).join(", ")}`);
});

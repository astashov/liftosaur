import { spawn } from "child_process";
import * as path from "path";

const PROJECT_DIR = path.resolve(__dirname, "..", "..");

interface IDockerClaudeOptions {
  command: string;
  logFilePath?: string;
  timeoutMs: number;
  prefetchDir?: string;
}

export function runClaudeInDocker(
  options: IDockerClaudeOptions,
  log: (msg: string) => void
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const args = ["run", "--rm"];

    args.push("-e", "CLAUDE_CODE_OAUTH_TOKEN");
    args.push("-e", "GH_TOKEN_AI");
    args.push("-e", "CI=true");

    args.push("--add-host", "host.docker.internal:host-gateway");
    args.push("--add-host", "localai.liftosaur.com:host-gateway");
    args.push("--add-host", "localai-api.liftosaur.com:host-gateway");
    args.push("--add-host", "localai-streaming-api.liftosaur.com:host-gateway");

    args.push("-v", `${path.join(PROJECT_DIR, "localdomain.js")}:/app/localdomain.js:ro`);
    args.push("-v", `${path.resolve(process.env.HOME || "~", ".secrets", "live")}:/root/.secrets/live:ro`);
    args.push("-v", `${path.join(PROJECT_DIR, "logs")}:/app/logs`);

    if (options.prefetchDir) {
      args.push("-v", `${options.prefetchDir}:/prefetched:ro`);
    }

    args.push("liftosaur-claude-sandbox");
    args.push(options.command);
    if (options.logFilePath) {
      const logsDir = path.join(PROJECT_DIR, "logs");
      const containerLogPath = options.logFilePath.startsWith(logsDir)
        ? "/app/logs" + options.logFilePath.slice(logsDir.length)
        : options.logFilePath;
      args.push(containerLogPath);
    }

    log(`Running Docker: docker ${args.join(" ")}`);

    const proc = spawn("docker", args, {
      cwd: PROJECT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    let output = "";
    let killed = false;

    const killProcessGroup = (signal: NodeJS.Signals): void => {
      try {
        process.kill(-proc.pid!, signal);
      } catch {
        // Process group already gone
      }
    };

    const timer = setTimeout(() => {
      killed = true;
      log("Docker command timed out, killing process group...");
      killProcessGroup("SIGTERM");
      setTimeout(() => killProcessGroup("SIGKILL"), 5000);
    }, options.timeoutMs);

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

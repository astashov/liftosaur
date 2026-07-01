#!/usr/bin/env node
// Dump the running React Native app's global `state` (window.state / globalThis.state)
// by talking CDP to Metro's Hermes inspector — the same channel React DevTools uses.
//
// Usage:
//   node scripts/dump-rn-state.js                      # whole state
//   node scripts/dump-rn-state.js storage.settings     # a dotted path into state
//   node scripts/dump-rn-state.js --eval "Object.keys(globalThis.state)"
//   node scripts/dump-rn-state.js --raw storage.currentProgramId   # print scalar unquoted
//
// Env: METRO_HOST (default localhost), METRO_PORT (default 8081), METRO_TARGET (index, default 0)
//
// Requires Node >= 22 for the global WebSocket. No npm dependencies.

const HOST = process.env.METRO_HOST || "localhost";
const PORT = process.env.METRO_PORT || "8081";
const TARGET_INDEX = parseInt(process.env.METRO_TARGET || "0", 10);

function parseArgs(argv) {
  const args = { path: undefined, evalExpr: undefined, raw: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--eval") {
      args.evalExpr = argv[++i];
    } else if (a === "--raw") {
      args.raw = true;
    } else if (!a.startsWith("--") && args.path === undefined) {
      args.path = a;
    }
  }
  return args;
}

// Hermes' JSON.stringify drops `undefined`/functions, which is what we want for IState.
// Guarding each hop keeps a bad path from throwing inside the runtime.
function buildExpression({ path, evalExpr }) {
  if (evalExpr) return `JSON.stringify(${evalExpr})`;
  const base = "globalThis.state";
  if (!path) return `JSON.stringify(${base})`;
  const access = path
    .split(".")
    .map((seg) => (/^\d+$/.test(seg) ? `?.[${seg}]` : `?.[${JSON.stringify(seg)}]`))
    .join("");
  return `JSON.stringify(${base}${access})`;
}

async function findTarget() {
  const res = await fetch(`http://${HOST}:${PORT}/json/list`);
  if (!res.ok) throw new Error(`Metro /json/list returned ${res.status}`);
  const targets = (await res.json()).filter((t) => t.webSocketDebuggerUrl);
  if (targets.length === 0) {
    throw new Error(
      "No debuggable Hermes target. Reload the app in the simulator (the 'Fast Refresh disconnected' banner means Metro dropped the connection)."
    );
  }
  const target = targets[TARGET_INDEX] || targets[0];
  return target.webSocketDebuggerUrl;
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Timed out waiting for CDP response (10s)"));
    }, 10000);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true, awaitPromise: true },
        })
      );
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (msg.error) return reject(new Error(msg.error.message));
      const r = msg.result;
      if (r.exceptionDetails) {
        return reject(new Error(r.exceptionDetails.exception?.description || "Runtime exception"));
      }
      resolve(r.result.value);
    };
    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket error: ${err.message || err.type || "unknown"}`));
    };
  });
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  try {
    const wsUrl = await findTarget();
    const raw = await evaluate(wsUrl, buildExpression(args));
    if (raw === undefined || raw === null) {
      console.error("(no value — path missing or state not set yet)");
      process.exit(2);
    }
    const value = JSON.parse(raw);
    if (args.raw && (typeof value !== "object" || value === null)) {
      console.log(value);
    } else {
      console.log(JSON.stringify(value, null, 2));
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
})();

/* eslint-disable @typescript-eslint/no-explicit-any */
import http from "http";
import https from "https";
import * as path from "path";
import * as fs from "fs";
import { getHandler } from "./lambda/index";
import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult } from "aws-lambda";
import { URL } from "url";
import { buildDi } from "./lambda/utils/di";
import { LogUtil } from "./lambda/utils/log";
import fetch from "node-fetch";
import childProcess from "child_process";
import { localdomain, localapidomain, localport, localapiport } from "./src/localdomain";

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface Global {
      __COMMIT_HASH__: string;
      __FULL_COMMIT_HASH__: string;
      awslambda: any;
    }
  }
}

// Mock awslambda.streamifyResponse for local development
(global as any).awslambda = {
  streamifyResponse: (handler: Function) => {
    return handler;
  },
};

function getBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      resolve(data);
    });
  });
}

async function requestToProxyEvent(request: http.IncomingMessage): Promise<APIGatewayProxyEvent> {
  const body = await getBody(request);
  const url = new URL(request.url || "", "http://www.example.com");

  const qs: Partial<Record<string, string>> = {};
  url.searchParams.forEach((v, k) => {
    qs[k] = v;
  });
  const headers = { ...request.headers } as APIGatewayProxyEventHeaders;
  const cookieHeader = headers.cookie || "";
  headers["x-auth-state"] = cookieHeader.includes("session") ? "yes" : "no";
  const ua = headers["user-agent"] || "";
  headers["x-device-type"] = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop";

  return {
    body: body,
    headers,
    multiValueHeaders: {},
    httpMethod: request.method || "GET",
    isBase64Encoded: false,
    path: url.pathname,
    pathParameters: {},
    queryStringParameters: qs,
    multiValueQueryStringParameters: {},
    stageVariables: {},

    requestContext: {} as any,
    resource: "",
  };
}

const handler = getHandler(() => buildDi(new LogUtil(), fetch));

const PERF_DATA_DIR = path.join(__dirname, "perfdata");

function setPerfCorsHeaders(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function handlePerfRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  setPerfCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return;
  }
  const body = await getBody(req);
  const sessionMatch = body.match(/"session":"([^"]+)"/);
  const session = sessionMatch?.[1] ?? "unknown";
  // Reject obvious path-traversal attempts to keep this safe even though it's dev-only.
  const safeSession = /^[A-Za-z0-9_\-]+$/.test(session) ? session : "unknown";
  const file = path.join(PERF_DATA_DIR, `${safeSession}.jsonl`);
  fs.mkdirSync(PERF_DATA_DIR, { recursive: true });
  fs.appendFileSync(file, body.endsWith("\n") ? body : body + "\n");
  res.statusCode = 200;
  res.end();
}

// Main API server
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(process.env.HOME!, `.secrets/live/${localapidomain}.liftosaur.com/privkey.pem`)),
    cert: fs.readFileSync(path.join(process.env.HOME!, `.secrets/live/${localapidomain}.liftosaur.com/fullchain.pem`)),
  },
  async (req, res) => {
    try {
      if (req.url === "/api/_dev/perf") {
        await handlePerfRequest(req, res);
        return;
      }
      // Handle regular API Gateway endpoints
      const result = (await handler(
        await requestToProxyEvent(req),
        { getRemainingTimeInMillis: () => 10000 },
        () => undefined
      )) as APIGatewayProxyResult;
      const body = result.isBase64Encoded ? Buffer.from(result.body, "base64") : result.body;
      res.statusCode = result.statusCode;
      for (const k of Object.keys(result.headers || {})) {
        res.setHeader(k, result.headers![k] as string);
      }
      res.end(body);
    } catch (e) {
      if (e instanceof Error) {
        console.error(e);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ name: e.name, error: e.message, stack: e.stack }));
      } else {
        throw e;
      }
    }
  }
);

(global as any).__COMMIT_HASH__ = childProcess.execSync("git rev-parse --short HEAD").toString().trim();
(global as any).__FULL_COMMIT_HASH__ = childProcess.execSync("git rev-parse HEAD").toString().trim();
process.env.COMMIT_HASH = (global as any).__COMMIT_HASH__;
process.env.FULL_COMMIT_HASH = (global as any).__FULL_COMMIT_HASH__;
process.env.HOST = `https://${localdomain}.liftosaur.com:${localport}`;

server.listen(localapiport, "0.0.0.0", () => {
  console.log(`--------- API Server is running on port ${localapiport} ----------`);
});

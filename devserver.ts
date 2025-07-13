/* eslint-disable @typescript-eslint/no-explicit-any */
import http from "http";
import https from "https";
import * as path from "path";
import * as fs from "fs";
import { getHandler } from "./lambda/index";
import { getStreamingHandler } from "./lambda/streamingHandler";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
} from "aws-lambda";
import { URL } from "url";
import { buildDi } from "./lambda/utils/di";
import { LogUtil } from "./lambda/utils/log";
import fetch from "node-fetch";
import childProcess from "child_process";
import { localapidomain, localstreamingapidomain } from "./src/localdomain";

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
  return {
    body: body,
    headers: request.headers as APIGatewayProxyEventHeaders,
    multiValueHeaders: {},
    httpMethod: request.method || "GET",
    isBase64Encoded: false,
    path: url.pathname,
    pathParameters: {},
    queryStringParameters: qs,
    multiValueQueryStringParameters: {},
    stageVariables: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestContext: {} as any,
    resource: "",
  };
}

const log = new LogUtil();
const di = buildDi(log, fetch);
const handler = getHandler(di);

// Main API server
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(process.env.HOME!, `.secrets/live/${localapidomain}.liftosaur.com/privkey.pem`)),
    cert: fs.readFileSync(path.join(process.env.HOME!, `.secrets/live/${localapidomain}.liftosaur.com/fullchain.pem`)),
  },
  async (req, res) => {
    try {
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

// Streaming API server
const streamingServer = https.createServer(
  {
    key: fs.readFileSync(
      path.join(process.env.HOME!, `.secrets/live/${localstreamingapidomain}.liftosaur.com/privkey.pem`)
    ),
    cert: fs.readFileSync(
      path.join(process.env.HOME!, `.secrets/live/${localstreamingapidomain}.liftosaur.com/fullchain.pem`)
    ),
  },
  async (req, res) => {
    try {
      const url = new URL(req.url || "", "http://www.example.com");

      const body = req.method === "OPTIONS" ? "" : await getBody(req);
      const streamingEvent: APIGatewayProxyEventV2 = {
        version: "2.0",
        routeKey: "$default",
        rawPath: url.pathname,
        rawQueryString: url.search.substring(1),
        headers: req.headers as { [key: string]: string },
        requestContext: {
          accountId: "123456789012",
          apiId: "local",
          domainName: "localhost",
          domainPrefix: "local",
          http: {
            method: req.method || "POST",
            path: url.pathname,
            protocol: "HTTP/1.1",
            sourceIp: "127.0.0.1",
            userAgent: req.headers["user-agent"] || "",
          },
          requestId: "local-" + Date.now(),
          time: new Date().toISOString(),
          timeEpoch: Date.now(),
          routeKey: "",
          stage: "",
        },
        body,
        isBase64Encoded: false,
      };

      const streamingHandler = getStreamingHandler(di);

      const responseStream = {
        write: (chunk: unknown) => {
          if (typeof chunk === "string") {
            // Check if it's the metadata
            if (chunk.startsWith("{") && chunk.includes("statusCode")) {
              try {
                const metadata = JSON.parse(chunk);
                res.statusCode = metadata.statusCode;
                for (const [key, value] of Object.entries(metadata.headers || {})) {
                  res.setHeader(key, value as string);
                }
                return;
              } catch (e) {
                // Not metadata, just write it
              }
            }
            res.write(chunk);
          } else {
            res.write(chunk);
          }
        },
        end: () => {
          res.end();
        },
      };

      await streamingHandler(streamingEvent, responseStream, () => undefined);
      return;
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

// eslint-disable-next-line prefer-const
(global as any).__COMMIT_HASH__ = childProcess.execSync("git rev-parse --short HEAD").toString().trim();
(global as any).__FULL_COMMIT_HASH__ = childProcess.execSync("git rev-parse HEAD").toString().trim();
process.env.COMMIT_HASH = (global as any).__COMMIT_HASH__;
process.env.FULL_COMMIT_HASH = (global as any).__FULL_COMMIT_HASH__;

server.listen(3000, "0.0.0.0", () => {
  console.log(`--------- API Server is running on port 3000 ----------`);
});

streamingServer.listen(3001, "0.0.0.0", () => {
  console.log(`--------- Streaming API Server is running on port 3001 ----------`);
});

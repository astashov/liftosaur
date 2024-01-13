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

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface Global {
      __COMMIT_HASH__: string;
      __FULL_COMMIT_HASH__: string;
    }
  }
}

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
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(process.env.HOME!, ".secrets/live/local-api.liftosaur.com/privkey.pem")),
    cert: fs.readFileSync(path.join(process.env.HOME!, ".secrets/live/local-api.liftosaur.com/fullchain.pem")),
  },
  async (req, res) => {
    try {
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
      console.error(e);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ name: e.name, error: e.message, stack: e.stack }));
    }
  }
);
// eslint-disable-next-line prefer-const
global.__COMMIT_HASH__ = childProcess.execSync("git rev-parse --short HEAD").toString().trim();
global.__FULL_COMMIT_HASH__ = childProcess.execSync("git rev-parse HEAD").toString().trim();

server.listen(3000, "0.0.0.0", () => {
  console.log(`--------- Server is running ----------`);
});

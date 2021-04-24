import http from "http";
import { handler } from "./lambda/index";
import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult } from "aws-lambda";
import { URL } from "url";

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

function prefixTime(time: number): string {
  return `${time}`.padStart(2, "0");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(...str: any[]): void {
  const time = new Date();
  const timeStr = `${prefixTime(time.getHours())}:${prefixTime(time.getMinutes())}:${prefixTime(time.getSeconds())}`;
  console.log("[\x1b[36m" + timeStr + "\x1b[0m]", ...str);
}

const server = http.createServer(async (req, res) => {
  try {
    const time = Date.now();
    log("Starting request", req.method, req.url);
    const result = (await handler(
      await requestToProxyEvent(req),
      { getRemainingTimeInMillis: () => 10000 },
      () => undefined
    )) as APIGatewayProxyResult;
    log("Responding for", req.method, req.url, result.statusCode, `${Date.now() - time}ms`);
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
});
server.listen(3000, "localhost", () => {
  log(`Server is running`);
});

import http from "http";
import { handler } from "./lambda/index";
import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult } from "aws-lambda";
import { URL } from "url";
import { LogUtil } from "./lambda/utils/log";

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

const server = http.createServer(async (req, res) => {
  try {
    const time = Date.now();
    const log = new LogUtil();
    log.log("--------> Starting request", req.method, req.url);
    const result = (await handler(
      await requestToProxyEvent(req),
      { getRemainingTimeInMillis: () => 10000, log },
      () => undefined
    )) as APIGatewayProxyResult;
    log.log("<-------- Responding for", req.method, req.url, result.statusCode, `${Date.now() - time}ms`);
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
  console.log(`--------- Server is running ----------`);
});

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UrlUtils } from "../../src/utils/url";
import { localdomain } from "../../src/localdomain";

export const allowedHosts = [
  `${localdomain}.liftosaur.com:8080`,
  "www.liftosaur.com",
  "localhost:8080",
  "stage.liftosaur.com",
];

export function ResponseUtils_json(
  status: number,
  event: APIGatewayProxyEvent,
  body: string | object,
  headers?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode: status,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { ...ResponseUtils_getHeaders(event), ...headers },
  };
}

export function ResponseUtils_getHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  const origin = event.headers.Origin || event.headers.origin || "http://example.com";
  const url = UrlUtils.build(origin);
  let headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (allowedHosts.some((host) => host === url.host)) {
    headers = {
      ...headers,
      "access-control-allow-origin": `${url.protocol}//${url.host}`,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "OPTIONS,HEAD,GET,POST,PUT,DELETE,PATCH",
      "access-control-expose-headers": "cookie, set-cookie",
    };
  }
  return headers;
}

export function ResponseUtils_getHost(event: APIGatewayProxyEvent): string {
  return event.headers.Host || event.headers.host || "liftosaur.com";
}

export function ResponseUtils_getReferer(event: APIGatewayProxyEvent): string {
  return (
    event.headers.origin ||
    event.headers.Origin ||
    event.headers.referer ||
    event.headers.Referer ||
    "https://liftosaur.com"
  );
}

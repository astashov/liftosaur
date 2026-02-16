import { APIGatewayProxyEventHeaders, APIGatewayProxyEvent } from "aws-lambda";
import { IHandler } from "../../lambda";
import { ObjectUtils } from "../../src/utils/object";
import { UrlUtils } from "../../src/utils/url";
import JWT from "jsonwebtoken";
import { NoRetryError } from "../../src/ducks/thunks";
import fs from "fs";
import path from "path";

interface IMockRequest {
  url: string;
  body: Record<string, unknown>;
}

export interface IMockFetchLog {
  request: IMockRequest;
  response: Record<string, unknown>;
}

export class MockFetch {
  public hasConnection: boolean = true;
  public handler: IHandler | undefined;
  constructor(
    public readonly userId: string,
    public readonly logs: IMockFetchLog[]
  ) {}

  public fetch: Window["fetch"] = async (urlStr, options) => {
    const session = JWT.sign({ userId: this.userId }, "cookieSecret");
    if (!this.handler) {
      throw new Error("No handler");
    }
    const body = options?.body;
    const headers = { Cookie: `session=${session}`, ...options?.headers };
    const url = UrlUtils.build(typeof urlStr === "string" ? urlStr : (urlStr as Request).url);
    if (url.pathname.startsWith("/programdata/")) {
      const filePath = path.join(__dirname, "../../dist", url.pathname);
      if (!this.hasConnection) {
        throw new NoRetryError("Network Error");
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return {
        ok: true,
        bytes: async () => new Uint8Array(0),
        status: 200,
        statusText: "OK",
        json: async () => JSON.parse(content),
        headers: new MockHeaders({}),
        redirected: false,
        text: async () => content,
        url: url.href,
        trailer: Promise.resolve(new MockHeaders({})),
        type: "basic",
        clone: () => new Response(),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
      };
    }
    const qs: Record<string, string> = {};
    url.searchParams.forEach((value, key) => (qs[key] = value));
    const request: APIGatewayProxyEvent = {
      body: body as string,
      headers: headers as APIGatewayProxyEventHeaders,
      multiValueHeaders: {},
      httpMethod: options?.method || "GET",
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
    if (!this.hasConnection) {
      throw new NoRetryError("Network Error");
    }
    const response = await this.handler(request, { getRemainingTimeInMillis: () => 10000 });
    this.logs.push({
      request: { url: url.href, body: body ? JSON.parse(body as string) : {} },
      response: response.body ? JSON.parse(response.body) : {},
    });
    return {
      ok: response.statusCode === 200,
      bytes: async () => new Uint8Array(0),
      status: response.statusCode,
      statusText: response.body,
      json: async () => JSON.parse(response.body),
      headers: new MockHeaders({}),
      redirected: false,
      text: async () => response.body,
      url: url.href,
      trailer: Promise.resolve(new MockHeaders({})),
      type: "basic",
      clone: () => new Response(),
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
    };
  };
}

class MockHeaders implements Headers {
  constructor(public headers: Record<string, string>) {}
  public append(name: string, value: string): void {
    this.headers[name] = value;
  }
  public delete(name: string): void {
    delete this.headers[name];
  }
  public get(name: string): string | null {
    return this.headers[name];
  }
  public has(name: string): boolean {
    return !!this.headers[name];
  }
  public set(name: string, value: string): void {
    this.headers[name] = value;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
    for (const key of ObjectUtils.keys(this.headers)) {
      const value = this.headers[key];
      callbackfn(value, key, this);
    }
  }

  public getSetCookie(): string[] {
    return this.headers["Set-Cookie"]?.split(",") || [];
  }
}

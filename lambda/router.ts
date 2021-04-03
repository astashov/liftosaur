import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";

/**
 * Helper functions that when passed a request will return a
 * boolean indicating if the request uses that HTTP method,
 * header, host or referrer.
 */
const Method = (method: string) => (req: APIGatewayProxyEvent) => req.httpMethod.toLowerCase() === method.toLowerCase();
const Connect = Method("connect");
const Delete = Method("delete");
const Get = Method("get");
const Head = Method("head");
const Options = Method("options");
const Patch = Method("patch");
const Post = Method("post");
const Put = Method("put");
const Trace = Method("trace");

const Path = (regExp: RegExp | string) => (req: APIGatewayProxyEvent) => {
  const url = new URL(req.path, "http://example.com");
  console.log(url, regExp, req.path);
  const path = url.pathname;
  const match = path.match(regExp) || [];
  return match[0] === path;
};

type ICondition = (req: APIGatewayProxyEvent) => boolean;

interface IRoute {
  conditions: ICondition | ICondition[];
  handler: IHandler;
}

type IHandler = (req: APIGatewayProxyEvent) => APIGatewayProxyResult | Promise<APIGatewayProxyResult>;

/**
 * The Router handles determines which handler is matched given the
 * conditions present for each request.
 */
export class Router {
  private readonly routes: IRoute[];

  constructor() {
    this.routes = [];
  }

  public handle(conditions: ICondition | ICondition[], handler: IHandler): this {
    this.routes.push({
      conditions,
      handler,
    });
    return this;
  }

  public connect(url: string | RegExp, handler: IHandler): this {
    return this.handle([Connect, Path(url)], handler);
  }

  public delete(url: string | RegExp, handler: IHandler): this {
    return this.handle([Delete, Path(url)], handler);
  }

  public get(url: string | RegExp, handler: IHandler): this {
    return this.handle([Get, Path(url)], handler);
  }

  public head(url: string | RegExp, handler: IHandler): this {
    return this.handle([Head, Path(url)], handler);
  }

  public options(url: string | RegExp, handler: IHandler): this {
    return this.handle([Options, Path(url)], handler);
  }

  public patch(url: string | RegExp, handler: IHandler): this {
    return this.handle([Patch, Path(url)], handler);
  }

  public post(url: string | RegExp, handler: IHandler): this {
    return this.handle([Post, Path(url)], handler);
  }

  public put(url: string | RegExp, handler: IHandler): this {
    return this.handle([Put, Path(url)], handler);
  }

  public trace(url: string | RegExp, handler: IHandler): this {
    return this.handle([Trace, Path(url)], handler);
  }

  public all(handler: IHandler): this {
    return this.handle([], handler);
  }

  public route(req: APIGatewayProxyEvent): APIGatewayProxyResult | Promise<APIGatewayProxyResult> {
    const route = this.resolve(req);

    if (route) {
      return route.handler(req);
    }

    return {
      statusCode: 404,
      body: "not found",
      headers: {
        "content-type": "text/plain",
      },
    };
  }

  /**
   * resolve returns the matching route for a request that returns
   * true for all conditions (if any).
   */
  public resolve(req: APIGatewayProxyEvent): IRoute | undefined {
    return this.routes.find((r) => {
      if (!r.conditions || (Array.isArray(r) && !r.conditions.length)) {
        return true;
      }

      if (typeof r.conditions === "function") {
        return r.conditions(req);
      }

      return r.conditions.every((c) => c(req));
    });
  }
}

import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { LlmUtil } from "./utils/llms/llm";
import { IDI } from "./utils/di";
import Rollbar from "rollbar";
import { Utils } from "./utils";
import { RollbarUtils } from "../src/utils/rollbar";
import { allowedHosts } from "./utils/response";
import * as Cookie from "cookie";
import { ILimitedUserDao, UserDao } from "./dao/userDao";
import { Endpoint, Method, RouteHandler, Router } from "yatro";
import { UrlUtils } from "../src/utils/url";
import { IEither } from "../src/utils/types";
import { ClaudeProvider } from "./utils/llms/claude";
import { Account, IAccount } from "../src/models/account";
import { Subscriptions } from "./utils/subscriptions";

// Import the streamifyResponse wrapper
declare const awslambda: any;

interface IStream {
  write: (chunk: unknown) => void;
  end: () => void;
}

interface IPayload {
  event: APIGatewayProxyEventV2;
  stream: IStream;
  onEnd: (status: number) => void;
  di: IDI;
}

function getHeaders(event: APIGatewayProxyEventV2): Record<string, string> {
  const origin = event.headers?.origin || event.headers?.Origin || "*";
  const corsOrigin = allowedHosts.some((h) => origin.includes(h)) ? origin : "https://www.liftosaur.com";

  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cookie",
    "Access-Control-Allow-Credentials": "true",
  };
}

async function getCurrentUserId(event: APIGatewayProxyEventV2, di: IDI): Promise<string | undefined> {
  const cookies = Cookie.parse(event.headers.Cookie || event.headers.cookie || "");
  const userDao = new UserDao(di);
  return userDao.getCurrentUserIdFromCookie(cookies);
}

async function getUserAccount(
  di: IDI,
  userId?: string
): Promise<{ user: ILimitedUserDao; account: IAccount } | undefined> {
  if (!userId) {
    return undefined;
  }
  const userDao = new UserDao(di);
  const user = await userDao.getLimitedById(userId);
  if (!user) {
    return undefined;
  }
  return {
    user: user,
    account: Account.getFromStorage(user.id, user.email, user.storage),
  };
}

const postAiConvertStreamEndpoint = Endpoint.build("/stream/ai/liftoscript");
const postAiConvertStreamHandler: RouteHandler<IPayload, void, typeof postAiConvertStreamEndpoint> = async ({
  payload,
}) => {
  const { di, event, stream, onEnd } = payload;
  let input: string;
  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "";
    const parsed = JSON.parse(body);
    input = parsed.input;

    if (!input || typeof input !== "string") {
      throw new Error("Invalid input");
    }
  } catch (error) {
    stream.write(
      JSON.stringify({
        statusCode: 400,
        headers: getHeaders(event),
      })
    );
    stream.write(`data: ${JSON.stringify({ type: "error", data: "Invalid request body" })}\n\n`);
    onEnd(400);
    return;
  }

  const userId = await getCurrentUserId(event, di);
  const result = await getUserAccount(di, userId);
  console.log("User ID:", userId, result);
  if (!result) {
    stream.write(
      JSON.stringify({
        statusCode: 403,
        headers: getHeaders(event),
      })
    );
    onEnd(403);
    return;
  }
  const { user } = result;
  const subscriptions = new Subscriptions(di.log, di.secrets);
  const hasSubscription = await subscriptions.hasSubscription(di, user.id, user.storage.subscription);
  if (!hasSubscription) {
    stream.write(
      JSON.stringify({
        statusCode: 402,
        headers: getHeaders(event),
      })
    );
    stream.write(
      `data: ${JSON.stringify({ type: "error", data: "You need to have premium subscription to use AI Liftoscript generator" })}\n\n`
    );
    onEnd(402);
    return;
  }

  stream.write(
    JSON.stringify({
      statusCode: 200,
      headers: getHeaders(event),
    })
  );

  const anthropicKey = await di.secrets.getAnthropicKey();
  di.log.log("Using Claude provider for LLM");
  const provider = new ClaudeProvider(anthropicKey);

  try {
    const llm = new LlmUtil(di.secrets, di.log, di.fetch, provider);
    for await (const event of llm.generateLiftoscript(input)) {
      const sseData = `data: ${JSON.stringify(event)}\n\n`;
      stream.write(sseData);
    }
    onEnd(200);
  } catch (error) {
    di.log.log("Error in streaming handler:", error);
    const errorMessage = error instanceof Error ? error.message : "Conversion failed";
    stream.write(`data: ${JSON.stringify({ type: "error", data: errorMessage })}\n\n`);
    onEnd(500);
  }
};

const rollbar = new Rollbar({
  accessToken: "bcdd086a019f49edb69f790a854b44dd",
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: `${Utils.getEnv()}-lambda-streaming`,
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: process.env.FULL_COMMIT_HASH,
        guess_uncaught_frames: true,
      },
    },
  },
  checkIgnore: RollbarUtils.checkIgnore,
});

export type IHandler = (event: APIGatewayProxyEventV2, responseStream: IStream, context: unknown) => Promise<void>;

export const getStreamingHandler = (di: IDI): IHandler => {
  const handler = async (event: APIGatewayProxyEventV2, stream: IStream, context: Context): Promise<void> => {
    const method = event.requestContext.http.method as Method;
    if (method === "OPTIONS") {
      const optionsResponse = {
        statusCode: 200,
        headers: getHeaders(event),
      };
      stream.write(JSON.stringify(optionsResponse));
      stream.end();
      return;
    }

    const time = Date.now();
    const userDao = new UserDao(di);
    const userid = await userDao.getCurrentUserIdFromCookie(
      Cookie.parse(event.headers.Cookie || event.headers.cookie || "")
    );
    const path = event.rawPath || event.requestContext.http.path;
    if (userid) {
      di.log.setUser(userid);
    } else {
      di.log.setUser("anonymous");
    }
    di.log.log("--------> Starting streaming request", path);
    di.log.log("User Agent:", event.headers["user-agent"] || event.headers["User-Agent"] || "");

    const url = UrlUtils.build(path, "http://example.com");
    for (const key of Object.keys(event.queryStringParameters || {})) {
      const value = (event.queryStringParameters || {})[key];
      url.searchParams.set(key, value || "");
    }

    const request: IPayload = {
      event,
      di,
      stream,
      onEnd: (status) => {
        stream.write("data: [DONE]\n\n");
        di.log.log("<-------- Responding for", method, path, status, `${Date.now() - time}ms`);
        stream.end();
      },
    };
    let r = new Router<IPayload, void>(request).post(postAiConvertStreamEndpoint, postAiConvertStreamHandler);
    let resp: IEither<void, string>;
    try {
      resp = await r.route(method, url.pathname + url.search);
    } catch (e) {
      rollbar.error(e as Error);
      di.log.log(e);
      const errorStatus = 500;
      di.log.log("<-------- Error ", method, path, errorStatus, `${Date.now() - time}ms`);

      stream.write(
        JSON.stringify({
          headers: getHeaders(event),
          statusCode: errorStatus,
        })
      );
      stream.write(`data: ${JSON.stringify({ type: "error", data: "Internal Server Error" })}\n\n`);
      stream.write("data: [DONE]\n\n");
      stream.end();
      return;
    }
    if (!resp.success) {
      const errorStatus = 404;
      di.log.log("<-------- Responding for", method, path, errorStatus, undefined, `${Date.now() - time}ms`);
      stream.write(
        JSON.stringify({
          headers: getHeaders(event),
          statusCode: errorStatus,
        })
      );
      stream.write(`data: ${JSON.stringify({ type: "error", data: "Not found" })}\n\n`);
      stream.write("data: [DONE]\n\n");
      stream.end();
      return;
    }
  };

  return awslambda.streamifyResponse(handler);
};

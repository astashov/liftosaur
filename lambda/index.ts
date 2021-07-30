import "source-map-support/register";
import fetch from "node-fetch";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, Method, Router, RouteHandler } from "yatro";
import { GoogleAuthTokenDao } from "./dao/googleAuthTokenDao";
import { UserDao, IUserDao } from "./dao/userDao";
import * as Cookie from "cookie";
import JWT from "jsonwebtoken";
import { UidFactory } from "./utils/generator";
import { Utils } from "./utils";
import { IStorage } from "../src/types";
import { ProgramDao } from "./dao/programDao";
import { renderRecordHtml, recordImage } from "./record";
import { LogDao } from "./dao/logDao";
import { renderUserHtml, userImage } from "./user";
import { renderUsersHtml } from "../src/components/admin/usersHtml";
import { CollectionUtils } from "../src/utils/collection";
import { renderLogsHtml, ILogPayloads } from "../src/components/admin/logsHtml";
import Rollbar from "rollbar";
import { buildDi, IDI } from "./utils/di";
import { LogUtil } from "./utils/log";
import { runMigrations } from "../src/migrations/runner";
import { FriendDao } from "./dao/friendDao";
import { IEither } from "../src/utils/types";
// import programsJson from "./programs.json";

interface IOpenIdResponseSuccess {
  sub: string;
  email: string;
}

interface IOpenIdResponseError {
  error: string;
  error_description: string;
}

interface IPayload {
  event: APIGatewayProxyEvent;
  di: IDI;
}

export type IEnv = "dev" | "prod";

const allowedHosts = ["local.liftosaur.com:8080", "www.liftosaur.com"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBodyJson(event: APIGatewayProxyEvent): any {
  try {
    return JSON.parse(Buffer.from(event.body || "e30=", "base64").toString("utf8"));
  } catch (e) {
    return JSON.parse(event.body || "{}");
  }
}

function getHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  const origin = event.headers.Origin || event.headers.origin || "http://example.com";
  const url = new URL(origin);
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

// eslint-disable-next-line @typescript-eslint/ban-types
function json(status: number, event: APIGatewayProxyEvent, body: string | object): APIGatewayProxyResult {
  return {
    statusCode: status,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: getHeaders(event),
  };
}

function getHost(event: APIGatewayProxyEvent): string {
  return event.headers.Host || event.headers.host || "liftosaur.com";
}

function getReferer(event: APIGatewayProxyEvent): string {
  return (
    event.headers.origin ||
    event.headers.Origin ||
    event.headers.referer ||
    event.headers.Referer ||
    "https://liftosaur.com"
  );
}

async function getCurrentUserId(event: APIGatewayProxyEvent, di: IDI): Promise<string | undefined> {
  const cookies = Cookie.parse(event.headers.Cookie || event.headers.cookie || "");
  const cookieSecret = await di.secrets.getCookieSecret();
  if (cookies.session) {
    let isValid = false;
    try {
      isValid = !!JWT.verify(cookies.session, cookieSecret);
    } catch (e) {
      if (e.constructor.name !== "JsonWebTokenError") {
        throw e;
      }
    }
    if (isValid) {
      const session = JWT.decode(cookies.session) as Record<string, string>;
      return session.userId;
    }
  }
  return undefined;
}

async function getCurrentUser(event: APIGatewayProxyEvent, di: IDI): Promise<IUserDao | undefined> {
  const userId = await getCurrentUserId(event, di);
  if (userId != null) {
    return new UserDao(di).getById(userId);
  } else {
    return undefined;
  }
}

const timerEndpoint = Endpoint.build("/timernotification");
const timerHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof timerEndpoint> = async ({ payload }) => {
  const { event, di } = payload;
  const response = await fetch("https://app.webpushr.com/api/v1/notification/send/sid", {
    method: "POST",
    headers: {
      webpushrKey: await di.secrets.getWebpushrKey(),
      webpushrAuthToken: await di.secrets.getWebpushrAuthToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Timer",
      message: "Time to make another attempt",
      target_url: "https://www.liftosaur.com",
      expire_push: "5m",
      sid: (event.queryStringParameters || {}).sid,
    }),
  });

  const body = JSON.stringify({ status: response.ok ? "ok" : "error" });
  return json(response.status, event, body);
};

const getStorageEndpoint = Endpoint.build("/api/storage", { key: "string?", userid: "string?" });
const getStorageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getStorageEndpoint> = async ({
  payload,
  match,
}) => {
  const { event, di } = payload;
  const querystringParams = event.queryStringParameters || {};
  let userId;
  if (match.params.key != null && match.params.userid != null && match.params.key === (await di.secrets.getApiKey())) {
    userId = querystringParams.userid;
  } else {
    userId = await getCurrentUserId(event, di);
  }
  if (userId != null) {
    const user = await new UserDao(di).getById(userId);
    if (user != null) {
      return json(200, event, { storage: user.storage, email: user.email, user_id: user.id });
    }
  }
  return json(200, event, {});
};

const saveStorageEndpoint = Endpoint.build("/api/storage");
const saveStorageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof saveStorageEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const user = await getCurrentUser(event, di);
  if (user != null) {
    const storage: IStorage = getBodyJson(event).storage;
    await new UserDao(di).saveStorage(user, storage);
  }
  return json(200, event, {});
};

const googleLoginEndpoint = Endpoint.build("/api/signin/google");
const googleLoginHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof googleLoginEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const env = Utils.getEnv();
  const { token, forceuseremail } = getBodyJson(event);
  let openIdJson: IOpenIdResponseSuccess | IOpenIdResponseError;
  if (env === "dev" && forceuseremail != null) {
    openIdJson = {
      email: forceuseremail,
      sub: `${forceuseremail}googleId`,
    };
  } else {
    const url = `https://openidconnect.googleapis.com/v1/userinfo?access_token=${token}`;
    const googleApiResponse = await fetch(url);
    openIdJson = await googleApiResponse.json();
  }
  const cookieSecret = await di.secrets.getCookieSecret();

  if ("error" in openIdJson) {
    return json(403, event, openIdJson);
  }

  await new GoogleAuthTokenDao(di).store(env, token, openIdJson.sub);
  const userDao = new UserDao(di);
  let user = await userDao.getByGoogleId(openIdJson.sub);
  let userId = user?.id;

  if (userId == null) {
    userId = UidFactory.generateUid(12);
    user = UserDao.build(userId, openIdJson.sub, openIdJson.email);
    await userDao.store(user);
  }

  const session = JWT.sign({ userId: userId }, cookieSecret);
  const resp = { email: openIdJson.email, user_id: userId, storage: user!.storage };

  return {
    statusCode: 200,
    body: JSON.stringify(resp),
    headers: {
      ...getHeaders(event),
      "set-cookie": Cookie.serialize("session", session, {
        httpOnly: true,
        domain: ".liftosaur.com",
        path: "/",
        expires: new Date(new Date().getFullYear() + 10, 0, 1),
      }),
    },
  };
};

const signoutEndpoint = Endpoint.build("/api/signout");
const signoutHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof signoutEndpoint> = async ({ payload }) => {
  const { event } = payload;
  return {
    statusCode: 200,
    headers: {
      ...getHeaders(event),
      "set-cookie": Cookie.serialize("session", "", {
        httpOnly: true,
        domain: ".liftosaur.com",
        path: "/",
        expires: new Date(1970, 0, 1),
      }),
    },
    body: "{}",
  };
};

const getProgramsEndpoint = Endpoint.build("/api/programs");
const getProgramsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProgramsEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const programs = await new ProgramDao(di).getAll();
  return json(200, event, { programs });
};

const getHistoryRecordEndpoint = Endpoint.build("/api/record", { user: "string?", id: "number?" });
const getHistoryRecordHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getHistoryRecordEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const error: { message?: string } = {};
  if (params.user != null && params.id != null && !isNaN(params.id)) {
    const result = await new UserDao(di).getById(params.user);
    if (result != null) {
      const storage: IStorage = result.storage;
      const history = storage.history;
      const historyRecord = history.find((hi) => hi.id === params.id);
      if (historyRecord != null) {
        return {
          statusCode: 200,
          body: renderRecordHtml(
            { history, record: historyRecord, settings: storage.settings },
            params.user,
            params.id
          ),
          headers: { "content-type": "text/html" },
        };
      } else {
        error.message = "Can't find history record";
      }
    } else {
      error.message = "Can't find user";
    }
  } else {
    error.message = "Missing required params - 'user' or 'id'";
  }
  return json(400, event, { error });
};

const getHistoryRecordImageEndpoint = Endpoint.build("/api/recordimage", {
  user: "string",
  id: "number",
});
const getHistoryRecordImageHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getHistoryRecordImageEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  const env = Utils.getEnv();
  const bucket = `liftosaurcaches${env === "dev" ? "dev" : ""}`;
  const key = `historyrecordimage${event.path}-${params.user}-${params.id}.png`;
  const body = await di.s3.getObject({ bucket, key });
  const headers = {
    "content-type": "image/png",
    "cache-control": "max-age=86400",
  };
  if (body != null) {
    return {
      statusCode: 200,
      body: `${body.toString("base64")}`,
      headers,
      isBase64Encoded: true,
    };
  }

  const error: { message?: string } = {};

  const result = await new UserDao(di).getById(params.user);
  if (result != null) {
    const imageResult = await recordImage(result.storage, params.id);
    if (imageResult.success) {
      const buffer = imageResult.data;
      await di.s3.putObject({ bucket, key, body: buffer });
      return {
        statusCode: 200,
        body: buffer.toString("base64"),
        headers,
        isBase64Encoded: true,
      };
    } else {
      error.message = imageResult.error;
    }
  } else {
    error.message = "Can't find user";
  }
  return json(400, event, { error });
};

const publishProgramEndpoint = Endpoint.build("/api/publishprogram", { key: "string" });
const publishProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof publishProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  if (params.key === (await di.secrets.getApiKey())) {
    const program = getBodyJson(event).program;
    if (program != null) {
      await new ProgramDao(di).save(program);
      return json(200, event, { data: "ok" });
    } else {
      return json(400, event, { error: "missing program in payload" });
    }
  } else {
    return json(401, event, {});
  }
};

const logEndpoint = Endpoint.build("/api/log");
const logHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof logEndpoint> = async ({ payload }) => {
  const { event, di } = payload;
  const { user, action } = getBodyJson(event);
  let data;
  if (user && action) {
    await new LogDao(di).increment(user, action);
    data = "ok";
  } else {
    data = "error";
  }
  return json(200, event, { data });
};

const getProfileEndpoint = Endpoint.build("/profile", { user: "string" });
const getProfileHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProfileEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const error: { message?: string } = {};
  const result = await new UserDao(di).getById(params.user);
  if (result != null) {
    const storage = result.storage;
    if (storage.settings.isPublicProfile) {
      return {
        statusCode: 200,
        body: renderUserHtml(storage, params.user),
        headers: { "content-type": "text/html" },
      };
    } else {
      error.message = "The user's profile is not public";
    }
  } else {
    error.message = "Can't find user";
  }
  return json(400, event, { error });
};

const getProfileImageEndpoint = Endpoint.build("/profileimage", { user: "string" });
const getProfileImageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProfileImageEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const env = Utils.getEnv();
  const bucket = `liftosaurcaches${env === "dev" ? "dev" : ""}`;
  const key = `profileimage${event.path}-${params.user}.png`;
  const body = await di.s3.getObject({ bucket, key });
  const headers = {
    "content-type": "image/png",
    "cache-control": "max-age=86400",
  };
  if (body != null) {
    return {
      statusCode: 200,
      body: `${body.toString("base64")}`,
      headers,
      isBase64Encoded: true,
    };
  }

  const error: { message?: string } = {};
  const result = await new UserDao(di).getById(params.user);
  if (result != null) {
    if (result?.storage?.settings?.isPublicProfile) {
      const imageResult = await userImage(result.storage);
      const buffer = Buffer.from(imageResult);
      await di.s3.putObject({ bucket, key, body: buffer });
      return {
        statusCode: 200,
        body: buffer.toString("base64"),
        headers,
        isBase64Encoded: true,
      };
    } else {
      error.message = "The user's profile is not public";
    }
  } else {
    error.message = "Can't find user";
  }
  return json(400, event, { error });
};

const getAdminUsersEndpoint = Endpoint.build("/admin/users", { key: "string" });
const getAdminUsersHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAdminUsersEndpoint> = async ({
  payload,
  match,
}) => {
  const { event, di } = payload;
  if (match.params.key === (await di.secrets.getApiKey())) {
    const users = await new UserDao(di).getAll();
    const processedUsers = await Promise.all(
      users.map(async (u) => {
        const storage = await runMigrations(fetch, u.storage);

        return {
          id: u.id,
          email: u.email,
          history: storage.history.slice(0, 4),
          totalHistory: storage.history.length,
          programs: storage.programs.map((p) => p.name),
          settings: storage.settings,
          timestamp: u.createdAt,
        };
      })
    );
    processedUsers.sort((a, b) => {
      const h1 = a.history[0];
      const h2 = b.history[0];
      return (h2 == null ? 0 : Date.parse(h2.date)) - (h1 == null ? 0 : Date.parse(h1.date));
    });
    return {
      statusCode: 200,
      body: renderUsersHtml({ users: processedUsers, apiKey: match.params.key }),
      headers: { "content-type": "text/html" },
    };
  } else {
    return json(401, event, { data: "Unauthorized" });
  }
};

const getAdminLogsEndpoint = Endpoint.build("/admin/logs", { key: "string" });
const getAdminLogsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAdminLogsEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  if (params.key === (await di.secrets.getApiKey())) {
    const userLogs = await new LogDao(di).getAll();
    const users = await new UserDao(di).getAllLimited();
    const usersByKey = CollectionUtils.groupByKey(users, "id");
    const logPayloads = userLogs.reduce<ILogPayloads>((memo, log) => {
      memo[log.userId] = memo[log.userId] || { logs: [], email: usersByKey[log.userId]?.[0].email };
      memo[log.userId]!.logs.push({
        action: log.action,
        count: log.cnt,
        timestamp: log.ts,
      });
      return memo;
    }, {});
    return {
      statusCode: 200,
      body: renderLogsHtml({ logs: logPayloads, apiKey: params.key }),
      headers: { "content-type": "text/html" },
    };
  } else {
    return json(401, event, { data: "Unauthorized" });
  }
};

const getFriendsEndpoint = Endpoint.build("/api/friends", { username: "string" });
const getFriendsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getFriendsEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId != null) {
    const friends = await new FriendDao(di).getAllByUsernameOrId(currentUserId, params.username);
    return json(200, event, { friends });
  } else {
    return json(401, event, {});
  }
};

const inviteFriendEndpoint = Endpoint.build("/api/invite/:friendId");
const inviteFriendHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof inviteFriendEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event } = payload;
  const message = getBodyJson(event).message;
  const host = getReferer(event);
  const userDao = new UserDao(payload.di);
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId != null) {
    const [currentUser, friend] = await Promise.all([
      userDao.getLimitedById(currentUserId),
      userDao.getLimitedById(params.friendId),
    ]);
    if (currentUser != null && friend != null) {
      const friendDao = new FriendDao(payload.di);
      const result = await friendDao.invite(currentUser, friend, host, message);
      if (result.success) {
        return json(200, event, {});
      } else {
        return json(400, event, { error: result.error });
      }
    }
  }
  return json(401, event, {});
};

export const acceptFriendInvitationEndpoint = Endpoint.build("/api/acceptfriendinvitation/:friendId");
const acceptFriendInvitationHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof acceptFriendInvitationEndpoint
> = async ({ payload, match: { params } }) => {
  const { event } = payload;
  const friendDao = new FriendDao(payload.di);
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId != null) {
    const result = await friendDao.acceptInvitation(currentUserId, params.friendId);
    if (result.success) {
      return json(200, event, {});
    } else {
      return json(400, event, { error: result.error });
    }
  } else {
    return json(401, event, {});
  }
};

export const removeFriendEndpoint = Endpoint.build("/api/removefriend/:friendId");
const removeFriendHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof removeFriendEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event } = payload;
  const friendDao = new FriendDao(payload.di);
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId != null) {
    const result = await friendDao.removeFriend(currentUserId, params.friendId);
    if (result.success) {
      return json(200, event, {});
    } else {
      return json(400, event, { error: result.error });
    }
  } else {
    return json(401, event, {});
  }
};

export const acceptFriendInvitationByHashEndpoint = Endpoint.build("/api/acceptfriendinvitation", { hash: "string" });
const acceptFriendInvitationByHashHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof acceptFriendInvitationByHashEndpoint
> = async ({ payload, match: { params } }) => {
  const { event } = payload;
  const host = getHost(event);
  const friendDao = new FriendDao(payload.di);
  const result = await friendDao.acceptInvitationByHash(params.hash);
  const redirectUrl = new URL(`https://${host}`);
  if (result.success) {
    redirectUrl.searchParams.set("messagesuccess", result.data);
  } else {
    redirectUrl.searchParams.set("messageerror", result.error);
  }
  return { statusCode: 303, body: "Redirecting...", headers: { Location: redirectUrl.toString() } };
};

export const getFriendsHistoryEndpoint = Endpoint.build("/api/friendshistory", {
  startdate: "string",
  enddate: "string?",
});
const getFriendsHistoryHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getFriendsHistoryEndpoint
> = async ({ payload, match: { params } }) => {
  const { event } = payload;
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId != null) {
    const friendDao = new FriendDao(payload.di);
    const friends = await friendDao.getFriendsWithHistories(currentUserId, params.startdate, params.enddate);
    return json(200, event, { friends: CollectionUtils.groupByKeyUniq(friends, "id") });
  } else {
    return json(401, event, {});
  }
};

// async function loadBackupHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
//   const json = JSON.parse(fs.readFileSync("json.json", "utf-8"));

//   for (const userId in json.users) {
//     if (json.users.hasOwnProperty(userId)) {
//       const { storage, email } = JSON.parse(json.users[userId]) as { storage: IStorage; email: string };
//       if (storage != null) {
//         const googleId = Object.keys(json.google_ids).find((k) => json.google_ids[k] === userId);
//         const user = UserDao.build(userId, googleId!, email);
//         await UserDao.store(user);
//         await UserDao.saveStorage(user, storage);
//       } else {
//         console.error("There's no storage for", userId);
//       }
//     }
//   }

//   for (const token in json.google_access_tokens) {
//     if (json.google_access_tokens.hasOwnProperty(token)) {
//       const googleId = json.google_access_tokens[token];
//       await GoogleAuthTokenDao.store(Utils.getEnv(), token, googleId);
//     }
//   }

//   for (const programId in json.programs) {
//     if (json.programs.hasOwnProperty(programId)) {
//       const { program, timestamp } = JSON.parse(json.programs[programId]) as {
//         program: IProgram;
//         timestamp: number;
//       };
//       await ProgramDao.save(program, timestamp);
//     }
//   }

//   return {
//     statusCode: 200,
//     body: JSON.stringify({ data: "ok" }),
//     headers: getHeaders(event),
//   };
// }

// async function storePrograms(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
//   for (const programPayload of programsJson) {
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     await ProgramDao.add(programPayload as any);
//   }
//   return { statusCode: 200, body: "{}", headers: getHeaders(event) };
// }

const rollbar = new Rollbar({
  accessToken: "3b3e1e0fe50041debced953e58707402",
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: `${Utils.getEnv()}-lambda`,
  },
});

export const handler = rollbar.lambdaHandler(
  async (event: APIGatewayProxyEvent, context): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, body: "", headers: getHeaders(event) };
    }
    const log = new LogUtil();
    const time = Date.now();
    log.log("--------> Starting request", event.httpMethod, event.path);
    const di = buildDi(log);
    const request: IPayload = { event, di };
    const r = new Router<IPayload, APIGatewayProxyResult>(request)
      .post(timerEndpoint, timerHandler)
      .get(getStorageEndpoint, getStorageHandler)
      .post(googleLoginEndpoint, googleLoginHandler)
      .post(signoutEndpoint, signoutHandler)
      .get(getProgramsEndpoint, getProgramsHandler)
      .post(saveStorageEndpoint, saveStorageHandler)
      .get(getHistoryRecordEndpoint, getHistoryRecordHandler)
      .get(getHistoryRecordImageEndpoint, getHistoryRecordImageHandler)
      .post(logEndpoint, logHandler)
      .post(publishProgramEndpoint, publishProgramHandler)
      .get(getProfileEndpoint, getProfileHandler)
      .get(getProfileImageEndpoint, getProfileImageHandler)
      .get(getAdminUsersEndpoint, getAdminUsersHandler)
      .get(getAdminLogsEndpoint, getAdminLogsHandler)
      .get(getFriendsEndpoint, getFriendsHandler)
      .post(inviteFriendEndpoint, inviteFriendHandler)
      .get(acceptFriendInvitationByHashEndpoint, acceptFriendInvitationByHashHandler)
      .post(acceptFriendInvitationEndpoint, acceptFriendInvitationHandler)
      .delete(removeFriendEndpoint, removeFriendHandler)
      .get(getFriendsHistoryEndpoint, getFriendsHistoryHandler);
    // r.post(".*/api/loadbackup", loadBackupHandler);
    const url = new URL(event.path, "http://example.com");
    for (const key of Object.keys(event.queryStringParameters || {})) {
      const value = (event.queryStringParameters || {})[key];
      url.searchParams.set(key, value || "");
    }
    let resp: IEither<APIGatewayProxyResult, string>;
    let errorStatus = 404;
    try {
      resp = await r.route(event.httpMethod as Method, url.pathname + url.search);
    } catch (e) {
      console.error(e);
      errorStatus = 500;
      resp = { success: false, error: "Internal Server Error" };
    }
    log.log(
      "<-------- Responding for",
      event.httpMethod,
      event.path,
      resp.success ? resp.data.statusCode : errorStatus,
      `${Date.now() - time}ms`
    );
    return resp.success ? resp.data : { statusCode: errorStatus, headers: getHeaders(event), body: resp.error };
  }
) as Rollbar.LambdaHandler<unknown, APIGatewayProxyResult, unknown>;

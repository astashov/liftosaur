import "source-map-support/register";
import fetch from "node-fetch";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Router } from "./router";
import { GoogleAuthTokenDao } from "./dao/googleAuthTokenDao";
import { UserDao, IUserDao } from "./dao/userDao";
import * as Cookie from "cookie";
import JWT from "jsonwebtoken";
import { UidFactory } from "./utils/generator";
import AWS from "aws-sdk";
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
// import programsJson from "./programs.json";

interface IOpenIdResponseSuccess {
  sub: string;
  email: string;
}

interface IOpenIdResponseError {
  error: string;
  error_description: string;
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
      "access-control-expose-headers": "cookie, set-cookie",
    };
  }
  return headers;
}

async function getSecret(arns: { dev: string; prod: string }): Promise<string> {
  const sm = new AWS.SecretsManager();
  return sm
    .getSecretValue({ SecretId: arns[Utils.getEnv()] })
    .promise()
    .then((s) => s.SecretString!);
}

async function getCookieSecret(): Promise<string> {
  return getSecret({
    dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecretDev-0eiLCe",
    prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecret-FwRXge",
  });
}

async function getApiKey(): Promise<string> {
  return getSecret({
    dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftKeyApiKeyDev-JyFvUp",
    prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:lftKeyApiKey-rdTqST",
  });
}

async function getWebpushrKey(): Promise<string> {
  return getSecret({
    dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrKeyDev-OfWaEI",
    prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrKey-RrE8Yo",
  });
}

async function getWebpushrAuthToken(): Promise<string> {
  return getSecret({
    dev: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrAuthTokenDev-Fa7AH9",
    prod: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyWebpushrAuthToken-dxAKvR",
  });
}

async function getCurrentUserId(event: APIGatewayProxyEvent): Promise<string | undefined> {
  const cookies = Cookie.parse(event.headers.Cookie || event.headers.cookie || "");
  const cookieSecret = await getCookieSecret();
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

async function getCurrentUser(event: APIGatewayProxyEvent): Promise<IUserDao | undefined> {
  const userId = await getCurrentUserId(event);
  if (userId != null) {
    return UserDao.getById(userId);
  } else {
    return undefined;
  }
}

async function timerHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const response = await fetch("https://app.webpushr.com/api/v1/notification/send/sid", {
    method: "POST",
    headers: {
      webpushrKey: await getWebpushrKey(),
      webpushrAuthToken: await getWebpushrAuthToken(),
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
  return { statusCode: response.status, body, headers: getHeaders(event) };
}

async function getStorageHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const querystringParams = event.queryStringParameters || {};
  const adminKey = querystringParams.key;
  const userIdKey = querystringParams.userid;
  let userId;
  if (adminKey != null && userIdKey != null && adminKey === (await getApiKey())) {
    userId = querystringParams.userid;
  } else {
    userId = await getCurrentUserId(event);
  }
  if (userId != null) {
    const user = await UserDao.getById(userId);
    if (user != null) {
      return {
        statusCode: 200,
        body: JSON.stringify({ storage: user.storage, email: user.email, user_id: user.id }),
        headers: getHeaders(event),
      };
    }
  }
  return { statusCode: 200, body: "{}", headers: getHeaders(event) };
}

async function saveStorageHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = await getCurrentUser(event);
  if (user != null) {
    const storage: IStorage = getBodyJson(event).storage;
    await UserDao.saveStorage(user, storage);
  }
  return {
    statusCode: 200,
    body: "{}",
    headers: getHeaders(event),
  };
}

async function googleLoginHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const token = getBodyJson(event).token;
  const url = `https://openidconnect.googleapis.com/v1/userinfo?access_token=${token}`;
  const googleApiResponse = await fetch(url);
  const openIdJson: IOpenIdResponseSuccess | IOpenIdResponseError = await googleApiResponse.json();
  const env = process.env.IS_DEV === "true" ? "dev" : "prod";
  const cookieSecret = await getCookieSecret();

  if ("error" in openIdJson) {
    return {
      statusCode: 403,
      body: JSON.stringify(openIdJson),
      headers: getHeaders(event),
    };
  }

  await GoogleAuthTokenDao.store(env, token, openIdJson.sub);
  let user = await UserDao.getByGoogleId(openIdJson.sub);
  let userId = user?.id;

  if (userId == null) {
    userId = UidFactory.generateUid(12);
    user = UserDao.build(userId, openIdJson.sub, openIdJson.email);
    await UserDao.store(user);
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
}

async function signoutHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
}

async function getProgramsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const programs = await ProgramDao.getAll();
  return { statusCode: 200, body: JSON.stringify({ programs }), headers: getHeaders(event) };
}

async function getHistoryRecord(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.queryStringParameters?.user;
  const recordId = parseInt(event.queryStringParameters?.id || "", 10);
  const error: { message?: string } = {};
  if (userId != null && recordId != null && !isNaN(recordId)) {
    const result = await UserDao.getById(userId);
    if (result != null) {
      const storage: IStorage = result.storage;
      const history = storage.history;
      const historyRecord = history.find((hi) => hi.id === recordId);
      if (historyRecord != null) {
        return {
          statusCode: 200,
          body: renderRecordHtml({ history, record: historyRecord, settings: storage.settings }, userId, recordId),
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
  return {
    statusCode: 400,
    body: JSON.stringify({ error }),
    headers: getHeaders(event),
  };
}

async function getHistoryRecordImage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const s3 = new AWS.S3();
  const env = Utils.getEnv();
  const userId = event.queryStringParameters?.user;
  const recordId = parseInt(event.queryStringParameters?.id || "", 10);
  const bucket = `liftosaurcaches${env === "dev" ? "dev" : ""}`;
  const key = `historyrecordimage${event.path}-${userId}-${recordId}.png`;
  console.log(key);
  let body: AWS.S3.GetObjectOutput["Body"];
  try {
    const cachedResponse = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    body = cachedResponse.Body;
  } catch (e) {
    if (e.code !== "NoSuchKey") {
      throw e;
    }
  }
  const headers = {
    "content-type": "image/png",
    "cache-control": "max-age=86400",
  };
  if (body != null) {
    console.log(body);
    return {
      statusCode: 200,
      body: `${body.toString("base64")}`,
      headers,
      isBase64Encoded: true,
    };
  }

  const error: { message?: string } = {};

  if (userId != null && recordId != null && !isNaN(recordId)) {
    const result = await UserDao.getById(userId);
    if (result != null) {
      const imageResult = await recordImage(result.storage, recordId);
      if (imageResult.success) {
        const buffer = Buffer.from(imageResult.data);
        await s3.putObject({ Bucket: bucket, Key: key, Body: buffer }).promise();
        console.log(buffer.toString("base64"));
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
  } else {
    error.message = "Missing required params - 'user' or 'id'";
  }
  return {
    statusCode: 400,
    body: JSON.stringify({ error }),
    headers: getHeaders(event),
  };
}

async function publishProgramHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const key = event.queryStringParameters?.key;
  if (key != null && key === (await getApiKey())) {
    const program = getBodyJson(event).program;
    if (program != null) {
      await ProgramDao.save(program);
      return { statusCode: 200, body: JSON.stringify({ data: "ok" }), headers: getHeaders(event) };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "missing program in payload" }),
        headers: getHeaders(event),
      };
    }
  } else {
    return {
      statusCode: 401,
      body: "{}",
      headers: getHeaders(event),
    };
  }
}

async function logHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { user, action } = getBodyJson(event);
  let data;
  if (user && action) {
    await LogDao.increment(user, action);
    data = "ok";
  } else {
    data = "error";
  }
  return { statusCode: 200, body: JSON.stringify({ data }), headers: getHeaders(event) };
}

async function getProfileHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = event.queryStringParameters?.user;
  const error: { message?: string } = {};
  if (userId != null) {
    const result = await UserDao.getById(userId);
    if (result != null) {
      const storage = result.storage;
      if (storage.settings.isPublicProfile) {
        return {
          statusCode: 200,
          body: renderUserHtml(storage, userId),
          headers: { "content-type": "text/html" },
        };
      } else {
        error.message = "The user's profile is not public";
      }
    } else {
      error.message = "Can't find user";
    }
  } else {
    error.message = "Missing required params - 'user'";
  }
  return { statusCode: 400, body: JSON.stringify({ error }), headers: getHeaders(event) };
}

async function getProfileImage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const s3 = new AWS.S3();
  const env = Utils.getEnv();
  const userId = event.queryStringParameters?.user;
  const bucket = `liftosaurcaches${env === "dev" ? "dev" : ""}`;
  const key = `profileimage${event.path}-${userId}.png`;
  console.log(key);
  let body: AWS.S3.GetObjectOutput["Body"];
  try {
    const cachedResponse = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    body = cachedResponse.Body;
  } catch (e) {
    if (e.code !== "NoSuchKey") {
      throw e;
    }
  }
  const headers = {
    "content-type": "image/png",
    "cache-control": "max-age=86400",
  };
  if (body != null) {
    console.log(body);
    return {
      statusCode: 200,
      body: `${body.toString("base64")}`,
      headers,
      isBase64Encoded: true,
    };
  }

  const error: { message?: string } = {};
  if (userId != null) {
    const result = await UserDao.getById(userId);
    if (result != null) {
      if (result?.storage?.settings?.isPublicProfile) {
        const imageResult = await userImage(result.storage);
        if (imageResult.success) {
          const buffer = Buffer.from(imageResult.data);
          await s3.putObject({ Bucket: bucket, Key: key, Body: buffer }).promise();
          console.log(buffer.toString("base64"));
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
        error.message = "The user's profile is not public";
      }
    } else {
      error.message = "Can't find user";
    }
  } else {
    error.message = "Missing required params - 'user'";
  }
  return { statusCode: 400, body: JSON.stringify({ error }), headers: getHeaders(event) };
}

async function getUsersHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const key = event.queryStringParameters?.key;
  if (key != null && key === (await getApiKey())) {
    const users = await UserDao.getAll();
    const processedUsers = users.map((u) => {
      return {
        id: u.id,
        email: u.email,
        history: u.storage.history.slice(0, 4),
        totalHistory: u.storage.history.length,
        programs: u.storage.programs.map((p) => p.name),
        settings: u.storage.settings,
        timestamp: u.createdAt,
      };
    });
    processedUsers.sort((a, b) => {
      const h1 = a.history[0];
      const h2 = b.history[0];
      return (h2 == null ? 0 : Date.parse(h2.date)) - (h1 == null ? 0 : Date.parse(h1.date));
    });
    return {
      statusCode: 200,
      body: renderUsersHtml({ users: processedUsers, apiKey: key }),
      headers: { "content-type": "text/html" },
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ data: "Unauthorized" }),
      headers: getHeaders(event),
    };
  }
}

async function getAdminLogsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const key = event.queryStringParameters?.key;
  if (key != null && key === (await getApiKey())) {
    const userLogs = await LogDao.getAll();
    const users = await UserDao.getAllLimited();
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
      body: renderLogsHtml({ logs: logPayloads, apiKey: key }),
      headers: { "content-type": "text/html" },
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ data: "Unauthorized" }),
      headers: getHeaders(event),
    };
  }
}

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
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const r = new Router();
    r.post(".*timernotification", timerHandler);
    r.post(".*/api/signin/google", googleLoginHandler);
    r.post(".*/api/signout", signoutHandler);
    r.post(".*/api/storage", saveStorageHandler);
    r.get(".*/api/storage", getStorageHandler);
    r.get(".*/api/record", getHistoryRecord);
    r.get(".*/api/recordimage", getHistoryRecordImage);
    r.post(".*/api/publishprogram", publishProgramHandler);
    r.get(".*/api/programs", getProgramsHandler);
    r.post(".*/api/log", logHandler);
    r.get(".*/profile", getProfileHandler);
    r.get(".*/profileimage", getProfileImage);
    // r.post(".*/api/loadbackup", loadBackupHandler);

    r.get(".*/admin/users", getUsersHandler);
    r.get(".*/admin/logs", getAdminLogsHandler);
    const resp = await r.route(event);
    return resp;
  }
);

import CloudflareWorkerGlobalScope, { CloudflareWorkerKV } from "types-cloudflare-worker";
import { Router } from "./router";
import { UidFactory } from "./utils/generator";
import * as Cookie from "cookie";
import JWT from "jsonwebtoken";
import { Backup } from "./backup";
import { IStorage } from "../../src/models/state";
import { renderRecordHtml, recordImage } from "./record";
import { ProgramModel } from "./models/program";
import { runMigrations } from "./migrations/runner";
import { UserModel } from "./models/user";
import { renderUsersHtml } from "../../src/components/admin/usersHtml";

declare let kv_liftosaur_google_access_tokens: CloudflareWorkerKV;
declare let kv_liftosaur_google_ids: CloudflareWorkerKV;
declare let kv_liftosaur_users: CloudflareWorkerKV;
declare let kv_liftosaur_programs: CloudflareWorkerKV;

interface IOpenIdResponse {
  sub: string;
  email: string;
}

interface IUser {
  id: string;
  email: string;
}

declare let self: CloudflareWorkerGlobalScope;
declare let webpushrKey: string;
declare let webpushrAuthToken: string;
declare let apiKey: string;
declare let cookieSecret: string;

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

const allowedHosts = ["local.liftosaur.com:8080", "www.liftosaur.com"];

function getHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "http://example.com";
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

async function timerHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const response = await fetch("https://app.webpushr.com/api/v1/notification/send/sid", {
    method: "POST",
    headers: {
      webpushrKey: webpushrKey,
      webpushrAuthToken: webpushrAuthToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Timer",
      message: "Time to get another attempt",
      target_url: "https://www.liftosaur.com",
      expire_push: "5m",
      sid: url.searchParams.get("sid"),
    }),
  });

  const init = {
    headers: getHeaders(request),
    status: response.status,
  };
  const body = JSON.stringify({ status: response.ok ? "ok" : "error" });
  return new Response(body, init);
}

async function googleLoginHandler(request: Request): Promise<Response> {
  const token = (await request.json()).token;
  const url = `https://openidconnect.googleapis.com/v1/userinfo?access_token=${token}`;
  const response = await fetch(url);
  const openIdJson: IOpenIdResponse = await response.json();
  await kv_liftosaur_google_access_tokens.put(token, openIdJson.sub);
  let userId = await kv_liftosaur_google_ids.get(openIdJson.sub);
  if (userId == null) {
    userId = UidFactory.generateUid(12);
    await kv_liftosaur_google_ids.put(openIdJson.sub, userId);
  }
  const storageStr = await kv_liftosaur_users.get(userId);
  let storage;
  if (storageStr == null) {
    storage = { email: openIdJson.email, id: userId, timestamp: Date.now() };
    await kv_liftosaur_users.put(userId, JSON.stringify(storage));
  } else {
    storage = JSON.parse(storageStr);
  }
  const session = JWT.sign({ userId: userId }, cookieSecret);
  const resp = { email: openIdJson.email, user_id: userId, storage: storage.storage };
  return new Response(JSON.stringify(resp), {
    headers: {
      ...getHeaders(request),
      "set-cookie": Cookie.serialize("session", session, {
        httpOnly: true,
        domain: ".liftosaur.com",
        path: "/",
        expires: new Date(new Date().getFullYear() + 10, 0, 1),
      }),
    },
  });
}

async function signoutHandler(request: Request): Promise<Response> {
  return new Response(JSON.stringify({}), {
    headers: {
      ...getHeaders(request),
      "set-cookie": Cookie.serialize("session", "", {
        httpOnly: true,
        domain: ".liftosaur.com",
        path: "/",
        expires: new Date(1970, 0, 1),
      }),
    },
  });
}

async function getCurrentUser(request: Request): Promise<IUser | undefined> {
  const cookies = Cookie.parse(request.headers.get("cookie") || "");
  if (cookies.session != null && JWT.verify(cookies.session, cookieSecret)) {
    const session = JWT.decode(cookies.session) as Record<string, string>;
    return getUser(session.userId);
  } else {
    return undefined;
  }
}

async function getUser(userId: string): Promise<IUser | undefined> {
  const resultRaw = await kv_liftosaur_users.get(userId);
  if (resultRaw != null) {
    const result = JSON.parse(resultRaw);
    return { id: result.id, email: result.email };
  } else {
    return undefined;
  }
}

async function getStorageHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userid");
  const adminKey = url.searchParams.get("key");
  let user: IUser | undefined;
  if (userId != null && adminKey === apiKey) {
    user = await getUser(userId);
  } else {
    user = await getCurrentUser(request);
  }
  if (user != null) {
    const resultRaw = await kv_liftosaur_users.get(user.id);
    if (resultRaw != null) {
      const result = JSON.parse(resultRaw);
      return new Response(JSON.stringify({ storage: result.storage, email: user.email, user_id: user.id }), {
        headers: getHeaders(request),
      });
    }
  }
  return new Response(JSON.stringify({}), { headers: getHeaders(request) });
}

async function getHistoryRecord(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user");
  const recordId = parseInt(url.searchParams.get("id") || "", 10);
  const error: { message?: string } = {};
  if (userId != null && recordId != null && !isNaN(recordId)) {
    const resultRaw = await kv_liftosaur_users.get(userId);
    if (resultRaw != null) {
      const result = JSON.parse(resultRaw);
      const storage: IStorage = result.storage;
      const history = storage.history;
      const historyRecord = history.find((hi) => hi.id === recordId);
      if (historyRecord != null) {
        return new Response(
          renderRecordHtml({ history, record: historyRecord, settings: storage.settings }, userId, recordId),
          {
            headers: { "content-type": "text/html" },
          }
        );
      } else {
        error.message = "Can't find history record";
      }
    } else {
      error.message = "Can't find user";
    }
  } else {
    error.message = "Missing required params - 'user' or 'id'";
  }
  return new Response(JSON.stringify({ error }), { headers: getHeaders(request), status: 400 });
}

async function getHistoryRecordImage(request: Request): Promise<Response> {
  const cache = caches.default;
  const cachedResponse = await cache.match(request);
  if (cachedResponse != null) {
    return cachedResponse;
  }

  const error: { message?: string } = {};

  const url = new URL(request.url);
  const userId = url.searchParams.get("user");
  const recordId = parseInt(url.searchParams.get("id") || "", 10);
  if (userId != null && recordId != null && !isNaN(recordId)) {
    const resultRaw = await kv_liftosaur_users.get(userId);
    if (resultRaw != null) {
      const result = JSON.parse(resultRaw);
      const imageResult = await recordImage(result.storage, recordId);
      if (imageResult.success) {
        const response = new Response(imageResult.data, {
          headers: {
            "content-type": "image/png",
            "cache-control": "max-age=86400",
          },
          status: 200,
        });
        cache.put(request, response.clone());
        return response;
      } else {
        error.message = imageResult.error;
      }
    } else {
      error.message = "Can't find user";
    }
  } else {
    error.message = "Missing required params - 'user' or 'id'";
  }
  return new Response(JSON.stringify({ error }), { headers: getHeaders(request), status: 400 });
}

async function saveStorageHandler(request: Request): Promise<Response> {
  const user = await getCurrentUser(request);
  if (user != null) {
    const storage = (await request.json()).storage;
    const payload = { storage, email: user.email, id: user.id };
    await kv_liftosaur_users.put(user.id, JSON.stringify(payload));
    return new Response(JSON.stringify({}), { headers: getHeaders(request) });
  } else {
    return new Response(JSON.stringify({}), { headers: getHeaders(request) });
  }
}

async function backupHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("key") === apiKey) {
    let result = true;
    console.log("Backing up users...");
    result = result && (await new Backup(kv_liftosaur_users, "kv_liftosaur_users").backup());
    console.log("Google IDS...");
    result = result && (await new Backup(kv_liftosaur_google_ids, "kv_liftosaur_google_ids").backup());
    console.log("Programs...");
    result = result && (await new Backup(kv_liftosaur_programs, "kv_liftosaur_programs").backup());
    console.log("Access Tokens...");
    result =
      result && (await new Backup(kv_liftosaur_google_access_tokens, "kv_liftosaur_google_access_tokens").backup());
    return new Response(result ? "ok" : "error");
  } else {
    return new Response("wrong_key", { status: 400 });
  }
}

async function migrationHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("key") === apiKey) {
    try {
      await runMigrations();
      return new Response("ok");
    } catch (e) {
      return new Response(JSON.stringify(e), { status: 500 });
    }
  } else {
    return new Response("wrong_key", { status: 400 });
  }
}

async function publishProgramHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("key") === apiKey) {
    const program = (await request.json()).program;
    await ProgramModel.save(program);
    return new Response(JSON.stringify({ data: "ok" }), { headers: getHeaders(request) });
  } else {
    return new Response(JSON.stringify({}), { status: 401, headers: getHeaders(request) });
  }
}

async function getProgramsHandler(request: Request): Promise<Response> {
  const programs = await ProgramModel.getAll();
  return new Response(JSON.stringify({ programs }), { headers: getHeaders(request) });
}

async function syncToProdHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("key") === apiKey) {
    const ids =
      url.searchParams
        .get("ids")
        ?.split(",")
        .map((id) => id.trim()) || [];
    const syncedIds = await ProgramModel.syncToProd(ids);
    return new Response(JSON.stringify({ data: { ids: syncedIds } }), { headers: getHeaders(request) });
  } else {
    return new Response(JSON.stringify({}), { status: 401, headers: getHeaders(request) });
  }
}

async function syncToDevHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("key") === apiKey) {
    const ids =
      url.searchParams
        .get("ids")
        ?.split(",")
        .map((id) => id.trim()) || [];
    const syncedIds = await ProgramModel.syncToDev(ids);
    return new Response(JSON.stringify({ data: { ids: syncedIds } }), { headers: getHeaders(request) });
  } else {
    return new Response(JSON.stringify({}), { status: 401, headers: getHeaders(request) });
  }
}

async function getUsersHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (key === apiKey) {
    const users = await UserModel.getAll();
    const processedUsers = users.map((u) => {
      return {
        id: u.id,
        email: u.email,
        history: u.storage.history.slice(0, 4),
        totalHistory: u.storage.history.length,
        programs: u.storage.programs.map((p) => p.name),
        settings: u.storage.settings,
        timestamp: u.timestamp,
      };
    });
    processedUsers.sort((a, b) => {
      const h1 = a.history[0];
      const h2 = b.history[0];
      return (h2 == null ? 0 : Date.parse(h2.date)) - (h1 == null ? 0 : Date.parse(h1.date));
    });
    return new Response(renderUsersHtml({ users: processedUsers, apiKey: key }), {
      headers: { "content-type": "text/html" },
    });
  } else {
    return new Response("Unauthorized", { status: 401, headers: getHeaders(request) });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const r = new Router();
  r.post(".*timernotification", (req: Request) => timerHandler(req));
  r.post(".*/api/signin/google", (req: Request) => googleLoginHandler(req));
  r.post(".*/api/signout", (req: Request) => signoutHandler(req));
  r.post(".*/api/storage", (req: Request) => saveStorageHandler(req));
  r.get(".*/api/storage", (req: Request) => getStorageHandler(req));
  r.get(".*/api/backup", (req: Request) => backupHandler(req));
  r.get(".*/api/record", (req: Request) => getHistoryRecord(req));
  r.get(".*/api/recordimage", (req: Request) => getHistoryRecordImage(req));
  r.post(".*/api/publishprogram", (req: Request) => publishProgramHandler(req));
  r.post(".*/api/migrate", (req: Request) => migrationHandler(req));
  r.get(".*/api/programs", (req: Request) => getProgramsHandler(req));
  r.post(".*/api/synctoprod", (req: Request) => syncToProdHandler(req));
  r.post(".*/api/synctodev", (req: Request) => syncToDevHandler(req));

  r.get(".*/admin/users", (req: Request) => getUsersHandler(req));
  const resp = await r.route(request);
  return resp;
}

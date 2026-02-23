import "source-map-support/register";
import * as fs from "fs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, Method, Router, RouteHandler } from "yatro";
import { GoogleAuthTokenDao } from "./dao/googleAuthTokenDao";
import { UserDao, ILimitedUserDao } from "./dao/userDao";
import * as Cookie from "cookie";
import JWT from "jsonwebtoken";
import { UidFactory } from "./utils/generator";
import { Utils } from "./utils";
import { ApplePromotionalOfferSigner } from "./utils/applePromotionalOfferSigner";
import rsaPemFromModExp from "rsa-pem-from-mod-exp";
import { IPartialStorage, IStorage } from "../src/types";
import { ProgramDao } from "./dao/programDao";
import { renderRecordHtml, recordImage } from "./record";
import { LogDao } from "./dao/logDao";
import { renderUserHtml, userImage } from "./user";
import { renderProgramDetailsHtml } from "./programDetails";
import { renderUsersHtml } from "../src/components/admin/usersHtml";
import { CollectionUtils } from "../src/utils/collection";
import { renderLogsHtml, ILogPayloads } from "../src/components/admin/logsHtml";
import Rollbar from "rollbar";
import { IDI } from "./utils/di";
import { runMigrations } from "../src/migrations/runner";
import { c, IEither } from "../src/utils/types";
import { ResponseUtils } from "./utils/response";
import { ImageCacher } from "./utils/imageCacher";
import { ProgramImageGenerator } from "./utils/programImageGenerator";
import { AppleAuthTokenDao } from "./dao/appleAuthTokenDao";
import { Subscriptions } from "./utils/subscriptions";
import * as ClientSubscription from "../src/utils/subscriptions";
import { NodeEncoder } from "./utils/nodeEncoder";
import { renderProgramHtml } from "./program";
import { IExportedProgram, Program } from "../src/models/program";
import { ImportExporter } from "../src/lib/importexporter";
import { UrlDao } from "./dao/urlDao";
import { AffiliateDao } from "./dao/affiliateDao";
import { renderAffiliateDashboardHtml } from "./affiliateDashboard";
import { renderUserAffiliatesHtml } from "./userAffiliates";
import { renderUsersDashboardHtml } from "./usersDashboard";
import { DateUtils } from "../src/utils/date";
import { IUsersDashboardData } from "../src/pages/usersDashboard/usersDashboardContent";
import { Mobile } from "./utils/mobile";
import { renderAffiliatesHtml } from "./affiliates";
import { renderAiPromptHtml } from "./aiPrompt";
import { FreeUserDao } from "./dao/freeUserDao";
import { SubscriptionDetailsDao } from "./dao/subscriptionDetailsDao";
import { AppleWebhookHandler } from "./utils/appleWebhookHandler";
import { ApplePaymentProcessor } from "./utils/applePaymentProcessor";
import { GooglePaymentProcessor } from "./utils/googlePaymentProcessor";
import { GoogleWebhookHandler } from "./utils/googleWebhookHandler";
import { CouponDao } from "./dao/couponDao";
import { DebugDao } from "./dao/debugDao";
import { renderPlannerHtml } from "./planner";
import { ExceptionDao } from "./dao/exceptionDao";
import { UrlUtils } from "../src/utils/url";
import { RollbarUtils } from "../src/utils/rollbar";
import { Account, IAccount } from "../src/models/account";
import { Storage } from "../src/models/storage";
import { renderProgramsListHtml } from "./programsList";
import { renderMainHtml } from "./main";
import { getUserImagesPrefix, LftS3Buckets } from "./dao/buckets";
import { IStorageUpdate, IStorageUpdate2 } from "../src/utils/sync";
import { IEventPayload, IPostSyncResponse } from "../src/api/service";
import { Settings } from "../src/models/settings";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import { renderLoginHtml } from "./login";
import { ExerciseImageUtils } from "../src/models/exerciseImage";
import { Exercise } from "../src/models/exercise";
import { renderExerciseHtml } from "./exercise";
import { renderAllExercisesHtml } from "./allExercises";
import { renderAllProgramsHtml } from "./allPrograms";
import { renderRepMaxHtml } from "./repmax";
import { MathUtils } from "../src/utils/math";
import { EventDao } from "./dao/eventDao";
import { PaymentDao } from "./dao/paymentDao";
import { StorageDao } from "./dao/storageDao";
import { renderUserDashboardHtml } from "./userDashboard";
import { renderPaymentsDashboardHtml, IPaymentsDashboardData } from "./paymentsDashboard";
import { IExportedPlannerProgram } from "../src/pages/planner/models/types";
import { UrlContentFetcher } from "./utils/urlContentFetcher";
import { LlmPrompt } from "./utils/llms/llmPrompt";
import { AiLogsDao } from "./dao/aiLogsDao";
import { ICollectionVersions } from "../src/models/versionTracker";
import { ObjectUtils } from "../src/utils/object";
import { ClaudeProvider } from "./utils/llms/claude";
import { MuscleGenerator } from "./utils/muscleGenerator";
import { LlmMuscles } from "./utils/llms/llmMuscles";
import { AiMuscleCacheDao } from "./dao/aiMuscleCacheDao";
import { TestimonialDao } from "./dao/testimonialDao";

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

export interface IStatsUserData {
  userId: string;
  email?: string;
  userTs?: number;
  isSubscribed?: boolean;
  firstAction: { ts: number; name: string };
  lastAction: { ts: number; name: string };
}

export type IEnv = "dev" | "prod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBodyJson(event: APIGatewayProxyEvent): any {
  try {
    return JSON.parse(Buffer.from(event.body || "e30=", "base64").toString("utf8"));
  } catch (e) {
    return JSON.parse(event.body || "{}");
  }
}

async function getCurrentUserId(event: APIGatewayProxyEvent, di: IDI): Promise<string | undefined> {
  const userDao = new UserDao(di);

  // Try cookies first (web/iOS web view)
  const cookies = Cookie.parse(event.headers.Cookie || event.headers.cookie || "");
  let userId = await userDao.getCurrentUserIdFromCookie(cookies);

  if (!userId) {
    // Try Authorization header (Apple Watch)
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      userId = await userDao.getUserIdFromToken(token);
    }
  }

  return userId;
}

async function getCurrentLimitedUser(event: APIGatewayProxyEvent, di: IDI): Promise<ILimitedUserDao | undefined> {
  const userId = await getCurrentUserId(event, di);
  if (userId != null) {
    return new UserDao(di).getLimitedById(userId);
  } else {
    return undefined;
  }
}

function getUserAgent(event: APIGatewayProxyEvent): string {
  return event.headers["user-agent"] || event.headers["User-Agent"] || "";
}

const postVerifyAppleReceiptEndpoint = Endpoint.build("/api/verifyapplereceipt");
const postVerifyAppleReceiptHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postVerifyAppleReceiptEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  const bodyJson = getBodyJson(event);
  const { appleReceipt, userId } = bodyJson;
  // return ResponseUtils.json(200, event, { result: true });
  if (appleReceipt == null) {
    return ResponseUtils.json(200, event, { result: false });
  }
  const subscriptions = new Subscriptions(di.log, di.secrets);
  const appleJson = await subscriptions.getAppleVerificationJson(appleReceipt);
  let verifiedAppleReceipt = undefined;
  if (appleJson) {
    verifiedAppleReceipt = subscriptions.verifyAppleReceiptJson(appleReceipt, appleJson);
    if (verifiedAppleReceipt && userId) {
      const subscriptionDetails = subscriptions.getAppleVerificationInfo(userId, appleJson);
      if (subscriptionDetails) {
        await new SubscriptionDetailsDao(di).add(subscriptionDetails);
      }

      try {
        const applePaymentProcessor = new ApplePaymentProcessor(di, subscriptions);
        await applePaymentProcessor.processReceiptPayment(userId, appleJson.latest_receipt_info);
      } catch (e) {
        di.log.log("Failed to add Apple payment record", e);
      }
    }
    return ResponseUtils.json(200, event, { result: !!verifiedAppleReceipt });
  } else {
    return ResponseUtils.json(200, event, { result: true });
  }
};

const postVerifyGooglePurchaseTokenEndpoint = Endpoint.build("/api/verifygooglepurchasetoken");
const postVerifyGooglePurchaseTokenHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postVerifyGooglePurchaseTokenEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  const bodyJson = getBodyJson(event);
  const { googlePurchaseToken, userId } = bodyJson;
  if (googlePurchaseToken == null) {
    return ResponseUtils.json(200, event, { result: false });
  }
  const subscriptions = new Subscriptions(di.log, di.secrets);
  const { token, productId } = JSON.parse(googlePurchaseToken) as { token: string; productId: string };
  const googleJson = await subscriptions.getGooglePurchaseTokenJson(token, productId);
  let verifiedGooglePurchaseToken = false;
  if (googleJson) {
    verifiedGooglePurchaseToken = await subscriptions.verifyGooglePurchaseTokenJson(googleJson);
    if (verifiedGooglePurchaseToken && userId && !("error" in googleJson)) {
      const subscriptionDetails = await subscriptions.getGoogleVerificationInfo(
        userId,
        googleJson,
        googlePurchaseToken
      );
      if (subscriptionDetails) {
        await new SubscriptionDetailsDao(di).add(subscriptionDetails);
      }

      try {
        const googlePaymentProcessor = new GooglePaymentProcessor(di);
        await googlePaymentProcessor.processVerificationPayment(userId, googleJson, token, productId);
      } catch (e) {
        di.log.log("Failed to add Google payment record", e);
      }
    }
  }
  return ResponseUtils.json(200, event, { result: !!verifiedGooglePurchaseToken });
};

const postAppleWebhookEndpoint = Endpoint.build("/api/apple-payment-webhook");
const postAppleWebhookHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postAppleWebhookEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const body = event.body;
  di.log.log("Received body", body);

  const appleWebhookHandler = new AppleWebhookHandler(di);
  const result = await appleWebhookHandler.handleWebhook(body);

  if (result.error) {
    return ResponseUtils.json(400, event, result);
  }

  return ResponseUtils.json(200, event, result);
};

const postGoogleWebhookEndpoint = Endpoint.build("/api/google-payment-webhook");
const postGoogleWebhookHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postGoogleWebhookEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  const handler = new GoogleWebhookHandler(di);
  const authorizationHeader = event.headers?.authorization || event.headers?.Authorization;
  di.log.log("Received headers", event.headers);
  const result = await handler.handleWebhook(event.body || "", authorizationHeader);

  return ResponseUtils.json(200, event, { status: result.success ? "ok" : "error", message: result.message });
};

const postReceiveAdAttrEndpoint = Endpoint.build("/api/adattr");
const postReceiveAdAttrHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postReceiveAdAttrEndpoint
> = async ({ payload }) => {
  const body = payload.event.body?.toString() ?? "";
  const bucket = `${LftS3Buckets.debugs}${Utils.getEnv() === "dev" ? "dev" : ""}`;
  const uid = UidFactory.generateUid(12);
  await payload.di.s3.putObject({
    bucket: bucket,
    key: "adattrs/" + uid,
    body: body,
  });
  return ResponseUtils.json(200, payload.event, { data: "ok" });
};

function filterStorageForWatch(storage: IStorage): IStorage {
  const currentProgramId = storage.currentProgramId;

  const filteredPrograms = currentProgramId ? storage.programs.filter((p) => p.id === currentProgramId) : [];
  const currentProgram = filteredPrograms[0];
  const programVersionKey = currentProgram?.clonedAt != null ? String(currentProgram.clonedAt) : undefined;

  let filteredVersions = storage._versions;
  if (filteredVersions) {
    const programsVersions = filteredVersions.programs as
      | { items?: Record<string, unknown>; deleted?: Record<string, unknown> }
      | undefined;
    filteredVersions = {
      ...filteredVersions,
      history: { items: {} },
      stats: {
        weight: {},
        length: {},
        percentage: {},
      },
      programs: programsVersions
        ? {
            ...programsVersions,
            items:
              programVersionKey && programsVersions.items
                ? { [programVersionKey]: programsVersions.items[programVersionKey] }
                : {},
          }
        : { items: {} },
    };
  }

  return {
    ...storage,
    programs: filteredPrograms,
    history: [],
    stats: { weight: {}, length: {}, percentage: {} },
    _versions: filteredVersions,
  };
}

const postSync2Endpoint = Endpoint.build("/api/sync2", {
  tempuserid: "string?",
});
const postSync2Handler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postSync2Endpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const setCookie: string | undefined = undefined;
  const rawBodyJson = getBodyJson(event);

  // Support both compressed (with data field) and uncompressed payloads
  let bodyJson: Record<string, unknown>;
  if (rawBodyJson.data && typeof rawBodyJson.data === "string") {
    const bodyJsonStr = await NodeEncoder.decode(rawBodyJson.data);
    bodyJson = JSON.parse(bodyJsonStr);
  } else {
    bodyJson = rawBodyJson;
  }
  const deviceId = bodyJson.deviceId as string | undefined;
  const timestamp: number = (bodyJson.timestamp as number) || Date.now();
  const storageUpdate = bodyJson.storageUpdate as IStorageUpdate2;
  const historylimit = bodyJson.historylimit as number | undefined;
  const isWatch = bodyJson.isWatch as boolean | undefined;
  const userId = await getCurrentUserId(event, di);
  let keyResult: { key: string; isClaimed: boolean } | undefined;
  if (params.tempuserid) {
    keyResult = await new FreeUserDao(di).getKey(params.tempuserid);
  }
  const key = keyResult ? (keyResult.isClaimed ? keyResult.key : "unclaimed") : undefined;
  const response = (status: number, r: IPostSyncResponse): APIGatewayProxyResult =>
    ResponseUtils.json(status, event, r, setCookie ? { "set-cookie": setCookie } : undefined);
  const eventDao = new EventDao(di);
  const storageDao = new StorageDao(di);
  if (userId != null) {
    const userDao = new UserDao(di);
    const limitedUser = await userDao.getLimitedById(userId);
    if (limitedUser != null) {
      di.log.log(`Server oid: ${limitedUser.storage.originalId}, update oid: ${storageUpdate.originalId}`);
      if (storageUpdate.originalId != null && limitedUser.storage.originalId === storageUpdate.originalId) {
        di.log.log("Fetch: Safe update");
        di.log.log(JSON.stringify(storageUpdate, null, 2));
        const result = await userDao.applySafeSync2(limitedUser, storageUpdate, deviceId);
        if (result.success) {
          di.log.log("New original id", result.data.originalId);
          const [storageId] = await Promise.all([
            storageDao.store(limitedUser.id, result.data.newStorage, storageUpdate?.storage),
            userDao.maybeSaveProgramRevision(limitedUser.id, storageUpdate),
          ]);
          if (storageId) {
            await eventDao.post({
              type: "safesnapshot",
              userId: limitedUser.id,
              timestamp,
              commithash: process.env.COMMIT_HASH || "",
              storage_id: storageId,
              update: EventDao.prepareStorageUpdateForEvent(storageUpdate),
              isMobile: Mobile.isMobile(
                payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || ""
              ),
            });
          }
          return response(200, {
            type: "clean",
            new_original_id: result.data.originalId,
            email: limitedUser.email,
            user_id: limitedUser.id,
            key,
          });
        } else {
          return response(400, { type: "error", error: result.error, key });
        }
      } else {
        di.log.log("Fetch: Merging update");
        di.log.log(JSON.stringify(storageUpdate, null, 2));
        storageUpdate.originalId = Date.now();
        const result = await userDao.applySafeSync2(limitedUser, storageUpdate, deviceId);
        if (result.success) {
          di.log.log("New original id", result.data.originalId);
          const fullUser = (await userDao.getById(userId))!;
          const storage = fullUser.storage;
          if (storage.tempUserId !== userId) {
            storage.tempUserId = userId;
            if (storage._versions) {
              storage._versions.tempUserId = Date.now();
            }
          }
          const [storageId] = await Promise.all([
            storageDao.store(limitedUser.id, storage, storageUpdate?.storage),
            userDao.maybeSaveProgramRevision(limitedUser.id, storageUpdate),
          ]);
          if (key) {
            storage.subscription.key = key;
          }
          if (storageId) {
            await eventDao.post({
              type: "mergesnapshot",
              userId: limitedUser.id,
              timestamp,
              storage_id: storageId,
              commithash: process.env.COMMIT_HASH || "",
              isMobile: Mobile.isMobile(
                payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || ""
              ),
              update: EventDao.prepareStorageUpdateForEvent(storageUpdate),
            });
          }
          if (historylimit != null) {
            storage.history = storage.history.slice(0, historylimit);
          }
          // Filter storage for watch to reduce payload size
          // See: rfcs/watch-storage-performance.md
          const responseStorage = isWatch ? filterStorageForWatch(storage) : storage;
          return response(200, {
            type: "dirty",
            storage: responseStorage,
            email: limitedUser.email,
            user_id: limitedUser.id,
            key,
          });
        } else {
          di.log.log("Error", result.error);
          return response(400, { type: "error", error: result.error, key });
        }
      }
    }
  }
  return ResponseUtils.json(401, event, { type: "error", error: "not_authorized", key });
};

const postSyncEndpoint = Endpoint.build("/api/sync", { tempuserid: "string?", adminkey: "string?", userid: "string?" });
const postSyncHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postSyncEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  let userId: string | undefined = undefined;
  let setCookie: string | undefined = undefined;
  const bodyJson = getBodyJson(event);
  const timestamp = bodyJson.timestamp || Date.now();
  const storageUpdate = bodyJson.storageUpdate as IStorageUpdate;
  const historylimit = bodyJson.historylimit as number | undefined;
  if (params.adminkey != null && params.userid != null && params.adminkey === (await di.secrets.getApiKey())) {
    userId = params.userid;
    const cookieSecret = await di.secrets.getCookieSecret();
    const session = JWT.sign({ userId: userId }, cookieSecret);
    setCookie = Cookie.serialize("session", session, {
      httpOnly: true,
      domain: ".liftosaur.com",
      path: "/",
      expires: new Date(new Date().getFullYear() + 10, 0, 1),
    });
  } else {
    userId = await getCurrentUserId(event, di);
  }
  let keyResult: { key: string; isClaimed: boolean } | undefined;
  if (params.tempuserid) {
    keyResult = await new FreeUserDao(di).getKey(params.tempuserid);
  }
  const key = keyResult ? (keyResult.isClaimed ? keyResult.key : "unclaimed") : undefined;
  const response = (status: number, r: IPostSyncResponse): APIGatewayProxyResult =>
    ResponseUtils.json(status, event, r, setCookie ? { "set-cookie": setCookie } : undefined);
  const eventDao = new EventDao(di);
  const storageDao = new StorageDao(di);
  if (userId != null) {
    const userDao = new UserDao(di);
    const limitedUser = await userDao.getLimitedById(userId);
    if (limitedUser != null) {
      di.log.log(`Server oid: ${limitedUser.storage.originalId}, update oid: ${storageUpdate.originalId}`);
      storageUpdate.tempUserId = userId;
      if (storageUpdate.originalId != null && limitedUser.storage.originalId === storageUpdate.originalId) {
        di.log.log("Fetch: Safe update");
        di.log.log(storageUpdate);
        const result = await userDao.applySafeSync(limitedUser, storageUpdate);
        if (result.success) {
          di.log.log("New original id", result.data);
          const [storageId] = await Promise.all([
            storageDao.store(limitedUser.id, result.data.newStorage, undefined),
            userDao.maybeSaveProgramRevision(limitedUser.id, storageUpdate),
          ]);
          if (storageId) {
            await eventDao.post({
              type: "safesnapshot",
              userId: limitedUser.id,
              timestamp,
              commithash: process.env.COMMIT_HASH || "",
              storage_id: storageId,
              update: EventDao.prepareStorageUpdateForEvent(storageUpdate),
              isMobile: Mobile.isMobile(
                payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || ""
              ),
            });
          }
          return response(200, {
            type: "clean",
            new_original_id: result.data.originalId,
            email: limitedUser.email,
            user_id: limitedUser.id,
            key,
          });
        } else {
          return response(400, { type: "error", error: result.error, key });
        }
      } else {
        di.log.log("Fetch: Merging update");
        di.log.log(storageUpdate);
        storageUpdate.originalId = Date.now();
        const result = await userDao.applySafeSync(limitedUser, storageUpdate);
        if (result.success) {
          di.log.log("New original id", result.data);
          const fullUser = (await userDao.getById(userId, { historyLimit: historylimit }))!;
          const storage = fullUser.storage;
          const [storageId] = await Promise.all([
            storageDao.store(limitedUser.id, storage, undefined),
            userDao.maybeSaveProgramRevision(limitedUser.id, storageUpdate),
          ]);
          if (key) {
            storage.subscription.key = key;
          }
          if (storageId) {
            await eventDao.post({
              type: "mergesnapshot",
              userId: limitedUser.id,
              commithash: process.env.COMMIT_HASH || "",
              timestamp,
              storage_id: storageId,
              isMobile: Mobile.isMobile(
                payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || ""
              ),
              update: EventDao.prepareStorageUpdateForEvent(storageUpdate),
            });
          }
          return response(200, { type: "dirty", storage, email: limitedUser.email, user_id: limitedUser.id, key });
        } else {
          di.log.log("Error", result.error);
          return response(400, { type: "error", error: result.error, key });
        }
      }
    }
  }
  return ResponseUtils.json(401, event, { type: "error", error: "not_authorized", key });
};

const getStorageEndpoint = Endpoint.build("/api/storage", {
  tempuserid: "string?",
  key: "string?",
  userid: "string?",
  storageid: "string?",
  historylimit: "number?",
});
const getStorageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getStorageEndpoint> = async ({
  payload,
  match,
}) => {
  const { event, di } = payload;
  const querystringParams = event.queryStringParameters || {};
  let userId;
  let setCookie: string | undefined = undefined;
  const passAdminKey = match.params.key != null && match.params.key === (await di.secrets.getApiKey());
  if (passAdminKey && match.params.userid != null) {
    userId = querystringParams.userid;
    const cookieSecret = await di.secrets.getCookieSecret();
    const session = JWT.sign({ userId: userId }, cookieSecret);
    setCookie = Cookie.serialize("session", session, {
      httpOnly: true,
      domain: ".liftosaur.com",
      path: "/",
      expires: new Date(new Date().getFullYear() + 10, 0, 1),
    });
  } else {
    userId = await getCurrentUserId(event, di);
  }
  let keyResult: { key: string; isClaimed: boolean } | undefined;
  if (match.params.tempuserid) {
    keyResult = await new FreeUserDao(di).getKey(match.params.tempuserid);
  }
  const key = keyResult ? (keyResult.isClaimed ? keyResult.key : "unclaimed") : undefined;
  if (userId != null) {
    const userDao = new UserDao(di);
    const user = await userDao.getById(userId, { historyLimit: match.params.historylimit });
    if (user != null) {
      if (passAdminKey && match.params.storageid) {
        const storageDao = new StorageDao(di);
        const loadedStorage = await storageDao.get(user.id, match.params.storageid);
        if (loadedStorage) {
          user.storage = loadedStorage.data as IStorage;
        }
      }
      di.log.log(`Responding user data, id: ${user.storage.id}, original id: ${user.storage.originalId}`);
      user.storage.originalId = user.storage.originalId || Date.now();
      return ResponseUtils.json(
        200,
        event,
        {
          storage: user.storage,
          email: user.email,
          user_id: user.id,
          is_new_user: false,
          key,
        },
        setCookie ? { "set-cookie": setCookie } : undefined
      );
    }
  }
  return ResponseUtils.json(200, event, { key });
};

const saveDebugEndpoint = Endpoint.build("/api/debug");
const saveDebugHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof saveDebugEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const { id, data } = getBodyJson(event);
  const debugDao = new DebugDao(di);
  let debugData: string;
  if (typeof data === "string") {
    debugData = await NodeEncoder.decode(data);
  } else {
    debugData = JSON.stringify(data);
  }
  await debugDao.store(id, debugData);
  return ResponseUtils.json(200, event, { data: "ok" });
};

const debugLogsEndpoint = Endpoint.build("/api/debuglogs");
const debugLogsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof debugLogsEndpoint> = async ({
  payload,
}) => {
  if (Utils.getEnv() !== "dev") {
    return ResponseUtils.json(403, payload.event, { error: "forbidden" });
  }
  const { event } = payload;
  const { log, device, timestamp } = getBodyJson(event);
  if (!log) {
    return ResponseUtils.json(400, event, { error: "log is required" });
  }
  const logFile = "/tmp/watchlogs.txt";
  const date = new Date(timestamp || Date.now()).toISOString();
  const logLine = `[${date}] [${device || "UNKNOWN"}] ${log}\n`;
  fs.appendFileSync(logFile, logLine);
  return ResponseUtils.json(200, event, { data: "ok" });
};

interface IAppleKeysResponse {
  keys: Array<{
    kty: string;
    kid: string;
    use: string;
    alg: string;
    n: string;
    e: string;
  }>;
}

const appleLoginEndpoint = Endpoint.build("/api/signin/apple");
const appleLoginHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof appleLoginEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const env = Utils.getEnv();
  const bodyJson = getBodyJson(event);
  const { idToken, id, historylimit } = bodyJson;
  const keysResponse = await di.fetch("https://appleid.apple.com/auth/keys");
  const keysJson = (await keysResponse.json()) as IAppleKeysResponse;
  const decodedToken = JWT.decode(idToken!, { complete: true });
  if (decodedToken) {
    const header = (decodedToken as Record<string, Record<string, string>>).header;
    const content = (decodedToken as Record<string, Record<string, string>>).payload;
    const kid = header.kid;
    const key = keysJson.keys.find((k) => k.kid === kid);
    if (key != null) {
      const pem = rsaPemFromModExp(key.n, key.e);
      const result = JWT.verify(idToken, pem, {
        issuer: "https://appleid.apple.com",
        audience: content.aud,
      }) as { sub?: string; email?: string } | undefined;
      if (result?.sub) {
        const email = result.email || "noemail@example.com";
        const cookieSecret = await di.secrets.getCookieSecret();

        await new AppleAuthTokenDao(di).store(env, idToken, result.sub);
        const userDao = new UserDao(di);
        let user = await userDao.getByAppleId(result.sub, { historyLimit: historylimit });
        let userId = user?.id;
        let isNewUser = false;

        if (userId == null) {
          userId = (id as string) || UidFactory.generateUid(12);
          user = UserDao.build(userId, email, { appleId: result.sub });
          isNewUser = true;
          await userDao.store(user);
        }

        const session = JWT.sign({ userId: userId }, cookieSecret);
        const resp = {
          email: email,
          user_id: userId,
          storage: user!.storage,
          is_new_user: isNewUser,
        };

        return {
          statusCode: 200,
          body: JSON.stringify(resp),
          headers: {
            ...ResponseUtils.getHeaders(event),
            "set-cookie": Cookie.serialize("session", session, {
              httpOnly: true,
              domain: ".liftosaur.com",
              path: "/",
              expires: new Date(new Date().getFullYear() + 10, 0, 1),
            }),
          },
        };
      }
    }
  }

  return ResponseUtils.json(403, event, { error: "invalid_token" });
};

const googleLoginEndpoint = Endpoint.build("/api/signin/google");
const googleLoginHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof googleLoginEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const env = Utils.getEnv();
  const bodyJson = getBodyJson(event);
  const { token, id, forceuseremail, historylimit } = bodyJson;
  let openIdJson: IOpenIdResponseSuccess | IOpenIdResponseError;
  if (env === "dev" && forceuseremail != null) {
    openIdJson = {
      email: forceuseremail,
      sub: `${forceuseremail}googleId`,
    };
  } else {
    const url = `https://openidconnect.googleapis.com/v1/userinfo?access_token=${token}`;
    const googleApiResponse = await di.fetch(url);
    openIdJson = await googleApiResponse.json();
  }
  const cookieSecret = await di.secrets.getCookieSecret();

  if ("error" in openIdJson) {
    const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?id_token=${token}`;
    const googleApiResponse = await di.fetch(url);
    const response = await googleApiResponse.json();
    if ("error" in response) {
      return ResponseUtils.json(403, event, openIdJson);
    } else {
      openIdJson = {
        sub: response.user_id,
        email: response.email,
      };
    }
  }

  await new GoogleAuthTokenDao(di).store(env, token, openIdJson.sub);
  const userDao = new UserDao(di);
  let user = await userDao.getByGoogleId(openIdJson.sub, { historyLimit: historylimit });
  let userId = user?.id;
  let isNewUser = false;

  if (userId == null) {
    userId = (id as string) || UidFactory.generateUid(12);
    user = UserDao.build(userId, openIdJson.email, { googleId: openIdJson.sub });
    isNewUser = true;
    await userDao.store(user);
  }

  const session = JWT.sign({ userId: userId }, cookieSecret);
  const resp = {
    email: openIdJson.email,
    user_id: userId,
    storage: user!.storage,
    is_new_user: isNewUser,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(resp),
    headers: {
      ...ResponseUtils.getHeaders(event),
      "set-cookie": Cookie.serialize("session", session, {
        httpOnly: true,
        domain: ".liftosaur.com",
        path: "/",
        expires: new Date(new Date().getFullYear() + 10, 0, 1),
      }),
    },
  };
};

const getHistoryEndpoint = Endpoint.build("/api/history", { after: "number?", limit: "number?" });
const getHistoryHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getHistoryEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const user = await getCurrentLimitedUser(event, di);
  if (user != null) {
    const userDao = new UserDao(di);
    const history = await userDao.getHistoryByUserId(user.id, { after: params.after, limit: params.limit });
    return ResponseUtils.json(200, event, { history });
  }
  return ResponseUtils.json(400, event, { error: "Not Authorized" });
};

const signoutEndpoint = Endpoint.build("/api/signout");
const signoutHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof signoutEndpoint> = async ({ payload }) => {
  const { event } = payload;
  return {
    statusCode: 200,
    headers: {
      ...ResponseUtils.getHeaders(event),
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

const postSaveProgramEndpoint = Endpoint.build("/api/program");
const postSaveProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postSaveProgramEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const user = await getCurrentLimitedUser(event, di);
  if (user != null) {
    const bodyJson = getBodyJson(event);
    const deviceId = bodyJson.deviceId as string | undefined;
    const exportedProgram: IExportedProgram = bodyJson.program;
    const userDao = new UserDao(di);
    const eventDao = new EventDao(di);
    const programs = await userDao.getProgramsByUserId(user.id);
    const oldStorageResult = Storage.get({ ...user.storage, programs });
    if (!oldStorageResult.success) {
      di.log.log("Program Save: Error loading old storage", oldStorageResult.error);
      return ResponseUtils.json(500, event, { error: "Corrupted storage!" });
    }
    const oldStorage = oldStorageResult.data;
    if (oldStorage.version !== exportedProgram.version) {
      di.log.log(`Program Save: Version mismatch! Old: ${oldStorage.version}, New: ${exportedProgram.version}.`);
      return ResponseUtils.json(400, event, { error: "Version mismatch! Please refresh the page." });
    }
    const newStorage: IPartialStorage = {
      ...oldStorage,
      programs: CollectionUtils.setBy(oldStorage.programs, "id", exportedProgram.program.id, exportedProgram.program),
      settings: Settings.applyExportedProgram(oldStorage.settings, exportedProgram),
      originalId: Date.now(),
    };
    di.log.log("Device id", deviceId);
    const newVersions = Storage.updateVersions(oldStorage, newStorage, deviceId);
    const saveVersions = eventDao.post({
      type: "event",
      name: "save-program-www-versions",
      userId: user.id,
      commithash: process.env.COMMIT_HASH ?? "",
      timestamp: Date.now(),
      isMobile: false,
      extra: {
        versions: JSON.stringify(newVersions.programs),
        name: exportedProgram.program.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        suspciousDeletion: JSON.stringify((global as any).suspiciousDeletion),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((global as any).suspiciousDeletion) {
      await eventDao.post({
        type: "event",
        name: "ls-suspicious-deletion-www",
        userId: user.id,
        commithash: process.env.COMMIT_HASH ?? "",
        timestamp: Date.now(),
        isMobile: false,
        extra: {
          programId: exportedProgram.program.id,
          name: exportedProgram.program.name,
          clonedAt: exportedProgram.program.clonedAt || "none",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          suspciousDeletion: JSON.stringify((global as any).suspiciousDeletion),
          programs: JSON.stringify(
            newStorage.programs?.map((p) => {
              const { planner, ...cleanedProgram } = p;
              return cleanedProgram;
            })
          ),
        },
      });
    }
    newStorage._versions = newVersions;
    delete newStorage.programs;
    user.storage = newStorage;
    const eventPost = eventDao.post({
      type: "event",
      name: "save-program-www",
      userId: user.id,
      commithash: process.env.COMMIT_HASH ?? "",
      timestamp: Date.now(),
      isMobile: false,
      extra: { programId: exportedProgram.program.id, clonedAt: exportedProgram.program.clonedAt || "none" },
    });
    await Promise.all([
      userDao.saveProgram(user.id, exportedProgram.program),
      userDao.store(user),
      userDao.saveProgramRevision(user.id, exportedProgram.program),
      eventPost,
      saveVersions,
    ]);
    return ResponseUtils.json(200, event, { data: { id: exportedProgram.program.id } });
  }
  return ResponseUtils.json(400, event, { error: "Not Authorized" });
};

const deleteProgramEndpoint = Endpoint.build("/api/program/:id");
const deleteProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof deleteProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const user = await getCurrentLimitedUser(event, di);
  if (user != null) {
    const userDao = new UserDao(di);
    const eventDao = new EventDao(di);
    const program = await userDao.getProgram(user.id, params.id);
    if (program == null) {
      return ResponseUtils.json(404, event, { error: "Not Found" });
    }
    const eventPost = eventDao.post({
      type: "event",
      name: "delete-program-www",
      commithash: process.env.COMMIT_HASH ?? "",
      userId: user.id,
      timestamp: Date.now(),
      isMobile: false,
      extra: { programId: program.id, clonedAt: program.clonedAt || "none" },
    });
    const newStorage = {
      ...user.storage,
      _versions: program.clonedAt
        ? {
            ...user.storage._versions,
            programs: {
              ...c<ICollectionVersions>(user.storage._versions?.programs || {}),
              deleted: {
                ...c<ICollectionVersions>(user.storage._versions?.programs || {}).deleted,
                [program.clonedAt]: Date.now(),
              },
            },
          }
        : user.storage._versions,
      originalId: Date.now(),
    };
    user.storage = newStorage;
    await Promise.all([userDao.deleteProgram(user.id, program.id), userDao.store(user), eventPost]);
    return ResponseUtils.json(200, event, { data: { id: program.id } });
  }
  return ResponseUtils.json(400, event, { error: "Not Authorized" });
};

const getProgramsEndpoint = Endpoint.build("/api/programs");
const getProgramsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProgramsEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const programs = await new ProgramDao(di).getAll();
  return ResponseUtils.json(200, event, { programs });
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
            di.fetch,
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
  return ResponseUtils.json(400, event, { error });
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
  return ImageCacher.cache(di, event, `historyrecordimage${event.path}-${params.user}-${params.id}.png`, async () => {
    const result = await new UserDao(di).getById(params.user);
    if (result != null) {
      const imageResult = await recordImage(result.storage, params.id);
      if (imageResult.success) {
        return { success: true, data: imageResult.data };
      } else {
        return { success: false, error: imageResult.error };
      }
    } else {
      return { success: false, error: "Can't find user" };
    }
  });
};

const getProgramImageEndpoint = Endpoint.build("/api/programimage/:id");
const getProgramImageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProgramImageEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return ImageCacher.cache(di, event, `programimage${event.path}-${params.id}.png`, async () => {
    const result = await new ProgramDao(di).getById(params.id);
    if (result != null) {
      const imageResult = await new ProgramImageGenerator().generate({
        indexEntry: result.indexEntry,
        fetch: di.fetch,
      });
      if (imageResult.success) {
        return { success: true, data: imageResult.data };
      } else {
        return { success: false, error: imageResult.error };
      }
    } else {
      return { success: false, error: "Can't find program" };
    }
  });
};

const postAddFreeUserEndpoint = Endpoint.build("/api/addfreeuser/:id", { key: "string" });
const postAddFreeUserHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postAddFreeUserEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  if (params.key === (await di.secrets.getApiKey())) {
    await new FreeUserDao(di).create(params.id, Date.now() + 1000 * 60 * 60 * 24 * 365, false);
    return ResponseUtils.json(200, event, { data: "ok" });
  } else {
    return ResponseUtils.json(401, event, {});
  }
};

const postCreateCouponEndpoint = Endpoint.build("/api/coupon/:ttl", { key: "string", info: "string?" });
const postCreateCouponHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postCreateCouponEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const ttlMs = parseInt(params.ttl, 10);
  if (!isNaN(ttlMs) && params.key === (await di.secrets.getApiKey())) {
    const coupon = await new CouponDao(di).create({ ttlMs, info: params.info });
    return ResponseUtils.json(200, event, { data: coupon });
  } else {
    return ResponseUtils.json(401, event, {});
  }
};

const postClaimCouponEndpoint = Endpoint.build("/api/coupon/claim/:code");
const postClaimCouponHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postClaimCouponEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const couponDao = new CouponDao(di);
  const bodyJson = getBodyJson(event);
  const { platform } = bodyJson;
  const currentUserId = await getCurrentUserId(payload.event, payload.di);

  const coupon = await couponDao.get(params.code);
  if (!coupon) {
    return ResponseUtils.json(404, event, { error: "coupon_not_found" });
  }

  if (coupon.isDisabled) {
    return ResponseUtils.json(404, event, { error: "coupon_disabled" });
  }

  if (coupon.isClaimed) {
    return ResponseUtils.json(400, event, { error: "coupon_already_claimed" });
  }

  const data = couponDao.getData(coupon);
  if (platform === "ios" && data) {
    const applePromoSigner = new ApplePromotionalOfferSigner(di);
    const monthlyOffer = await applePromoSigner.generateSignature(
      data.apple.monthly.offerId,
      "liftosaur",
      data.apple.monthly.productId
    );
    const yearlyOffer = await applePromoSigner.generateSignature(
      data.apple.yearly.offerId,
      "liftosaur",
      data.apple.yearly.productId
    );
    return ResponseUtils.json(200, event, {
      data: { affiliate: coupon.affiliate, appleOffer: { monthly: monthlyOffer, yearly: yearlyOffer } },
    });
  }

  if (platform === "android" && data) {
    const googleOffer = {
      monthly: {
        offerId: data.google.monthly.offerId,
        productId: data.google.monthly.productId,
      },
      yearly: {
        offerId: data.google.yearly.offerId,
        productId: data.google.yearly.productId,
      },
    };
    return ResponseUtils.json(200, event, { affiliate: coupon.affiliate, data: { googleOffer } });
  }
  if (data) {
    return ResponseUtils.json(400, event, { error: "wrong_platform" });
  }

  if (currentUserId == null) {
    return ResponseUtils.json(401, event, { error: "not_authorized" });
  }

  await couponDao.claim(coupon);
  const freeuser = await new FreeUserDao(di).create(currentUserId, Date.now() + coupon.ttlMs, true, coupon.code);
  return ResponseUtils.json(200, event, {
    data: { key: freeuser.key, expires: freeuser.expires },
  });
};

const logEndpoint = Endpoint.build("/api/log");
const logHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof logEndpoint> = async ({ payload }) => {
  const { event, di } = payload;
  const env = Utils.getEnv();
  const { user, action, affiliates, platform, subscriptions, key, enforce, referrer } = getBodyJson(event);
  let data: { result: "ok" | "error"; clear?: boolean };
  if (user && action) {
    let clear: boolean | undefined;
    if (key != null && (env === "prod" || enforce)) {
      const fetchedKey = await new FreeUserDao(di).verifyKey(user);
      if (fetchedKey !== key) {
        clear = true;
      }
    }
    await new LogDao(di).increment(user, action, platform, subscriptions, affiliates, referrer);
    data = { result: "ok", clear };
  } else {
    data = { result: "error" };
  }
  return ResponseUtils.json(200, event, { data });
};

const postBatchEventsEndpoint = Endpoint.build("/api/batchevents");
const postBatchEventsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postBatchEventsEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const eventDao = new EventDao(di);
  const { events: eventsRaw } = getBodyJson(event) as { events: { id: string; data: string }[] };
  const events = eventsRaw.reduce<Record<string, IEventPayload>>((memo, e) => {
    memo[e.id] = JSON.parse(e.data) as IEventPayload;
    return memo;
  }, {});
  let successfulIds: string[] = [];
  di.log.log(
    "Storing events: ",
    ObjectUtils.values(events)
      .map((e) => (e.type === "event" ? e.name : e.type))
      .join(", ")
  );
  const idGroups = CollectionUtils.inGroupsOf(25, ObjectUtils.keys(events));
  for (const group of idGroups) {
    const eventsToPost: IEventPayload[] = [];
    for (const id of group) {
      const event2 = events[id];
      let attempts = 0;
      while (attempts < 5 && eventsToPost.some((e) => e.timestamp === event2.timestamp)) {
        event2.timestamp += 1;
        attempts += 1;
      }
      eventsToPost.push(event2);
    }
    try {
      await eventDao.batchPost(CollectionUtils.uniqBy(eventsToPost, "timestamp"));
      successfulIds = successfulIds.concat(group);
    } catch (error) {
      di.log.log("Error posting batch events", error);
    }
  }
  return ResponseUtils.json(200, event, { acknowledged: successfulIds });
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
        body: renderUserHtml(di.fetch, storage, params.user),
        headers: { "content-type": "text/html" },
      };
    } else {
      error.message = "The user's profile is not public";
    }
  } else {
    error.message = "Can't find user";
  }
  return ResponseUtils.json(400, event, { error });
};

const getDashboardsUserEndpoint = Endpoint.build("/dashboards/user/:userid", { key: "string" });
const getDashboardsUserHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getDashboardsUserEndpoint
> = async ({ payload, match }) => {
  const { event, di } = payload;
  const apiKey = await di.secrets.getApiKey();
  if (match.params.key === apiKey) {
    const userDao = new UserDao(di);
    const eventDao = new EventDao(di);
    const user = await userDao.getById(match.params.userid);
    const events = await eventDao.getByUserId(match.params.userid);
    if (user != null || events.length > 0) {
      const firstWorkoutDate =
        user && user.storage.history.length > 0
          ? DateUtils.formatYYYYMMDD(user.storage.history[user.storage.history.length - 1].startTime)
          : undefined;

      return {
        statusCode: 200,
        body: renderUserDashboardHtml(
          di.fetch,
          apiKey,
          user
            ? {
                email: user.email,
                id: user.id,
                workoutsCount: user.storage.history.length,
                firstWorkoutDate,
                programNames: user.storage.programs.map((p) => p.name),
              }
            : undefined,
          events
        ),
        headers: { "content-type": "text/html" },
      };
    } else {
      return ResponseUtils.json(404, event, { error: "User not found" });
    }
  } else {
    return ResponseUtils.json(401, event, { data: "Unauthorized" });
  }
};

const getDashboardsPaymentsEndpoint = Endpoint.build("/dashboards/payments", { key: "string" });
const getDashboardsPaymentsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getDashboardsPaymentsEndpoint
> = async ({ payload, match }) => {
  const { event, di } = payload;
  const apiKey = await di.secrets.getApiKey();
  if (match.params.key === apiKey) {
    const paymentDao = new PaymentDao(di);
    const allPayments = await paymentDao.getAllPayments();
    const paymentsByDate: Record<string, typeof allPayments> = {};

    for (const payment of allPayments) {
      const date = DateUtils.formatUTCYYYYMMDD(payment.timestamp);
      if (!paymentsByDate[date]) {
        paymentsByDate[date] = [];
      }
      paymentsByDate[date].push(payment);
    }

    const paymentsData: IPaymentsDashboardData[] = Object.entries(paymentsByDate)
      .map(([date, payments]) => ({
        date,
        payments: payments.sort((a, b) => b.timestamp - a.timestamp),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      statusCode: 200,
      body: renderPaymentsDashboardHtml(di.fetch, apiKey, paymentsData),
      headers: { "content-type": "text/html" },
    };
  } else {
    return ResponseUtils.json(401, event, { data: "Unauthorized" });
  }
};

const getProfileImageEndpoint = Endpoint.build("/profileimage", { user: "string" });
const getProfileImageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProfileImageEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return ImageCacher.cache(di, event, `profileimage${event.path}-${params.user}.png`, async () => {
    const result = await new UserDao(di).getById(params.user);
    if (result != null) {
      if (result?.storage?.settings?.isPublicProfile) {
        const imageResult = await userImage(result.storage);
        return { success: true, data: imageResult };
      } else {
        return { success: false, error: "The user's profile is not public" };
      }
    } else {
      return { success: false, error: "Can't find user" };
    }
  });
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
      users.map((u) => {
        const storage = runMigrations(u.storage);

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
    return ResponseUtils.json(401, event, { data: "Unauthorized" });
  }
};

const getDashboardsUsersEndpoint = Endpoint.build("/dashboards/users", { key: "string" });
const getDashboardsUsersHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getDashboardsUsersEndpoint
> = async ({ payload, match }) => {
  const { event, di } = payload;
  const apiKey = await di.secrets.getApiKey();
  if (match.params.key === apiKey) {
    const lastThreeMonths = [
      DateUtils.yearAndMonth(Date.now()),
      DateUtils.yearAndMonth(Date.now() - 1000 * 60 * 60 * 24 * 30),
      DateUtils.yearAndMonth(Date.now() - 1000 * 60 * 60 * 24 * 60),
    ];
    const last3MonthslogRecords = (
      await Promise.all([
        await new LogDao(di).getAllForYearAndMonth(lastThreeMonths[0][0], lastThreeMonths[0][1]),
        // await new LogDao(di).getAllForYearAndMonth(lastThreeMonths[1][0], lastThreeMonths[1][1]),
        // await new LogDao(di).getAllForYearAndMonth(lastThreeMonths[2][0], lastThreeMonths[2][1]),
      ])
    ).flat();
    const userIds = Array.from(
      new Set(last3MonthslogRecords.filter((r) => r.action === "ls-finish-workout").map((r) => r.userId))
    );
    const [users, userPrograms, unsortedLogRecords, freeUsers, subscriptionDetailsDaos] = await Promise.all([
      new UserDao(di).getLimitedByIds(userIds),
      new UserDao(di).getProgramsByUserIds(userIds),
      new LogDao(di).getForUsers(userIds),
      new FreeUserDao(di).getAll(userIds),
      new SubscriptionDetailsDao(di).getAll(userIds),
    ]);
    const usersById = CollectionUtils.groupByKeyUniq(users, "id");
    const userIdToProgramNames = userPrograms.reduce<Record<string, { id: string; name: string }[]>>((memo, p) => {
      memo[p.userId] = memo[p.userId] || [];
      memo[p.userId].push({ id: p.id, name: `${p.name} ${p.planner ? "🎯" : "👴"}` });
      return memo;
    }, {});
    const subscriptionDetailsById = CollectionUtils.groupByKeyUniq(subscriptionDetailsDaos, "userId");
    const logRecords = CollectionUtils.sortBy(unsortedLogRecords, "ts", true);
    const freeUsersById = CollectionUtils.groupByKeyUniq(freeUsers, "id");

    const logRecordsByUserId = CollectionUtils.groupByKey(logRecords, "userId");
    const data: IUsersDashboardData[] = Object.keys(logRecordsByUserId).map((userId) => {
      const userLogRecords = CollectionUtils.sortBy(logRecordsByUserId[userId] || [], "ts", true);
      const programNames = CollectionUtils.sort(userIdToProgramNames[userId] || [], (a, b) => {
        const user = usersById[userId];
        return user != null ? (a.id === user.storage.currentProgramId ? -1 : 1) : -1;
      }).map((p) => p.name);
      const lastAction = userLogRecords[0];
      const firstAction = userLogRecords[userLogRecords.length - 1];
      const workoutsCount = userLogRecords.filter((r) => r.action === "ls-finish-workout")[0]?.cnt || 0;
      const referrer = usersById[userId]?.storage.referrer || userLogRecords.filter((r) => !!r.referrer)[0]?.referrer;
      const platforms = Array.from(
        userLogRecords.reduce<Set<string>>((memo, record) => {
          for (const val of record.platforms || []) {
            memo.add(`${val.name}${val.version ? ` - ${val.version}` : ""}`);
          }
          return memo;
        }, new Set())
      );
      const affiliates = Array.from(
        userLogRecords.reduce<Set<string>>((memo, record) => {
          for (const val of Object.keys(record.affiliates || {})) {
            memo.add(val);
          }
          return memo;
        }, new Set())
      );
      const subscriptions = userLogRecords.reduce<Set<"apple" | "google" | "unclaimedkey" | "key">>((memo, record) => {
        for (const val of record.subscriptions || []) {
          memo.add(val);
        }
        return memo;
      }, new Set());
      if (Object.keys(usersById[userId]?.storage.subscription.apple || {}).length > 0) {
        subscriptions.add("apple");
      }
      if (Object.keys(usersById[userId]?.storage.subscription.google || {}).length > 0) {
        subscriptions.add("google");
      }
      if (usersById[userId]?.storage.subscription.key === "unclaimed") {
        subscriptions.add("unclaimedkey");
      } else if (usersById[userId]?.storage.subscription.key) {
        subscriptions.add("key");
      }
      const signupRequests = userLogRecords.reduce<[number, number, number]>(
        (memo, r) => {
          if (r.action === "ls-signup-request-signup") {
            memo[0] += r.cnt;
          } else if (r.action === "ls-signup-request-maybe-later") {
            memo[1] += r.cnt;
          } else if (r.action === "ls-signup-request-close") {
            memo[2] += r.cnt;
          }
          return memo;
        },
        [0, 0, 0]
      );

      const subscriptionDetailsDao = subscriptionDetailsById[userId];
      let subscriptionDetails = undefined;
      if (subscriptionDetailsDao) {
        let product: "yearly" | "montly" | "lifetime";
        if (subscriptionDetailsDao.product === "com.liftosaur.subscription.ios_montly") {
          product = "montly";
        } else if (subscriptionDetailsDao.product === "com.liftosaur.subscription.ios_yearly") {
          product = "yearly";
        } else if (subscriptionDetailsDao.product === "com.liftosaur.subscription.ios_lifetime") {
          product = "lifetime";
        } else {
          product = subscriptionDetailsDao.product as "montly" | "yearly" | "lifetime";
        }
        subscriptionDetails = {
          product,
          isTrial: subscriptionDetailsDao.isTrial,
          isPromo: subscriptionDetailsDao.isPromo,
          isActive: subscriptionDetailsDao.isActive,
          expires: subscriptionDetailsDao.expires,
          promoCode: subscriptionDetailsDao.promoCode,
        };
      }

      return {
        userId,
        email: usersById[userId]?.email,
        freeUserExpires: freeUsersById[userId]?.expires,
        userTs: usersById[userId]?.createdAt,
        reviewRequests: usersById[userId]?.storage?.reviewRequests || [],
        signupRequests: signupRequests,
        firstAction: { name: firstAction.action, ts: firstAction.ts },
        lastAction: { name: lastAction.action, ts: lastAction.ts },
        workoutsCount,
        platforms,
        programNames,
        affiliates,
        subscriptions: Array.from(subscriptions),
        subscriptionDetails,
        referrer,
      };
    });

    return {
      statusCode: 200,
      body: renderUsersDashboardHtml(di.fetch, apiKey, data),
      headers: { "content-type": "text/html" },
    };
  } else {
    return ResponseUtils.json(401, event, { data: "Unauthorized" });
  }
};

const getDashboardsAffiliatesEndpoint = Endpoint.build("/dashboards/affiliates/:id", { key: "string" });
const getDashboardsAffiliatesHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getDashboardsAffiliatesEndpoint
> = async ({ payload, match }) => {
  const { event, di } = payload;
  const apiKey = await di.secrets.getApiKey();
  if (match.params.key === apiKey) {
    const affiliateDao = new AffiliateDao(di);
    const { affiliateData, summary, monthlyPayments } = await affiliateDao.getDashboardData(match.params.id);

    return {
      statusCode: 200,
      body: renderAffiliateDashboardHtml(di.fetch, match.params.id, affiliateData, summary, monthlyPayments, apiKey),
      headers: { "content-type": "text/html" },
    };
  } else {
    return ResponseUtils.json(401, event, { data: "Unauthorized" });
  }
};

const getAdminLogsEndpoint = Endpoint.build("/admin/logs", { key: "string" });
const getAdminLogsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAdminLogsEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  if (params.key === (await di.secrets.getApiKey())) {
    const userLogs = await new LogDao(di).getAllSince(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const users = await new UserDao(di).getAllLimited();
    const usersByKey = CollectionUtils.groupByKey(users, "id");
    const logPayloads = userLogs.reduce<ILogPayloads>((memo, log) => {
      memo[log.userId] = memo[log.userId] || { logs: [], email: usersByKey[log.userId]?.[0].email };
      memo[log.userId]!.logs.push({
        action: log.action,
        count: log.cnt,
        timestamp: log.ts,
        affiliates: log.affiliates,
        platforms: log.platforms,
        subscriptions: log.subscriptions,
      });
      return memo;
    }, {});
    return {
      statusCode: 200,
      body: renderLogsHtml({ logs: logPayloads, apiKey: params.key }),
      headers: { "content-type": "text/html" },
    };
  } else {
    return ResponseUtils.json(401, event, { data: "Unauthorized" });
  }
};

const getUserAffiliatesEndpoint = Endpoint.build("/user/affiliates", { key: "string?", userid: "string?" });
const getUserAffiliatesHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getUserAffiliatesEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  let currentUserId = await getCurrentUserId(event, di);
  if (params.key && params.userid) {
    const apiKey = await di.secrets.getApiKey();
    if (params.key === apiKey) {
      currentUserId = params.userid;
    }
  }
  if (!currentUserId) {
    const baseHeaders = ResponseUtils.getHeaders(event);
    return {
      statusCode: 302,
      headers: {
        ...baseHeaders,
        "content-type": "text/html",
        Location: `/login?url=${encodeURIComponent("/user/affiliates")}`,
      },
      body: "",
    };
  }

  const affiliateDao = new AffiliateDao(di);
  const creatorStats = await affiliateDao.getCreatorStats(currentUserId);
  const userResult = await getUserAccount(payload, { withBodyweight: true });
  const account = userResult.success ? userResult.data.account : undefined;

  return {
    statusCode: 200,
    body: renderUserAffiliatesHtml(di.fetch, account, creatorStats),
    headers: { "content-type": "text/html" },
  };
};

export const deleteAccountEndpoint = Endpoint.build("/api/deleteaccount");
const deleteAccountHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof deleteAccountEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event } = payload;
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId != null) {
    const userDao = new UserDao(payload.di);
    await userDao.removeUser(currentUserId);
    return ResponseUtils.json(200, event, { data: "ok" });
  } else {
    return ResponseUtils.json(401, event, {});
  }
};

const getAllProgramsEndpoint = Endpoint.build("/programs");
const getAllProgramsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAllProgramsEndpoint> = async ({
  payload,
}) => {
  const { di } = payload;
  let account: IAccount | undefined;
  const userResult = await getUserAccount(payload);
  if (userResult.success) {
    account = userResult.data.account;
  }
  const dao = new ProgramDao(di);
  const index = await dao.getIndex();
  return {
    statusCode: 200,
    body: renderAllProgramsHtml(di.fetch, index, account),
    headers: { "content-type": "text/html" },
  };
};

const getProgramDetailsEndpoint = Endpoint.build("/programs/:id");
const getProgramDetailsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getProgramDetailsEndpoint
> = async ({ payload, match: { params } }) => {
  const { di } = payload;
  const dao = new ProgramDao(di);
  const result = await dao.getById(params.id);
  const userAgent = getUserAgent(payload.event);
  if (result != null) {
    const { program, indexEntry } = result;
    let fullDescription: string | undefined;
    let faq: string | undefined;
    try {
      const detail = await dao.getDetail(params.id);
      fullDescription = detail.fullDescription || program.description;
      faq = detail.faq;
    } catch (e) {
      // Fall back to description from program
    }
    const userResult = await getUserAccount(payload);
    const account = userResult.success ? userResult.data.account : undefined;
    const settings = userResult.success ? userResult.data.user.storage.settings : undefined;

    return {
      statusCode: 200,
      body: renderProgramDetailsHtml(program, di.fetch, fullDescription, faq, userAgent, account, settings, indexEntry),
      headers: { "content-type": "text/html" },
    };
  } else {
    return { statusCode: 404, body: "Not Found", headers: { "content-type": "text/html" } };
  }
};

const getPlannerEndpoint = Endpoint.build("/planner", { data: "string?" });
const getPlannerHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getPlannerEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { di } = payload;
  let initialProgram: IExportedProgram | undefined;
  const data = params.data;
  if (data) {
    try {
      const initialProgramJson = await NodeEncoder.decode(data);
      const programData: IExportedProgram | IExportedPlannerProgram = JSON.parse(initialProgramJson);
      if ("type" in programData && programData.type === "v2") {
        initialProgram = Program.exportedPlannerProgramToExportedProgram(programData);
      } else {
        initialProgram = programData as IExportedProgram;
      }
    } catch (e) {
      di.log.log(e);
    }
  }
  const userResult = await getUserAccount(payload, { withBodyweight: true });
  const account = userResult.success ? userResult.data.account : undefined;
  const user = userResult.success ? userResult.data.user : undefined;
  const userAgent = getUserAgent(payload.event);

  return {
    statusCode: 200,
    body: renderPlannerHtml(di.fetch, initialProgram, account, user?.storage, userAgent),
    headers: { "content-type": "text/html" },
  };
};

const getMainEndpoint = Endpoint.build("/main");
const getMainHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getMainEndpoint> = async ({ payload }) => {
  const di = payload.di;
  let account: IAccount | undefined;
  const userResult = await getUserAccount(payload, { withPrograms: true });
  if (userResult.success) {
    ({ account } = userResult.data);
  }
  const userAgent = payload.event.headers["user-agent"] || payload.event.headers["User-Agent"];
  const testimonials = await new TestimonialDao(di).getAll();

  return {
    statusCode: 200,
    body: renderMainHtml(di.fetch, testimonials, account, userAgent),
    headers: { "content-type": "text/html" },
  };
};

const getProgramEndpoint = Endpoint.build("/program", { data: "string?" });
const getProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const di = payload.di;
  const data = params.data;
  let program: IExportedProgram | undefined;
  const isMobile = Mobile.isMobile(payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || "");
  let user: ILimitedUserDao | undefined;
  let account: IAccount | undefined;
  const userResult = await getUserAccount(payload, { withPrograms: true, withBodyweight: true });
  if (userResult.success) {
    ({ user, account } = userResult.data);
  }
  const storage = user?.storage ? runMigrations(user.storage) : undefined;

  if (data) {
    try {
      const exportedProgramJson = await NodeEncoder.decode(data);
      const result = await ImportExporter.getExportedProgram(di.fetch, exportedProgramJson);
      if (result.success) {
        program = result.data;
      } else {
        di.log.log(result.error);
      }
    } catch (e) {
      di.log.log(e);
    }
  }

  return {
    statusCode: 200,
    body: renderProgramHtml(di.fetch, isMobile, false, program, account, undefined, storage),
    headers: { "content-type": "text/html" },
  };
};

const getUserProgramsEndpoint = Endpoint.build("/user/programs");
const getUserProgramsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getUserProgramsEndpoint> = async ({
  payload,
}) => {
  const di = payload.di;
  const isMobile = Mobile.isMobile(payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || "");
  const userResult = await getUserAccount(payload, { withPrograms: true });
  if (!userResult.success) {
    return userResult.error;
  }
  const { account, user } = userResult.data;
  const storage = runMigrations(user.storage);

  return {
    statusCode: 200,
    body: renderProgramsListHtml(di.fetch, isMobile, account, storage),
    headers: { "content-type": "text/html" },
  };
};

async function getUserAccount(
  payload: IPayload,
  args: { withPrograms?: boolean; withBodyweight?: boolean } = {}
): Promise<IEither<{ user: ILimitedUserDao; account: IAccount }, APIGatewayProxyResult>> {
  const currentUserId = await getCurrentUserId(payload.event, payload.di);
  if (currentUserId == null) {
    const currentUrl = payload.event.path;
    const url = `/login?url=${encodeURIComponent(currentUrl)}`;
    const result: APIGatewayProxyResult = {
      statusCode: 302,
      body: "",
      headers: { "content-type": "text/html", location: url },
    };
    return { success: false, error: result };
  }
  const userDao = new UserDao(payload.di);
  const user = await userDao.getLimitedById(currentUserId);
  if (!user) {
    const result = {
      statusCode: 404,
      body: "Not Found",
      headers: { "content-type": "text/html" },
    };
    return { success: false, error: result };
  }
  const programs = args.withPrograms ? await userDao.getProgramsByUserId(user.id) : undefined;
  user.storage.programs = programs;
  const stats = args.withBodyweight ? await userDao.getLastBodyweightStats(user.id) : undefined;
  user.storage.stats = stats;
  const account = Account.getFromStorage(user.id, user.email, user.storage);
  return { success: true, data: { user, account } };
}

const getAllExercisesEndpoint = Endpoint.build("/exercises");
const getAllExercisesHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAllExercisesEndpoint> = async ({
  payload,
}) => {
  const { di } = payload;
  let account: IAccount | undefined;
  const userResult = await getUserAccount(payload, { withPrograms: true });
  if (userResult.success) {
    account = userResult.data.account;
  }
  return {
    statusCode: 200,
    body: renderAllExercisesHtml(di.fetch, account),
    headers: { "content-type": "text/html" },
  };
};

const getExerciseEndpoint = Endpoint.build("/exercises/:id", { filtertypes: "string?" });
const getExerciseHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getExerciseEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { di } = payload;
  const exerciseType = Exercise.fromUrlSlug(params.id);
  const filterTypes = (params.filtertypes || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  if (exerciseType && ExerciseImageUtils.exists(exerciseType, "small")) {
    let account: IAccount | undefined;
    const userResult = await getUserAccount(payload, { withPrograms: true });
    if (userResult.success) {
      account = userResult.data.account;
    }
    return {
      statusCode: 200,
      body: renderExerciseHtml(di.fetch, params.id, exerciseType, filterTypes, account),
      headers: { "content-type": "text/html" },
    };
  } else {
    return {
      statusCode: 404,
      body: "Not Found",
      headers: { "content-type": "text/html" },
    };
  }
};

const getProgramRevisionsEndpoint = Endpoint.build("/api/programrevisions/:programid");
const getProgramRevisionsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getProgramRevisionsEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  const currentUserId = await getCurrentUserId(event, di);
  if (currentUserId == null) {
    return ResponseUtils.json(401, event, { error: "not_authorized" });
  }
  const userDao = new UserDao(di);
  const programRevisions = await userDao.listProgramRevisions(currentUserId, params.programid);
  return ResponseUtils.json(200, event, { data: programRevisions });
};

const getProgramRevisionEndpoint = Endpoint.build("/api/programrevision/:programid/:revision");
const getProgramRevisionHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getProgramRevisionEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  const currentUserId = await getCurrentUserId(event, di);
  if (currentUserId == null) {
    return ResponseUtils.json(401, event, { error: "not_authorized" });
  }
  const userDao = new UserDao(di);
  const programRevision = await userDao.getProgramRevision(currentUserId, params.programid, params.revision);
  const program = programRevision?.program;
  if (!program || !program.planner) {
    return ResponseUtils.json(404, event, { error: "not_found" });
  }
  const fulltext = PlannerProgram.generateFullText(program.planner.weeks);
  return ResponseUtils.json(200, event, { text: fulltext });
};

const getLoginEndpoint = Endpoint.build("/login", { url: "string?" });
const getLoginHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getLoginEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const currentUser = await getCurrentLimitedUser(event, di);
  const account = currentUser
    ? Account.getFromStorage(currentUser.id, currentUser.email, currentUser.storage)
    : undefined;
  return {
    statusCode: 200,
    body: renderLoginHtml(di.fetch, account, params.url),
    headers: { "content-type": "text/html" },
  };
};

const getUserProgramEndpoint = Endpoint.build("/user/p/:programid");
const getUserProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getUserProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const di = payload.di;
  const isMobile = Mobile.isMobile(payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || "");
  const userResult = await getUserAccount(payload, { withPrograms: true, withBodyweight: true });
  if (!userResult.success) {
    return userResult.error;
  }
  const { account, user } = userResult.data;
  const storage = runMigrations(user.storage);
  const exportedProgram = Program.storageToExportedProgram(storage, params.programid);
  if (!exportedProgram) {
    return {
      statusCode: 404,
      body: "Not Found",
      headers: { "content-type": "text/html" },
    };
  }

  const userDao = new UserDao(di);
  const programRevisions = await userDao.listProgramRevisions(user.id, params.programid);
  return {
    statusCode: 200,
    body: renderProgramHtml(di.fetch, isMobile, true, exportedProgram, account, undefined, storage, programRevisions),
    headers: { "content-type": "text/html" },
  };
};

const getAffiliatesEndpoint = Endpoint.build("/affiliates");
const getAffiliatesHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAffiliatesEndpoint> = async ({
  payload,
  match,
}) => {
  const di = payload.di;
  const userResult = await getUserAccount(payload);
  const account = userResult.success ? userResult.data.account : undefined;
  return {
    statusCode: 200,
    body: renderAffiliatesHtml(di.fetch, account),
    headers: { "content-type": "text/html" },
  };
};

const getMusclesForExerciseEndpoint = Endpoint.build("/api/muscles", { exercise: "string", tempuserid: "string?" });
const getMusclesForExerciseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getMusclesForExerciseEndpoint
> = async ({ payload, match }) => {
  const di = payload.di;
  const exerciseName = match.params.exercise;
  const aiMuscleCacheDao = new AiMuscleCacheDao(di);
  const eventDao = new EventDao(di);
  const userId = (await getCurrentUserId(payload.event, di)) ?? match.params.tempuserid ?? "anonymous";
  await eventDao.post({
    type: "event",
    name: "ai-get-muscles",
    userId: userId,
    commithash: process.env.COMMIT_HASH ?? "",
    timestamp: Date.now(),
    isMobile: Mobile.isMobile(getUserAgent(payload.event)),
    extra: { exercise: exerciseName },
  });
  di.log.log("Looking for muscles for exercise:", exerciseName);
  const cachedResponse = await aiMuscleCacheDao.getByName(exerciseName);
  if (cachedResponse) {
    di.log.log("Found cached response for muscles for exercise:", exerciseName);
    if (cachedResponse.isSuccess) {
      const musclesResponse = JSON.parse(cachedResponse.response);
      return ResponseUtils.json(200, payload.event, { data: musclesResponse }, { "X-Cache": "HIT" });
    } else {
      return ResponseUtils.json(500, payload.event, { error: "Failed to generate muscles" }, { "X-Cache": "HIT" });
    }
  } else {
    di.log.log("Missed cached response for muscles for exercise:", exerciseName);
    const anthropicKey = await di.secrets.getAnthropicKey();
    const llmProvider = new ClaudeProvider(anthropicKey);
    const llmMuscles = new LlmMuscles(di, llmProvider, userId);
    const muscleGenerator = new MuscleGenerator(di, llmMuscles);
    const musclesResponse = await muscleGenerator.generateMuscles(match.params.exercise);
    di.log.log("Generated muscles response for ", exerciseName, musclesResponse);
    if (musclesResponse) {
      await aiMuscleCacheDao.create({ name: exerciseName, response: JSON.stringify(musclesResponse), isSuccess: true });
      return ResponseUtils.json(200, payload.event, { data: musclesResponse });
    } else {
      await aiMuscleCacheDao.create({
        name: exerciseName,
        response: JSON.stringify({}),
        isSuccess: false,
      });
      return ResponseUtils.json(500, payload.event, { error: "Failed to generate muscles" });
    }
  }
};

// const getAiEndpoint = Endpoint.build("/ai");
// const getAiHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAiEndpoint> = async ({
//   payload,
//   match,
// }) => {
//   const di = payload.di;
//   const userResult = await getUserAccount(payload);
//   if (!userResult.success) {
//     return userResult.error;
//   } else {
//     const account = userResult.data.account;
//     return {
//       statusCode: 200,
//       body: renderAiHtml(di.fetch, account),
//       headers: { "content-type": "text/html" },
//     };
//   }
// };

const postAiPromptEndpoint = Endpoint.build("/api/ai/prompt");
const postAiPromptHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postAiPromptEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const { input } = getBodyJson(event);

  if (!input) {
    return ResponseUtils.json(400, event, { error: "Input is required" });
  }

  try {
    const urlFetcher = new UrlContentFetcher(di);
    let content = input;

    const userId = await getCurrentUserId(event, di);
    try {
      const aiLogsDao = new AiLogsDao(di);
      await aiLogsDao.create({
        userId: userId || "anonymous",
        input,
        timestamp: Date.now(),
      });
    } catch (err) {
      di.log.log("Failed to log prompt:", err);
    }

    // If it's a URL, fetch the content
    if (urlFetcher.isUrl(input)) {
      const fetched = await urlFetcher.fetchUrlContent(input);
      content = fetched.content;

      if (fetched.type === "csv") {
        if (content.includes("with Formulas:")) {
          content = `[This is Google Sheets data with formulas. Cells show both formulas (e.g., =B2*0.8) and their calculated values. Use the formulas to understand the program structure and progressions]:\n\n${content}`;
        } else {
          content = `[This is CSV data from a spreadsheet]:\n\n${content}`;
        }
      } else if (fetched.type === "html") {
        const markdownContent = urlFetcher.convertHtmlToMarkdown(content);
        content = `[This content was extracted from a webpage and converted to Markdown format. Tables are preserved in HTML format between [TABLE] tags. Extract the workout program information]:\n\n${markdownContent}`;
      }
    }

    // Generate the full prompt
    const systemPrompt = LlmPrompt.getSystemPrompt();
    const userPrompt = LlmPrompt.getUserPrompt(content);
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    return ResponseUtils.json(200, event, { prompt: fullPrompt });
  } catch (error) {
    di.log.log("Error generating prompt:", error);
    return ResponseUtils.json(400, event, { error: `Failed to generate prompt: ${error}` });
  }
};

const getUploadedImagesEndpoint = Endpoint.build("/api/uploadedimages");
const getUploadedImagesHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getUploadedImagesEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  const userId = await getCurrentUserId(event, di);
  if (!userId) {
    return ResponseUtils.json(401, event, { error: "Unauthorized" });
  }
  const userDao = new UserDao(di);
  const files = await userDao.getImages(userId);
  return ResponseUtils.json(
    200,
    event,
    { data: { images: files.map((f) => `${getUserImagesPrefix()}${f}`) } },
    { "Cache-Control": "no-store" }
  );
};

const postImageUploadUrlEndpoint = Endpoint.build("/api/imageuploadurl");
const postImageUploadUrlHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postImageUploadUrlEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  const { fileName, contentType } = getBodyJson(event);

  const userId = await getCurrentUserId(event, di);
  if (!userId) {
    return ResponseUtils.json(401, event, { error: "Unauthorized" });
  }

  if (!fileName || !contentType) {
    return ResponseUtils.json(400, event, { error: "fileName and contentType are required" });
  }

  try {
    const key = `user-uploads/${userId}/${UidFactory.generateUid(8)}-${fileName}`;
    const env = Utils.getEnv();
    const bucketname = `${LftS3Buckets.userimages}${env === "dev" ? "dev" : ""}`;
    const uploadUrl = await di.s3.getPresignedUploadUrl({
      bucket: bucketname,
      key,
      contentType,
      expiresIn: 300,
    });
    const imageUrl = `${getUserImagesPrefix()}${key}`;

    return ResponseUtils.json(200, event, {
      uploadUrl,
      imageUrl,
      key,
    });
  } catch (error) {
    di.log.log("Error generating presigned URL:", error);
    return ResponseUtils.json(500, event, { error: "Failed to generate upload URL" });
  }
};

const getAiPromptEndpoint = Endpoint.build("/ai/prompt");
const getAiPromptHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getAiPromptEndpoint> = async ({
  payload,
  match,
}) => {
  const di = payload.di;
  const userResult = await getUserAccount(payload, { withPrograms: true });
  let account: IAccount | undefined;
  if (userResult.success) {
    ({ account } = userResult.data);
  }
  return {
    statusCode: 200,
    body: renderAiPromptHtml(di.fetch, account),
    headers: { "content-type": "text/html" },
  };
};

const getProgramShorturlResponseEndpoint = Endpoint.build("/api/p/:id");
const getProgramShorturlResponseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getProgramShorturlEndpoint
> = async ({ payload, match: { params } }) => {
  return _getProgramShorturlResponseHandler(payload.di, payload.event, params.id);
};

const getPlannerShorturlResponseEndpoint = Endpoint.build("/api/n/:id");
const getPlannerShorturlResponseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getPlannerShorturlResponseEndpoint
> = async ({ payload, match: { params } }) => {
  return _getProgramShorturlResponseHandler(payload.di, payload.event, params.id);
};

const getPlanShorturlResponseEndpoint = Endpoint.build("/api/b/:id");
const getPlanShorturlResponseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getPlanShorturlResponseEndpoint
> = async ({ payload, match: { params } }) => {
  return _getProgramShorturlResponseHandler(payload.di, payload.event, params.id);
};

const postEventEndpoint = Endpoint.build("/api/event");
const postEventHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postEventEndpoint> = async ({
  payload,
}) => {
  const { di, event } = payload;
  const bodyJson: IEventPayload = getBodyJson(event);
  const userId = (await getCurrentUserId(event, di)) || bodyJson.userId;
  if (userId == null) {
    return ResponseUtils.json(400, event, { error: "missing user id" });
  }
  const eventDao = new EventDao(di);
  await eventDao.post({
    ...bodyJson,
    userId,
    isMobile: Mobile.isMobile(payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || ""),
  });
  return ResponseUtils.json(200, event, { data: "ok" });
};

async function _getProgramShorturlResponseHandler(
  di: IDI,
  event: APIGatewayProxyEvent,
  id: string
): Promise<APIGatewayProxyResult> {
  const urlString = await new UrlDao(di).get(id);
  if (urlString) {
    const url = UrlUtils.build(urlString, "https://www.liftosaur.com");
    const data = url.searchParams.get("data");
    const s = url.searchParams.get("s");
    const u = url.searchParams.get("u");
    if (data) {
      return ResponseUtils.json(200, event, { data, s, u });
    } else {
      return ResponseUtils.json(401, event, {});
    }
  }
  return ResponseUtils.json(404, event, {});
}

const postClaimFreeUserEndpoint = Endpoint.build("/api/claimkey/:userid");
const postClaimFreeUserHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postClaimFreeUserEndpoint
> = async ({ payload, match: { params } }) => {
  const { di, event } = payload;
  const userid = params.userid;
  const claim = await new FreeUserDao(di).claim(userid);
  return ResponseUtils.json(200, event, { data: { claim } });
};

const postStoreExceptionDataEndpoint = Endpoint.build("/api/exception");
const postStoreExceptionDataHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postStoreExceptionDataEndpoint
> = async ({ payload }) => {
  const { di, event } = payload;
  const bodyJson = getBodyJson(event);
  const { id, data } = bodyJson;
  const exceptionDao = new ExceptionDao(di);
  let exceptionData: string;
  if (typeof data === "string") {
    exceptionData = await NodeEncoder.decode(data);
  } else {
    exceptionData = JSON.stringify(data);
  }
  await exceptionDao.store(id, exceptionData);
  return ResponseUtils.json(200, event, { data: { id } });
};

const getStoreExceptionDataEndpoint = Endpoint.build("/api/exception/:id");
const getStoreExceptionDataHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getStoreExceptionDataEndpoint
> = async ({ payload, match: { params } }) => {
  const { di, event } = payload;
  const id = params.id;
  const exceptionDao = new ExceptionDao(di);
  const data = await exceptionDao.get(id);
  if (data) {
    return ResponseUtils.json(200, event, { data });
  } else {
    return ResponseUtils.json(404, event, { error: "Not Found" });
  }
};

const getPlannerShorturlEndpoint = Endpoint.build("/n/:id");
const getPlannerShorturlHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getPlannerShorturlEndpoint
> = async ({ payload, match: { params } }) => {
  const di = payload.di;
  const id = params.id;
  return shorturlRedirect(di, id);
};

const getProgramShorturlEndpoint = Endpoint.build("/p/:id");
const getProgramShorturlHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getProgramShorturlEndpoint
> = async ({ payload, match: { params } }) => {
  const di = payload.di;
  const id = params.id;
  let program: IExportedProgram | undefined;
  const isMobile = Mobile.isMobile(payload.event.headers["user-agent"] || payload.event.headers["User-Agent"] || "");
  const urlString = await new UrlDao(di).get(id);
  if (urlString) {
    const url = UrlUtils.build(urlString, "https://www.liftosaur.com");
    const data = url.searchParams.get("data");
    const source = url.searchParams.get("s") || undefined;
    if (data) {
      try {
        const exportedProgramJson = await NodeEncoder.decode(data);
        const result = await ImportExporter.getExportedProgram(di.fetch, exportedProgramJson);
        if (result.success) {
          program = result.data;
          let user: ILimitedUserDao | undefined;
          let account: IAccount | undefined;
          const userResult = await getUserAccount(payload, { withPrograms: true, withBodyweight: true });
          if (userResult.success) {
            ({ user, account } = userResult.data);
          }
          const storage = user?.storage ? runMigrations(user.storage) : undefined;

          return {
            statusCode: 200,
            body: renderProgramHtml(di.fetch, isMobile, false, program, account, source, storage),
            headers: { "content-type": "text/html" },
          };
        } else {
          di.log.log(result.error);
        }
      } catch (e) {
        di.log.log(e);
      }
    }
  }
  return ResponseUtils.json(404, payload.event, { error: "Not Found" });
};

async function shorturlRedirect(di: IDI, id: string): Promise<APIGatewayProxyResult> {
  const url = await new UrlDao(di).get(id);
  if (url) {
    const header: Record<string, string> = { location: url, "content-type": "text/html" };
    return {
      statusCode: 302,
      body: "",
      headers: header,
    };
  } else {
    const header: Record<string, string> = { "content-type": "text/html" };
    return {
      statusCode: 404,
      body: "Not Found",
      headers: header,
    };
  }
}

const postShortUrlEndpoint = Endpoint.build("/shorturl/:type");
const postShortUrlHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postShortUrlEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  const { type } = params;
  const json = getBodyJson(event);
  let url = json.url;
  const src = json.src;
  const userid = await getCurrentUserId(event, di);
  if (url == null || typeof url !== "string") {
    return ResponseUtils.json(400, event, {});
  }
  if (userid || src) {
    const uriResult = UrlUtils.buildSafe(url, "https://www.liftosaur.com");
    if (uriResult.success) {
      const uri = uriResult.data;
      if (userid) {
        uri.searchParams.set("u", userid || "anonymous");
      }
      if (src) {
        uri.searchParams.set("s", src);
      }
      url = uri.toString();
    }
  }
  const id = await new UrlDao(di).put(url, userid);
  const newUrl = `/${type}/${id}`;

  return ResponseUtils.json(200, event, { url: newUrl });
};

const getRepMaxEndpoint = Endpoint.build("/rep-max-calculator");
const getRepMaxHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getRepMaxEndpoint> = async ({ payload }) =>
  showRepMax(payload, undefined);

const repmaxpairs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const repmaxpairswords = repmaxpairs.map((reps) => {
  const word = MathUtils.toWord(reps);
  return [
    Endpoint.build(`/${word}-rep-max-calculator`),
    async ({ payload }: { payload: IPayload }) => showRepMax(payload, reps),
  ] as const;
});
const repmaxpairnums = repmaxpairs.map((reps) => {
  return [
    Endpoint.build(`/${reps}rm`),
    async ({}: {}) => {
      const word = MathUtils.toWord(reps);
      return {
        statusCode: 301,
        body: "",
        headers: { "content-type": "text/html", location: `/${word != null ? `${word}-` : ""}rep-max-calculator` },
      };
    },
  ] as const;
});

async function showRepMax(payload: IPayload, reps?: number): Promise<APIGatewayProxyResult> {
  const { di } = payload;
  const userResult = await getUserAccount(payload);
  const account = userResult.success ? userResult.data.account : undefined;
  return {
    statusCode: 200,
    body: renderRepMaxHtml(di.fetch, reps, account),
    headers: { "content-type": "text/html" },
  };
}

const rollbar = new Rollbar({
  accessToken: "bcdd086a019f49edb69f790a854b44dd",
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: `${Utils.getEnv()}-lambda`,
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

export const getLftStatsLambdaDev = (
  diBuilder: () => IDI
): Rollbar.LambdaHandler<unknown, APIGatewayProxyResult, unknown> =>
  rollbar.lambdaHandler(
    async (event: {}): Promise<APIGatewayProxyResult> => statsLambdaHandler(diBuilder)(event)
  ) as Rollbar.LambdaHandler<unknown, APIGatewayProxyResult, unknown>;

export const getLftStatsLambda = (
  diBuilder: () => IDI
): Rollbar.LambdaHandler<unknown, APIGatewayProxyResult, unknown> =>
  rollbar.lambdaHandler(
    async (event: {}): Promise<APIGatewayProxyResult> => statsLambdaHandler(diBuilder)(event)
  ) as Rollbar.LambdaHandler<unknown, APIGatewayProxyResult, unknown>;

export const statsLambdaHandler = (diBuilder: () => IDI): ((event: {}) => Promise<APIGatewayProxyResult>) => {
  return async () => {
    const di = diBuilder();
    const lastThreeMonths = [DateUtils.yearAndMonth(Date.now())];
    const lastMonthlogRecords = await new LogDao(di).getAllForYearAndMonth(
      lastThreeMonths[0][0],
      lastThreeMonths[0][1]
    );
    const userIds = lastMonthlogRecords.filter((r) => r.action === "ls-finish-workout").map((r) => r.userId);
    const users = await new UserDao(di).getLimitedByIds(userIds);
    const usersById = CollectionUtils.groupByKeyUniq(users, "id");
    const logRecords = CollectionUtils.sortBy(await new LogDao(di).getForUsers(userIds), "ts", true);
    const logRecordsByUserId = CollectionUtils.groupByKey(logRecords, "userId");

    const usersData: IStatsUserData[] = Object.keys(logRecordsByUserId).map((userId) => {
      const userLogRecords = CollectionUtils.sortBy(logRecordsByUserId[userId] || [], "ts", true);
      const lastAction = userLogRecords[0];
      const firstAction = userLogRecords[userLogRecords.length - 1];
      const userSubscriptions = usersById[userId]?.storage.subscription;
      const isSubscribed =
        userSubscriptions != null
          ? ClientSubscription.Subscriptions.hasSubscription(userSubscriptions)
          : userLogRecords.some((lr) => (lr.subscriptions || []).length > 0);
      return {
        userId,
        email: usersById[userId]?.email,
        userTs: usersById[userId]?.createdAt,
        isSubscribed: isSubscribed,
        firstAction: { name: firstAction.action, ts: firstAction.ts },
        lastAction: { name: lastAction.action, ts: lastAction.ts },
      };
    });

    let lastDay;
    const data: IStatsUserData[][] = [];
    for (const user of usersData) {
      const day = new Date(user.lastAction.ts).getUTCDate();
      if (lastDay == null || lastDay !== day) {
        data.push([]);
        lastDay = day;
      }
      const dayGroup = data[data.length - 1];
      dayGroup.push(user);
    }

    for (const dayGroup of data) {
      dayGroup.sort((a, b) => {
        const isANew = getIsNew(a);
        const isANewUser = getIsNewUser(a);
        const isBNew = getIsNew(b);
        const isBNewUser = getIsNewUser(b);

        if ((isANew || isANewUser) && !(isBNew || isBNewUser)) {
          return -1;
        } else if (!(isANew || isANewUser) && (isBNew || isBNewUser)) {
          return 1;
        } else {
          return b.lastAction.ts - a.lastAction.ts;
        }
      });
    }

    const activeMontlyCount = data.reduce((acc, dayGroup) => acc + dayGroup.length, 0);
    const activeMonthlySubscribedCount = data.reduce(
      (acc, dayGroup) => acc + dayGroup.filter((i) => i.isSubscribed).length,
      0
    );
    const activeMonthlyRegisteredCount = data.reduce(
      (acc, dayGroup) => acc + dayGroup.filter((i) => i.email != null).length,
      0
    );
    const newThisMonth = data.reduce(
      (acc, dayGroup) => acc + dayGroup.filter((i) => Date.now() - i.firstAction.ts < 1000 * 60 * 60 * 24 * 30).length,
      0
    );
    const newRegisteredThisMonth = data.reduce(
      (acc, dayGroup) =>
        acc + dayGroup.filter((i) => i.userTs != null && Date.now() - i.userTs < 1000 * 60 * 60 * 24 * 30).length,
      0
    );

    const dayGroup = data[0];
    const activeCount = dayGroup.length;
    const activeSubscribedCount = dayGroup.filter((i) => i.isSubscribed).length;
    const activeRegisteredCount = dayGroup.filter((i) => i.email != null).length;
    const newThisDay = dayGroup.filter((i) => Date.now() - i.firstAction.ts < 1000 * 60 * 60 * 24).length;
    const newRegisteredThisDay = dayGroup.filter(
      (i) => i.userTs != null && Date.now() - i.userTs < 1000 * 60 * 60 * 24
    ).length;

    const bucket = `${LftS3Buckets.stats}${Utils.getEnv() === "dev" ? "dev" : ""}`;
    const statsFile = await di.s3.getObject({ bucket, key: "stats.csv" });
    let stats = statsFile?.toString();
    if (!stats) {
      stats =
        "date,monthly,monthly_subscribed,monthly_registered,monthly_new,monthly_new_registered,daily,daily_subscribed,daily_registered,daily_new,daily_new_registered\n";
    }
    stats += `${DateUtils.formatYYYYMMDD(
      new Date()
    )},${activeMontlyCount},${activeMonthlySubscribedCount},${activeMonthlyRegisteredCount},${newThisMonth},${newRegisteredThisMonth},${activeCount},${activeSubscribedCount},${activeRegisteredCount},${newThisDay},${newRegisteredThisDay}\n`;
    await di.s3.putObject({
      bucket: bucket,
      key: "stats.csv",
      body: stats,
      opts: { contentType: "text/csv" },
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: "done",
      }),
    };
  };
};

function getIsNew(item: IStatsUserData): boolean {
  const firstActionDate = new Date(item.firstAction.ts);
  const lastActionDate = new Date(item.lastAction.ts);
  return (
    firstActionDate.getUTCFullYear() === lastActionDate.getUTCFullYear() &&
    firstActionDate.getUTCMonth() === lastActionDate.getUTCMonth() &&
    firstActionDate.getUTCDate() === lastActionDate.getUTCDate()
  );
}

function getIsNewUser(item: IStatsUserData): boolean {
  const lastActionDate = new Date(item.lastAction.ts);
  const userDate = item.userTs && new Date(item.userTs);
  return !!(
    userDate &&
    userDate.getUTCFullYear() === lastActionDate.getUTCFullYear() &&
    userDate.getUTCMonth() === lastActionDate.getUTCMonth() &&
    userDate.getUTCDate() === lastActionDate.getUTCDate()
  );
}

export type IHandler = (event: APIGatewayProxyEvent, context: unknown) => Promise<APIGatewayProxyResult>;
type IRollbarHandler = Rollbar.LambdaHandler<APIGatewayProxyEvent, APIGatewayProxyResult, unknown>;
export const getHandler = (diBuilder: () => IDI): IRollbarHandler => {
  return rollbar.lambdaHandler(getRawHandler(diBuilder));
};

export const getRawHandler = (diBuilder: () => IDI): IHandler => {
  return async (event: APIGatewayProxyEvent, context) => {
    const di = diBuilder();
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, body: "", headers: ResponseUtils.getHeaders(event) };
    }
    di.log.id = UidFactory.generateUid(4);
    const time = Date.now();
    const userid = await getCurrentUserId(event, di);
    // @ts-ignore
    if (rollbar?.client?.telemeter?.queue) {
      // @ts-ignore
      rollbar.client.telemeter.queue = [];
    }
    di.log.setRollbar(rollbar);
    if (userid) {
      di.log.setUser(userid);
    } else {
      di.log.setUser("anonymous");
    }
    di.log.log("--------> Starting request", event.httpMethod, event.path);
    di.log.log("User Agent:", event.headers["user-agent"] || event.headers["User-Agent"] || "");

    const host = ResponseUtils.getHost(event);
    const isApiDomain = host.startsWith("api3");
    if (isApiDomain && event.path === "/robots.txt") {
      return {
        statusCode: 200,
        body: "User-agent: *\nDisallow: /\n",
        headers: { "content-type": "text/plain" },
      };
    }

    const request: IPayload = { event, di };
    let r = new Router<IPayload, APIGatewayProxyResult>(request)
      .get(getMainEndpoint, getMainHandler)
      .get(getStoreExceptionDataEndpoint, getStoreExceptionDataHandler)
      .post(postStoreExceptionDataEndpoint, postStoreExceptionDataHandler)
      .get(getProgramShorturlEndpoint, getProgramShorturlHandler)
      .get(getPlannerShorturlEndpoint, getPlannerShorturlHandler)
      .get(getProgramShorturlResponseEndpoint, getProgramShorturlResponseHandler)
      .get(getPlannerShorturlResponseEndpoint, getPlannerShorturlResponseHandler)
      .get(getPlanShorturlResponseEndpoint, getPlanShorturlResponseHandler)
      .get(getHistoryEndpoint, getHistoryHandler)
      .get(getUploadedImagesEndpoint, getUploadedImagesHandler)
      .get(getDashboardsAffiliatesEndpoint, getDashboardsAffiliatesHandler)
      .get(getLoginEndpoint, getLoginHandler)
      .post(postSaveProgramEndpoint, postSaveProgramHandler)
      .get(getDashboardsUsersEndpoint, getDashboardsUsersHandler)
      .get(getAffiliatesEndpoint, getAffiliatesHandler)
      .get(getAiPromptEndpoint, getAiPromptHandler)
      .post(postShortUrlEndpoint, postShortUrlHandler)
      .post(postAddFreeUserEndpoint, postAddFreeUserHandler)
      .post(postClaimFreeUserEndpoint, postClaimFreeUserHandler)
      .post(postAiPromptEndpoint, postAiPromptHandler)
      .post(postImageUploadUrlEndpoint, postImageUploadUrlHandler)
      .post(postSyncEndpoint, postSyncHandler)
      .post(postSync2Endpoint, postSync2Handler)
      .get(getStorageEndpoint, getStorageHandler)
      .get(getPlannerEndpoint, getPlannerHandler)
      .get(getProgramEndpoint, getProgramHandler)
      .get(getUserProgramsEndpoint, getUserProgramsHandler)
      .get(getUserProgramEndpoint, getUserProgramHandler)
      .get(getUserAffiliatesEndpoint, getUserAffiliatesHandler)
      .get(getProgramRevisionsEndpoint, getProgramRevisionsHandler)
      .get(getProgramRevisionEndpoint, getProgramRevisionHandler)
      .get(getMusclesForExerciseEndpoint, getMusclesForExerciseHandler)
      .post(postVerifyAppleReceiptEndpoint, postVerifyAppleReceiptHandler)
      .post(postVerifyGooglePurchaseTokenEndpoint, postVerifyGooglePurchaseTokenHandler)
      .post(postAppleWebhookEndpoint, postAppleWebhookHandler)
      .post(postGoogleWebhookEndpoint, postGoogleWebhookHandler)
      .post(googleLoginEndpoint, googleLoginHandler)
      .post(appleLoginEndpoint, appleLoginHandler)
      .post(signoutEndpoint, signoutHandler)
      .get(getProgramsEndpoint, getProgramsHandler)
      .get(getHistoryRecordEndpoint, getHistoryRecordHandler)
      .get(getHistoryRecordImageEndpoint, getHistoryRecordImageHandler)
      .post(logEndpoint, logHandler)

      .get(getProfileEndpoint, getProfileHandler)
      .get(getProfileImageEndpoint, getProfileImageHandler)
      .get(getAdminUsersEndpoint, getAdminUsersHandler)
      .get(getAdminLogsEndpoint, getAdminLogsHandler)
      .get(getAllProgramsEndpoint, getAllProgramsHandler)
      .get(getProgramDetailsEndpoint, getProgramDetailsHandler)
      .get(getProgramImageEndpoint, getProgramImageHandler)
      .post(postCreateCouponEndpoint, postCreateCouponHandler)
      .post(postClaimCouponEndpoint, postClaimCouponHandler)
      .post(saveDebugEndpoint, saveDebugHandler)
      .post(debugLogsEndpoint, debugLogsHandler)
      .delete(deleteAccountEndpoint, deleteAccountHandler)
      .delete(deleteProgramEndpoint, deleteProgramHandler)
      .get(getExerciseEndpoint, getExerciseHandler)
      .get(getAllExercisesEndpoint, getAllExercisesHandler)
      .get(getRepMaxEndpoint, getRepMaxHandler)
      .post(postReceiveAdAttrEndpoint, postReceiveAdAttrHandler)
      .post(postEventEndpoint, postEventHandler)
      .get(getDashboardsUserEndpoint, getDashboardsUserHandler)
      .get(getDashboardsPaymentsEndpoint, getDashboardsPaymentsHandler)
      .post(postBatchEventsEndpoint, postBatchEventsHandler);
    r = repmaxpairswords.reduce((memo, [endpoint, handler]) => memo.get(endpoint, handler), r);
    r = repmaxpairnums.reduce((memo, [endpoint, handler]) => memo.get(endpoint, handler), r);

    const url = UrlUtils.build(event.path, "http://example.com");
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
      di.log.log(e);
      errorStatus = 500;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rollbar.error(e as any, undefined, { person: { id: userid } });
      } catch (_e) {}
      resp = { success: false, error: "Internal Server Error" };
    }
    di.log.log(
      "<-------- Responding for",
      event.httpMethod,
      event.path,
      resp.success ? resp.data.statusCode : errorStatus,
      resp.success ? `${resp.data.body.length}b` : undefined,
      `${Date.now() - time}ms`
    );
    return resp.success
      ? resp.data
      : { statusCode: errorStatus, headers: ResponseUtils.getHeaders(event), body: resp.error };
  };
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiKeyDao } from "../dao/apiKeyDao";
import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { Subscriptions } from "./subscriptions";
import { IDI } from "./di";
import { createHash } from "crypto";

export interface IApiKeyAuthResult {
  userId: string;
  user: ILimitedUserDao;
  deviceId: string;
}

// The raw key is a credential, so it must never end up inside stored `_versions` - hash it into a
// stable node id instead. Distinct keys stay distinct nodes, which is what the vector clock needs.
//
// A caller-supplied instance id is namespaced *under* the credential rather than used as the node
// itself. Taken raw it would let any API client claim another writer's node - send a real device's
// id and its writes land on that device's counters while the device is offline with its own, which
// manufactures a false causal ordering and rolls one of them back. The `api_` prefix makes that
// impossible by construction. The instance is sanitized rather than hashed so the node stays
// readable in stored `_versions`, which is where these get debugged from.
export function ApiKeyAuth_deviceIdForKey(apiKey: string, clientInstance?: string): string {
  const key = createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
  const instance = (clientInstance || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
  return instance ? `api_${key}_${instance}` : `api_${key}`;
}

export function ResponseUtils_apiJson(status: number, body: object): APIGatewayProxyResult {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "OPTIONS,GET,POST,PUT,DELETE",
    },
  };
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: { line?: number; offset?: number; from?: number; to?: number; message: string }[]
): APIGatewayProxyResult {
  return ResponseUtils_apiJson(status, { error: { code, message, ...(details ? { details } : {}) } });
}

export async function withApiAuth(
  event: APIGatewayProxyEvent,
  di: IDI,
  handler: (auth: IApiKeyAuthResult) => Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader?.startsWith("Bearer lftsk_")) {
    return apiError(401, "unauthorized", "Missing or invalid API key");
  }

  const apiKey = authHeader.substring(7);
  const apiKeyDao = new ApiKeyDao(di);
  const keyRecord = await apiKeyDao.getByKey(apiKey);
  if (!keyRecord) {
    return apiError(401, "unauthorized", "Invalid API key");
  }

  const userDao = new UserDao(di);
  const user = await userDao.getLimitedById(keyRecord.userId);
  if (!user) {
    return apiError(401, "unauthorized", "User not found");
  }

  const subscriptions = new Subscriptions(di.log, di.secrets);
  const hasSub = await subscriptions.hasSubscription(di, keyRecord.userId, user.storage.subscription);
  if (!hasSub) {
    return apiError(403, "subscription_required", "Active subscription required to use the API");
  }

  const headers = event.headers || {};
  const headerDeviceId = headers["X-Liftosaur-Device-Id"] ?? headers["x-liftosaur-device-id"];
  return handler({
    userId: keyRecord.userId,
    user,
    deviceId: ApiKeyAuth_deviceIdForKey(apiKey, headerDeviceId),
  });
}

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiKeyDao } from "../dao/apiKeyDao";
import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { Subscriptions } from "./subscriptions";
import { IDI } from "./di";

export interface IApiKeyAuthResult {
  userId: string;
  user: ILimitedUserDao;
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

  return handler({ userId: keyRecord.userId, user });
}

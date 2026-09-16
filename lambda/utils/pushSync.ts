import { IEither } from "../../src/utils/types";
import {
  VersionTrackerUtils_SERVER_DEVICE_ID,
  VersionTrackerUtils_UNIDENTIFIED_DEVICE_ID,
} from "../../src/models/versionTracker/utils";
import { IPushEndpointDao, PushEndpointDao } from "../dao/pushEndpointDao";
import { Utils_getEnv } from "../utils";
import { IDI } from "./di";
import { IPushPlatform, PushPlatforms_apnsKey, PushPlatforms_arns, PushPlatforms_isPlatform } from "./pushPlatforms";

export interface IPushRegistration {
  deviceId: string;
  platform: IPushPlatform;
  token: string;
}

export const PushSync_TTL_SECONDS = 90 * 24 * 60 * 60;

const platformPrefixes: Record<IPushPlatform, string> = { ios: "ios_", android: "and_" };
const reservedDeviceIds = [VersionTrackerUtils_UNIDENTIFIED_DEVICE_ID, VersionTrackerUtils_SERVER_DEVICE_ID];

export function PushSync_ttl(now: number): number {
  return Math.floor(now / 1000) + PushSync_TTL_SECONDS;
}

export function PushSync_validateRegistration(body: unknown): IEither<IPushRegistration, string> {
  if (body == null || typeof body !== "object") {
    return { success: false, error: "Missing body" };
  }
  const { deviceId, platform, token } = body as Record<string, unknown>;
  if (!PushPlatforms_isPlatform(platform)) {
    return { success: false, error: "platform must be 'ios' or 'android'" };
  }
  if (typeof token !== "string" || token.length === 0) {
    return { success: false, error: "Missing token" };
  }
  if (typeof deviceId !== "string" || reservedDeviceIds.indexOf(deviceId) !== -1) {
    return { success: false, error: "Missing deviceId" };
  }
  if (!deviceId.startsWith(platformPrefixes[platform])) {
    return { success: false, error: `deviceId must start with '${platformPrefixes[platform]}' for ${platform}` };
  }
  return { success: true, data: { deviceId, platform, token } };
}

export function PushSync_targets(rows: IPushEndpointDao[], originDeviceId: string | undefined): IPushEndpointDao[] {
  if (originDeviceId == null || originDeviceId === VersionTrackerUtils_UNIDENTIFIED_DEVICE_ID) {
    return rows;
  }
  return rows.filter((row) => row.deviceId !== originDeviceId);
}

export function PushSync_buildMessage(
  platform: IPushPlatform,
  env: "dev" | "prod",
  originalId: number
): { message: string; attributes: Record<string, string> } {
  if (platform === "ios") {
    const payload = { aps: { "content-available": 1 }, reason: "storage", originalId };
    return {
      message: JSON.stringify({ default: "storage", [PushPlatforms_apnsKey(env)]: JSON.stringify(payload) }),
      attributes: { "AWS.SNS.MOBILE.APNS.PUSH_TYPE": "background", "AWS.SNS.MOBILE.APNS.PRIORITY": "5" },
    };
  }
  const fcm = {
    fcmV1Message: {
      message: { data: { reason: "storage", originalId: `${originalId}` }, android: { priority: "high" } },
    },
  };
  return { message: JSON.stringify({ default: "storage", GCM: JSON.stringify(fcm) }), attributes: {} };
}

export async function PushSync_register(di: IDI, userId: string, registration: IPushRegistration): Promise<void> {
  const dao = new PushEndpointDao(di);
  const existing = await dao.get(userId, registration.deviceId);
  let endpointArn = existing?.endpointArn;
  if (endpointArn != null) {
    const outcome = await di.sns.setEndpoint({ endpointArn, token: registration.token });
    if (outcome === "gone") {
      endpointArn = undefined;
    }
  }
  if (endpointArn == null) {
    endpointArn = await di.sns.createPlatformEndpoint({
      platformApplicationArn: PushPlatforms_arns[Utils_getEnv()][registration.platform],
      token: registration.token,
    });
    await di.sns.setEndpoint({ endpointArn, token: registration.token });
  }
  const arn = endpointArn;
  const others = (await dao.listByEndpointArn(arn)).filter(
    (row) => row.userId !== userId || row.deviceId !== registration.deviceId
  );
  await Promise.all(others.map((row) => dao.remove(row.userId, row.deviceId, arn)));
  await dao.put({
    userId,
    deviceId: registration.deviceId,
    platform: registration.platform,
    endpointArn: arn,
    ttl: PushSync_ttl(Date.now()),
  });
}

export async function PushSync_unregister(di: IDI, userId: string, deviceId: string): Promise<void> {
  const dao = new PushEndpointDao(di);
  const row = await dao.get(userId, deviceId);
  if (row == null) {
    return;
  }
  await di.sns.deleteEndpoint(row.endpointArn);
  await dao.remove(userId, deviceId, row.endpointArn);
}

export async function PushSync_removeAllForUser(di: IDI, userId: string): Promise<void> {
  const dao = new PushEndpointDao(di);
  const rows = await dao.listByUserId(userId);
  await Promise.all(
    rows.map(async (row) => {
      try {
        await di.sns.deleteEndpoint(row.endpointArn);
      } catch (e) {
        di.log.log(`push remove all: failed to delete endpoint for ${row.deviceId}`, e);
      }
      await dao.remove(row.userId, row.deviceId, row.endpointArn);
    })
  );
}

export async function PushSync_notify(
  di: IDI,
  userId: string,
  originDeviceId: string | undefined,
  originalId: number
): Promise<void> {
  const dao = new PushEndpointDao(di);
  const env = Utils_getEnv();
  let rows: IPushEndpointDao[];
  try {
    rows = await dao.listByUserId(userId);
  } catch (e) {
    di.log.log("push notify: failed to list endpoints", e);
    return;
  }
  const targets = PushSync_targets(rows, originDeviceId);
  await Promise.all(
    targets.map(async (row) => {
      try {
        const { message, attributes } = PushSync_buildMessage(row.platform, env, originalId);
        const outcome = await di.sns.publish({ endpointArn: row.endpointArn, message, attributes });
        if (outcome !== "ok") {
          await dao.remove(row.userId, row.deviceId, row.endpointArn);
        }
      } catch (e) {
        di.log.log(`push notify: failed for ${row.deviceId}`, e);
      }
    })
  );
}

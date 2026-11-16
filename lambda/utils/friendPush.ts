import { IDI } from "./di";
import { Utils_getEnv } from "../utils";
import { IPushPlatform, PushPlatforms_apnsKey } from "./pushPlatforms";
import { PushSync_notifySocial, PushSync_publish } from "./pushSync";
import { PushEndpointDao } from "../dao/pushEndpointDao";
import { UserDao } from "../dao/userDao";
import { IFollowDao } from "../dao/followDao";
import { Bounded_run } from "./bounded";
import { Feed_summarizeReactions } from "./feed";
import { FeedWorkout_key } from "../../src/models/feedWorkout";
import { IHistoryRecord, ISettingsNotifications } from "../../src/types";
import {
  FriendNotification_content,
  FriendNotification_isEnabled,
  FriendNotification_tapData,
  FriendNotification_workoutLabel,
  IFriendNotificationContent,
  IFriendNotificationEvent,
} from "../../src/models/friendNotification";

export const FriendPush_timeoutMs = 2000;
const threadId = "friends";

export function FriendPush_buildMessage(
  platform: IPushPlatform,
  env: "dev" | "prod",
  content: IFriendNotificationContent
): { message: string; attributes: Record<string, string> } {
  const tap = FriendNotification_tapData(content);
  if (platform === "ios") {
    const payload = {
      aps: { alert: { title: content.title, body: content.body }, sound: "default", "thread-id": threadId },
      ...tap,
    };
    return {
      message: JSON.stringify({ default: content.body, [PushPlatforms_apnsKey(env)]: JSON.stringify(payload) }),
      attributes: {
        "AWS.SNS.MOBILE.APNS.PUSH_TYPE": "alert",
        "AWS.SNS.MOBILE.APNS.PRIORITY": "10",
        "AWS.SNS.MOBILE.APNS.COLLAPSE_ID": content.collapseKey,
      },
    };
  }
  const fcm = {
    fcmV1Message: {
      message: {
        data: { ...tap, title: content.title, body: content.body, tag: content.collapseKey },
        android: { priority: "high" },
      },
    },
  };
  return { message: JSON.stringify({ default: content.body, GCM: JSON.stringify(fcm) }), attributes: {} };
}

async function deliver(
  di: IDI,
  event: IFriendNotificationEvent,
  knownPrefs?: { prefs: ISettingsNotifications | undefined }
): Promise<void> {
  const userDao = new UserDao(di);
  const prefs = knownPrefs != null ? knownPrefs.prefs : await userDao.getNotificationPrefs(event.recipientId);
  if (!FriendNotification_isEnabled(prefs, event.kind)) {
    return;
  }
  const nicknames = event.kind === "reactions" ? {} : await userDao.getNicknamesByIds([event.actorId]);
  const content = FriendNotification_content(event, nicknames);
  const rows = await new PushEndpointDao(di).listByUserId(event.recipientId);
  const env = Utils_getEnv();
  await PushSync_publish(di, rows, (platform) => FriendPush_buildMessage(platform, env, content));
}

async function reactionEvent(
  di: IDI,
  ownerId: string,
  record: IHistoryRecord
): Promise<IFriendNotificationEvent | undefined> {
  const summaries = await Feed_summarizeReactions(di, ownerId, [{ ownerId, recordId: record.id }], {
    consistentRead: true,
  });
  const summary = summaries[FeedWorkout_key(ownerId, record.id)];
  if (summary == null) {
    return undefined;
  }
  return {
    kind: "reactions",
    recipientId: ownerId,
    recordId: record.id,
    workoutLabel: FriendNotification_workoutLabel(record),
    summary,
  };
}

function bounded(di: IDI, label: string, work: () => Promise<void>): Promise<void | undefined> {
  return Bounded_run(di, `friend push: ${label}`, FriendPush_timeoutMs, work);
}

export async function FriendPush_send(di: IDI, event: IFriendNotificationEvent): Promise<void> {
  await bounded(di, `${event.kind} to ${event.recipientId}`, () => deliver(di, event));
}

export async function FriendPush_reactionAdded(
  di: IDI,
  args: { ownerId: string; reactorId: string; record: IHistoryRecord; isNew: boolean }
): Promise<void> {
  if (args.reactorId === args.ownerId) {
    return;
  }
  await bounded(di, `reactions to ${args.ownerId}`, async () => {
    const prefs = await new UserDao(di).getNotificationPrefs(args.ownerId);
    if (!args.isNew || !FriendNotification_isEnabled(prefs, "reactions")) {
      await PushSync_notifySocial(di, args.ownerId);
      return;
    }
    const event = await reactionEvent(di, args.ownerId, args.record);
    if (event != null) {
      await deliver(di, event, { prefs });
    }
  });
}

export async function FriendPush_reactionRemoved(di: IDI, args: { ownerId: string; reactorId: string }): Promise<void> {
  if (args.reactorId === args.ownerId) {
    return;
  }
  await bounded(di, `reaction removed for ${args.ownerId}`, () => PushSync_notifySocial(di, args.ownerId));
}

export async function FriendPush_followRequested(di: IDI, row: IFollowDao, isCreated: boolean): Promise<void> {
  if (!isCreated) {
    return;
  }
  await FriendPush_send(di, {
    kind: "followRequest",
    recipientId: row.followeeId,
    actorId: row.followerId,
    requestId: row.requestId,
  });
}

export async function FriendPush_followApproved(
  di: IDI,
  row: IFollowDao,
  isFollowBackRequested: boolean
): Promise<void> {
  await FriendPush_send(di, {
    kind: "followApproved",
    recipientId: row.followerId,
    actorId: row.followeeId,
    requestId: row.requestId,
    isFollowBackRequested,
  });
}

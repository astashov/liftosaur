import { IHistoryRecord, ISettingsNotifications } from "../types";
import { IReactionSummary, Reactions_applyMine, Reactions_reactorsLine } from "./reactions";
import { Follow_displayName } from "./follow";
import { NotificationPrefs_isOn } from "./notificationPrefs";

export const FriendNotification_reason = "friend";

export type IFriendNotificationEvent =
  | { kind: "followRequest"; recipientId: string; actorId: string; requestId: string }
  | {
      kind: "followApproved";
      recipientId: string;
      actorId: string;
      requestId: string;
      isFollowBackRequested: boolean;
    }
  | { kind: "reactions"; recipientId: string; recordId: number; workoutLabel: string; summary: IReactionSummary }
  | { kind: "programEdit"; recipientId: string; actorId: string; programId: string; programName: string };

export type IFriendNotificationTarget =
  | { screen: "friends" }
  | { screen: "workout"; historyRecordId: number }
  | { screen: "programEdits"; programId: string };

const prefByKind: Record<IFriendNotificationEvent["kind"], keyof ISettingsNotifications> = {
  followRequest: "friendRequests",
  followApproved: "friendRequests",
  reactions: "reactions",
  programEdit: "programEdits",
};

export interface IFriendNotificationContent {
  title: string;
  body: string;
  collapseKey: string;
  recipientId: string;
  target: IFriendNotificationTarget;
}

export function FriendNotification_isEnabled(
  notifications: ISettingsNotifications | undefined,
  kind: IFriendNotificationEvent["kind"]
): boolean {
  return NotificationPrefs_isOn({ notifications }, prefByKind[kind]);
}

export function FriendNotification_othersSummary(summary: IReactionSummary): IReactionSummary {
  const owner = summary.reactors[0];
  return summary.mine != null && owner != null ? Reactions_applyMine(summary, owner, undefined) : summary;
}

export function FriendNotification_workoutLabel(record: IHistoryRecord): string {
  return [record.programName, record.dayName].filter((part) => part.trim().length > 0).join(" · ");
}

export function FriendNotification_content(
  event: IFriendNotificationEvent,
  nicknames: Partial<Record<string, string>>
): IFriendNotificationContent {
  switch (event.kind) {
    case "followRequest": {
      const name = Follow_displayName(nicknames[event.actorId]);
      return {
        title: "Follow request",
        body: `${name} wants to follow your training.`,
        collapseKey: `follow-${event.requestId}`,
        recipientId: event.recipientId,
        target: { screen: "friends" },
      };
    }
    case "followApproved": {
      const name = Follow_displayName(nicknames[event.actorId]);
      return {
        title: "Request accepted",
        body: event.isFollowBackRequested
          ? `${name} accepted your request and wants to follow you back.`
          : `${name} accepted your request. You can now see their workouts.`,
        collapseKey: `approved-${event.requestId}`,
        recipientId: event.recipientId,
        target: { screen: "friends" },
      };
    }
    case "reactions": {
      const others = FriendNotification_othersSummary(event.summary);
      return {
        title: `${Reactions_reactorsLine(others)} reacted to your workout`,
        body: event.workoutLabel,
        collapseKey: `reactions-${event.recordId}`,
        recipientId: event.recipientId,
        target: { screen: "workout", historyRecordId: event.recordId },
      };
    }
    case "programEdit": {
      const name = Follow_displayName(nicknames[event.actorId]);
      return {
        title: `${name} edited your program`,
        body: event.programName,
        collapseKey: `program-${event.programId}`,
        recipientId: event.recipientId,
        target: { screen: "programEdits", programId: event.programId },
      };
    }
  }
}

export function FriendNotification_tapData(content: IFriendNotificationContent): Record<string, string> {
  const base = { reason: FriendNotification_reason, recipientId: content.recipientId, target: content.target.screen };
  switch (content.target.screen) {
    case "workout":
      return { ...base, historyRecordId: `${content.target.historyRecordId}` };
    case "programEdits":
      return { ...base, programId: content.target.programId };
    case "friends":
      return base;
  }
}

export function FriendNotification_parseTap(
  data: unknown,
  currentUserId: string | undefined
): IFriendNotificationTarget | undefined {
  if (data == null || typeof data !== "object" || currentUserId == null) {
    return undefined;
  }
  const fields: Partial<Record<string, unknown>> = { ...data };
  if (fields.reason !== FriendNotification_reason || fields.recipientId !== currentUserId) {
    return undefined;
  }
  if (fields.target === "friends") {
    return { screen: "friends" };
  }
  if (fields.target === "workout") {
    const historyRecordId = Number(fields.historyRecordId);
    return Number.isSafeInteger(historyRecordId) && historyRecordId > 0
      ? { screen: "workout", historyRecordId }
      : undefined;
  }
  if (fields.target === "programEdits") {
    return typeof fields.programId === "string" && fields.programId.length > 0
      ? { screen: "programEdits", programId: fields.programId }
      : undefined;
  }
  return undefined;
}

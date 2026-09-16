import { IState } from "../models/state";
import { AdminDebug_isDebugAccountId } from "../models/adminDebug";
import { IPushIdentity } from "./pushSyncAdapter";

export interface IPushPosted {
  userId: string;
  deviceId: string;
  token: string;
}

export interface IPushRegistrationState {
  token?: string;
  identity?: IPushIdentity;
  lastPosted?: IPushPosted;
  syncing: boolean;
  pendingOriginalId?: number;
  deliveries: string[];
}

export type IPushRegistrationEvent =
  | { type: "token"; token: string }
  | { type: "identity"; identity: IPushIdentity | undefined }
  | { type: "posted"; posted: IPushPosted }
  | { type: "push"; originalId: number; localOriginalId: number | undefined; deliveryId: string }
  | { type: "syncDone"; localOriginalId: number | undefined }
  | { type: "signout" };

export type IPushRegistrationEffect =
  | { type: "post"; registration: { deviceId: string; token: string } }
  | { type: "delete"; deviceId: string }
  | { type: "sync"; originalId: number }
  | { type: "complete"; deliveryIds: string[]; newData: boolean };

export function PushRegistration_initial(): IPushRegistrationState {
  return { syncing: false, deliveries: [] };
}

export function PushRegistration_next(
  state: IPushRegistrationState,
  event: IPushRegistrationEvent
): { state: IPushRegistrationState; effects: IPushRegistrationEffect[] } {
  switch (event.type) {
    case "token":
      return withPostIfNeeded({ ...state, token: event.token });
    case "identity":
      return withPostIfNeeded({ ...state, identity: event.identity });
    case "posted":
      return { state: { ...state, lastPosted: event.posted }, effects: [] };
    case "push":
      if (event.originalId === event.localOriginalId) {
        return { state, effects: [{ type: "complete", deliveryIds: [event.deliveryId], newData: false }] };
      }
      if (state.syncing) {
        return {
          state: { ...state, pendingOriginalId: event.originalId, deliveries: [...state.deliveries, event.deliveryId] },
          effects: [],
        };
      }
      return {
        state: { ...state, syncing: true, deliveries: [event.deliveryId] },
        effects: [{ type: "sync", originalId: event.originalId }],
      };
    case "syncDone": {
      const pending = state.pendingOriginalId;
      if (pending != null && pending !== event.localOriginalId) {
        return {
          state: { ...state, syncing: true, pendingOriginalId: undefined },
          effects: [{ type: "sync", originalId: pending }],
        };
      }
      return {
        state: { ...state, syncing: false, pendingOriginalId: undefined, deliveries: [] },
        effects:
          state.deliveries.length > 0 ? [{ type: "complete", deliveryIds: state.deliveries, newData: true }] : [],
      };
    }
    case "signout": {
      const deviceId = state.lastPosted?.deviceId ?? state.identity?.deviceId;
      const next = { ...state, identity: undefined, lastPosted: undefined };
      return { state: next, effects: deviceId ? [{ type: "delete", deviceId }] : [] };
    }
  }
}

function withPostIfNeeded(state: IPushRegistrationState): {
  state: IPushRegistrationState;
  effects: IPushRegistrationEffect[];
} {
  const { token, identity, lastPosted } = state;
  if (token == null || identity == null) {
    return { state, effects: [] };
  }
  const alreadyPosted =
    lastPosted != null &&
    lastPosted.userId === identity.userId &&
    lastPosted.deviceId === identity.deviceId &&
    lastPosted.token === token;
  if (alreadyPosted) {
    return { state, effects: [] };
  }
  return { state, effects: [{ type: "post", registration: { deviceId: identity.deviceId, token } }] };
}

export function PushRegistration_identityOf(state: IState): IPushIdentity | undefined {
  const userId = state.user?.id;
  if (userId == null || AdminDebug_isDebugAccountId(state.storage.tempUserId)) {
    return undefined;
  }
  return { userId, deviceId: state.deviceId };
}

export function PushRegistration_identityChanged(
  oldState: IState,
  newState: IState
): IPushIdentity | undefined | false {
  const before = PushRegistration_identityOf(oldState);
  const after = PushRegistration_identityOf(newState);
  if (before?.userId === after?.userId && before?.deviceId === after?.deviceId) {
    return false;
  }
  return after;
}

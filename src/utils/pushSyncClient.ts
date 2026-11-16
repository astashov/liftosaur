import type {
  LiftosaurNotificationEvent,
  LiftosaurPushEvent,
  LiftosaurPushTokenEvent,
} from "../specs/NativeLiftosaurPush";
import { Service } from "../api/service";
import { lg } from "./posthog";
import { PushMessage_parse } from "./pushMessage";
import {
  IPushRegistrationEffect,
  IPushRegistrationEvent,
  IPushRegistrationState,
  PushRegistration_initial,
  PushRegistration_next,
} from "./pushRegistration";
import { IPushIdentity, IPushSync } from "./pushSyncAdapter";

export interface INativeLiftosaurPush {
  start(): Promise<void>;
  flushPending(): Promise<void>;
  complete(deliveryId: string, newData: boolean): Promise<void>;
  onToken(handler: (event: LiftosaurPushTokenEvent) => void): { remove(): void };
  onPush(handler: (event: LiftosaurPushEvent) => void): { remove(): void };
  onNotificationTap?: (handler: (event: LiftosaurNotificationEvent) => void) => { remove(): void };
  onNotificationReceived?: (handler: (event: LiftosaurNotificationEvent) => void) => { remove(): void };
}

// AsyncQueue never settles an aborted sync, so a backgrounded sync would otherwise leave `syncing` set forever.
export const PushSyncClient_SYNC_DEADLINE_MS = 30_000;

export class PushSyncClient implements IPushSync {
  private state: IPushRegistrationState = PushRegistration_initial();
  private requests: Promise<void> = Promise.resolve();
  private getLocalOriginalId: () => number | undefined = () => undefined;
  private onSync: (done: () => void) => void = () => undefined;

  constructor(
    private readonly service: Service,
    private readonly native: INativeLiftosaurPush,
    private readonly platform: "ios" | "android"
  ) {}

  public start(args: {
    identity: IPushIdentity | undefined;
    getLocalOriginalId: () => number | undefined;
    onSync: (done: () => void) => void;
    onNotificationTap?: (data: unknown) => void;
    onNotificationReceived?: (data: unknown) => void;
  }): () => void {
    this.getLocalOriginalId = args.getLocalOriginalId;
    const onTap = args.onNotificationTap;
    const tapSubscription =
      onTap != null && typeof this.native.onNotificationTap === "function"
        ? this.native.onNotificationTap((event) => onTap(parseJson(event.data)))
        : undefined;
    const onReceived = args.onNotificationReceived;
    const receivedSubscription =
      onReceived != null && typeof this.native.onNotificationReceived === "function"
        ? this.native.onNotificationReceived((event) => onReceived(parseJson(event.data)))
        : undefined;
    this.onSync = args.onSync;
    const tokenSubscription = this.native.onToken((event) => {
      this.apply({ type: "token", token: event.token });
    });
    const pushSubscription = this.native.onPush((event) => {
      const message = PushMessage_parse(event);
      if (message == null) {
        this.native.complete(event.deliveryId, false).catch(() => undefined);
        return;
      }
      this.apply(
        message.type === "social"
          ? { type: "socialPush", deliveryId: event.deliveryId }
          : {
              type: "push",
              originalId: message.originalId,
              localOriginalId: this.getLocalOriginalId(),
              deliveryId: event.deliveryId,
            }
      );
    });
    this.apply({ type: "identity", identity: args.identity });
    this.native.start().catch((e) => lg("ls-push-start-fail", { error: errorMessage(e) }));
    this.native.flushPending().catch(() => undefined);
    return () => {
      tokenSubscription.remove();
      pushSubscription.remove();
      tapSubscription?.remove();
      receivedSubscription?.remove();
    };
  }

  public setIdentity(identity: IPushIdentity | undefined): void {
    this.apply({ type: "identity", identity });
  }

  public async unregisterBeforeSignout(): Promise<void> {
    this.apply({ type: "signout" });
    await this.requests;
  }

  private apply(event: IPushRegistrationEvent): void {
    const result = PushRegistration_next(this.state, event);
    this.state = result.state;
    for (const effect of result.effects) {
      this.run(effect);
    }
  }

  private run(effect: IPushRegistrationEffect): void {
    switch (effect.type) {
      case "post": {
        const identity = this.state.identity;
        if (identity == null) {
          return;
        }
        const posted = { userId: identity.userId, deviceId: identity.deviceId, token: effect.registration.token };
        this.enqueue(async () => {
          await this.service.postPushToken({ ...effect.registration, platform: this.platform });
          this.apply({ type: "posted", posted });
        }, "ls-push-register-fail");
        return;
      }
      case "delete":
        this.enqueue(() => this.service.deletePushToken(effect.deviceId), "ls-push-unregister-fail");
        return;
      case "sync":
        this.onSync(this.syncFinisher());
        return;
      case "complete":
        for (const deliveryId of effect.deliveryIds) {
          this.native.complete(deliveryId, effect.newData).catch(() => undefined);
        }
        return;
    }
  }

  private syncFinisher(): () => void {
    let finished = false;
    const finish = (): void => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(deadline);
      this.apply({ type: "syncDone", localOriginalId: this.getLocalOriginalId() });
    };
    const deadline = setTimeout(finish, PushSyncClient_SYNC_DEADLINE_MS);
    return finish;
  }

  private enqueue(request: () => Promise<void>, failureEvent: string): void {
    this.requests = this.requests.then(request).catch((e) => lg(failureEvent, { error: errorMessage(e) }));
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    return undefined;
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

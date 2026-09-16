import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Service } from "../src/api/service";
import { INativeLiftosaurPush, PushSyncClient, PushSyncClient_SYNC_DEADLINE_MS } from "../src/utils/pushSyncClient";
import { LiftosaurPushEvent, LiftosaurPushTokenEvent } from "../src/specs/NativeLiftosaurPush";

class FakeNative implements INativeLiftosaurPush {
  public started = 0;
  public flushed = 0;
  public completed: string[] = [];
  private tokenHandlers: ((event: LiftosaurPushTokenEvent) => void)[] = [];
  private pushHandlers: ((event: LiftosaurPushEvent) => void)[] = [];

  public async start(): Promise<void> {
    this.started += 1;
  }
  public async flushPending(): Promise<void> {
    this.flushed += 1;
  }
  public async complete(deliveryId: string, newData: boolean): Promise<void> {
    this.completed.push(`${deliveryId}:${newData ? "new" : "none"}`);
  }
  public onToken(handler: (event: LiftosaurPushTokenEvent) => void): { remove(): void } {
    this.tokenHandlers.push(handler);
    return {
      remove: () => {
        this.tokenHandlers = this.tokenHandlers.filter((h) => h !== handler);
      },
    };
  }
  public onPush(handler: (event: LiftosaurPushEvent) => void): { remove(): void } {
    this.pushHandlers.push(handler);
    return {
      remove: () => {
        this.pushHandlers = this.pushHandlers.filter((h) => h !== handler);
      },
    };
  }
  public emitToken(token: string): void {
    this.tokenHandlers.forEach((h) => h({ token }));
  }
  public emitPush(event: LiftosaurPushEvent): void {
    this.pushHandlers.forEach((h) => h(event));
  }
}

class FakeService {
  public calls: string[] = [];
  public failNext: number | undefined;
  private gates: (() => void)[] = [];
  public holdRequests = false;

  public async postPushToken(args: { deviceId: string; platform: string; token: string }): Promise<void> {
    await this.gate();
    this.calls.push(`post:${args.deviceId}:${args.platform}:${args.token}`);
    if (this.failNext != null) {
      const status = this.failNext;
      this.failNext = undefined;
      throw new Error(`postPushToken failed: ${status}`);
    }
  }
  public async deletePushToken(deviceId: string): Promise<void> {
    await this.gate();
    this.calls.push(`delete:${deviceId}`);
  }
  public release(): void {
    const gates = this.gates;
    this.gates = [];
    gates.forEach((g) => g());
  }
  private gate(): Promise<void> {
    if (!this.holdRequests) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.gates.push(resolve));
  }
}

function build(): {
  native: FakeNative;
  service: FakeService;
  client: PushSyncClient;
  syncs: number;
  done: (() => void)[];
  setLocal: (originalId: number) => void;
} {
  const native = new FakeNative();
  const service = new FakeService();
  const client = new PushSyncClient(service as unknown as Service, native, "ios");
  const done: (() => void)[] = [];
  let local: number | undefined = 5;
  const result = {
    native,
    service,
    client,
    syncs: 0,
    done,
    setLocal: (originalId: number) => {
      local = originalId;
    },
  };
  client.start({
    identity: undefined,
    getLocalOriginalId: () => local,
    onSync: (finish) => {
      result.syncs += 1;
      done.push(finish);
    },
  });
  return result;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe("PushSyncClient", () => {
  it("starts native, flushes pending, and posts once token and identity are known", async () => {
    const { native, service, client } = build();
    expect(native.started).to.equal(1);
    expect(native.flushed).to.equal(1);
    native.emitToken("tok");
    await settle();
    expect(service.calls).to.eql([]);
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    await settle();
    expect(service.calls).to.eql(["post:ios_a:ios:tok"]);
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    await settle();
    expect(service.calls).to.eql(["post:ios_a:ios:tok"]);
  });

  it("posts again when the same identity is re-applied after a failed post, which is what a foreground wake does", async () => {
    const { native, service, client } = build();
    service.failNext = 500;
    native.emitToken("tok");
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    await settle();
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    await settle();
    expect(service.calls).to.eql(["post:ios_a:ios:tok", "post:ios_a:ios:tok"]);
  });

  it("runs the logout delete after an in-flight post, never before", async () => {
    const { native, service, client } = build();
    service.holdRequests = true;
    native.emitToken("tok");
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    const signout = client.unregisterBeforeSignout();
    let finished = false;
    signout.then(() => (finished = true));
    await settle();
    expect(service.calls).to.eql([]);
    expect(finished).to.equal(false);
    service.release();
    await settle();
    service.release();
    await settle();
    expect(service.calls).to.eql(["post:ios_a:ios:tok", "delete:ios_a"]);
    expect(finished).to.equal(true);
  });

  it("posts again after login when a post finished only after the logout delete", async () => {
    const { native, service, client } = build();
    service.holdRequests = true;
    native.emitToken("tok");
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    const signout = client.unregisterBeforeSignout();
    for (let i = 0; i < 10 && service.calls.length < 2; i++) {
      service.release();
      await settle();
    }
    await signout;
    expect(service.calls).to.eql(["post:ios_a:ios:tok", "delete:ios_a"]);
    service.holdRequests = false;
    client.setIdentity({ userId: "u1", deviceId: "ios_a" });
    await settle();
    expect(service.calls).to.eql(["post:ios_a:ios:tok", "delete:ios_a", "post:ios_a:ios:tok"]);
  });

  it("syncs on a new originalId and completes the delivery with new data only after the sync finished", () => {
    const state = build();
    state.native.emitPush({ reason: "storage", originalId: "6", deliveryId: "d1" });
    expect(state.syncs).to.equal(1);
    expect(state.native.completed).to.eql([]);
    state.setLocal(6);
    state.done[0]();
    expect(state.native.completed).to.eql(["d1:new"]);
  });

  it("completes a dropped or malformed delivery right away with no new data", () => {
    const state = build();
    state.native.emitPush({ reason: "storage", originalId: "5", deliveryId: "same" });
    state.native.emitPush({ reason: "other", originalId: "9", deliveryId: "unknown" });
    expect(state.syncs).to.equal(0);
    expect(state.native.completed).to.eql(["same:none", "unknown:none"]);
  });

  it("coalesces a burst into one follow-up sync and completes every delivery at the end", () => {
    const state = build();
    state.native.emitPush({ reason: "storage", originalId: "6", deliveryId: "d1" });
    state.native.emitPush({ reason: "storage", originalId: "7", deliveryId: "d2" });
    state.native.emitPush({ reason: "storage", originalId: "8", deliveryId: "d3" });
    expect(state.syncs).to.equal(1);
    state.setLocal(7);
    state.done[0]();
    expect(state.syncs).to.equal(2);
    expect(state.native.completed).to.eql([]);
    state.setLocal(8);
    state.done[1]();
    expect(state.native.completed).to.eql(["d1:new", "d2:new", "d3:new"]);
  });

  it("gives up on a sync that never reports back after the deadline, so the next push syncs again", () => {
    const clock = sinon.useFakeTimers();
    try {
      const state = build();
      state.native.emitPush({ reason: "storage", originalId: "6", deliveryId: "d1" });
      expect(state.syncs).to.equal(1);
      clock.tick(PushSyncClient_SYNC_DEADLINE_MS + 1);
      expect(state.native.completed).to.eql(["d1:new"]);
      state.native.emitPush({ reason: "storage", originalId: "7", deliveryId: "d2" });
      expect(state.syncs).to.equal(2);
      state.done[0]();
      expect(state.syncs).to.equal(2);
    } finally {
      clock.restore();
    }
  });
});

import "mocha";
import { expect } from "chai";
import { SyncTestUtils_initTheApp, SyncTestUtils_logStat } from "./utils/syncTestUtils";
import { PushSyncClient } from "../src/utils/pushSyncClient";
import { LiftosaurPushEvent, LiftosaurPushTokenEvent } from "../src/specs/NativeLiftosaurPush";
import { PushEndpointDao } from "../lambda/dao/pushEndpointDao";
import { Thunk_logOut, Thunk_sync2 } from "../src/ducks/thunks";
import { MockSnsUtil } from "./utils/mockSnsUtil";
import { PushPlatforms_arns } from "../lambda/utils/pushPlatforms";

class FakeNative {
  public completed: string[] = [];
  private readonly tokenHandlers: ((event: LiftosaurPushTokenEvent) => void)[] = [];
  private readonly pushHandlers: ((event: LiftosaurPushEvent) => void)[] = [];
  public async start(): Promise<void> {}
  public async flushPending(): Promise<void> {}
  public async complete(deliveryId: string, newData: boolean): Promise<void> {
    this.completed.push(`${deliveryId}:${newData ? "new" : "none"}`);
  }
  public onToken(handler: (event: LiftosaurPushTokenEvent) => void): { remove(): void } {
    this.tokenHandlers.push(handler);
    return { remove: () => undefined };
  }
  public onPush(handler: (event: LiftosaurPushEvent) => void): { remove(): void } {
    this.pushHandlers.push(handler);
    return { remove: () => undefined };
  }
  public emitToken(token: string): void {
    this.tokenHandlers.forEach((h) => h({ token }));
  }
  public emitPush(originalId: number, deliveryId: string): void {
    this.pushHandlers.forEach((h) => h({ reason: "storage", originalId: `${originalId}`, deliveryId }));
  }
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !check(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(check()).to.equal(true);
}

describe("push client end to end", () => {
  beforeEach(() => {
    // @ts-ignore
    global.__API_HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__ENV__ = "prod";
    // @ts-ignore
    global.__FULL_COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.__COMMIT_HASH__ = "abc123";
  });

  it("registers the device, syncs on a push it does not hold, and unregisters on logout", async () => {
    const { mockReducer, env, di, mockFetch } = await SyncTestUtils_initTheApp("ios_aaa");
    const userId = mockReducer.state.storage.tempUserId;
    const native = new FakeNative();
    const client = new PushSyncClient(env.service, native, "ios");
    env.push = client;
    let syncs = 0;
    client.start({
      identity: { userId, deviceId: "ios_aaa" },
      getLocalOriginalId: () => mockReducer.state.storage.originalId,
      onSync: (done) => {
        syncs += 1;
        mockReducer.run([Thunk_sync2({ force: true, cb: done })]);
      },
    });

    native.emitToken("tok-ios");
    const dao = new PushEndpointDao(di);
    await waitFor(() => di.dynamo.data.lftPushEndpoints != null);
    const row = await dao.get(userId, "ios_aaa");
    expect(row?.endpointArn).to.equal(MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok-ios"));

    const before = mockReducer.state.storage.originalId!;
    native.emitPush(before, "same");
    expect(syncs).to.equal(0);
    expect(native.completed).to.eql(["same:none"]);

    const otherDevice = await SyncTestUtils_initTheApp("and_bbb");
    expect(otherDevice.mockReducer.state.storage.tempUserId).to.not.equal(userId);
    await SyncTestUtils_logStat(mockReducer, 100);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    const serverOriginalId = mockReducer.state.storage.originalId!;
    mockReducer.state.storage.originalId = before;
    native.emitPush(serverOriginalId, "d1");
    expect(syncs).to.equal(1);
    await waitFor(() => native.completed.length === 2);
    expect(native.completed[1]).to.equal("d1:new");
    expect(mockReducer.state.storage.originalId).to.equal(serverOriginalId);

    await mockReducer.run([Thunk_logOut()]);
    expect(await dao.get(userId, "ios_aaa")).to.equal(undefined);
    expect(mockFetch.logs.some((l) => l.request.url.endsWith("/api/pushtoken/ios_aaa"))).to.equal(true);
  });
});

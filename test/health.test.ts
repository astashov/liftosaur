import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Platform } from "react-native";
import { lb } from "lens-shmens";
import { SyncTestUtils_initTheApp, SyncTestUtils_mockDispatch } from "./utils/syncTestUtils";
import {
  Thunk_requestHealthPermissions,
  Thunk_saveMeasurementsToHealth,
  Thunk_saveWorkoutToHealth,
  Thunk_syncHealthKit,
} from "../src/ducks/thunks";
import { HealthIosAnchors_decode, HealthIosAnchors_encode } from "../src/utils/healthIosAnchors";
import { HEALTH_ANDROID_PACKAGE_NAME, HealthAndroidFilter_isSelfOrigin } from "../src/utils/healthAndroidFilter";
import { IEnv, IState } from "../src/models/state";
import { IAction } from "../src/ducks/reducer";
import { MockReducer } from "./utils/mockReducer";
import { MockFetch } from "./utils/mockFetch";
import * as encoder from "../src/utils/encoder";
import { NodeEncoder_encode } from "../lambda/utils/nodeEncoder";

function postedEventNames(mockFetch: MockFetch): string[] {
  return mockFetch.logs
    .filter((l) => l.request.url.includes("/api/event"))
    .map((l) => (l.request.body as { name?: string }).name ?? "");
}

describe("Health", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    let ts = 0;
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });
    sandbox.stub(encoder, "Encoder_encode").callsFake((...args: [string]) => NodeEncoder_encode(...args));
  });

  afterEach(() => {
    sandbox.restore();
  });

  function setIosPlatform(): void {
    sandbox.stub(Platform, "OS").value("ios");
    sandbox.stub(Platform, "Version").value("17.0");
  }

  function setAndroidPlatform(): void {
    sandbox.stub(Platform, "OS").value("android");
    sandbox.stub(Platform, "Version").value(34);
  }

  function enableAppleHealth(mockReducer: MockReducer<IState, IAction, IEnv>): Promise<void> {
    return mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        ds({
          type: "UpdateState",
          lensRecording: [
            lb<IState>().p("storage").p("settings").p("appleHealthSyncMeasurements").record(true),
            lb<IState>().p("storage").p("settings").p("appleHealthSyncWorkout").record(true),
          ],
          desc: "enable apple health",
        })
      ),
    ]);
  }

  function enableGoogleHealth(mockReducer: MockReducer<IState, IAction, IEnv>): Promise<void> {
    return mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        ds({
          type: "UpdateState",
          lensRecording: [
            lb<IState>().p("storage").p("settings").p("googleHealthSyncMeasurements").record(true),
            lb<IState>().p("storage").p("settings").p("googleHealthSyncWorkout").record(true),
          ],
          desc: "enable google health",
        })
      ),
    ]);
  }

  it("ios syncMeasurements: writes returned anchor and bodyweight stat to storage", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_h1");
    await enableAppleHealth(mockReducer);
    healthAdapter.defaultSyncResult = {
      added: [
        {
          timestamp: 1700000000000,
          type: "bodyweight",
          uuid: "uuid-1",
          value: { value: 80, unit: "kg" },
        },
      ],
      deleted: [],
      anchor: "new-ios-anchor",
    };

    await mockReducer.run([Thunk_syncHealthKit()]);

    expect(healthAdapter.syncCalls).to.have.lengthOf(1);
    const settings = mockReducer.state.storage.settings;
    expect(settings.appleHealthAnchor).to.equal("new-ios-anchor");
    const weights = mockReducer.state.storage.stats.weight.weight ?? [];
    expect(weights).to.have.lengthOf(1);
    expect(weights[0].appleUuid).to.equal("uuid-1");
  });

  it("ios syncMeasurements: passes through existing anchor", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_h2");
    await enableAppleHealth(mockReducer);
    await mockReducer.run([
      SyncTestUtils_mockDispatch((ds) =>
        ds({
          type: "UpdateState",
          lensRecording: [lb<IState>().p("storage").p("settings").p("appleHealthAnchor").record("legacy-anchor")],
          desc: "set legacy anchor",
        })
      ),
    ]);

    await mockReducer.run([Thunk_syncHealthKit()]);

    expect(healthAdapter.syncCalls[0].anchor).to.equal("legacy-anchor");
  });

  it("android syncMeasurements: dispatches as android platform and stores googleHealthAnchor", async () => {
    setAndroidPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_and_h1");
    await enableGoogleHealth(mockReducer);
    healthAdapter.defaultSyncResult = {
      added: [
        {
          timestamp: 1700000001000,
          type: "bodyfat",
          uuid: "uuid-bf-1",
          value: { value: 18.5, unit: "%" },
        },
      ],
      deleted: [],
      anchor: "new-android-token",
    };

    await mockReducer.run([Thunk_syncHealthKit()]);

    expect(healthAdapter.syncCalls).to.have.lengthOf(1);
    expect(mockReducer.state.storage.settings.googleHealthAnchor).to.equal("new-android-token");
    const fat = mockReducer.state.storage.stats.percentage.bodyfat ?? [];
    expect(fat).to.have.lengthOf(1);
    expect(fat[0].value.value).to.equal(18.5);
  });

  it("syncHealthKit: skips when toggles off", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_h3");

    await mockReducer.run([Thunk_syncHealthKit()]);

    expect(healthAdapter.syncCalls).to.have.lengthOf(0);
  });

  it("saveWorkoutToHealth: forwards workout payload to adapter", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_h4");
    await enableAppleHealth(mockReducer);

    await mockReducer.run([
      Thunk_saveWorkoutToHealth({
        startMs: 1700000000000,
        endMs: 1700000003600,
        calories: 250,
        intervals: [
          [1700000000000, 1700000001000],
          [1700000002000, 1700000003600],
        ],
      }),
    ]);

    expect(healthAdapter.saveWorkoutCalls).to.have.lengthOf(1);
    expect(healthAdapter.saveWorkoutCalls[0].calories).to.equal(250);
    expect(healthAdapter.saveWorkoutCalls[0].intervals).to.have.lengthOf(2);
  });

  it("saveWorkoutToHealth: swallows adapter errors", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_h5");
    await enableAppleHealth(mockReducer);
    sinon.stub(healthAdapter, "saveWorkout").rejects(new Error("denied"));

    await mockReducer.run([Thunk_saveWorkoutToHealth({ startMs: 1, endMs: 2, calories: 0, intervals: [] })]);
  });

  it("saveMeasurementsToHealth: forwards payload to adapter", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_sm1");
    await enableAppleHealth(mockReducer);

    await mockReducer.run([
      Thunk_saveMeasurementsToHealth({
        bodyweight: { value: 80, unit: "kg" },
        bodyfat: { value: 18, unit: "%" },
        timestamp: 1700000000000,
      }),
    ]);

    expect(healthAdapter.saveMeasurementsCalls).to.have.lengthOf(1);
    expect(healthAdapter.saveMeasurementsCalls[0].bodyweight?.value).to.equal(80);
    expect(healthAdapter.saveMeasurementsCalls[0].bodyfat?.value).to.equal(18);
    expect(healthAdapter.saveMeasurementsCalls[0].timestamp).to.equal(1700000000000);
  });

  it("saveMeasurementsToHealth: no-op when nothing to save", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_sm2");
    await enableAppleHealth(mockReducer);

    await mockReducer.run([Thunk_saveMeasurementsToHealth({ timestamp: 1 })]);

    expect(healthAdapter.saveMeasurementsCalls).to.have.lengthOf(0);
  });

  it("syncHealthKit: returns empty result when adapter reports no permissions", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_perm_denied");
    await enableAppleHealth(mockReducer);
    healthAdapter.defaultSyncResult = { added: [], deleted: [], anchor: "" };

    await mockReducer.run([Thunk_syncHealthKit()]);

    expect(healthAdapter.syncCalls).to.have.lengthOf(1);
    const weights = mockReducer.state.storage.stats.weight.weight ?? [];
    expect(weights).to.have.lengthOf(0);
  });

  it("syncHealthKit: catches adapter failures, no unhandled rejection", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_fail");
    await enableAppleHealth(mockReducer);
    healthAdapter.syncResultsQueue.push(new Error("boom"));

    await mockReducer.run([Thunk_syncHealthKit()]);

    expect(healthAdapter.syncCalls).to.have.lengthOf(1);
  });

  it("HealthIosAnchors: round-trips three anchors", () => {
    const encoded = HealthIosAnchors_encode({ bodyMass: "a", bodyFat: "b", waist: "c" });
    expect(HealthIosAnchors_decode(encoded)).to.deep.equal({ bodyMass: "a", bodyFat: "b", waist: "c" });
  });

  it("HealthIosAnchors: legacy TWA base64 anchor decodes to empty (full re-import)", () => {
    const legacy = "YnBsaXN0MDDUAQIDBAUGBwhYJHZlcnNpb24=";
    expect(HealthIosAnchors_decode(legacy)).to.deep.equal({});
  });

  it("HealthIosAnchors: missing fields decode to undefined", () => {
    const partial = JSON.stringify({ bodyMass: "x" });
    expect(HealthIosAnchors_decode(partial)).to.deep.equal({
      bodyMass: "x",
      bodyFat: undefined,
      waist: undefined,
    });
  });

  it("HealthIosAnchors: undefined input returns empty", () => {
    expect(HealthIosAnchors_decode(undefined)).to.deep.equal({});
  });

  it("HealthAndroidFilter: matches self-origin records", () => {
    expect(HealthAndroidFilter_isSelfOrigin({ metadata: { dataOrigin: HEALTH_ANDROID_PACKAGE_NAME } })).to.equal(true);
  });

  it("HealthAndroidFilter: does not match foreign records", () => {
    expect(HealthAndroidFilter_isSelfOrigin({ metadata: { dataOrigin: "com.example.scale" } })).to.equal(false);
  });

  it("HealthAndroidFilter: missing metadata is foreign", () => {
    expect(HealthAndroidFilter_isSelfOrigin({})).to.equal(false);
    expect(HealthAndroidFilter_isSelfOrigin(null)).to.equal(false);
    expect(HealthAndroidFilter_isSelfOrigin(undefined)).to.equal(false);
  });

  it("saveWorkoutToHealth: emits submit/storing/success postevents on success", async () => {
    setIosPlatform();
    const { mockReducer, mockFetch } = await SyncTestUtils_initTheApp("rn_ios_evt_ok");
    await enableAppleHealth(mockReducer);

    await mockReducer.run([
      Thunk_saveWorkoutToHealth({
        startMs: 1700000000000,
        endMs: 1700000003600,
        calories: 250,
        intervals: [[1700000000000, 1700000001000]],
      }),
    ]);

    const events = postedEventNames(mockFetch);
    expect(events).to.include("submit-workout-apple-health");
    expect(events).to.include("storing-workout-to-apple-health");
    expect(events).to.include("success-workout-apple-health");
    expect(events).to.not.include("fail-workout-apple-health");
  });

  it("saveWorkoutToHealth: emits fail postevent on adapter rejection (android)", async () => {
    setAndroidPlatform();
    const { mockReducer, mockFetch, healthAdapter } = await SyncTestUtils_initTheApp("rn_and_evt_fail");
    await enableGoogleHealth(mockReducer);
    sinon.stub(healthAdapter, "saveWorkout").rejects(new Error("permission denied"));

    await mockReducer.run([
      Thunk_saveWorkoutToHealth({
        startMs: 1,
        endMs: 2,
        calories: 0,
        intervals: [],
      }),
    ]);

    const events = postedEventNames(mockFetch);
    expect(events).to.include("submit-workout-google-health");
    expect(events).to.include("fail-workout-google-health");
    expect(events).to.not.include("success-workout-google-health");
  });

  it("Thunk_requestHealthPermissions: invokes adapter requestPermissions", async () => {
    setAndroidPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_and_perm_req");

    await mockReducer.run([Thunk_requestHealthPermissions()]);

    expect(healthAdapter.requestPermissionsCalls).to.equal(1);
  });

  it("Thunk_requestHealthPermissions: swallows adapter rejection", async () => {
    setAndroidPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_and_perm_req_fail");
    sinon.stub(healthAdapter, "requestPermissions").rejects(new Error("user-cancel"));

    await mockReducer.run([Thunk_requestHealthPermissions()]);
    // no assertion needed — completing without unhandled rejection is the test
  });

  it("syncMeasurements: dedupes against existing stats by timestamp", async () => {
    setIosPlatform();
    const { mockReducer, healthAdapter } = await SyncTestUtils_initTheApp("rn_ios_h6");
    await enableAppleHealth(mockReducer);
    healthAdapter.defaultSyncResult = {
      added: [
        { timestamp: 4242, type: "bodyweight", uuid: "first", value: { value: 70, unit: "kg" } },
        { timestamp: 4242, type: "bodyweight", uuid: "duplicate", value: { value: 71, unit: "kg" } },
      ],
      deleted: [],
      anchor: "anchor-x",
    };

    await mockReducer.run([Thunk_syncHealthKit()]);

    const weights = mockReducer.state.storage.stats.weight.weight ?? [];
    expect(weights).to.have.lengthOf(1);
    expect(weights[0].timestamp).to.equal(4242);
  });
});

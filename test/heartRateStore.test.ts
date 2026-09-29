import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { HeartRateStore } from "../src/utils/heartRateStore";
import { MockBridgeLog, MockWorkoutMirroring } from "./utils/mockBridges";

describe("HeartRateStore", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ now: 100000 });
  });

  afterEach(() => {
    clock.restore();
  });

  it("shows a reading and hides it 15 s after the measurement, notifying both times", () => {
    const mirroring = new MockWorkoutMirroring(new MockBridgeLog());
    const store = new HeartRateStore(mirroring);
    let notified = 0;
    store.subscribe(() => notified++);

    mirroring.emitMirroringEvent({ type: "heartRate", bpm: 120, measuredAt: 99000, source: "phone" });
    expect(store.getBpm()).to.equal(120);
    expect(notified).to.equal(1);

    clock.tick(13999);
    expect(store.getBpm()).to.equal(120);
    clock.tick(1);
    expect(store.getBpm()).to.equal(undefined);
    expect(notified).to.equal(2);
  });

  it("returns the same snapshot until something changes", () => {
    const mirroring = new MockWorkoutMirroring(new MockBridgeLog());
    const store = new HeartRateStore(mirroring);
    mirroring.emitMirroringEvent({ type: "heartRate", bpm: 120, measuredAt: 99000, source: "watch" });
    clock.tick(14999);
    expect(store.getBpm()).to.equal(store.getBpm());
  });

  it("hides the reading when the source goes away", () => {
    const mirroring = new MockWorkoutMirroring(new MockBridgeLog());
    const store = new HeartRateStore(mirroring);
    mirroring.emitMirroringEvent({ type: "heartRate", bpm: 120, measuredAt: 99000, source: "watch" });
    mirroring.emitMirroringEvent({ type: "source", source: undefined });
    expect(store.getBpm()).to.equal(undefined);
  });

  it("does not show a flushed reading that is already stale", () => {
    const mirroring = new MockWorkoutMirroring(new MockBridgeLog());
    const store = new HeartRateStore(mirroring);
    mirroring.emitMirroringEvent({ type: "heartRate", bpm: 120, measuredAt: 50000, source: "watch" });
    expect(store.getBpm()).to.equal(undefined);
  });
});

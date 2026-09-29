import "mocha";
import { expect } from "chai";
import {
  HeartRateReading_apply,
  HeartRateReading_expiresAt,
  HeartRateReading_parseEvent,
  HeartRateReading_visibleBpm,
  IHeartRateReading,
} from "../src/models/heartRateReading";

const watchReading: IHeartRateReading = { bpm: 120, measuredAt: 1000, source: "watch" };

describe("HeartRateReading_parseEvent", () => {
  it("parses a heart rate event and rounds bpm", () => {
    expect(HeartRateReading_parseEvent({ type: "heartRate", heartRate: 121.6, measuredAt: 5, source: "phone" })).to.eql({
      type: "heartRate",
      bpm: 122,
      measuredAt: 5,
      source: "phone",
    });
  });

  it("drops a heart rate event with a missing field, unknown source or non-positive bpm", () => {
    expect(HeartRateReading_parseEvent({ type: "heartRate", heartRate: 120, source: "watch" })).to.equal(undefined);
    expect(HeartRateReading_parseEvent({ type: "heartRate", heartRate: 120, measuredAt: 1, source: "ring" })).to.equal(
      undefined
    );
    expect(HeartRateReading_parseEvent({ type: "heartRate", heartRate: 0, measuredAt: 1, source: "watch" })).to.equal(
      undefined
    );
  });

  it("parses a source event, mapping none to undefined", () => {
    expect(HeartRateReading_parseEvent({ type: "source", source: "watch" })).to.eql({ type: "source", source: "watch" });
    expect(HeartRateReading_parseEvent({ type: "source", source: "none" })).to.eql({ type: "source", source: undefined });
  });

  it("drops unknown event types", () => {
    expect(HeartRateReading_parseEvent({ type: "stateChanged" })).to.equal(undefined);
  });
});

describe("HeartRateReading_apply", () => {
  it("takes a newer reading", () => {
    const next = HeartRateReading_apply(watchReading, { type: "heartRate", bpm: 130, measuredAt: 2000, source: "watch" });
    expect(next).to.eql({ bpm: 130, measuredAt: 2000, source: "watch" });
  });

  it("keeps the current reading when a flushed older one arrives from the same source", () => {
    const next = HeartRateReading_apply(watchReading, { type: "heartRate", bpm: 90, measuredAt: 500, source: "watch" });
    expect(next).to.equal(watchReading);
  });

  it("takes a reading from a new source even if its clock is behind", () => {
    const next = HeartRateReading_apply(watchReading, { type: "heartRate", bpm: 95, measuredAt: 900, source: "phone" });
    expect(next).to.eql({ bpm: 95, measuredAt: 900, source: "phone" });
  });

  it("clears the reading when the source changes or goes away", () => {
    expect(HeartRateReading_apply(watchReading, { type: "source", source: "phone" })).to.equal(undefined);
    expect(HeartRateReading_apply(watchReading, { type: "source", source: undefined })).to.equal(undefined);
  });

  it("keeps the reading when the same source is announced again", () => {
    expect(HeartRateReading_apply(watchReading, { type: "source", source: "watch" })).to.equal(watchReading);
  });
});

describe("HeartRateReading_visibleBpm", () => {
  it("shows the bpm until 15 s after the measurement", () => {
    expect(HeartRateReading_visibleBpm(watchReading, 15999)).to.equal(120);
    expect(HeartRateReading_visibleBpm(watchReading, 16000)).to.equal(undefined);
    expect(HeartRateReading_expiresAt(watchReading)).to.equal(16000);
  });

  it("shows nothing without a reading", () => {
    expect(HeartRateReading_visibleBpm(undefined, 0)).to.equal(undefined);
    expect(HeartRateReading_expiresAt(undefined)).to.equal(undefined);
  });
});

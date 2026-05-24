import "mocha";
import { expect } from "chai";
import { PerfTrackerStore_create, PerfTrackerStore_generateSessionId } from "../src/utils/perfTrackerStore";
import type { IPerfEvent } from "../src/utils/perfTracker";

function makeNavEvent(to: string, tap_ts: number): IPerfEvent {
  return { type: "nav", session: "test", to, tap_ts };
}

describe("PerfTrackerStore", () => {
  it("buffers events and reports 'buffered' until the batch threshold is hit", () => {
    const store = PerfTrackerStore_create({ ringBufferSize: 100, batchMaxSize: 3 });
    expect(store.recordEvent(makeNavEvent("a", 1))).to.equal("buffered");
    expect(store.recordEvent(makeNavEvent("b", 2))).to.equal("buffered");
    expect(store.recordEvent(makeNavEvent("c", 3))).to.equal("flush");
    expect(store.pendingCount()).to.equal(3);
  });

  it("drainPending returns all pending and clears them", () => {
    const store = PerfTrackerStore_create({ ringBufferSize: 100, batchMaxSize: 50 });
    store.recordEvent(makeNavEvent("a", 1));
    store.recordEvent(makeNavEvent("b", 2));
    const drained = store.drainPending();
    expect(drained).to.have.lengthOf(2);
    expect(store.pendingCount()).to.equal(0);
    expect(store.drainPending()).to.have.lengthOf(0);
  });

  it("ring buffer evicts oldest events once full but keeps newest available via getRecent", () => {
    const store = PerfTrackerStore_create({ ringBufferSize: 3, batchMaxSize: 999 });
    store.recordEvent(makeNavEvent("a", 1));
    store.recordEvent(makeNavEvent("b", 2));
    store.recordEvent(makeNavEvent("c", 3));
    store.recordEvent(makeNavEvent("d", 4));
    store.recordEvent(makeNavEvent("e", 5));
    const recent = store.getRecent(3);
    expect(recent).to.have.lengthOf(3);
    expect(recent.map((e) => (e.type === "nav" ? e.to : ""))).to.deep.equal(["c", "d", "e"]);
  });

  it("getRecent returns all events when n exceeds buffer length", () => {
    const store = PerfTrackerStore_create({ ringBufferSize: 100, batchMaxSize: 999 });
    store.recordEvent(makeNavEvent("a", 1));
    store.recordEvent(makeNavEvent("b", 2));
    expect(store.getRecent(100)).to.have.lengthOf(2);
  });
});

describe("PerfTrackerStore_generateSessionId", () => {
  it("produces an ISO-style prefix and 4-char hex suffix", () => {
    const id = PerfTrackerStore_generateSessionId(
      () => Date.UTC(2026, 4, 24, 10, 30, 45),
      () => 0.5
    );
    expect(id).to.equal("2026-05-24T10-30-45-7fff");
  });

  it("produces unique ids when called repeatedly with different rand seeds", () => {
    const fixedNow = (): number => Date.UTC(2026, 4, 24, 10, 30, 45);
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(PerfTrackerStore_generateSessionId(fixedNow, () => i / 10));
    }
    expect(ids.size).to.be.greaterThan(5);
  });
});

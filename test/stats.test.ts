import "mocha";
import { expect } from "chai";
import { Stats_insertByTimestamp } from "../src/models/stats";

describe("Stats_insertByTimestamp", () => {
  const existing = [
    { timestamp: 300, value: "c" },
    { timestamp: 200, value: "b" },
    { timestamp: 100, value: "a" },
  ];

  it("puts a newer value first", () => {
    const result = Stats_insertByTimestamp(existing, { timestamp: 400, value: "d" });
    expect(result.map((v) => v.timestamp)).to.deep.equal([400, 300, 200, 100]);
  });

  it("puts a backdated value in timestamp order", () => {
    const result = Stats_insertByTimestamp(existing, { timestamp: 150, value: "x" });
    expect(result.map((v) => v.timestamp)).to.deep.equal([300, 200, 150, 100]);
  });

  it("puts the oldest value last", () => {
    const result = Stats_insertByTimestamp(existing, { timestamp: 50, value: "x" });
    expect(result.map((v) => v.timestamp)).to.deep.equal([300, 200, 100, 50]);
  });

  it("starts a list when there are no values yet", () => {
    const result = Stats_insertByTimestamp(undefined, { timestamp: 100, value: "a" });
    expect(result).to.deep.equal([{ timestamp: 100, value: "a" }]);
  });

  it("does not mutate the existing list", () => {
    Stats_insertByTimestamp(existing, { timestamp: 150, value: "x" });
    expect(existing.map((v) => v.timestamp)).to.deep.equal([300, 200, 100]);
  });
});

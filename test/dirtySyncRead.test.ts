import "mocha";
import { expect } from "chai";
import { DirtySyncRead_args } from "../lambda/utils/dirtySyncRead";

describe("DirtySyncRead_args", () => {
  it("reads everything when the merge wrote something", () => {
    expect(DirtySyncRead_args({ hasMergeWrite: true, historylimit: 20 })).to.eql({});
    expect(DirtySyncRead_args({ hasMergeWrite: true, historylimit: 20, isWatch: true })).to.eql({});
  });

  it("reads no history and no stats for a watch that wrote nothing", () => {
    expect(DirtySyncRead_args({ hasMergeWrite: false, historylimit: 20, isWatch: true })).to.eql({
      historyLimit: 0,
      skipStats: true,
    });
  });

  it("limits the history read for a phone that wrote nothing", () => {
    expect(DirtySyncRead_args({ hasMergeWrite: false, historylimit: 20 })).to.eql({ historyLimit: 20 });
    expect(DirtySyncRead_args({ hasMergeWrite: false, historylimit: 0 })).to.eql({ historyLimit: 0 });
  });

  it("reads everything when the limit is not a non-negative integer", () => {
    expect(DirtySyncRead_args({ hasMergeWrite: false, historylimit: -1 })).to.eql({});
    expect(DirtySyncRead_args({ hasMergeWrite: false, historylimit: 1.5 })).to.eql({});
    expect(DirtySyncRead_args({ hasMergeWrite: false })).to.eql({});
  });
});

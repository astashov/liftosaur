import "mocha";
import { expect } from "chai";
import { HistoryIds_MAX, HistoryIds_parse } from "../src/utils/historyIds";

describe("HistoryIds_parse", () => {
  it("parses a list, dropping duplicates and empty parts", () => {
    expect(HistoryIds_parse("3,1,,3,2")).to.eql({ success: true, data: [3, 1, 2] });
    expect(HistoryIds_parse("")).to.eql({ success: true, data: [] });
  });

  it("rejects anything that is not a safe integer", () => {
    expect(HistoryIds_parse("1,abc").success).to.equal(false);
    expect(HistoryIds_parse("1.5").success).to.equal(false);
    expect(HistoryIds_parse("9007199254740993").success).to.equal(false);
  });

  it("rejects more than the maximum", () => {
    const max = Array.from({ length: HistoryIds_MAX }, (_, i) => i + 1).join(",");
    expect(HistoryIds_parse(max).success).to.equal(true);
    expect(HistoryIds_parse(`${max},${HistoryIds_MAX + 1}`).success).to.equal(false);
  });
});

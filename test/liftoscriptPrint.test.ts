import "mocha";
import { expect } from "chai";
import {
  LiftoscriptPrint_formatLegacy,
  LiftoscriptPrint_formatLine,
  LiftoscriptPrint_lines,
} from "../src/liftoscriptPrint";
import { Weight_build, Weight_buildPct } from "../src/models/weight";

describe("LiftoscriptPrint", () => {
  it("formats a line the way the old Prints view did", () => {
    expect(LiftoscriptPrint_formatLine([1.234, Weight_build(225, "lb"), Weight_buildPct(80)])).to.eql(
      "1.23, 225lb, 80%"
    );
  });

  it("formats text, booleans and missing values", () => {
    expect(LiftoscriptPrint_formatLine(["e1RM", true, undefined])).to.eql("e1RM, true, 0");
  });

  it("formats legacy prints", () => {
    expect(LiftoscriptPrint_formatLegacy([[1, Weight_build(5, "kg")], [2]])).to.eql(["1, 5kg", "2"]);
    expect(LiftoscriptPrint_formatLegacy(undefined)).to.eql(undefined);
  });

  it("prefers new lines, even empty ones, over legacy prints", () => {
    expect(LiftoscriptPrint_lines(["new"], [[1]])).to.eql(["new"]);
    expect(LiftoscriptPrint_lines([], [[1]])).to.eql([]);
    expect(LiftoscriptPrint_lines(undefined, [[1]])).to.eql(["1"]);
    expect(LiftoscriptPrint_lines(undefined, undefined)).to.eql([]);
  });
});

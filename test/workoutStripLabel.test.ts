import "mocha";
import { expect } from "chai";
import { WorkoutStripLabel_fadeRange, WorkoutStripLabel_shadowRange } from "../src/utils/workoutStripLabel";

describe("WorkoutStripLabel", () => {
  it("shows the shadow only once the strip has stuck to the top", () => {
    expect(WorkoutStripLabel_shadowRange(200, 90)).to.eql({ start: 110, end: 118 });
    expect(WorkoutStripLabel_shadowRange(0, 90)).to.eql({ start: 0, end: 8 });
  });

  it("fades in while the title row slides under the sticky strip", () => {
    const range = WorkoutStripLabel_fadeRange({
      titleWindowTop: 300,
      titleHeight: 28,
      viewportWindowTop: 100,
      scrollY: 0,
      stripHeight: 90,
    });
    expect(range).to.eql({ start: 110, end: 138 });
  });

  it("accounts for the scroll offset at the time of measuring", () => {
    const range = WorkoutStripLabel_fadeRange({
      titleWindowTop: 150,
      titleHeight: 28,
      viewportWindowTop: 100,
      scrollY: 150,
      stripHeight: 90,
    });
    expect(range).to.eql({ start: 110, end: 138 });
  });

  it("never goes negative and keeps the range at least one point wide", () => {
    const range = WorkoutStripLabel_fadeRange({
      titleWindowTop: 120,
      titleHeight: 0,
      viewportWindowTop: 100,
      scrollY: 0,
      stripHeight: 90,
    });
    expect(range).to.eql({ start: 0, end: 1 });
  });
});

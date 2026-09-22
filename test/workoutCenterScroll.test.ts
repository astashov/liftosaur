import "mocha";
import { expect } from "chai";
import { IWorkoutCenterScrollInput, WorkoutCenterScroll_targetY } from "../src/utils/workoutCenterScroll";

function input(overrides: Partial<IWorkoutCenterScrollInput>): IWorkoutCenterScrollInput {
  return {
    scrollY: 300,
    rowTop: 700,
    rowHeight: 100,
    viewportTop: 100,
    viewportHeight: 800,
    stickyHeaderHeight: 0,
    footerHeight: 0,
    contentHeight: 3000,
    ...overrides,
  };
}

describe("WorkoutCenterScroll", () => {
  it("moves the row's middle to the middle of the viewport", () => {
    expect(WorkoutCenterScroll_targetY(input({}))).to.equal(550);
  });

  it("centers in the part the sticky strip and the footer leave visible", () => {
    expect(WorkoutCenterScroll_targetY(input({ stickyHeaderHeight: 100, footerHeight: 60 }))).to.equal(530);
  });

  it("never scrolls above the top or past the end of the content", () => {
    expect(WorkoutCenterScroll_targetY(input({ scrollY: 0, rowTop: 150 }))).to.equal(0);
    expect(WorkoutCenterScroll_targetY(input({ contentHeight: 1200 }))).to.equal(400);
    expect(WorkoutCenterScroll_targetY(input({ contentHeight: 500 }))).to.equal(0);
  });
});

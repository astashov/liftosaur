import "mocha";
import { expect } from "chai";
import {
  WorkoutImpressionVisibility_isSeen,
  IWorkoutImpressionVisibilityArgs,
} from "../src/utils/workoutImpressionVisibility";

describe("WorkoutImpressionVisibility_isSeen", () => {
  const VIEWPORT = 800;
  const STICKY = 100;
  function seen(over: Partial<IWorkoutImpressionVisibilityArgs>): boolean {
    return WorkoutImpressionVisibility_isSeen({
      top: 200,
      height: 400,
      viewportHeight: VIEWPORT,
      stickyHeaderHeight: STICKY,
      ...over,
    });
  }

  it("counts a block sitting entirely between the sticky header and the bottom", () => {
    expect(seen({ top: 200, height: 400 })).to.equal(true);
  });

  it("does not count a sliver poking in at the bottom", () => {
    expect(seen({ top: VIEWPORT - 20, height: 400 })).to.equal(false);
  });

  it("does not count a block still mostly below the fold", () => {
    expect(seen({ top: 500, height: 400 })).to.equal(false);
  });

  it("does not count a block scrolled up under the sticky header", () => {
    expect(seen({ top: STICKY - 30, height: 400 })).to.equal(false);
  });

  it("counts a block resting exactly against both edges", () => {
    expect(seen({ top: STICKY, height: VIEWPORT - STICKY })).to.equal(true);
  });

  it("counts a block taller than the viewport once it fills it", () => {
    expect(seen({ top: STICKY, height: 5000 })).to.equal(true);
    expect(seen({ top: 400, height: 5000 })).to.equal(false);
  });

  it("reports nothing before layout has happened", () => {
    expect(seen({ height: 0 })).to.equal(false);
    expect(seen({ viewportHeight: 0 })).to.equal(false);
  });
});

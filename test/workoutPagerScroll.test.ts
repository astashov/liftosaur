import "mocha";
import { expect } from "chai";
import {
  WorkoutPagerScroll_plan,
  WorkoutPagerScroll_read,
  WorkoutPagerScroll_shownIndex,
} from "../src/utils/workoutPagerScroll";

describe("WorkoutPagerScroll", () => {
  it("rounds the offset to the page on screen", () => {
    expect(WorkoutPagerScroll_shownIndex(0, 400)).to.equal(0);
    expect(WorkoutPagerScroll_shownIndex(790, 400)).to.equal(2);
    expect(WorkoutPagerScroll_shownIndex(500, 0)).to.equal(0);
  });

  it("slides to a neighbour in either direction and waits for it", () => {
    expect(WorkoutPagerScroll_plan(2, 3, true)).to.eql({ animated: true, ownSlideTarget: 3 });
    expect(WorkoutPagerScroll_plan(2, 1, true)).to.eql({ animated: true, ownSlideTarget: 1 });
  });

  it("jumps for a far page, for the same page, and when it is not a navigation", () => {
    expect(WorkoutPagerScroll_plan(0, 5, true)).to.eql({ animated: false, ownSlideTarget: undefined });
    expect(WorkoutPagerScroll_plan(2, 2, true)).to.eql({ animated: false, ownSlideTarget: undefined });
    expect(WorkoutPagerScroll_plan(0, 1, false)).to.eql({ animated: false, ownSlideTarget: undefined });
  });

  it("reports nothing during its own slide and stops waiting once the target is under the middle", () => {
    expect(WorkoutPagerScroll_read(3, 2, 3)).to.eql({ ownSlideTarget: 3, reportIndex: undefined });
    expect(WorkoutPagerScroll_read(3, 3, 3)).to.eql({ ownSlideTarget: undefined, reportIndex: undefined });
  });

  it("reports a new page from a user scroll, and nothing for the current one", () => {
    expect(WorkoutPagerScroll_read(undefined, 4, 3)).to.eql({ ownSlideTarget: undefined, reportIndex: 4 });
    expect(WorkoutPagerScroll_read(undefined, 3, 3)).to.eql({ ownSlideTarget: undefined, reportIndex: undefined });
  });
});

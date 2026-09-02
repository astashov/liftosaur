import "mocha";
import { expect } from "chai";
import { WorkoutPagerSettle_index, IWorkoutPagerSettleArgs } from "../src/components/workoutPagerSettle";

describe("WorkoutPagerSettle_index", () => {
  const WIDTH = 400;
  function settle(over: Partial<IWorkoutPagerSettleArgs>): number | undefined {
    return WorkoutPagerSettle_index({
      offsetX: 0,
      windowWidth: WIDTH,
      isUserDriven: true,
      dragStartIndex: 0,
      ...over,
    });
  }

  it("reports the page the gesture landed on", () => {
    expect(settle({ offsetX: WIDTH })).to.equal(1);
    expect(settle({ offsetX: WIDTH * 3 })).to.equal(3);
  });

  it("snaps to the nearest page when the scroll stops off-centre", () => {
    expect(settle({ offsetX: WIDTH * 2 - 10 })).to.equal(2);
    expect(settle({ offsetX: WIDTH * 2 + 10 })).to.equal(2);
  });

  it("ignores anything the app scrolled itself", () => {
    expect(settle({ offsetX: WIDTH * 2, isUserDriven: false })).to.equal(undefined);
  });

  it("ignores a drag that snaps back to where it started", () => {
    expect(settle({ offsetX: WIDTH * 2, dragStartIndex: 2 })).to.equal(undefined);
  });

  it("reports a swipe back to a page reached earlier by other means", () => {
    expect(settle({ offsetX: 0, dragStartIndex: 3 })).to.equal(0);
  });

  it("reports nothing before the pager has been measured", () => {
    expect(settle({ offsetX: 0, windowWidth: 0, dragStartIndex: 5 })).to.equal(undefined);
  });

  it("never reports a negative page from an overscroll", () => {
    expect(settle({ offsetX: -WIDTH, dragStartIndex: 3 })).to.equal(0);
  });
});

import "mocha";
import { expect } from "chai";
import { WorkoutStripReveal_offset } from "../src/utils/workoutStripReveal";

describe("WorkoutStripReveal", () => {
  const base = { count: 20, pitch: 70, gap: 4, padding: 16, viewportWidth: 300, contentWidth: 900 };

  it("leaves the strip alone when the tile is already fully visible", () => {
    expect(WorkoutStripReveal_offset({ ...base, index: 2, offset: 0 })).to.equal(undefined);
    expect(WorkoutStripReveal_offset({ ...base, index: 5, offset: 200 })).to.equal(undefined);
  });

  it("scrolls right just enough to show a tile past the right edge, plus the padding", () => {
    expect(WorkoutStripReveal_offset({ ...base, index: 4, offset: 0 })).to.equal(78);
  });

  it("scrolls left just enough to show a tile past the left edge, minus the padding", () => {
    expect(WorkoutStripReveal_offset({ ...base, index: 1, offset: 200 })).to.equal(70);
    expect(WorkoutStripReveal_offset({ ...base, index: 0, offset: 200 })).to.equal(0);
  });

  it("never scrolls past the end of the content", () => {
    expect(WorkoutStripReveal_offset({ ...base, index: 11, offset: 0, contentWidth: 850 })).to.equal(550);
  });

  it("scrolls to the very end for the last tile, so the add button after it shows", () => {
    expect(WorkoutStripReveal_offset({ ...base, count: 11, index: 10, offset: 500 })).to.equal(600);
    expect(WorkoutStripReveal_offset({ ...base, count: 11, index: 10, offset: 600 })).to.equal(undefined);
  });

  it("does nothing before the viewport is measured", () => {
    expect(WorkoutStripReveal_offset({ ...base, index: 8, offset: 0, viewportWidth: 0 })).to.equal(undefined);
  });
});

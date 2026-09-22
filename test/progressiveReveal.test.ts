import { expect } from "chai";
import "mocha";
import { IProgressiveRevealInput, ProgressiveReveal_onScroll } from "../src/utils/progressiveReveal";

function input(overrides: Partial<IProgressiveRevealInput>): IProgressiveRevealInput {
  return {
    count: 0,
    total: 30,
    batchSize: 10,
    threshold: 50,
    rateLimitMs: 200,
    lastBumpAt: 0,
    now: 1000,
    offsetY: 0,
    viewportHeight: 800,
    contentHeight: 2000,
    ...overrides,
  };
}

describe("ProgressiveReveal", () => {
  it("does nothing while the bottom is further away than the threshold", () => {
    expect(ProgressiveReveal_onScroll(input({ offsetY: 1100 }))).to.eql({ kind: "none" });
  });

  it("reveals the next batch within the threshold of the bottom", () => {
    expect(ProgressiveReveal_onScroll(input({ offsetY: 1160 }))).to.eql({ kind: "bump", count: 10 });
  });

  it("reveals a batch when the content is shorter than the viewport", () => {
    expect(ProgressiveReveal_onScroll(input({ contentHeight: 500 }))).to.eql({ kind: "bump", count: 10 });
  });

  it("asks for a retry at the end of the rate limit instead of dropping the check", () => {
    const step = ProgressiveReveal_onScroll(input({ count: 10, contentHeight: 700, lastBumpAt: 950 }));
    expect(step).to.eql({ kind: "retry", inMs: 150 });
  });

  it("never goes past the total and stops once everything is revealed", () => {
    expect(ProgressiveReveal_onScroll(input({ count: 25, contentHeight: 500 }))).to.eql({ kind: "bump", count: 30 });
    expect(ProgressiveReveal_onScroll(input({ count: 30, contentHeight: 500 }))).to.eql({ kind: "none" });
  });
});

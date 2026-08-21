import "mocha";
import { expect } from "chai";
import {
  GridDragAutoScroll_step,
  IGridAutoScrollStep,
} from "../src/components/editProgram/editProgramGrid/gridDragAutoScroll";

// The scrolling half of every drag: whether the finger is close enough to an edge to scroll, how
// fast, and when to stop. Only reachable through a live gesture in the app, which is exactly what a
// test cannot drive — so the arithmetic lives on its own.
describe("GridDragAutoScroll_step", () => {
  const BOUNDS = { start: 100, end: 500 };
  function step(over: Partial<Parameters<typeof GridDragAutoScroll_step>[0]>): IGridAutoScrollStep {
    return GridDragAutoScroll_step({
      position: 300,
      bounds: BOUNDS,
      zone: 50,
      maxStep: 20,
      current: 200,
      reported: 200,
      target: undefined,
      knownMax: 1000,
      ...over,
    });
  }

  it("does nothing while the finger is away from both edges", () => {
    expect(step({ position: 300 }).kind).to.equal("idle");
    expect(step({ position: 151 }).kind).to.equal("idle");
    expect(step({ position: 449 }).kind).to.equal("idle");
  });

  it("scrolls back at the near edge and forward at the far one", () => {
    const back = step({ position: 110 });
    const forward = step({ position: 490 });
    expect(back.kind).to.equal("scroll");
    expect(forward.kind).to.equal("scroll");
    if (back.kind !== "scroll" || forward.kind !== "scroll") {
      return;
    }
    expect(back.to).to.be.lessThan(200);
    expect(forward.to).to.be.greaterThan(200);
  });

  it("ramps: the closer to the edge, the bigger the step", () => {
    // The far zone starts at 450 and the edge is 500, so a larger position is deeper into it.
    const shallow = step({ position: 460 });
    const deep = step({ position: 490 });
    if (shallow.kind !== "scroll" || deep.kind !== "scroll") {
      throw new Error("expected both to scroll");
    }
    expect(deep.to - 200).to.be.greaterThan(shallow.to - 200);
  });

  it("never exceeds one full step, however far past the edge the finger goes", () => {
    const far = step({ position: 5000 });
    if (far.kind !== "scroll") {
      throw new Error("expected a scroll");
    }
    expect(far.to - 200).to.be.at.most(20);
  });

  it("stops at both ends rather than scrolling past them", () => {
    expect(step({ position: 110, current: 0 }).kind).to.equal("idle");
    expect(step({ position: 490, current: 1000, knownMax: 1000 }).kind).to.equal("idle");
  });

  // Clamping to 0 while the extent is unknown deadlocks: no scroll means no scroll event, which
  // means the maximum is never learned, so it never scrolls again.
  it("keeps scrolling when the extent is not known yet", () => {
    const result = step({ position: 490, knownMax: undefined });
    expect(result.kind).to.equal("scroll");
    if (result.kind !== "scroll") {
      return;
    }
    expect(result.to).to.be.greaterThan(200);
  });

  // A known zero is not the same as not knowing: the view genuinely does not scroll, and pretending
  // otherwise reports movement that never happened and drags the drop target under a still finger.
  it("does nothing when the view is known not to scroll", () => {
    // A view that cannot scroll is at 0 and stays there.
    expect(step({ position: 490, knownMax: 0, current: 0 }).kind).to.equal("idle");
  });

  it("resyncs when the scroller stopped following where it was asked", () => {
    const result = step({ position: 490, target: 400, reported: 200 });
    expect(result.kind).to.equal("resync");
    if (result.kind !== "resync") {
      return;
    }
    expect(result.to).to.equal(200);
  });

  it("does not resync while the scroller is merely a little behind", () => {
    expect(step({ position: 490, target: 220, reported: 200 }).kind).to.equal("scroll");
  });

  it("checks the edges before anything else, so a resting finger never resyncs", () => {
    expect(step({ position: 300, target: 900, reported: 200 }).kind).to.equal("idle");
  });
});

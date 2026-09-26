import "mocha";
import { expect } from "chai";
import {
  HorizontalScroll_edges,
  HorizontalScroll_fadeMask,
  HorizontalScroll_wheelDelta,
} from "../src/utils/horizontalScroll";

describe("HorizontalScroll", () => {
  const wheel = { deltaX: 0, deltaY: 100, deltaMode: 0, offset: 50, maxOffset: 400, viewportWidth: 300 };

  it("turns a vertical wheel into a horizontal scroll", () => {
    expect(HorizontalScroll_wheelDelta(wheel)).to.equal(100);
    expect(HorizontalScroll_wheelDelta({ ...wheel, deltaY: -100 })).to.equal(-100);
  });

  it("leaves a mostly horizontal wheel (a trackpad swipe) to the browser", () => {
    expect(HorizontalScroll_wheelDelta({ ...wheel, deltaX: 30, deltaY: 10 })).to.equal(undefined);
  });

  it("scales line and page wheel modes to pixels", () => {
    expect(HorizontalScroll_wheelDelta({ ...wheel, deltaY: 3, deltaMode: 1 })).to.equal(48);
    expect(HorizontalScroll_wheelDelta({ ...wheel, deltaY: 1, deltaMode: 2 })).to.equal(300);
  });

  it("lets the page scroll once the strip is at the end in the wheel direction", () => {
    expect(HorizontalScroll_wheelDelta({ ...wheel, offset: 400 })).to.equal(undefined);
    expect(HorizontalScroll_wheelDelta({ ...wheel, offset: 0, deltaY: -100 })).to.equal(undefined);
    expect(HorizontalScroll_wheelDelta({ ...wheel, maxOffset: 0 })).to.equal(undefined);
  });

  it("reports which edges hide more content", () => {
    expect(HorizontalScroll_edges(0, 900, 300)).to.deep.equal({ hasMoreLeft: false, hasMoreRight: true });
    expect(HorizontalScroll_edges(300, 900, 300)).to.deep.equal({ hasMoreLeft: true, hasMoreRight: true });
    expect(HorizontalScroll_edges(600, 900, 300)).to.deep.equal({ hasMoreLeft: true, hasMoreRight: false });
    expect(HorizontalScroll_edges(0, 200, 300)).to.deep.equal({ hasMoreLeft: false, hasMoreRight: false });
  });

  it("fades only the edges that hide content", () => {
    expect(HorizontalScroll_fadeMask({ hasMoreLeft: false, hasMoreRight: false }, 24)).to.equal(undefined);
    expect(HorizontalScroll_fadeMask({ hasMoreLeft: false, hasMoreRight: true }, 24)).to.equal(
      "linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)"
    );
    expect(HorizontalScroll_fadeMask({ hasMoreLeft: true, hasMoreRight: false }, 24)).to.equal(
      "linear-gradient(to right, transparent 0, black 24px, black 100%)"
    );
  });
});

import "mocha";
import { expect } from "chai";
import { TooltipPlacement_place } from "../src/utils/tooltipPlacement";

const viewport = { width: 1000, height: 800 };
const tooltip = { width: 240, height: 100 };

describe("TooltipPlacement_place", () => {
  it("places the tooltip below the anchor, aligned to its left edge", () => {
    expect(TooltipPlacement_place({ left: 300, top: 100, bottom: 120 }, tooltip, viewport)).to.deep.equal({
      left: 300,
      top: 124,
    });
  });

  it("shifts left to stay inside the right edge of the window", () => {
    expect(TooltipPlacement_place({ left: 900, top: 100, bottom: 120 }, tooltip, viewport).left).to.equal(752);
  });

  it("opens above the anchor when there is no room below", () => {
    expect(TooltipPlacement_place({ left: 300, top: 720, bottom: 740 }, tooltip, viewport).top).to.equal(616);
  });
});

import "mocha";
import { expect } from "chai";
import { StyledText_cls, StyledText_remToPx } from "../src/utils/styledText";
import { Tailwind_colors, Tailwind_semantic } from "../src/utils/tailwindConfig";

describe("StyledText_cls", () => {
  // Tailwind_semantic() returns CSS vars or concrete colors depending on the render context
  // (other test files may mark the page context), so compare against the same call.
  const cls = StyledText_cls(16);
  const semantic = Tailwind_semantic();

  it("resolves sizes, weights, italic and decorations", () => {
    expect(cls("text-sm font-semibold italic line-through")).to.eql({
      fontSize: 14,
      fontWeight: "600",
      fontStyle: "italic",
      textDecorationLine: "line-through",
    });
    expect(cls("font-normal not-italic underline")).to.eql({
      fontWeight: "400",
      fontStyle: "normal",
      textDecorationLine: "underline",
    });
    expect(cls("font-medium")).to.eql({ fontWeight: "500" });
    expect(cls("font-bold")).to.eql({ fontWeight: "700" });
  });

  it("scales sizes by rem", () => {
    expect(StyledText_cls(20)("text-sm")).to.eql({ fontSize: StyledText_remToPx("sm", 20) });
  });

  it("resolves semantic text colors", () => {
    expect(cls("text-text-secondary")).to.eql({ color: semantic.text.secondary });
    expect(cls("text-syntax-weight")).to.eql({ color: semantic.syntax.weight });
  });

  it("resolves base palette colors with shades", () => {
    expect(cls("text-yellow-600")).to.eql({ color: Tailwind_colors().yellow[600] });
  });

  it("resolves direct palette colors without shades", () => {
    expect(cls("text-white")).to.eql({ color: Tailwind_colors().white });
  });

  it("resolves background colors", () => {
    expect(cls("bg-background-subtle")).to.eql({ backgroundColor: semantic.background.subtle });
  });

  it("combines multiple classes and ignores unknown ones", () => {
    expect(cls("text-xs font-bold text-text-error flex-1 mr-2")).to.eql({
      fontSize: 12,
      fontWeight: "700",
      color: semantic.text.error,
    });
  });
});

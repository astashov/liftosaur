import "mocha";
import { expect } from "chai";
import { StyledText, StyledText_fragmentsToSpans, StyledText_remToPx } from "../src/utils/styledText";

describe("StyledText builder", () => {
  it("tracks sequential UTF-16 offsets across add() calls", () => {
    const { text, fragments } = new StyledText()
      .add("ab")
      .add("cd", { fontWeight: "700" })
      .add("ef", { color: "#ff0000" })
      .build();
    expect(text).to.equal("abcdef");
    expect(fragments).to.deep.equal([
      { start: 2, end: 4, fontWeight: "700" },
      { start: 4, end: 6, color: "#ff0000" },
    ]);
  });

  it("ignores empty / null / undefined segments without advancing offset", () => {
    const { text, fragments } = new StyledText()
      .add("a")
      .add("")
      .add(null)
      .add(undefined)
      .add("b", { color: "#000000" })
      .build();
    expect(text).to.equal("ab");
    expect(fragments).to.deep.equal([{ start: 1, end: 2, color: "#000000" }]);
  });

  it("does not emit a fragment for an unstyled or empty-style segment", () => {
    const { fragments } = new StyledText().add("a").add("b", {}).build();
    expect(fragments).to.deep.equal([]);
  });

  it("advances by 2 for an astral emoji (🏆 is a UTF-16 surrogate pair)", () => {
    const { text, fragments } = new StyledText()
      .add("\u{1F3C6}", { fontSize: 14 })
      .add("x", { color: "#111111" })
      .build();
    expect(text.length).to.equal(3);
    expect(fragments).to.deep.equal([
      { start: 0, end: 2, fontSize: 14 },
      { start: 2, end: 3, color: "#111111" },
    ]);
  });
});

describe("StyledText_fragmentsToSpans", () => {
  it("fills gaps around a middle fragment", () => {
    const spans = StyledText_fragmentsToSpans("abcdef", [{ start: 2, end: 4, fontWeight: "700" }]);
    expect(spans).to.deep.equal([{ text: "ab" }, { text: "cd", style: { fontWeight: "700" } }, { text: "ef" }]);
  });

  it("returns a single unstyled span when there are no fragments", () => {
    expect(StyledText_fragmentsToSpans("hello")).to.deep.equal([{ text: "hello" }]);
  });

  it("handles adjacent fragments with no gap", () => {
    const spans = StyledText_fragmentsToSpans("abcd", [
      { start: 0, end: 2, color: "#aaa" },
      { start: 2, end: 4, color: "#bbb" },
    ]);
    expect(spans).to.deep.equal([
      { text: "ab", style: { color: "#aaa" } },
      { text: "cd", style: { color: "#bbb" } },
    ]);
  });

  it("clamps a fragment that runs past the end of the text", () => {
    const spans = StyledText_fragmentsToSpans("abc", [{ start: 1, end: 99, color: "#ccc" }]);
    expect(spans).to.deep.equal([{ text: "a" }, { text: "bc", style: { color: "#ccc" } }]);
  });
});

describe("StyledText_remToPx", () => {
  it("returns base px values at rem=16", () => {
    expect(StyledText_remToPx("xs", 16)).to.equal(12);
    expect(StyledText_remToPx("sm", 16)).to.equal(14);
    expect(StyledText_remToPx("base", 16)).to.equal(16);
  });

  it("scales linearly with a larger rem", () => {
    expect(StyledText_remToPx("sm", 20)).to.equal(17.5);
    expect(StyledText_remToPx("xs", 24)).to.equal(18);
  });
});

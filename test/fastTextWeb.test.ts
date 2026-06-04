import "mocha";
import { expect } from "chai";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FastText } from "../src/components/primitives/fastText";
import { IFastTextProps } from "../src/utils/styledText";

function render(props: IFastTextProps): string {
  return renderToStaticMarkup(createElement(FastText, props));
}

describe("FastText (web)", () => {
  it("renders a single unstyled run as plain text inside one span", () => {
    const html = render({ text: "hello" });
    expect(html).to.contain("hello");
    expect(html.match(/<span/g)?.length).to.equal(2); // outer + one plain slice
  });

  it("renders a middle fragment as its own styled slice with gaps preserved", () => {
    const html = render({
      text: "abcdef",
      fragments: [{ start: 2, end: 4, fontWeight: "700" }],
    });
    expect(html).to.contain("ab");
    expect(html).to.contain("cd");
    expect(html).to.contain("ef");
    expect(html).to.contain("font-weight:700");
  });

  it("applies base color/backgroundColor to the outer span", () => {
    const html = render({ text: "x", color: "#ff0000", backgroundColor: "#00ff00" });
    expect(html).to.contain("color:#ff0000");
    expect(html).to.contain("background-color:#00ff00");
  });

  it("applies a per-fragment background color (does not rely on inheritance)", () => {
    const html = render({
      text: "abcd",
      fragments: [{ start: 0, end: 2, backgroundColor: "#cceeff44" }],
    });
    expect(html).to.contain("background-color:#cceeff44");
  });

  it("propagates a fragment testID to data-testid and data-cy on the slice", () => {
    const html = render({
      text: "12x45",
      fragments: [{ start: 0, end: 2, fontWeight: "600", testID: "history-entry-reps" }],
    });
    expect(html).to.contain('data-testid="history-entry-reps"');
    expect(html).to.contain('data-cy="history-entry-reps"');
  });

  it("propagates the top-level testID/data-cy onto the outer span", () => {
    const html = render({ text: "x", "data-testid": "history-entry-sets-completed", "data-cy": "sets" });
    expect(html).to.contain('data-testid="history-entry-sets-completed"');
    expect(html).to.contain('data-cy="sets"');
  });

  it("renders px font sizes from resolved fragment values", () => {
    const html = render({ text: "ab", fontSize: 14, fragments: [{ start: 0, end: 1, fontSize: 28 }] });
    expect(html).to.contain("font-size:14px");
    expect(html).to.contain("font-size:28px");
  });
});

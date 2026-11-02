import "mocha";
import { expect } from "chai";
import { MarkdownHtml_render } from "../src/utils/markdownHtml";

describe("MarkdownHtml_render", () => {
  it("escapes raw HTML when HTML is disabled, and keeps it otherwise", () => {
    const value = 'Hi <img src=x onerror="alert(1)"> **bold**';
    expect(MarkdownHtml_render(value, true)).to.equal(
      "<p>Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt; <strong>bold</strong></p>\n"
    );
    expect(MarkdownHtml_render(value, false)).to.contain("<img src=x");
  });
});

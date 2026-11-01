import "mocha";
import { expect } from "chai";
import { Markdown_toHtml } from "../src/components/markdown";

describe("Markdown_toHtml", () => {
  it("escapes raw HTML when HTML is disabled, and keeps it otherwise", () => {
    const value = 'Hi <img src=x onerror="alert(1)"> **bold**';
    expect(Markdown_toHtml(value, true)).to.equal(
      "<p>Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt; <strong>bold</strong></p>\n"
    );
    expect(Markdown_toHtml(value, false)).to.contain("<img src=x");
  });
});

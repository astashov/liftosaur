import "mocha";
import { expect } from "chai";
import { DocImages_inlineHtml, DocImages_size, DocImages_sizesFor, DocImages_url } from "../src/utils/docImages";

describe("DocImages", () => {
  const sizes = {
    "rest-timer/rest-timer-collapsed": { width: 600, height: 1304 },
    "gzclp-apps/volm": { width: 720, height: 1607 },
    "other-article/unused": { width: 1, height: 1 },
  };

  it("turns a markdown image into an img tag with its size and lazy loading", () => {
    const html = DocImages_inlineHtml(
      "features",
      '![Timer "pill"](/images/features/rest-timer/rest-timer-collapsed.webp)',
      sizes
    );
    expect(html).to.equal(
      '<p><img src="/images/features/rest-timer/rest-timer-collapsed.webp" alt="Timer &quot;pill&quot;" width="600" height="1304" loading="lazy" decoding="async"></p>'
    );
  });

  it("wraps a line of several images in one paragraph", () => {
    const html = DocImages_inlineHtml(
      "features",
      "Text before.\n\n![a](/images/features/x/a.webp) ![b](/images/features/x/b.webp)\n\nText after.",
      sizes
    );
    expect(html).to.equal(
      'Text before.\n\n<p><img src="/images/features/x/a.webp" alt="a" loading="lazy" decoding="async"> <img src="/images/features/x/b.webp" alt="b" loading="lazy" decoding="async"></p>\n\nText after.'
    );
  });

  it("leaves out the size when the manifest has no entry and keeps other images alone", () => {
    const html = DocImages_inlineHtml("features", "![a](/images/features/x/y.webp) ![b](/images/other.png)", sizes);
    expect(html).to.equal(
      '<img src="/images/features/x/y.webp" alt="a" loading="lazy" decoding="async"> ![b](/images/other.png)'
    );
  });

  it("only rewrites images of its own section", () => {
    const markdown = "![a](/images/features/x/y.webp)";
    expect(DocImages_inlineHtml("compare", markdown, sizes)).to.equal(markdown);
    expect(DocImages_inlineHtml("compare", "![v](/images/compare/gzclp-apps/volm.webp)", sizes)).to.equal(
      '<p><img src="/images/compare/gzclp-apps/volm.webp" alt="v" width="720" height="1607" loading="lazy" decoding="async"></p>'
    );
  });

  it("builds URLs and looks sizes up by article and image name", () => {
    expect(DocImages_url("compare", "gzclp-apps", "volm")).to.equal("/images/compare/gzclp-apps/volm.webp");
    expect(DocImages_size(sizes, "rest-timer", "rest-timer-collapsed")).to.eql({ width: 600, height: 1304 });
    expect(DocImages_size(sizes, "rest-timer", "missing")).to.equal(undefined);
  });

  it("keeps only the sizes an article uses", () => {
    const markdown = "![v](/images/compare/gzclp-apps/volm.webp)\n\n![m](/images/compare/gzclp-apps/missing.webp)";
    expect(DocImages_sizesFor("compare", markdown, sizes)).to.eql({
      "gzclp-apps/volm": { width: 720, height: 1607 },
    });
  });
});

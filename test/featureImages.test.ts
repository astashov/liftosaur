import "mocha";
import { expect } from "chai";
import {
  FeatureImages_altText,
  FeatureImages_inlineHtml,
  FeatureImages_size,
} from "../src/pages/features/featureImages";

describe("FeatureImages", () => {
  const sizes = { "rest-timer/rest-timer-collapsed": { width: 600, height: 1304 } };

  it("builds a readable alt text from the screenshot name", () => {
    expect(FeatureImages_altText("Rest Timer", "rest-timer", "rest-timer-lock-screen")).to.equal(
      "Rest Timer: lock screen"
    );
    expect(FeatureImages_altText("Rest Timer", "rest-timer", "rest-timer")).to.equal("Rest Timer");
  });

  it("turns a markdown image into an img tag with its size and lazy loading", () => {
    const html = FeatureImages_inlineHtml(
      '![Timer "pill"](/images/features/rest-timer/rest-timer-collapsed.webp)',
      sizes
    );
    expect(html).to.equal(
      '<img src="/images/features/rest-timer/rest-timer-collapsed.webp" alt="Timer &quot;pill&quot;" width="600" height="1304" loading="lazy" decoding="async">'
    );
  });

  it("leaves out the size when the manifest has no entry and keeps other images alone", () => {
    const html = FeatureImages_inlineHtml("![a](/images/features/x/y.webp) ![b](/images/other.png)", sizes);
    expect(html).to.equal(
      '<img src="/images/features/x/y.webp" alt="a" loading="lazy" decoding="async"> ![b](/images/other.png)'
    );
  });

  it("looks a size up by feature and screenshot name", () => {
    expect(FeatureImages_size(sizes, "rest-timer", "rest-timer-collapsed")).to.eql({ width: 600, height: 1304 });
    expect(FeatureImages_size(sizes, "rest-timer", "missing")).to.equal(undefined);
  });
});

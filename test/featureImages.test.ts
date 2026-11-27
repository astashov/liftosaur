import "mocha";
import { expect } from "chai";
import { FeatureImages_altText } from "../src/pages/features/featureImages";

describe("FeatureImages", () => {
  it("builds a readable alt text from the screenshot name", () => {
    expect(FeatureImages_altText("Rest Timer", "rest-timer", "rest-timer-lock-screen")).to.equal(
      "Rest Timer: lock screen"
    );
    expect(FeatureImages_altText("Rest Timer", "rest-timer", "rest-timer")).to.equal("Rest Timer");
  });
});

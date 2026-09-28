import "mocha";
import { expect } from "chai";
import { LlmsFeatures_compile } from "../scripts/llmsFeatures";

describe("LlmsFeatures", () => {
  it("orders pages by category then order, drops images and demotes headings", () => {
    const out = LlmsFeatures_compile([
      {
        indexEntry: { id: "graphs", title: "Graphs", shortDescription: "See graphs.", order: 10, category: "Progress" },
        detail: {
          content:
            "## Exercise graphs\n\n![a](/images/features/graphs/a.webp) ![b](/images/features/graphs/b.webp)\n\nText.",
        },
      },
      {
        indexEntry: {
          id: "rest-timer",
          title: "Rest Timer",
          shortDescription: "Rests.",
          order: 10,
          category: "Workout",
        },
        detail: { content: "## How it works\n\n![x](/images/features/rest-timer/x.webp)\n\nComplete a set." },
      },
    ]);
    expect(out.indexOf("## Rest Timer")).to.be.lessThan(out.indexOf("## Graphs"));
    expect(out).to.include("Page: https://www.liftosaur.com/features/rest-timer");
    expect(out).to.include("### How it works\n\nComplete a set.");
    expect(out).to.include("### Exercise graphs\n\nText.");
    expect(out).to.not.include("![");
  });
});

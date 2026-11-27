import "mocha";
import { expect } from "chai";
import { DocAnchors_slug, DocAnchors_unique } from "../src/utils/docAnchors";
import { MarkdownHtml_render } from "../src/utils/markdownHtml";

describe("DocAnchors", () => {
  it("turns a heading into a slug", () => {
    expect(DocAnchors_slug("Hevy")).to.equal("hevy");
    expect(DocAnchors_slug("GZCL Workout Logger")).to.equal("gzcl-workout-logger");
    expect(DocAnchors_slug("Update a Friend's Program")).to.equal("update-a-friends-program");
    expect(DocAnchors_slug("Liftosaur or Volm?")).to.equal("liftosaur-or-volm");
  });

  it("adds a number to a repeated slug", () => {
    const used = new Set<string>();
    expect(DocAnchors_unique("state", used)).to.equal("state");
    expect(DocAnchors_unique("state", used)).to.equal("state-2");
    expect(DocAnchors_unique("state", used)).to.equal("state-3");
  });

  it("adds ids to h2 and h3 only, unique within one render", () => {
    const html = MarkdownHtml_render("# Title\n\n## Hevy\n\n### Hevy\n\n#### Deep", false, true);
    expect(html).to.equal('<h1>Title</h1>\n<h2 id="hevy">Hevy</h2>\n<h3 id="hevy-2">Hevy</h3>\n<h4>Deep</h4>\n');
  });

  it("does not leak ids into a render without anchors, or into the next render", () => {
    expect(MarkdownHtml_render("## Hevy", false, true)).to.equal('<h2 id="hevy">Hevy</h2>\n');
    expect(MarkdownHtml_render("## Hevy", false)).to.equal("<h2>Hevy</h2>\n");
    expect(MarkdownHtml_render("## Hevy", false, true)).to.equal('<h2 id="hevy">Hevy</h2>\n');
  });

  it("keeps raw HTML escaped when anchors and isHtmlDisabled are both on", () => {
    const html = MarkdownHtml_render("## Hevy\n\n<img src=x onerror=alert(1)>", true, true);
    expect(html).to.contain('<h2 id="hevy">Hevy</h2>');
    expect(html).to.contain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).to.not.contain("<img");
  });

  it("adds anchors when raw HTML is allowed too", () => {
    const html = MarkdownHtml_render("## Hevy\n\n<b>bold</b>", false, true);
    expect(html).to.contain('<h2 id="hevy">Hevy</h2>');
    expect(html).to.contain("<b>bold</b>");
  });
});

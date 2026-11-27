import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import { FaqMarkdown_parse, FaqMarkdown_section } from "../src/utils/faqMarkdown";

describe("FaqMarkdown", () => {
  it("parses ### questions with their answers", () => {
    expect(FaqMarkdown_parse("### Is it free?\n\nYes, **all** of it.\n\n### Why?\nBecause.")).to.eql([
      { question: "Is it free?", answer: "Yes, <strong>all</strong> of it." },
      { question: "Why?", answer: "Because." },
    ]);
  });

  it("cuts the FAQ section up to the next ## heading", () => {
    const markdown = "## Intro\n\ntext\n\n## FAQ\n\n### Q?\n\nA.\n\n## After\n\nmore";
    expect(FaqMarkdown_section(markdown)).to.equal("\n\n### Q?\n\nA.\n\n");
    expect(FaqMarkdown_section("## FAQ\n\n### Q?\n\nA.")).to.equal("\n\n### Q?\n\nA.");
    expect(FaqMarkdown_section("## Intro\n\nno faq")).to.equal(undefined);
  });

  it("parses the GZCLP program FAQ the same way the program page did", () => {
    const raw = fs.readFileSync("programs/builtin/gzclp.md", "utf8");
    const faq = raw.split("<!-- faq -->")[1].split("```")[0];
    const entries = FaqMarkdown_parse(faq);
    expect(entries.length).to.be.greaterThan(3);
    expect(entries[0].question).to.equal("Is GZCLP good for beginners?");
  });
});

import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { parseDocMarkdown } from "../src/utils/docUtils";
import { CompareCategories_order } from "../src/pages/compare/compareCategories";
import { MarkdownHtml_render } from "../src/utils/markdownHtml";
import { FaqMarkdown_parse, FaqMarkdown_section } from "../src/utils/faqMarkdown";
import { DocImages_key, IDocImageSizes } from "../src/utils/docImages";

const compareDir = path.resolve(__dirname, "../docs/compare");
const imagesDir = path.resolve(__dirname, "../images/compare");

describe("Compare docs", () => {
  const files = fs.readdirSync(compareDir).filter((f) => f.endsWith(".md"));
  const sizes: IDocImageSizes = JSON.parse(fs.readFileSync(path.join(compareDir, "screenshots.json"), "utf8"));

  it("has a sizes manifest that matches the image files", async () => {
    for (const [key, size] of Object.entries(sizes)) {
      const { width, height } = await sharp(path.join(imagesDir, `${key}.webp`)).metadata();
      expect({ width, height }, key).to.eql(size);
    }
  });

  for (const file of files) {
    describe(file, () => {
      const raw = fs.readFileSync(path.join(compareDir, file), "utf8");
      const { indexEntry, detail } = parseDocMarkdown(raw);

      it("has an id that matches the file name and a known category", () => {
        expect(indexEntry.id).to.equal(path.basename(file, ".md"));
        expect(CompareCategories_order).to.include(indexEntry.category);
        expect(indexEntry.order).to.be.a("number");
        expect(indexEntry.datePublished).to.match(/^\d{4}-\d{2}-\d{2}$/);
        expect(indexEntry.dateModified).to.match(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("keeps the title under 60 characters and the description between 50 and 160", () => {
        expect(indexEntry.title.length, indexEntry.title).to.be.within(3, 60);
        expect(indexEntry.shortDescription.length, indexEntry.shortDescription).to.be.within(50, 160);
      });

      it("uses h2 sections and no h1 in the body", () => {
        expect(detail.content).to.not.match(/^# /m);
        expect(detail.content).to.match(/^## /m);
      });

      it("references only its own images, all present in the sizes manifest", () => {
        const referenced = Array.from(detail.content.matchAll(/\/images\/compare\/([^/)]+)\/([^/)]+)\.webp/g));
        for (const [, articleId, name] of referenced) {
          expect(articleId, name).to.equal(indexEntry.id);
          expect(sizes, name).to.have.property(DocImages_key(articleId, name));
        }
        if (indexEntry.cover != null) {
          expect(sizes).to.have.property(DocImages_key(indexEntry.id, indexEntry.cover));
        }
      });

      it("links only to headings that exist", () => {
        const html = MarkdownHtml_render(detail.content, false, true);
        const ids = new Set(Array.from(html.matchAll(/ id="([^"]+)"/g)).map((m) => m[1]));
        for (const [, anchor] of detail.content.matchAll(/\]\(#([^)]+)\)/g)) {
          expect(ids, anchor).to.include(anchor);
        }
      });

      it("has an FAQ that parses into questions, if it has an FAQ", () => {
        const section = FaqMarkdown_section(detail.content);
        if (section != null) {
          expect(FaqMarkdown_parse(section).length).to.be.greaterThan(0);
        }
      });
    });
  }
});

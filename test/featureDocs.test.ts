import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { parseDocMarkdown } from "../src/utils/docUtils";
import { FeatureCategories_order } from "../src/pages/features/featureCategories";

const featuresDir = path.resolve(__dirname, "../docs/features");
const flowsDir = path.resolve(__dirname, "../screenshots/flows");
const categories = FeatureCategories_order;

function flowScreenshotNames(id: string): string[] {
  const flow = path.join(flowsDir, `${id}.yaml`);
  const watchFlow = path.join(flowsDir, "watch", `${id}.txt`);
  const names: string[] = [];
  for (const file of [flow, watchFlow]) {
    if (fs.existsSync(file)) {
      for (const match of fs.readFileSync(file, "utf8").matchAll(/(?:takeScreenshot:|^screenshot) *([a-z0-9-]+)/gm)) {
        names.push(match[1]);
      }
    }
  }
  return names;
}

describe("Feature docs", () => {
  const files = fs.readdirSync(featuresDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    describe(file, () => {
      const raw = fs.readFileSync(path.join(featuresDir, file), "utf8");
      const { indexEntry, detail } = parseDocMarkdown(raw);

      it("has an id that matches the file name and a known category", () => {
        expect(indexEntry.id).to.equal(path.basename(file, ".md"));
        expect(categories).to.include(indexEntry.category);
        expect(indexEntry.order).to.be.a("number");
        expect(indexEntry.datePublished).to.match(/^\d{4}-\d{2}-\d{2}$/);
        expect(indexEntry.dateModified).to.match(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("keeps the title under 60 characters and the description between 50 and 160", () => {
        expect(indexEntry.title.length, indexEntry.title).to.be.within(3, 60);
        expect(indexEntry.shortDescription.length, indexEntry.shortDescription).to.be.within(50, 160);
      });

      it("uses h2 sections and no h1 in the body", () => {
        const prose = detail.content.replace(/^```[\s\S]*?^```/gm, "");
        expect(prose).to.not.match(/^# /m);
        expect(prose).to.match(/^## /m);
      });

      it("references only screenshots its flow takes", () => {
        const names = flowScreenshotNames(indexEntry.id);
        const referenced = Array.from(detail.content.matchAll(/\/images\/features\/([^/)]+)\/([^/)]+)\.webp/g));
        for (const [, featureId, name] of referenced) {
          expect(featureId, name).to.equal(indexEntry.id);
          expect(names, name).to.include(name.replace(/^android-/, ""));
        }
        for (const name of indexEntry.screenshots || []) {
          expect(names, name).to.include(name);
        }
      });
    });
  }
});

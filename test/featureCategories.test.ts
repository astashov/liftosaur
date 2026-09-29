import "mocha";
import { expect } from "chai";
import { FeatureCategories_group, FeatureCategories_sort } from "../src/pages/features/featureCategories";
import { IDocIndexEntry } from "../src/models/doc";

function entry(id: string, category: string | undefined, order: number): IDocIndexEntry {
  return { id, title: id, order, category, shortDescription: "", screenshots: [] };
}

describe("FeatureCategories", () => {
  it("puts Start here before Workout regardless of order numbers", () => {
    const sorted = FeatureCategories_sort([entry("workout-screen", "Workout", 5), entry("premium", "Start here", 30)]);
    expect(sorted.map((f) => f.id)).to.eql(["premium", "workout-screen"]);
  });

  it("sorts by order inside a category", () => {
    const sorted = FeatureCategories_sort([entry("b", "Workout", 20), entry("a", "Workout", 10)]);
    expect(sorted.map((f) => f.id)).to.eql(["a", "b"]);
  });

  it("groups in category order and sends unknown categories last", () => {
    const groups = FeatureCategories_group([
      entry("x", "Something else", 1),
      entry("graphs", "Progress", 10),
      entry("premium", "Start here", 30),
      entry("week-insights", "Progress", 20),
    ]);
    expect(groups.map(([category]) => category)).to.eql(["Start here", "Progress", "Something else"]);
    expect(groups[1][1].map((f) => f.id)).to.eql(["graphs", "week-insights"]);
  });

  it("labels a missing category as Other", () => {
    const groups = FeatureCategories_group([entry("x", undefined, 1)]);
    expect(groups[0][0]).to.equal("Other");
  });
});

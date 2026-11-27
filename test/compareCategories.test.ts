import "mocha";
import { expect } from "chai";
import { CompareCategories_group } from "../src/pages/compare/compareCategories";
import { IDocIndexEntry } from "../src/models/doc";

function entry(id: string, order: number, category?: string): IDocIndexEntry {
  return { id, title: id, shortDescription: "", order, category };
}

describe("CompareCategories", () => {
  it("groups by the fixed category order, then by order inside a group", () => {
    const groups = CompareCategories_group([
      entry("hypertrophy", 1, "Programs"),
      entry("531-apps", 20, "Apps"),
      entry("misc", 1),
      entry("gzclp-apps", 10, "Apps"),
    ]);
    expect(groups.map(([category, entries]) => [category, entries.map((e) => e.id)])).to.eql([
      ["Apps", ["gzclp-apps", "531-apps"]],
      ["Programs", ["hypertrophy"]],
      ["Other", ["misc"]],
    ]);
  });
});

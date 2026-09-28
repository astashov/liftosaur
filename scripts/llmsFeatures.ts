import { IDocIndexEntry } from "../src/models/doc";
import { IDocDetail } from "../src/utils/docUtils";

const categoryOrder = [
  "Workout",
  "Programs",
  "Exercises and equipment",
  "Progress",
  "Sharing and data",
  "Getting started",
];

export interface ILlmsFeaturePage {
  indexEntry: IDocIndexEntry;
  detail: IDocDetail;
}

function categoryRank(category: string | undefined): number {
  const index = categoryOrder.indexOf(category || "");
  return index === -1 ? categoryOrder.length : index;
}

function bodyWithoutImages(content: string): string {
  return content
    .replace(/^!\[[^\]]*\]\([^)]*\)( !\[[^\]]*\]\([^)]*\))*\n\n?/gm, "")
    .replace(/^## /gm, "### ")
    .trim();
}

export function LlmsFeatures_compile(pages: ILlmsFeaturePage[]): string {
  const sorted = [...pages].sort(
    (a, b) =>
      categoryRank(a.indexEntry.category) - categoryRank(b.indexEntry.category) ||
      a.indexEntry.order - b.indexEntry.order
  );
  const sections = sorted.map(({ indexEntry, detail }) =>
    [
      `## ${indexEntry.title}`,
      "",
      `Category: ${indexEntry.category || "Other"}. Page: https://www.liftosaur.com/features/${indexEntry.id}`,
      "",
      indexEntry.shortDescription,
      "",
      bodyWithoutImages(detail.content),
    ].join("\n")
  );
  return [
    "# Liftosaur features",
    "",
    "One section per page of https://www.liftosaur.com/features, generated from docs/features by scripts/build-llms-features.ts. Liftoscript syntax is in liftoscript.md.",
    "",
    ...sections,
    "",
  ].join("\n");
}

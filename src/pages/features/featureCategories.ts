import { IDocIndexEntry } from "../../models/doc";

export const FeatureCategories_order = [
  "Start here",
  "Workout",
  "Programs",
  "Exercises and equipment",
  "Progress",
  "Sharing and data",
];

export function FeatureCategories_rank(category: string | undefined): number {
  const index = FeatureCategories_order.indexOf(category || "");
  return index === -1 ? FeatureCategories_order.length : index;
}

export function FeatureCategories_sort(features: IDocIndexEntry[]): IDocIndexEntry[] {
  return [...features].sort(
    (a, b) => FeatureCategories_rank(a.category) - FeatureCategories_rank(b.category) || a.order - b.order
  );
}

export function FeatureCategories_group(features: IDocIndexEntry[]): [string, IDocIndexEntry[]][] {
  const groups = new Map<string, IDocIndexEntry[]>();
  for (const feature of FeatureCategories_sort(features)) {
    const category = feature.category || "Other";
    const list = groups.get(category) || [];
    list.push(feature);
    groups.set(category, list);
  }
  return Array.from(groups.entries());
}

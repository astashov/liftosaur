import { IDocIndexEntry } from "../../models/doc";

export const CompareCategories_order = ["Apps", "Programs"];

function rank(category: string | undefined): number {
  const index = category == null ? -1 : CompareCategories_order.indexOf(category);
  return index === -1 ? CompareCategories_order.length : index;
}

export function CompareCategories_group(entries: IDocIndexEntry[]): [string, IDocIndexEntry[]][] {
  const sorted = [...entries].sort((a, b) => rank(a.category) - rank(b.category) || a.order - b.order);
  const groups = new Map<string, IDocIndexEntry[]>();
  for (const entry of sorted) {
    const category = entry.category ?? "Other";
    groups.set(category, [...(groups.get(category) ?? []), entry]);
  }
  return Array.from(groups.entries());
}

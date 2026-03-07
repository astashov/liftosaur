import { IDocIndexEntry } from "../models/doc";
import { parseFrontmatter } from "./programUtils";

export interface IDocDetail {
  content: string;
}

export function parseDocMarkdown(raw: string): { indexEntry: IDocIndexEntry; detail: IDocDetail } {
  const { data: fm, content } = parseFrontmatter(raw);
  const id = (fm.id as string) || "untitled";

  const entry: IDocIndexEntry = {
    id,
    title: (fm.title as string) || id,
    shortDescription: (fm.shortDescription as string) || "",
    order: (fm.order as number) ?? 999,
  };
  if (fm.category != null) {
    entry.category = fm.category as string;
  }
  if (fm.datePublished != null) {
    entry.datePublished = String(fm.datePublished);
  }
  if (fm.dateModified != null) {
    entry.dateModified = String(fm.dateModified);
  }

  return { indexEntry: entry, detail: { content: content.trim() } };
}

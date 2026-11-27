export type IDocCollection = "content" | "features" | "compare";

export interface IDocIndexEntry {
  id: string;
  title: string;
  shortDescription: string;
  order: number;
  category?: string;
  datePublished?: string;
  dateModified?: string;
  screenshots?: string[];
  headerScreenshots?: boolean;
  cover?: string;
}

export interface IDocIndexEntry {
  id: string;
  title: string;
  shortDescription: string;
  order: number;
  category?: string;
  datePublished?: string;
  dateModified?: string;
}

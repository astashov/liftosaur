import type { IJsonLd } from "../components/page";
import type { IDocCollection, IDocIndexEntry } from "./doc";

export type IDocSectionId = "doc" | "features" | "compare";

export interface IDocSection {
  id: IDocSectionId;
  collection: IDocCollection;
  path: string;
  label: string;
  titleSuffix: string;
  fallbackDescription: (title: string) => string;
}

const host = "https://www.liftosaur.com";

export const DocSections_all: Record<IDocSectionId, IDocSection> = {
  doc: {
    id: "doc",
    collection: "content",
    path: "/doc",
    label: "Documentation",
    titleSuffix: "Liftosaur Documentation",
    fallbackDescription: (title) => `${title} - Liftosaur documentation.`,
  },
  features: {
    id: "features",
    collection: "features",
    path: "/features",
    label: "Features",
    titleSuffix: "Liftosaur Features",
    fallbackDescription: (title) => `${title} in the Liftosaur weightlifting app.`,
  },
  compare: {
    id: "compare",
    collection: "compare",
    path: "/compare",
    label: "Compare",
    titleSuffix: "Liftosaur",
    fallbackDescription: (title) => `${title} - compared by Liftosaur.`,
  },
};

export function DocSections_sectionUrl(section: IDocSection): string {
  return `${host}${section.path}`;
}

export function DocSections_articleUrl(section: IDocSection, id: string): string {
  return `${host}${section.path}/${id}`;
}

export function DocSections_title(section: IDocSection, entry: IDocIndexEntry): string {
  return `${entry.title} - ${section.titleSuffix}`;
}

export function DocSections_description(section: IDocSection, entry: IDocIndexEntry): string {
  return entry.shortDescription || section.fallbackDescription(entry.title);
}

export function DocSections_articleJsonLd(
  section: IDocSection,
  entry: IDocIndexEntry,
  image: string | undefined
): IJsonLd[] {
  return [
    {
      type: "Article",
      headline: entry.title,
      description: DocSections_description(section, entry),
      mainEntityOfPage: DocSections_articleUrl(section, entry.id),
      ...(image ? { image } : {}),
      ...(entry.datePublished ? { datePublished: entry.datePublished } : {}),
      ...(entry.dateModified ? { dateModified: entry.dateModified } : {}),
    },
    {
      type: "BreadcrumbList",
      items: [
        { name: "Home", url: host },
        { name: section.label, url: DocSections_sectionUrl(section) },
        { name: entry.title },
      ],
    },
  ];
}

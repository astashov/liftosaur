import type { JSX, ReactNode } from "react";
import { IJsonLd, Page } from "./page";
import { IDocIndexEntry } from "../models/doc";
import {
  DocSections_articleJsonLd,
  DocSections_articleUrl,
  DocSections_description,
  DocSections_title,
  IDocSection,
} from "../models/docSections";

interface IProps<T> {
  section: IDocSection;
  entry: IDocIndexEntry;
  data: T;
  client: Window["fetch"];
  isLoggedIn?: boolean;
  bundle: string;
  image?: string;
  extraJsonLd?: IJsonLd[];
  preloadMono?: boolean;
  children: ReactNode;
}

export function DocArticlePage<T>(props: IProps<T>): JSX.Element {
  const { section, entry } = props;
  const url = DocSections_articleUrl(section, entry.id);
  const description = DocSections_description(section, entry);
  const jsonLd = [...DocSections_articleJsonLd(section, entry, props.image), ...(props.extraJsonLd ?? [])];

  return (
    <Page
      css={[props.bundle]}
      js={[props.bundle]}
      maxWidth={1200}
      title={DocSections_title(section, entry)}
      canonical={url}
      isLoggedIn={!!props.isLoggedIn}
      description={description}
      ogDescription={description}
      ogUrl={url}
      ogType="article"
      ogImage={props.image}
      jsonLd={jsonLd}
      postHead={
        <>
          {entry.datePublished && <meta property="article:published_time" content={entry.datePublished} />}
          {entry.dateModified && <meta property="article:modified_time" content={entry.dateModified} />}
          {entry.category && <meta property="article:section" content={entry.category} />}
        </>
      }
      data={props.data}
      client={props.client}
      preloadMono={props.preloadMono}
      url={section.path}
    >
      {props.children}
    </Page>
  );
}

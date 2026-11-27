import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";
import { Markdown } from "../../components/markdown";
import { DocArticle } from "../../components/docArticle";
import { DocSections_all } from "../../models/docSections";

export interface IDocDetailsContentProps {
  doc: IDocIndexEntry;
  content: string;
}

export function DocDetailsContent(props: IDocDetailsContentProps): JSX.Element {
  return (
    <DocArticle section={DocSections_all.doc} entry={props.doc} headingClassName="mb-6 text-3xl font-bold">
      <Markdown className="program-details-description" value={props.content} withAnchors />
    </DocArticle>
  );
}

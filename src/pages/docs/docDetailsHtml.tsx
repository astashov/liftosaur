import type { JSX } from "react";
import { DocArticlePage } from "../../components/docArticlePage";
import { IDocIndexEntry } from "../../models/doc";
import { DocSections_all } from "../../models/docSections";
import { DocDetailsContent, IDocDetailsContentProps } from "./docDetailsContent";

interface IProps {
  doc: IDocIndexEntry;
  content: string;
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function DocDetailsHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  return (
    <DocArticlePage<IDocDetailsContentProps>
      section={DocSections_all.doc}
      entry={props.doc}
      data={data}
      client={client}
      isLoggedIn={isLoggedIn}
      bundle="docdetails"
      preloadMono
    >
      <DocDetailsContent {...data} />
    </DocArticlePage>
  );
}

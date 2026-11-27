import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";
import { Markdown } from "../../components/markdown";
import { DocArticle } from "../../components/docArticle";
import { ImageLightbox } from "../../components/imageLightbox";
import { DocSections_all } from "../../models/docSections";
import { DocImages_inlineHtml, IDocImageSizes } from "../../utils/docImages";

export interface ICompareDetailsContentProps {
  entry: IDocIndexEntry;
  content: string;
  sizes: IDocImageSizes;
}

export function CompareDetailsContent(props: ICompareDetailsContentProps): JSX.Element {
  const { entry } = props;
  const content = DocImages_inlineHtml("compare", props.content, props.sizes);
  return (
    <DocArticle section={DocSections_all.compare} entry={entry} headingClassName="mb-2 text-3xl font-bold">
      {entry.shortDescription && <p className="mb-6 text-lg text-text-secondary">{entry.shortDescription}</p>}
      <ImageLightbox>
        <Markdown className="program-details-description compare-body" value={content} withAnchors />
      </ImageLightbox>
    </DocArticle>
  );
}

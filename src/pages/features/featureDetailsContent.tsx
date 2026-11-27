import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";
import { Markdown } from "../../components/markdown";
import { DocArticle } from "../../components/docArticle";
import { DocSections_all } from "../../models/docSections";
import { DocImages_inlineHtml, DocImages_size, DocImages_url, IDocImageSizes } from "../../utils/docImages";
import { FeatureImages_altText } from "./featureImages";

export interface IFeatureDetailsContentProps {
  feature: IDocIndexEntry;
  content: string;
  sizes: IDocImageSizes;
}

export function FeatureDetailsContent(props: IFeatureDetailsContentProps): JSX.Element {
  const { feature, sizes } = props;
  const content = DocImages_inlineHtml("features", props.content, sizes);
  const headerShots = feature.headerScreenshots === false ? [] : (feature.screenshots ?? []);

  return (
    <DocArticle section={DocSections_all.features} entry={feature} headingClassName="mb-2 text-3xl font-bold">
      {feature.shortDescription && <p className="mb-6 text-lg text-text-secondary">{feature.shortDescription}</p>}
      {headerShots.length > 0 && (
        <div className="flex flex-wrap justify-center gap-5 pt-2 pb-5 mb-2">
          {headerShots.map((name, index) => (
            <figure
              key={name}
              className="shrink-0 w-[250px] m-0 overflow-hidden rounded-[34px] border-8 border-[#111] bg-[#111]"
            >
              <img
                className="block w-full h-auto rounded-[26px]"
                src={DocImages_url("features", feature.id, name)}
                alt={FeatureImages_altText(feature.title, feature.id, name)}
                width={DocImages_size(sizes, feature.id, name)?.width}
                height={DocImages_size(sizes, feature.id, name)?.height}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
                decoding="async"
              />
            </figure>
          ))}
        </div>
      )}
      <Markdown className="program-details-description feature-body" value={content} withAnchors />
    </DocArticle>
  );
}

import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";
import { Markdown } from "../../components/markdown";
import { Features_screenshotUrl } from "./featuresListContent";
import {
  FeatureImages_altText,
  FeatureImages_inlineHtml,
  FeatureImages_size,
  IFeatureImageSizes,
} from "./featureImages";

export interface IFeatureDetailsContentProps {
  feature: IDocIndexEntry;
  content: string;
  sizes: IFeatureImageSizes;
}

export function FeatureDetailsContent(props: IFeatureDetailsContentProps): JSX.Element {
  const { feature, sizes } = props;
  const content = FeatureImages_inlineHtml(props.content, sizes);
  const headerShots = feature.headerScreenshots === false ? [] : (feature.screenshots ?? []);

  return (
    <section className="px-4 py-8 mx-auto" style={{ maxWidth: 800 }}>
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <a href="/features" className="underline hover:text-text-primary">
          Features
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">{feature.title}</span>
      </nav>
      <h1 className="mb-2 text-3xl font-bold">{feature.title}</h1>
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
                src={Features_screenshotUrl(feature.id, name)}
                alt={FeatureImages_altText(feature.title, feature.id, name)}
                width={FeatureImages_size(sizes, feature.id, name)?.width}
                height={FeatureImages_size(sizes, feature.id, name)?.height}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
                decoding="async"
              />
            </figure>
          ))}
        </div>
      )}
      <Markdown className="program-details-description feature-body" value={content} />
    </section>
  );
}

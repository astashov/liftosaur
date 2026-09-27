import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";
import { Markdown } from "../../components/markdown";
import { Features_screenshotUrl } from "./featuresListContent";

export interface IFeatureDetailsContentProps {
  feature: IDocIndexEntry;
  content: string;
}

export function FeatureDetailsContent(props: IFeatureDetailsContentProps): JSX.Element {
  const { feature, content } = props;

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
      {feature.screenshots && feature.screenshots.length > 0 && (
        <div className="flex flex-wrap justify-center gap-5 pt-2 pb-5 mb-2">
          {feature.screenshots.map((name) => (
            <figure
              key={name}
              className="shrink-0 w-[250px] m-0 overflow-hidden rounded-[34px] border-8 border-[#111] bg-[#111]"
            >
              <img
                className="block w-full h-auto rounded-[26px]"
                src={Features_screenshotUrl(feature.id, name)}
                alt={`${feature.title} - ${name}`}
              />
            </figure>
          ))}
        </div>
      )}
      <Markdown className="program-details-description feature-body" value={content} />
    </section>
  );
}

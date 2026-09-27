import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";

export interface IFeaturesListContentProps {
  features: IDocIndexEntry[];
}

export function Features_screenshotUrl(featureId: string, name: string): string {
  return `/images/features/${featureId}/${name}.webp`;
}

export function FeaturesListContent(props: IFeaturesListContentProps): JSX.Element {
  const categories = new Map<string, IDocIndexEntry[]>();
  for (const feature of props.features) {
    const category = feature.category || "Other";
    const list = categories.get(category) || [];
    list.push(feature);
    categories.set(category, list);
  }

  return (
    <section className="px-4 py-8 mx-auto" style={{ maxWidth: 960 }}>
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">Features</span>
      </nav>
      <h1 className="mb-2 text-3xl font-bold">Liftosaur Features</h1>
      <p className="mb-8 text-text-secondary">Everything the app does, one page per feature, with screenshots.</p>
      {Array.from(categories.entries()).map(([category, features]) => (
        <div key={category} className="mb-10">
          <h2 className="mb-3 text-xl font-bold">{category}</h2>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            {features.map((feature) => (
              <a
                key={feature.id}
                href={`/features/${feature.id}`}
                className="flex items-start gap-3.5 p-3.5 no-underline border rounded-xl border-border-neutral hover:bg-background-subtle"
              >
                {feature.screenshots?.[0] && (
                  <span className="shrink-0 w-[72px] overflow-hidden rounded-xl border-[3px] border-[#111] bg-[#111]">
                    <img
                      className="block w-full h-auto rounded-[9px]"
                      src={Features_screenshotUrl(feature.id, feature.screenshots[0])}
                      alt={feature.title}
                      loading="lazy"
                    />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-text-primary">{feature.title}</span>
                  {feature.shortDescription && (
                    <span className="block mt-1 text-sm text-text-secondary">{feature.shortDescription}</span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

import type { JSX } from "react";
import { IDocIndexEntry } from "../../models/doc";
import { CompareCategories_group } from "./compareCategories";

export interface ICompareListContentProps {
  entries: IDocIndexEntry[];
}

export function CompareListContent(props: ICompareListContentProps): JSX.Element {
  const categories = CompareCategories_group(props.entries);

  return (
    <section className="px-4 py-8 mx-auto" style={{ maxWidth: 800 }}>
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">Compare</span>
      </nav>
      <h1 className="mb-2 text-3xl font-bold">Compare</h1>
      <p className="mb-8 text-text-secondary">
        Side-by-side comparisons of workout apps and lifting programs: what each one does, where it falls short, and
        who it fits. Each page says how we compared and when.
      </p>
      {categories.map(([category, entries]) => (
        <div key={category} className="mb-8">
          <h2 className="mb-3 text-xl font-bold">{category}</h2>
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <a
                key={entry.id}
                href={`/compare/${entry.id}`}
                className="block p-4 no-underline border rounded-lg border-border-neutral hover:bg-background-neutral"
              >
                <div className="text-base font-semibold text-text-primary">{entry.title}</div>
                {entry.shortDescription && (
                  <div className="mt-1 text-sm text-text-secondary">{entry.shortDescription}</div>
                )}
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

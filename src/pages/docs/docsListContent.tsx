import { h, JSX } from "preact";
import { IDocIndexEntry } from "../../models/doc";

export interface IDocsListContentProps {
  docs: IDocIndexEntry[];
}

export function DocsListContent(props: IDocsListContentProps): JSX.Element {
  const categories = new Map<string, IDocIndexEntry[]>();
  const uncategorized: IDocIndexEntry[] = [];

  for (const doc of props.docs) {
    if (doc.category) {
      const list = categories.get(doc.category) || [];
      list.push(doc);
      categories.set(doc.category, list);
    } else {
      uncategorized.push(doc);
    }
  }

  return (
    <section className="px-4 py-8 mx-auto" style={{ maxWidth: 800 }}>
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">Documentation</span>
      </nav>
      <h1 className="mb-2 text-3xl font-bold">Documentation</h1>
      <p className="mb-8 text-text-secondary">Learn how to use Liftosaur and its features.</p>
      {uncategorized.length > 0 && (
        <div className="mb-8">
          <DocsList docs={uncategorized} />
        </div>
      )}
      {Array.from(categories.entries()).map(([category, docs]) => (
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-bold capitalize">{category}</h2>
          <DocsList docs={docs} />
        </div>
      ))}
    </section>
  );
}

function DocsList(props: { docs: IDocIndexEntry[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {props.docs.map((doc) => (
        <a
          href={`/docs/${doc.id}`}
          className="block p-4 no-underline border rounded-lg border-border-neutral hover:bg-background-neutral"
        >
          <div className="text-base font-semibold text-text-primary">{doc.title}</div>
          {doc.shortDescription && <div className="mt-1 text-sm text-text-secondary">{doc.shortDescription}</div>}
        </a>
      ))}
    </div>
  );
}

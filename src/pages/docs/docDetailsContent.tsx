import { h, JSX } from "preact";
import { IDocIndexEntry } from "../../models/doc";
import { Markdown } from "../../components/markdown";

export interface IDocDetailsContentProps {
  doc: IDocIndexEntry;
  content: string;
}

export function DocDetailsContent(props: IDocDetailsContentProps): JSX.Element {
  const { doc, content } = props;

  return (
    <section className="px-4 py-8 mx-auto" style={{ maxWidth: 800 }}>
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <a href="/docs" className="underline hover:text-text-primary">
          Documentation
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">{doc.title}</span>
      </nav>
      <h1 className="mb-6 text-3xl font-bold">{doc.title}</h1>
      <Markdown className="program-details-description" value={content} />
    </section>
  );
}

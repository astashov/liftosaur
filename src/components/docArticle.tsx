import type { JSX, ReactNode } from "react";
import { IDocIndexEntry } from "../models/doc";
import { IDocSection } from "../models/docSections";

interface IProps {
  section: IDocSection;
  entry: IDocIndexEntry;
  headingClassName: string;
  children: ReactNode;
}

export function DocArticle(props: IProps): JSX.Element {
  const { section, entry } = props;
  return (
    <section className="px-4 py-8 mx-auto" style={{ maxWidth: 800 }}>
      <nav className="pt-2 pb-2 text-xs text-text-secondary" aria-label="Breadcrumb">
        <a href="/" className="underline hover:text-text-primary">
          Home
        </a>
        <span className="mx-1">/</span>
        <a href={section.path} className="underline hover:text-text-primary">
          {section.label}
        </a>
        <span className="mx-1">/</span>
        <span className="text-text-primary">{entry.title}</span>
      </nav>
      <h1 className={props.headingClassName}>{entry.title}</h1>
      {props.children}
    </section>
  );
}

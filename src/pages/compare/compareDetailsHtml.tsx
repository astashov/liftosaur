import type { JSX } from "react";
import { DocArticlePage } from "../../components/docArticlePage";
import { IJsonLd } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { DocSections_all } from "../../models/docSections";
import { DocImages_url, IDocImageSizes } from "../../utils/docImages";
import { FaqMarkdown_parse, FaqMarkdown_section } from "../../utils/faqMarkdown";
import { CompareDetailsContent, ICompareDetailsContentProps } from "./compareDetailsContent";

interface IProps {
  entry: IDocIndexEntry;
  content: string;
  sizes: IDocImageSizes;
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function CompareDetailsHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const { entry } = props;
  const image = entry.cover ? `https://www.liftosaur.com${DocImages_url("compare", entry.id, entry.cover)}` : undefined;
  const faqSection = FaqMarkdown_section(props.content);
  const faq = faqSection ? FaqMarkdown_parse(faqSection) : [];
  const extraJsonLd: IJsonLd[] = faq.length > 0 ? [{ type: "FAQPage", questions: faq }] : [];

  return (
    <DocArticlePage<ICompareDetailsContentProps>
      section={DocSections_all.compare}
      entry={entry}
      data={data}
      client={client}
      isLoggedIn={isLoggedIn}
      bundle="comparedetails"
      image={image}
      extraJsonLd={extraJsonLd}
    >
      <CompareDetailsContent {...data} />
    </DocArticlePage>
  );
}

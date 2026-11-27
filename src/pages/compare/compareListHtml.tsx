import type { JSX } from "react";
import { IJsonLd, Page } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { DocSections_all, DocSections_articleUrl, DocSections_sectionUrl } from "../../models/docSections";
import { CompareListContent } from "./compareListContent";

interface IProps {
  entries: IDocIndexEntry[];
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function CompareListHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const section = DocSections_all.compare;
  const url = DocSections_sectionUrl(section);
  const description =
    "Side-by-side comparisons of workout apps and lifting programs: what each one does, where it falls short, and who it fits.";

  const jsonLd: IJsonLd[] = [
    {
      type: "BreadcrumbList",
      items: [{ name: "Home", url: "https://www.liftosaur.com" }, { name: section.label }],
    },
    {
      type: "ItemList",
      name: "Liftosaur comparisons",
      items: props.entries.map((entry) => ({ name: entry.title, url: DocSections_articleUrl(section, entry.id) })),
    },
  ];

  return (
    <Page
      css={["allcompare"]}
      js={["allcompare"]}
      maxWidth={1200}
      title="Compare workout apps and programs - Liftosaur"
      canonical={url}
      isLoggedIn={!!isLoggedIn}
      description={description}
      ogDescription={description}
      ogUrl={url}
      ogImage="https://www.liftosaur.com/images/logo-square.png"
      jsonLd={jsonLd}
      data={data}
      client={client}
      url={section.path}
    >
      <CompareListContent {...data} />
    </Page>
  );
}

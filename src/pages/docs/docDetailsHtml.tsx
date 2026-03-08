import { h, JSX } from "preact";
import { IJsonLd, Page } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { DocDetailsContent } from "./docDetailsContent";

interface IProps {
  doc: IDocIndexEntry;
  content: string;
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function DocDetailsHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const { doc } = props;
  const title = `${doc.title} - Liftosaur Documentation`;
  const url = `https://www.liftosaur.com/doc/${doc.id}`;
  const description = doc.shortDescription || `${doc.title} - Liftosaur documentation.`;

  const jsonLd: IJsonLd[] = [
    {
      type: "Article",
      headline: doc.title,
      description,
      mainEntityOfPage: url,
      ...(doc.datePublished ? { datePublished: doc.datePublished } : {}),
      ...(doc.dateModified ? { dateModified: doc.dateModified } : {}),
    },
    {
      type: "BreadcrumbList",
      items: [
        { name: "Home", url: "https://www.liftosaur.com" },
        { name: "Documentation", url: "https://www.liftosaur.com/doc" },
        { name: doc.title },
      ],
    },
  ];

  return (
    <Page
      css={["docdetails"]}
      js={["docdetails"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      isLoggedIn={!!isLoggedIn}
      description={description}
      ogDescription={description}
      ogUrl={url}
      jsonLd={jsonLd}
      data={data}
      client={client}
      url="/doc"
    >
      <DocDetailsContent {...data} />
    </Page>
  );
}

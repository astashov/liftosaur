import { h, JSX } from "preact";
import { IJsonLd, Page } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { DocsListContent } from "./docsListContent";

interface IProps {
  docs: IDocIndexEntry[];
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function DocsListHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const title = "Documentation - Liftosaur";
  const url = "https://www.liftosaur.com/doc";
  const description =
    "Liftosaur documentation - learn how to use the app, create workout programs, and write Liftoscript.";

  const jsonLd: IJsonLd[] = [
    {
      type: "BreadcrumbList",
      items: [{ name: "Home", url: "https://www.liftosaur.com" }, { name: "Documentation" }],
    },
  ];

  return (
    <Page
      css={["alldocs"]}
      js={["alldocs"]}
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
      <DocsListContent {...data} />
    </Page>
  );
}

import type { JSX } from "react";
import { IJsonLd, Page } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { FeaturesListContent } from "./featuresListContent";

interface IProps {
  features: IDocIndexEntry[];
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function FeaturesListHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const title = "Features - Liftosaur";
  const url = "https://www.liftosaur.com/features";
  const description =
    "Every Liftosaur feature explained with screenshots: workout tracking, rest timers, programs, Liftoscript, graphs, Apple Watch, and more.";

  const jsonLd: IJsonLd[] = [
    {
      type: "BreadcrumbList",
      items: [{ name: "Home", url: "https://www.liftosaur.com" }, { name: "Features" }],
    },
  ];

  return (
    <Page
      css={["allfeatures"]}
      js={["allfeatures"]}
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
      url="/features"
    >
      <FeaturesListContent {...data} />
    </Page>
  );
}

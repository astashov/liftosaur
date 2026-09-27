import type { JSX } from "react";
import { IJsonLd, Page } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { FeatureDetailsContent } from "./featureDetailsContent";
import { Features_screenshotUrl } from "./featuresListContent";

interface IProps {
  feature: IDocIndexEntry;
  content: string;
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function FeatureDetailsHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const { feature } = props;
  const title = `${feature.title} - Liftosaur Features`;
  const url = `https://www.liftosaur.com/features/${feature.id}`;
  const description = feature.shortDescription || `${feature.title} in the Liftosaur weightlifting app.`;
  const firstShot = feature.screenshots?.[0];

  const jsonLd: IJsonLd[] = [
    {
      type: "Article",
      headline: feature.title,
      description,
      mainEntityOfPage: url,
      ...(feature.datePublished ? { datePublished: feature.datePublished } : {}),
      ...(feature.dateModified ? { dateModified: feature.dateModified } : {}),
    },
    {
      type: "BreadcrumbList",
      items: [
        { name: "Home", url: "https://www.liftosaur.com" },
        { name: "Features", url: "https://www.liftosaur.com/features" },
        { name: feature.title },
      ],
    },
  ];

  return (
    <Page
      css={["featuredetails"]}
      js={["featuredetails"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      isLoggedIn={!!isLoggedIn}
      description={description}
      ogDescription={description}
      ogUrl={url}
      ogImage={firstShot ? `https://www.liftosaur.com${Features_screenshotUrl(feature.id, firstShot)}` : undefined}
      jsonLd={jsonLd}
      data={data}
      client={client}
      url="/features"
    >
      <FeatureDetailsContent {...data} />
    </Page>
  );
}

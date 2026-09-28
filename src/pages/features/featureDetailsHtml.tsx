import type { JSX } from "react";
import { IJsonLd, Page } from "../../components/page";
import { IDocIndexEntry } from "../../models/doc";
import { FeatureDetailsContent } from "./featureDetailsContent";
import { Features_screenshotUrl } from "./featuresListContent";
import { IFeatureImageSizes } from "./featureImages";

interface IProps {
  feature: IDocIndexEntry;
  content: string;
  sizes: IFeatureImageSizes;
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
  const image = firstShot ? `https://www.liftosaur.com${Features_screenshotUrl(feature.id, firstShot)}` : undefined;

  const jsonLd: IJsonLd[] = [
    {
      type: "Article",
      headline: feature.title,
      description,
      mainEntityOfPage: url,
      ...(image ? { image } : {}),
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
      ogType="article"
      ogImage={image}
      jsonLd={jsonLd}
      postHead={
        <>
          {feature.datePublished && <meta property="article:published_time" content={feature.datePublished} />}
          {feature.dateModified && <meta property="article:modified_time" content={feature.dateModified} />}
          {feature.category && <meta property="article:section" content={feature.category} />}
        </>
      }
      data={data}
      client={client}
      url="/features"
    >
      <FeatureDetailsContent {...data} />
    </Page>
  );
}

import type { JSX } from "react";
import { DocArticlePage } from "../../components/docArticlePage";
import { IDocIndexEntry } from "../../models/doc";
import { DocSections_all } from "../../models/docSections";
import { DocImages_url, IDocImageSizes } from "../../utils/docImages";
import { FeatureDetailsContent, IFeatureDetailsContentProps } from "./featureDetailsContent";

interface IProps {
  feature: IDocIndexEntry;
  content: string;
  sizes: IDocImageSizes;
  client: Window["fetch"];
  isLoggedIn?: boolean;
}

export function FeatureDetailsHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;
  const { feature } = props;
  const firstShot = feature.screenshots?.[0];
  const image = firstShot ? `https://www.liftosaur.com${DocImages_url("features", feature.id, firstShot)}` : undefined;

  return (
    <DocArticlePage<IFeatureDetailsContentProps>
      section={DocSections_all.features}
      entry={feature}
      data={data}
      client={client}
      isLoggedIn={isLoggedIn}
      bundle="featuredetails"
      image={image}
    >
      <FeatureDetailsContent {...data} />
    </DocArticlePage>
  );
}

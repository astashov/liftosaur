import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { AffiliatesContent } from "./affiliatesContent";

export interface IAffiliatesHtmlProps {
  client: Window["fetch"];
}

export function AffiliatesHtml(props: IAffiliatesHtmlProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["affiliates"]}
      js={["affiliates"]}
      maxWidth={740}
      title="Affiliate Program"
      ogTitle="Liftosaur: Affiliate Program"
      ogDescription="Liftosaur's affiliate program"
      ogUrl={`https://www.liftosaur.com/affiliates`}
      data={data}
    >
      <AffiliatesContent client={client} {...data} />
    </Page>
  );
}

import type { JSX } from "react";
import { Page } from "../../components/page";
import { FriendsWeb_presentation, IFriendsPageData } from "../../models/friendsWeb";
import { FriendsContent } from "./friendsContent";

export function FriendsHtml(props: { client: Window["fetch"]; data: IFriendsPageData }): JSX.Element {
  const { path, documentTitle } = FriendsWeb_presentation(props.data);
  return (
    <Page
      css={["friends"]}
      js={["friends"]}
      maxWidth={1200}
      title={documentTitle}
      description="Your friends on Liftosaur"
      canonical={`https://www.liftosaur.com${path}`}
      ogUrl={`https://www.liftosaur.com${path}`}
      data={props.data}
      isLoggedIn={true}
      client={props.client}
      url={path}
    >
      <FriendsContent {...props.data} client={props.client} />
    </Page>
  );
}

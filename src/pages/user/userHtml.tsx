import React, { JSX } from "react";
import { Page } from "../../components/page";
import { UserContent } from "./userContent";
import { IStorage } from "../../types";

interface IProps {
  data: IStorage;
  userId: string;
  client: Window["fetch"];
}

export function UserHtml(props: IProps): JSX.Element {
  const username = props.data.settings.nickname;
  const title = username ? `${username} Profile Page | Liftosaur` : "Profile Page | Liftosaur";
  const url = `https://www.liftosaur.com/profile/${props.userId}`;
  return (
    <Page
      css={["user"]}
      js={["user"]}
      title={title}
      canonical={url}
      ogUrl={url}
      description="User Profile - What program user follows, the max weights lifted and progress graphs."
      ogImage={`https://www.liftosaur.com/profileimage/${props.userId}`}
      data={props.data}
      client={props.client}
    >
      <UserContent data={props.data} />
    </Page>
  );
}

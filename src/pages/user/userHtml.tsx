import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { UserContent } from "./userContent";
import { IStorage } from "../../types";

interface IProps {
  data: IStorage;
  userId: string;
}

export function UserHtml(props: IProps): JSX.Element {
  return (
    <Page
      css={["user"]}
      js={["user"]}
      title="Profile Page"
      ogTitle={`Liftosaur: User Profile${props.data.settings.nickname ? `- ${props.data.settings.nickname}` : ""}`}
      ogDescription="Liftosaur User Profile - What program user follows, the max weights lifted and progress graphs."
      ogUrl={`https://www.liftosaur.com/profile/${props.userId}`}
      ogImage={`https://www.liftosaur.com/profileimage/${props.userId}`}
      data={props.data}
    >
      <UserContent data={props.data} />
    </Page>
  );
}

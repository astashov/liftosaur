import type { JSX } from "react";
import { Page } from "../../components/page";
import { VerifyEmailContent } from "./verifyEmailContent";

interface IProps {
  client: Window["fetch"];
  token?: string;
}

export function VerifyEmailHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      nowrapper={true}
      css={["verifyemail"]}
      js={["verifyemail"]}
      maxWidth={1200}
      title="Verify Email | Liftosaur"
      canonical="https://www.liftosaur.com/verifyemail"
      description="Verify the email of your Liftosaur account"
      ogUrl="https://www.liftosaur.com/verifyemail"
      postHead={<meta name="robots" content="noindex" />}
      data={data}
      client={client}
      url={"/verifyemail"}
    >
      <VerifyEmailContent client={client} {...data} />
    </Page>
  );
}

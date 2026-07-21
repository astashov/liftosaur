import type { JSX } from "react";
import { Page } from "../../components/page";
import { ResetPasswordContent } from "./resetPasswordContent";

interface IProps {
  client: Window["fetch"];
  token?: string;
}

export function ResetPasswordHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      nowrapper={true}
      css={["resetpassword"]}
      js={["resetpassword"]}
      maxWidth={1200}
      title="Reset Password | Liftosaur"
      canonical="https://www.liftosaur.com/resetpassword"
      description="Set a new password for your Liftosaur account"
      ogUrl="https://www.liftosaur.com/resetpassword"
      postHead={<meta name="robots" content="noindex" />}
      data={data}
      client={client}
      url={"/resetpassword"}
    >
      <ResetPasswordContent client={client} {...data} />
    </Page>
  );
}

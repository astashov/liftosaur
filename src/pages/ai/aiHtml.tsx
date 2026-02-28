import { JSX, h } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { AiContent } from "./aiContent";

interface IAiHtmlProps {
  client: Window["fetch"];
  account: IAccount;
}

export function AiHtml(props: IAiHtmlProps): JSX.Element {
  const client = props.client;

  return (
    <Page
      isLoggedIn={!!props.account}
      client={client}
      css={["ai"]}
      js={["ai"]}
      maxWidth={1280}
      title="Liftosaur AI generator | Liftosaur"
      description="Convert any workout program to Liftoscript format using AI. Support for spreadsheets, documents, and text descriptions."
      canonical="https://www.liftosaur.com/ai"
      ogUrl="https://www.liftosaur.com/ai"
      data={props}
      url="/ai"
    >
      <AiContent client={client} account={props.account} />
    </Page>
  );
}

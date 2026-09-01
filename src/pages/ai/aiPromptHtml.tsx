import type { JSX } from "react";
import { Page } from "../../components/page";
import { AiPromptContent } from "./aiPromptContent";
import { IAccount } from "../../models/account";

interface IAiPromptHtmlProps {
  client: Window["fetch"];
  account?: IAccount;
}

export function AiPromptHtml(props: IAiPromptHtmlProps): JSX.Element {
  const client = props.client;

  return (
    <Page
      client={client}
      css={["aiPrompt"]}
      js={["aiPrompt"]}
      maxWidth={1200}
      isLoggedIn={!!props.account}
      title="Liftoscript Prompt Generator (retired) | Liftosaur"
      description="The Liftoscript prompt generator is retired - use the Liftosaur MCP server to connect Claude, ChatGPT or Gemini directly to your account instead."
      canonical="https://www.liftosaur.com/ai/prompt"
      ogUrl="https://www.liftosaur.com/ai/prompt"
      data={{}}
      url="/ai/prompt"
    >
      <AiPromptContent />
    </Page>
  );
}

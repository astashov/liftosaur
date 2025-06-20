import { JSX, h } from "preact";
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
      maxWidth={1280}
      account={props.account}
      title="Liftoscript Prompt Generator | Liftosaur"
      description="Generate prompts to convert workout programs to Liftoscript format using any LLM like ChatGPT, Claude, or Gemini."
      canonical="https://www.liftosaur.com/ai/prompt"
      ogUrl="https://www.liftosaur.com/ai/prompt"
      data={props}
      url="/ai/prompt"
    >
      <AiPromptContent client={client} account={props.account} />
    </Page>
  );
}

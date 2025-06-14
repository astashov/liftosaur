import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import { AiContent } from "./pages/ai/aiContent";
import { PageWrapper } from "./components/pageWrapper";
import { IAccount } from "./models/account";

interface IAiContentProps {
  client: Window["fetch"];
  account?: IAccount;
}

function main(): void {
  HydrateUtils.hydratePage<IAiContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <AiContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
import { h } from "preact";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { AiContent } from "./pages/ai/aiContent";
import { PageWrapper } from "./components/pageWrapper";
import { IAccount } from "./models/account";

interface IAiContentProps {
  client: Window["fetch"];
  account: IAccount;
}

function main(): void {
  HydrateUtils_hydratePage<IAiContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <AiContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();

import { h } from "preact";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { AiPromptContent } from "./pages/ai/aiPromptContent";
import { PageWrapper } from "./components/pageWrapper";

interface IAiPromptContentProps {
  client: Window["fetch"];
}

function main(): void {
  HydrateUtils_hydratePage<IAiPromptContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <AiPromptContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();

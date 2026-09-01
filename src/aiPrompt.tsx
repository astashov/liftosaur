import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { AiPromptContent } from "./pages/ai/aiPromptContent";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils_hydratePage<Record<string, never>>((pageWrapperProps) => (
    <PageWrapper {...pageWrapperProps}>
      <AiPromptContent />
    </PageWrapper>
  ));
}

main();

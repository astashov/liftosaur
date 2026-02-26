import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { ProgramPreviewPage } from "./pages/programs/programPreviewPage";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<Record<string, never>>((pageWrapperProps) => (
    <PageWrapper {...pageWrapperProps}>{() => <ProgramPreviewPage />}</PageWrapper>
  ));
}

main();

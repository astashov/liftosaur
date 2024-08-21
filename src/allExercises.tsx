import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { AllExercisesContent, IAllExercisesContentProps } from "./pages/allExercises/allExercisesContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IAllExercisesContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <AllExercisesContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();

import { h } from "preact";
import { IExerciseContentProps, ExerciseContent } from "./pages/exercise/exerciseContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IExerciseContentProps>((pageWrapperProps, data) => (
    <ExerciseContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
